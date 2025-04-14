import Foundation
import React
import WebKit
import UIKit
import AVFoundation

@objc(KanmonModule)
class KanmonModule: RCTEventEmitter {
  
  private let logger = OSLog(subsystem: "com.kanmon.sdk", category: "KanmonModule")
  private var webView: WKWebView?
  private var webViewController: UIViewController?
  private var messageQueue: [String] = []
  private var isWebViewLoaded: Bool = false


  override func supportedEvents() -> [String]! {
    return ["onWebViewMessage"]
  }
  
  @objc(show:)
  func show(_ args: String) -> Void {
    if webView == nil {
      os_log("Kanmon must be initialized before show is called.", log: logger, type: .debug)
      return
    }
    
    sendMessageToWebView(args)

    DispatchQueue.main.async {
      // If we already have a view controller, just present it
      if let viewController = self.webViewController {
        if let presentedViewController = RCTPresentedViewController() {
          presentedViewController.present(viewController, animated: true, completion: nil)
        }
      }
    }
  }

  private func sendMessageToWebView(_ eventData: String) {
    if !isWebViewLoaded {
      messageQueue.append(eventData)
      return
    }

    guard let webView = webView else { return }
    
    // Escape single quotes and create JavaScript string
    let escapedData = eventData.replacingOccurrences(of: "\\", with: "\\\\")
      .replacingOccurrences(of: "'", with: "\\'")
      .replacingOccurrences(of: "\n", with: "\\n")

    
    let javascript = """
      (function() {
        try {
          const event = new MessageEvent('message', { data: JSON.parse('\(escapedData)') });
          window.dispatchEvent(event);
        } catch (e) {
          console.error('Error dispatching event:', e);
        }
      })();
    """
    
    DispatchQueue.main.async {
      webView.evaluateJavaScript(javascript, completionHandler: nil)
    }
  }

  @objc(start:)
  func start(url: String) -> Void {
    DispatchQueue.main.async {
      // Create a WebView configuration
      let configuration = WKWebViewConfiguration()
      configuration.userContentController.add(self, name: "kanmonBridge")
      
      // Enable camera access for Persona
      configuration.allowsInlineMediaPlayback = true
      configuration.mediaTypesRequiringUserActionForPlayback = []
      
      // Enable window.open
      configuration.preferences.javaScriptCanOpenWindowsAutomatically = true
      
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

      // Inject JavaScript to override window.open
      let windowOpenScript = WKUserScript(
        source: """
        const og = window.open;
          window.open = function(url, target, features) {
            return og('https://storage.googleapis.com/business-document-uploads-staging/platform-document-uploads/invoices/886048d1-34a2-4e30-99ba-c6c502f8881c-blob?GoogleAccessId=staging-cdn%40aerobic-furnace-316818.iam.gserviceaccount.com&Expires=1744664908&Signature=1RBM6KxwsetWxYmRraUHKQRU131S5ij14a%2FfG7VD5XUtJeye5oNK0u5dNmvY99VcaJs7TaasluCs%2BHreM3eIMmRYvJRjNKf4ST4QDpC75W%2FB1xQmJ0DOZRjTVCyfGVkHyfwwskeYeqIZZarCxkgGAFgis0JKE%2F8%2FZJYeSghb3YBvMvwwsVkFFttg0NdQmTAOlydOImankI5NrMQfyNpbPNS4o2UoCrt14YEEU6ug%2Bgeas34vPS75h5HTAu7KyPnpa4hCn4qX15dRsH%2FJ6OJzaMDrWUtwghWVJwZE7bA4LlJu%2BRudKG9l%2Bj2B4IMB%2FafXgv0IM7V7hL9oYMsUrcNs%2Bw%3D%3D&response-content-disposition=attachment;filename=%22invoice.pdf%22', target, features);
          };
        """,
        injectionTime: .atDocumentStart,
        forMainFrameOnly: false
      )
      configuration.userContentController.addUserScript(windowOpenScript)
      
      // Create the WebView with full screen bounds
      let webView = WKWebView(frame: UIScreen.main.bounds, configuration: configuration)
      webView.navigationDelegate = self
      webView.uiDelegate = self
      self.webView = webView
      
      // Create a view controller to hold the WebView
      let viewController = UIViewController()
      viewController.view = webView
      viewController.modalPresentationStyle = .fullScreen
      self.webViewController = viewController
      
      // Load the URL
      if let url = URL(string: url) {
        let request = URLRequest(url: url)
        webView.load(request)
      }
    }
  }

  @objc(stop)
  func stop() -> Void {
    DispatchQueue.main.async {
      // Clean up the WebView
      if let webView = self.webView {
        // Stop any ongoing navigation
        webView.stopLoading()
        
        // Clear the navigation delegate
        webView.navigationDelegate = nil
        
        // Remove the message handler
        webView.configuration.userContentController.removeScriptMessageHandler(forName: "kanmonBridge")
        
        // Remove all user scripts
        webView.configuration.userContentController.removeAllUserScripts()
        
        // Clear the WebView
        webView.loadHTMLString("", baseURL: nil)
      }
      
      // Dismiss the view controller if it's presented
      self.webViewController?.dismiss(animated: true, completion: nil)
      
      // Clear references
      self.webView = nil
      self.webViewController = nil
    }
  }
}

