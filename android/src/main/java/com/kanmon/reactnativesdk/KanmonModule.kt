package com.kanmon.reactnativesdk

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import androidx.fragment.app.FragmentActivity
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.PermissionListener

class KanmonModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext),
  PermissionListener
{
  override fun getName() = "KanmonModule"

  private var webViewDialogFragment: WebViewDialogFragment? = null

  /**
   * Preload the WebView. This makes it so that it'll load
   * instantaneously when showModal is called later on.
   */
  @ReactMethod
  fun start(url: String) {
//    val activity = currentActivity as? KanmonActivity ?: return
//    activity.runOnUiThread {
//      activity.initializeWebView(reactContext, url)
//  }

    println("calling start in module")
    val activity = currentActivity as? FragmentActivity ?: return
    println("activity is $activity")

    if (webViewDialogFragment == null) {
      webViewDialogFragment = WebViewDialogFragment(reactContext).apply {
        arguments = Bundle().apply { putString("url", url) }

      }
    }

    activity.runOnUiThread{
      webViewDialogFragment?.initializeWebView(reactContext, url)
    }

//    activity.runOnUiThread{
//      activity.supportFragmentManager.beginTransaction().add(webViewDialogFragment!!, "WebViewDialog").commitNow()
//    }


//activity.runOnUiThread {
//  webViewDialogFragment?.show(
//    activity.supportFragmentManager,
//    "WebViewDialog"
//  )
//}

    println("built the web view dialog fragment.")
  }

  @ReactMethod
  fun show(showArgs: String) {
//    val activity = (currentActivity as? KanmonActivity) ?: return
//    activity.showModal(showArgs)

    val activity = currentActivity as? FragmentActivity ?: return

    val fragmentManager = activity.supportFragmentManager

    activity.runOnUiThread {
      if (webViewDialogFragment?.dialog == null) {
        webViewDialogFragment?.show(fragmentManager, "WebViewDialog")
      } else {
        webViewDialogFragment?.dialog?.show()
      }
    }

  }

  @ReactMethod
  fun stop() {
    val activity = (currentActivity as? KanmonActivity) ?: return

    activity.deleteWebView()
  }

  override fun onRequestPermissionsResult(
    requestCode: Int,
    permissions: Array<String>,
    grantResults: IntArray
  ): Boolean {
    TODO("Not yet implemented")
  }

//  override fun onRequestPermissionsResult(activity: Activity?, requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
//
}
