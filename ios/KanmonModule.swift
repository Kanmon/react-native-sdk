import Foundation
import React
import WebKit
import UIKit

@objc(KanmonModule)
class KanmonModule: RCTEventEmitter {
  
  private let logger = OSLog(subsystem: "com.kanmon.sdk", category: "KanmonModule")
  private var webView: WKWebView?
  private var webViewController: UIViewController?
  
  override func supportedEvents() -> [String]! {
    return ["onWebViewMessage"]
  }
  
  @objc(show:)
  func show(_ args: String) -> Void {
  }

  @objc(start:)
  func start(url: String) -> Void {
    DispatchQueue.main.async {
      // Create a WebView configuration
      let configuration = WKWebViewConfiguration()
      configuration.userContentController.add(self, name: "kanmonBridge")
      
      // Inject JavaScript to intercept postMessage
      let script = WKUserScript(
        source: """
          window.postMessage = function(message, targetOrigin) {
            window.webkit.messageHandlers.kanmonBridge.postMessage(message);
          };
        """,
        injectionTime: .atDocumentStart,
        forMainFrameOnly: false
      )
      configuration.userContentController.addUserScript(script)
      
      // Create the WebView with full screen bounds
      let webView = WKWebView(frame: UIScreen.main.bounds, configuration: configuration)
      webView.navigationDelegate = self
      self.webView = webView
      
      // Create a view controller to hold the WebView
      let viewController = UIViewController()
      viewController.view = webView
      viewController.modalPresentationStyle = .fullScreen // Make it full screen
      self.webViewController = viewController
      
      // Load the URL
      if let url = URL(string: url) {
        let request = URLRequest(url: url)
        webView.load(request)
      }
      
      if let presentedViewController = RCTPresentedViewController() {
        presentedViewController.present(viewController, animated: true, completion: nil)
      }
    }
  }

  @objc(stop)
  func stop() -> Void {
    DispatchQueue.main.async {
      self.webViewController?.dismiss(animated: true, completion: nil)
      self.webView = nil
      self.webViewController = nil
    }
  }
}

extension KanmonModule: WKNavigationDelegate {
  func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
    // Allow all navigation
    decisionHandler(.allow)
  }
}

extension KanmonModule: WKScriptMessageHandler {
  func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
    if message.name == "kanmonBridge" {
      // Check if message body is empty string
      if let messageBody = message.body as? String, messageBody.isEmpty {
        return
      }

      
      // Convert message body to JSON string
      var jsonString: String?
      do {
        let jsonData = try JSONSerialization.data(withJSONObject: message.body, options: [])
        jsonString = String(data: jsonData, encoding: .utf8)
      } catch {
        return
      }
      
      guard let jsonString = jsonString else {
        return
      }
      
      // Forward the message to React Native
      self.sendEvent(withName: "onWebViewMessage", body: jsonString)
    }
  }
}
