import Foundation
import React

@objc(KanmonModule)
class KanmonModule: RCTEventEmitter {
  
  override func supportedEvents() -> [String]! {
    return ["onWebViewMessage"]
  }
  
  @objc(show:)
  func show(_ args: String) -> Void {
    print("args: \(args)")
  }

  @objc(start:)
  func start(url: String) -> Void {
    print("Starting with URL: \(url)")
  }

  @objc(stop)
  func stop() -> Void {
    // TODO: Implement stop functionality
  }
}
