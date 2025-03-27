package com.kanmon.reactnativesdk

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class KanmonModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  override fun getName() = "KanmonModule"

  /**
   * Preload the WebView. This makes it so that it'll load
   * instantaneously when showModal is called later on.
   */
  @ReactMethod
  fun start(url: String) {
    val activity = currentActivity as? KanmonActivity ?: return
    activity.runOnUiThread {
      activity.initializeWebView(reactContext, url)
    }
  }

  @ReactMethod
  fun show(showArgs: String) {
    val activity = (currentActivity as? KanmonActivity) ?: return
    activity.showModal(showArgs)
  }

  @ReactMethod
  fun stop() {
    val activity = (currentActivity as? KanmonActivity) ?: return

    activity.deleteWebView()

  }
}
