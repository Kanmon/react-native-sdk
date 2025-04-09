import { NativeModules, NativeEventEmitter } from 'react-native'

const { KanmonModule } = NativeModules

interface KanmonModule {
  show(args: string): Promise<void>
  start(url: string): void
  sendEvent(eventName: string, eventData: string): void
  stop(): void
}

console.log('KanmonModule', KanmonModule)

export const WebViewEventEmitter = new NativeEventEmitter(KanmonModule)

export default KanmonModule as KanmonModule
