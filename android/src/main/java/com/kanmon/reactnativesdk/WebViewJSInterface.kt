package com.kanmon.reactnativesdk

import android.webkit.JavascriptInterface
import com.facebook.react.bridge.ReactContext
import com.facebook.react.modules.core.DeviceEventManagerModule

class WebViewJSInterface(
    private val onMessage: (message: String) -> Unit,
    private val handleDownload: (base64DataUrl: String, fileName: String) -> Unit
) {
  @JavascriptInterface
  fun postMessage(message: String) {
    onMessage(message)
  }



  @JavascriptInterface
  fun downloadBase64File(base64DataUrl: String, fileName: String) {
    handleDownload(base64DataUrl, fileName)
  }
}
