package com.kanmon.reactnativesdk

import android.webkit.JavascriptInterface
import com.facebook.react.bridge.ReactContext
import com.facebook.react.modules.core.DeviceEventManagerModule

class WebViewJSInterface(
    private val reactContext: ReactContext,
    private val onMessage: (message: String) -> Unit
) {
  @JavascriptInterface
  fun postMessage(message: String) {
    onMessage(message)

    // Emit to React Native
    reactContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit("onWebViewMessage", message)
  }
}
