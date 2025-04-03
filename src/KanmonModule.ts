import { NativeModules, NativeEventEmitter } from 'react-native'

const { KanmonModule } = NativeModules

interface KanmonModule {
  start(url: string): void
  show(showArgs: string): void
  sendEvent(eventName: string, eventData: string): void
  stop(): void
}

export const WebViewEventEmitter = new NativeEventEmitter(KanmonModule)

export default KanmonModule as KanmonModule