extension KanmonModule: WKNavigationDelegate {
  func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
    decisionHandler(.allow)
  }

  func webView(_ webView: WKWebView, decidePolicyFor navigationResponse: WKNavigationResponse, decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
    let response = navigationResponse.response as? HTTPURLResponse
    let contentDisposition = response?.allHeaderFields["Content-Disposition"] as? String

    if let disposition = contentDisposition, disposition.contains("attachment") {
        // Extract filename from Content-Disposition
        var filename = response?.url?.lastPathComponent ?? "downloaded_file"
        if let filenameRange = disposition.range(of: "filename=\"(.*?)\"", options: .regularExpression) {
            filename = String(disposition[filenameRange])
                .replacingOccurrences(of: "filename=\"", with: "")
                .replacingOccurrences(of: "\"", with: "")
        }
        
        // File download detected
        if let url = response?.url {
            downloadFile(from: url, filename: filename)
        }

        decisionHandler(.cancel) // Prevent WebView from trying to render it
        return
    }
    decisionHandler(.allow)
  }



}

extension KanmonModule: WKScriptMessageHandler {
  func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
    if message.name == "kanmonBridge" {
      // Get the current webview URL domain
      guard let webView = webView else {
        return
      }
      
      let webViewDomain = webView.url?.host ?? "unknown"
      let messageDomain = message.frameInfo.securityOrigin.host ?? "unknown"
      
      if webViewDomain != messageDomain {
        return
      }
      
      // Check for HIDE and MESSAGING_READY actions
      if let dict = message.body as? NSDictionary,
         let action = dict["action"] as? String {
        switch action {
        case "HIDE":
          // Dismiss the modal but keep the WebView
          DispatchQueue.main.async {
            self.webViewController?.dismiss(animated: true, completion: nil)
          }
        case "MESSAGING_READY":
          isWebViewLoaded = true
          // Process any queued messages
          if !messageQueue.isEmpty {
            messageQueue.forEach { sendMessageToWebView($0) }
            messageQueue.removeAll()
          }
        default:
          break
        }
      }
      
      // Convert message body to JSON string
      var jsonString: String?
      do {
        // First check if we can serialize the message body
        if JSONSerialization.isValidJSONObject(message.body) {
          let jsonData = try JSONSerialization.data(withJSONObject: message.body, options: [])
          jsonString = String(data: jsonData, encoding: .utf8)
        }
      } catch {
        print("Error converting message to JSON: \(error)")
        return
      }
      
      guard let jsonString = jsonString else {
        print("Failed to convert message to string")
        return
      }
      
      // Forward the message to React Native
      self.sendEvent(withName: "onWebViewMessage", body: jsonString)
    }
  }
}

extension KanmonModule: WKUIDelegate {
  func downloadFile(from url: URL, filename: String) {
    let task = URLSession.shared.downloadTask(with: url) { localURL, response, error in
        guard let localURL = localURL else {
            print("Download error: \(String(describing: error))")
            return
        }

        let fileManager = FileManager.default
        let documentsURL = fileManager.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let destinationURL = documentsURL.appendingPathComponent(filename)

        do {
            if fileManager.fileExists(atPath: destinationURL.path) {
                try fileManager.removeItem(at: destinationURL)
            }
            try fileManager.moveItem(at: localURL, to: destinationURL)
            print("File saved to: \(destinationURL.path)")
            
            // Show share sheet on the main thread
            DispatchQueue.main.async {
                let activityViewController = UIActivityViewController(
                    activityItems: [destinationURL],
                    applicationActivities: nil
                )
                
                // Present the share sheet
                if let viewController = RCTPresentedViewController() {
                    activityViewController.popoverPresentationController?.sourceView = viewController.view
                    viewController.present(activityViewController, animated: true, completion: nil)
                }
            }
        } catch {
            print("File error: \(error)")
        }
      }

      task.resume()
  }

  // Called when Persona requests camera access
  func webView(_ webView: WKWebView, requestMediaCapturePermissionFor origin: WKSecurityOrigin, initiatedByFrame frame: WKFrameInfo, type: WKMediaCaptureType, decisionHandler: @escaping (WKPermissionDecision) -> Void) {
    if type == .camera {
      AVCaptureDevice.requestAccess(for: .video) { granted in
        DispatchQueue.main.async {
          decisionHandler(granted ? .grant : .deny)
        }
      }
    } else {
      decisionHandler(.deny)
    }
  }

  // Called when window.open is called
  func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
    guard let url = navigationAction.request.url else {
      return nil
    }


    DispatchQueue.main.async {
      // If it's a file download, then download the file
      let components = URLComponents(url: url, resolvingAgainstBaseURL: false)
      if let value = components?.queryItems?.first(where: { $0.name == "response-content-disposition" })?.value {
          // Check if this is an attachment
          guard value.lowercased().contains("attachment") else {
              return
          }
          
          // Extract filename if present
          var filename = "download"
          if let filenameMatch = value.range(of: "filename=([^;]+)", options: .regularExpression) {
              // Get the filename portion
              filename = String(value[filenameMatch].dropFirst(9))
              // Remove surrounding quotes if present
              filename = filename.trimmingCharacters(in: CharacterSet(charactersIn: "\"'"))
          }

          self.downloadFile(from: url, filename: filename)
          return
      }

      let newWebView = WKWebView(frame: UIScreen.main.bounds, configuration: configuration)
      newWebView.navigationDelegate = self
      newWebView.uiDelegate = self
      
      let newViewController = UIViewController()
      newViewController.view = newWebView
      newViewController.modalPresentationStyle = .fullScreen
      
      let closeButton = UIButton(type: .system)
      closeButton.setTitle("Close", for: .normal)
      closeButton.addAction(UIAction { [weak newViewController] _ in
        newViewController?.dismiss(animated: true, completion: nil)
      }, for: .touchUpInside)
      closeButton.frame = CGRect(
        x: UIScreen.main.bounds.width - 90,
        y: 50,
        width: 100,
        height: 40
      )
      newViewController.view.addSubview(closeButton)
      
      if let url = navigationAction.request.url {
        newWebView.load(URLRequest(url: url))
      }
      
      self.webViewController?.present(newViewController, animated: true, completion: nil)
    }
    
    return nil
  }
}
