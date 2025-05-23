package com.kanmon.reactnativesdk

import android.Manifest
import android.app.Activity
import android.app.Dialog
import android.content.Intent
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
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener
import android.app.DownloadManager
import android.content.Context
import android.os.Environment
import android.webkit.CookieManager
import android.webkit.URLUtil
import android.widget.Toast

class KanmonModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), ActivityEventListener, PermissionListener {

  override fun getName(): String {
    return "KanmonModule"
  }

  companion object {
    private const val CAMERA_PERMISSION_REQUEST_CODE = 1001
    private const val FILE_PICKER_REQUEST_CODE = 1002
  }

  var webViewLock = Any()
  private var webView: WebView? = null

  private var dialog: Dialog? = null

  // I considered synchronizing this list, but could not think
  // of a race condition where it would be needed.
  private val messageQueue = mutableListOf<String>()
  private var isWebViewLoaded = false

  private var filePathCallback: ValueCallback<Array<Uri>>? = null
  private val permissionCallbacks = mutableMapOf<Int, (Boolean) -> Unit>()

  init {
    // This module extends ActivityEventListener so that we can implement
    // onActivityResult below to handle file uploads.
    reactContext.addActivityEventListener(this)
  }

  // This handles file upload.
  override fun onActivityResult(
      activity: Activity?,
      requestCode: Int,
      resultCode: Int,
      data: Intent?
  ) {
    if (requestCode == FILE_PICKER_REQUEST_CODE) {
      val uri: Uri? = data?.data

      if (uri != null) {
        filePathCallback?.onReceiveValue(arrayOf(uri))
      } else {
        filePathCallback?.onReceiveValue(null)
      }
      filePathCallback = null
    }
  }

  override fun onNewIntent(p0: Intent?) {
    // noop
  }

