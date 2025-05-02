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
  func show(_ args: String) {
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
  func start(url: String) {
    DispatchQueue.main.async {
      // Create a WebView configuration
      let configuration = WKWebViewConfiguration()
      configuration.userContentController.add(self, name: "kanmonBridge")

      // Enable camera access for Persona
      configuration.allowsInlineMediaPlayback = true
      configuration.mediaTypesRequiringUserActionForPlayback = []

      // Enable window.open
      configuration.preferences.javaScriptCanOpenWindowsAutomatically = true

      // Inject JavaScript to override postMessage
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

      // Give the webview a custom user agent so we can identify it
      webView.customUserAgent = "KanmonIOSWebView \(UIDevice.current.systemVersion)"

      webView.uiDelegate = self
      self.webView = webView

      // Create a view controller to hold the WebView
      let viewController = UIViewController()
      let containerView = UIView()
      containerView.addSubview(webView)

      // Constraints to fill the safe area
      webView.translatesAutoresizingMaskIntoConstraints = false
      NSLayoutConstraint.activate([
          webView.topAnchor.constraint(equalTo: containerView.safeAreaLayoutGuide.topAnchor),
          webView.bottomAnchor.constraint(equalTo: containerView.bottomAnchor),
          webView.leadingAnchor.constraint(equalTo: containerView.leadingAnchor),
          webView.trailingAnchor.constraint(equalTo: containerView.trailingAnchor)
      ])

      containerView.backgroundColor = .white

      viewController.view = containerView
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
  func stop() {
    DispatchQueue.main.async {
      // Clean up the WebView
      if let webView = self.webView {
        // Stop any ongoing navigation
        webView.stopLoading()

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

extension KanmonModule: WKScriptMessageHandler {
    func downloadFile(fromBase64 base64String: String, filename: String) {
        // Parse data URI
        let dataParts = base64String.components(separatedBy: ",")
        guard dataParts.count == 2,
              let mimeTypeComponent = base64String.components(separatedBy: ":").dropFirst().first,
              let mimeType = mimeTypeComponent?.components(separatedBy: ";").first,
              let data = Data(base64Encoded: dataParts[1]) else {
            print("Invalid base64 data")
            return
        }

        let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent(filename)

        do {
            try data.write(to: tempURL)
            // Present share sheet
            let activityVC = UIActivityViewController(activityItems: [tempURL], applicationActivities: nil)
            if let viewController = RCTPresentedViewController() {
              activityVC.popoverPresentationController?.sourceView = viewController.view
              viewController.present(activityVC, animated: true)
            }
        } catch {
            os_log("Failed to write file: %{public}@", log: self.logger, type: .error, error.localizedDescription)
        }
    }

  func userContentController(
    _ userContentController: WKUserContentController,
    didReceive message: WKScriptMessage
  ) {
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
        case "DOWNLOAD_FILE":
          if let data = dict["data"] as? NSDictionary,
            let base64Blob = data["base64Blob"] as? String,
            let fileName = data["fileName"] as? String {
            downloadFile(fromBase64: base64Blob, filename: fileName)
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
        os_log(
          "Error converting message to JSON: %{public}@",
          log: self.logger,
          type: .error,
          error.localizedDescription
        )
        return
      }

      guard let jsonString = jsonString else {
        os_log("Failed to convert message to string", log: self.logger, type: .error)
        return
      }

      // Forward the message to React Native
      self.sendEvent(withName: "onWebViewMessage", body: jsonString)
    }
  }
}

extension KanmonModule: WKUIDelegate {
  // Called when Persona requests camera access
  func webView(
    _ webView: WKWebView,
    requestMediaCapturePermissionFor origin: WKSecurityOrigin,
    initiatedByFrame frame: WKFrameInfo,
    type: WKMediaCaptureType,
    decisionHandler: @escaping (WKPermissionDecision) -> Void
  ) {
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
  func webView(
    _ webView: WKWebView,
    createWebViewWith configuration: WKWebViewConfiguration,
    for navigationAction: WKNavigationAction,
    windowFeatures: WKWindowFeatures
  ) -> WKWebView? {
    guard let url = navigationAction.request.url else {
      return nil
    }

    DispatchQueue.main.async {
      let newWebView = WKWebView(frame: UIScreen.main.bounds, configuration: configuration)
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
