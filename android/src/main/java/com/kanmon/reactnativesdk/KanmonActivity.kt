package com.kanmon.reactnativesdk
import android.Manifest
import android.app.Dialog
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Message
import android.util.Log
import android.view.ViewGroup
import android.view.Window
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.bridge.ReactContext
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class KanmonActivity : ReactActivity() {
  companion object {
      private const val CAMERA_PERMISSION_REQUEST_CODE = 1001
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "Kanmon"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  var webViewLock = Any()
  private var webView: WebView? = null

  private var dialog: Dialog? = null
  private var filePathCallback: ValueCallback<Array<Uri>>? = null

  // I considered synchronizing this list, but could not think
  // of a race condition where it would be needed.
  private val messageQueue = mutableListOf<String>()
  private var isWebViewLoaded = false
  private val permissionCallbacks = mutableMapOf<Int, (Boolean) -> Unit>()

  private val getContent = registerForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
    if (uri != null) {
      filePathCallback?.onReceiveValue(arrayOf(uri))
    } else {
      filePathCallback?.onReceiveValue(null)
    }
    filePathCallback = null
  }

  fun showModal(showArgs: String) {
    runOnUiThread {
      synchronized(webViewLock) {
        if (webView == null) {
          Log.w("KanmonActivity", "Kanmon must be initialized before show is called.")
          return@runOnUiThread
        }

        // TODO: VALIDATE show args
        sendMessageToWebView(showArgs)

        // Create dialog if it doesn't exist
        if (dialog == null) {
          dialog = Dialog(this, android.R.style.Theme_NoTitleBar_Fullscreen).apply {
            requestWindowFeature(Window.FEATURE_NO_TITLE)
            setContentView(R.layout.modal_webview)

            window?.apply {
              // Add animation
              attributes?.windowAnimations = R.style.DialogAnimation
            }

            setOnDismissListener {
              // The WebView can only have one parent. Remove WebView from its parent
              // when dialog is dismissed so that it can be added back as a child later.
              (webView?.parent as? ViewGroup)?.removeView(webView)
            }
          }
        }

        // Get the container from the layout
        val container = dialog?.findViewById<FrameLayout>(R.id.webview_container)

        // Hide system bars every time the dialog is shown
        dialog?.window?.decorView?.let { decorView ->
          if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
            decorView.windowInsetsController?.apply {
              hide(android.view.WindowInsets.Type.systemBars())
              systemBarsBehavior = android.view.WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
          } else {
            // For older Android versions (pre-Android 11)
            @Suppress("DEPRECATION")
            decorView.systemUiVisibility = (
                    android.view.View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                            or android.view.View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                            or android.view.View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                            or android.view.View.SYSTEM_UI_FLAG_FULLSCREEN
                            or android.view.View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                            or android.view.View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    )
          }
        }

        container?.addView(webView)

        dialog?.show()
      }

    }
  }

  private fun sendMessageToWebView(eventData: String) {
    // todo: event queueing if not loaded yet

    if (!isWebViewLoaded) {
      messageQueue.add(eventData)
      return
    }

    this.runOnUiThread {
      val webView = webView ?: return@runOnUiThread

      // Create a JavaScript string that dispatches a custom event
      val escapedData = eventData.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n")

      val javascript = """
                (function() {
                    try {
                        const event = new MessageEvent('message', { data: JSON.parse('$escapedData') });
                        window.dispatchEvent(event);
                    } catch (e) {
                        console.error('Error dispatching event:', e);
                    }
                })();
            """.trimIndent()

      webView.evaluateJavascript(javascript, null)
    }
  }

  fun initializeWebView(reactContext: ReactContext, url: String): WebView {
    synchronized(webViewLock) {
      // Remove the existing WebView if it exists
      webView?.let {
        deleteWebView()
      }

      webView = WebView(this).apply {
        settings.apply {
          javaScriptEnabled = true
          domStorageEnabled = true
          loadWithOverviewMode = true
          useWideViewPort = true
          javaScriptCanOpenWindowsAutomatically = true
          setSupportMultipleWindows(true)
          allowFileAccess = true
          allowContentAccess = true
          mediaPlaybackRequiresUserGesture = false
        }

        // This is needed for Persona selfies + gov ID.
        webChromeClient = object : WebChromeClient() {
          override fun onPermissionRequest(request: PermissionRequest) {
            Log.d("KanmonActivity", "Permission request received: ${request.resources.joinToString()}")

            if (request.resources.contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE)) {
              if (ContextCompat.checkSelfPermission(reactContext, Manifest.permission.CAMERA)
                == PackageManager.PERMISSION_GRANTED) {
                Log.d("KanmonActivity", "Camera permission already granted, allowing WebView access")
                request.grant(request.resources)
              } else {
                Log.d("KanmonActivity", "Requesting camera permission from user")


                // Store callback with unique request code
                permissionCallbacks[CAMERA_PERMISSION_REQUEST_CODE] = { granted ->
                  if (granted) {
                    request.grant(request.resources)
                  } else {
                    request.deny()
                  }
                }

                try {
                  ActivityCompat.requestPermissions(
                    this@KanmonActivity,
                    arrayOf(Manifest.permission.CAMERA),
                    CAMERA_PERMISSION_REQUEST_CODE
                  )
                  Log.d("KanmonActivity", "Requested camera permission from system")
                } catch (e: Exception) {
                  Log.e("KanmonActivity", "Error requesting camera permission: ${e.message}", e)
                  permissionCallbacks.remove(CAMERA_PERMISSION_REQUEST_CODE)
                  request.deny()
                }
              }
            } else {
              Log.d("KanmonActivity", "Denying non-camera permission request")
              request.deny()
            }
          }

          override fun onShowFileChooser(
            webView: WebView?,
            filePathCallback: ValueCallback<Array<Uri>>?,
            fileChooserParams: FileChooserParams?
          ): Boolean {
            this@KanmonActivity.filePathCallback = filePathCallback

            try {
              getContent.launch("*/*")
            } catch (e: Exception) {
              Log.e("KanmonActivity", "Error launching file chooser: ${e.message}", e)
              filePathCallback?.onReceiveValue(null)
              return false
            }

            return true
          }

          // This is needed to handle target="_blank" (e.g. view invoices)
          override fun onCreateWindow(
            view: WebView?,
            isDialog: Boolean,
            isUserGesture: Boolean,
            resultMsg: Message?
          ): Boolean {
            val newWebView = WebView(this@KanmonActivity).apply {
                settings.apply {
                    javaScriptEnabled = true
                    domStorageEnabled = true
                }
            }

            val transport = resultMsg?.obj as? WebView.WebViewTransport
            transport?.webView = newWebView
            resultMsg?.sendToTarget()

            return true
          }
        }

        webViewClient = object : WebViewClient() {
          override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
            super.onPageStarted(view, url, favicon)
            isWebViewLoaded = false
          }

          override fun onPageFinished(view: WebView?, url: String?) {
            super.onPageFinished(view, url)

            val javascript = """
                            (function() {
                                window.postMessage = function(data) {
                                    window.ReactNative.postMessage(typeof data === 'string' ? data : JSON.stringify(data));
                                };
                            })();
                        """.trimIndent()
            view?.evaluateJavascript(javascript, null)
          }
        }

        // TODO - undo this
        WebView.setWebContentsDebuggingEnabled(true)

        // This adds a field called "ReactNative" to the window object.
        addJavascriptInterface(WebViewJSInterface(reactContext) {
            message ->
              // TODO: handle other events here other than hide
              try {
                val jsonObject = org.json.JSONObject(message)
                val action = jsonObject.getString("action")

                when (action) {
                  "HIDE" -> dialog?.dismiss()
                  "MESSAGING_READY" -> {
                    isWebViewLoaded = true
                    // Process any queued messages
                    if (messageQueue.isNotEmpty()) {
                      messageQueue.forEach {
                        sendMessageToWebView(it) }
                      messageQueue.clear()
                    }
                  }
                }
              } catch (e: Exception) {
                Log.e("KanmonActivity", "Failed to parse message as JSON: $message")
              }
        }, "ReactNative")
      }


      Log.d("Kanmon", "starting webview with $url")
      webView?.loadUrl(url)
    }

    return webView!!
  }

  override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<String>, grantResults: IntArray) {
    super.onRequestPermissionsResult(requestCode, permissions, grantResults)

    Log.d("KanmonActivity", "onRequestPermissionsResult called with requestCode: $requestCode")

    val callback = permissionCallbacks.remove(requestCode)
    if (callback != null) {
      val granted = grantResults.isNotEmpty() &&
                   grantResults[0] == PackageManager.PERMISSION_GRANTED

      runOnUiThread {
        callback(granted)
      }
    } else {
      Log.w("KanmonActivity", "Received permission result for unknown requestCode: $requestCode")
    }
  }


  fun deleteWebView() {
    synchronized(webViewLock) {
      runOnUiThread {
        if (webView == null) {
          Log.d("KanmonActivity", "Cannot stop Kanmon because it is not started.")
          return@runOnUiThread
        }

        // Clean up dialog first
        dialog?.dismiss()
        dialog = null

        webView?.let { view ->
          view.parent?.let { parent ->
            (parent as ViewGroup).removeView(view)
          }

          // Clear history and cache
          view.clearHistory()

          // Load blank page to stop any running processes
          view.loadUrl("about:blank")

          // Destroy the WebView - this is crucial for proper cleanup
          view.destroy()

          // Clear the reference - object becomes eligible for GC
          webView = null
        }
      }
    }

    Log.d("KanmonActivity", "Kanmon WebView stopped.")
  }
}