  private fun showModal(showArgs: String) {
    synchronized(webViewLock) {
      if (webView == null) {
        Log.w(name, "Kanmon must be initialized before show is called.")
        return
      }

      sendMessageToWebView(showArgs)

      // Create dialog if it doesn't exist
      if (dialog == null) {
        dialog =
            Dialog(currentActivity!!, android.R.style.Theme_NoTitleBar_Fullscreen).apply {
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
            systemBarsBehavior =
                android.view.WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
          }
        } else {
          // For older Android versions (pre-Android 11)
          @Suppress("DEPRECATION")
          decorView.systemUiVisibility =
              (android.view.View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
                  android.view.View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
                  android.view.View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION or
                  android.view.View.SYSTEM_UI_FLAG_FULLSCREEN or
                  android.view.View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
                  android.view.View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY)
        }
      }

      container?.addView(webView)

      dialog?.show()
    }
  }

  private fun sendMessageToWebView(eventData: String) {
    if (!isWebViewLoaded) {
      messageQueue.add(eventData)
      return
    }

    val webView = webView ?: return

    // Create a JavaScript string that dispatches a custom event
    val escapedData = eventData.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n")

    val javascript =
        """
                (function() {
                    try {
                        const event = new MessageEvent('message', { data: JSON.parse('$escapedData') });
                        window.dispatchEvent(event);
                    } catch (e) {
                        console.error('Error dispatching event:', e);
                    }
                })();
            """
            .trimIndent()

    webView.evaluateJavascript(javascript, null)
  }

  private fun initializeWebView(url: String): WebView {
    synchronized(webViewLock) {

      // Remove the existing WebView if it exists
      webView?.let { deleteWebView() }

      webView =
          WebView(currentActivity!!).apply {
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

            webChromeClient =
                object : WebChromeClient() {
                  // This is needed for Persona.
                  override fun onPermissionRequest(request: PermissionRequest) {
                    Log.d(
                        "KanmonModule",
                        "Permission request received: ${request.resources.joinToString()}")

                    if (request.resources.contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE)) {
                      if (ContextCompat.checkSelfPermission(
                          reactContext, Manifest.permission.CAMERA) ==
                          PackageManager.PERMISSION_GRANTED) {
                        Log.d(
                            "KanmonModule",
                            "Camera permission already granted, allowing WebView access")
                        request.grant(request.resources)
                      } else {
                        Log.d("KanmonModule", "Requesting camera permission from user")

                        // Store callback with unique request code
                        permissionCallbacks[CAMERA_PERMISSION_REQUEST_CODE] = { granted ->
                          if (granted) {
                            request.grant(request.resources)
                          } else {
                            request.deny()
                          }
                        }

                        try {
                          val activity =
                              currentActivity as? PermissionAwareActivity
                                  ?: run {
                                    return
                                  }

                          activity.requestPermissions(
                              arrayOf(android.Manifest.permission.CAMERA),
                              CAMERA_PERMISSION_REQUEST_CODE,
                              this@KanmonModule)

                          Log.d("KanmonModule", "Requested camera permission from system")
                        } catch (e: Exception) {
                          Log.e(
                              "KanmonModule", "Error requesting camera permission: ${e.message}", e)
                          permissionCallbacks.remove(CAMERA_PERMISSION_REQUEST_CODE)
                          request.deny()
                        }
                      }
                    } else {
                      Log.d("KanmonModule", "Denying non-camera permission request")
                      request.deny()
                    }
                  }

                  override fun onShowFileChooser(
                      webView: WebView?,
                      filePathCallback: ValueCallback<Array<Uri>>?,
                      fileChooserParams: FileChooserParams?
                  ): Boolean {
                    this@KanmonModule.filePathCallback = filePathCallback

                    try {
                      val intent =
                          Intent(Intent.ACTION_GET_CONTENT).apply {
                            type = "*/*"
                            addCategory(Intent.CATEGORY_OPENABLE)
                          }

                      currentActivity?.startActivityForResult(
                          Intent.createChooser(intent, "Select File"), FILE_PICKER_REQUEST_CODE)
                    } catch (e: Exception) {
                      Log.e("KanmonModule", "Error launching file chooser: ${e.message}", e)
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
                    val newWebView =
                        WebView(currentActivity!!).apply {
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

            webViewClient =
                object : WebViewClient() {
                  override fun onPageStarted(
                      view: WebView?,
                      url: String?,
                      favicon: android.graphics.Bitmap?
                  ) {
                    super.onPageStarted(view, url, favicon)
                    isWebViewLoaded = false
                  }

                  override fun onPageFinished(view: WebView?, url: String?) {
                    super.onPageFinished(view, url)

                    val javascript =
                        """
                            (function() {
                                window.postMessage = function(data) {
                                    window.ReactNative.postMessage(typeof data === 'string' ? data : JSON.stringify(data));
                                };
                            })();
                        """
                            .trimIndent()
                    view?.evaluateJavascript(javascript, null)
                  }
                }

            // This adds a field called "ReactNative" to the window object in the WebView.
            addJavascriptInterface(
                WebViewJSInterface(reactContext) { message ->
                  try {
                    val jsonObject = org.json.JSONObject(message)
                    val action = jsonObject.getString("action")

                    // Note these events are handled on the React Native side. Just handling
                    // these here because they have to do with things happening on the Android side.
                    when (action) {
                      "HIDE" -> dialog?.dismiss()
                      "MESSAGING_READY" -> {
                        isWebViewLoaded = true
                        // Process any queued messages
                        if (messageQueue.isNotEmpty()) {
                          messageQueue.forEach { sendMessageToWebView(it) }
                          messageQueue.clear()
                        }
                      }
                    }
                  } catch (e: Exception) {
                    Log.e("KanmonModule", "Failed to parse message as JSON: $message")
                  }
                },
                "ReactNative")
          }

      Log.d("Kanmon", "starting webview with $url")
      webView?.loadUrl(url)
    }

                      WebView.setWebContentsDebuggingEnabled(true)

    return webView!!
  }

  override fun onRequestPermissionsResult(
      requestCode: Int,
      permissions: Array<String>,
      grantResults: IntArray
  ): Boolean {
    Log.d(
        "KanmonModule",
        "onRequestPermissionsResult called with requestCode: $requestCode, ${grantResults}")

    val callback = permissionCallbacks.remove(requestCode)

    if (callback != null) {
      val granted =
          grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED

      currentActivity?.runOnUiThread { callback(granted) }
      return true
    } else {
      Log.w("KanmonModule", "Received permission result for unknown requestCode: $requestCode")
      return false
    }
  }

  private fun deleteWebView() {
    synchronized(webViewLock) {
      if (webView == null) {
        Log.d("KanmonModule", "Cannot stop Kanmon because it is not started.")
        return
      }

      // Clean up dialog first
      dialog?.dismiss()
      dialog = null

      webView?.let { view ->
        view.parent?.let { parent -> (parent as ViewGroup).removeView(view) }

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

    Log.d("KanmonModule", "Kanmon WebView stopped.")
  }

  @ReactMethod
  fun start(url: String) {
    currentActivity?.runOnUiThread { initializeWebView(url) }
  }

  @ReactMethod
  fun show(showArgs: String) {
    currentActivity?.runOnUiThread { showModal(showArgs) }
  }

  @ReactMethod
  fun stop() {
    currentActivity?.runOnUiThread { deleteWebView() }
  }
}
