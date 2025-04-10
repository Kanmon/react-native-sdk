import Foundation
import React
import WebKit

@objc(KanmonModule)
class KanmonModule: RCTEventEmitter {
  
  private var webView: WKWebView?
  private var webViewController: UIViewController?
  
  override func supportedEvents() -> [String]! {
    return ["onWebViewMessage"]
  }
  
  @objc(show:)
  func show(_ args: String) -> Void {
    print("args: \(args)")
  }

  @objc(start:)
  func start(url: String) -> Void {
    DispatchQueue.main.async {
      // Create a WebView configuration
      let configuration = WKWebViewConfiguration()
      configuration.userContentController.add(self, name: "kanmonBridge")
      
      // Create the WebView
      let webView = WKWebView(frame: .zero, configuration: configuration)
      webView.navigationDelegate = self
      self.webView = webView
      
      // Create a view controller to hold the WebView
      let viewController = UIViewController()
      viewController.view = webView
      self.webViewController = viewController
      
      // Load the URL
      if let url = URL(string: url) {
        let request = URLRequest(url: url)
        webView.load(request)
      }
      
      // Present the view controller modally
      if let rootViewController = UIApplication.shared.keyWindow?.rootViewController {
        rootViewController.present(viewController, animated: true, completion: nil)
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
      // Forward the message to React Native
      self.sendEvent(withName: "onWebViewMessage", body: message.body)
    }
  }
}
