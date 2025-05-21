import { type EmitterSubscription } from 'react-native'
import KanmonModule, { WebViewEventEmitter } from './KanmonModule'
import { OnEventCallbackEventType } from './types/OnEventCallbackEvent.types'
import {
  ReceivedFromKanmonActions,
  type ReceivedFromKanmonMessage,
} from './types/ReceivedFromBizexMessages.types'
import {
  SentToKanmonConnectActions,
  type SentToKanmonConnectMessage,
} from './types/SentToKanmonConnectMessage.types'
import {
  ExternalProductType,
  KanmonConnectComponent,
  KanmonConnectEnviroment,
  type KanmonConnectParams,
} from './types/types'

export * from './types/General.types'
export * from './types/OnEventCallbackEvent.types'
export * from './types/ReceivedFromBizexMessages.types'
export * from './types/SentToKanmonConnectMessage.types'
export * from './types/types'

const validateParams = ({ connectToken }: KanmonConnectParams) => {
  if (!connectToken || typeof connectToken !== 'string') {
    throw new Error('connect token must be defined')
  }
}

const validateShowArgs = (showArgs: ShowArgs) => {
  const { component, sessionToken } = showArgs
  const allComponents = Object.values(KanmonConnectComponent)
  if (component && !allComponents.includes(component)) {
    throw new Error(`Component ${component} must be one of ${allComponents}.`)
  }

  if (sessionToken && typeof sessionToken !== 'string') {
    throw new Error(`sessionToken must be a string.`)
  }

  const componentsThatRequireSessionToken = [
    KanmonConnectComponent.SESSION_INVOICE_FLOW,
    KanmonConnectComponent.SESSION_INVOICE_FLOW_WITH_INVOICE_FILE,
    KanmonConnectComponent.SESSION_ACCOUNTS_PAYABLE_INVOICE_FLOW,
    KanmonConnectComponent.SESSION_ACCOUNTS_PAYABLE_INVOICE_FLOW_WITH_INVOICE_FILE,
  ]

  if (
    component &&
    componentsThatRequireSessionToken.includes(component) &&
    !sessionToken
  ) {
    throw new Error(`sessionToken must be a string.`)
  }
}

const buildUrl = ({
  connectToken,
  baseUrl,
  customInitializationName,
  productSubsetDuringOnboarding,
}: {
  connectToken: string
  baseUrl: string
  customInitializationName?: string
  productSubsetDuringOnboarding?: ExternalProductType[]
}) => {
  const urlParams: Record<string, string> = {
    connectToken,
    disableModalTransition: 'true',
    ...(customInitializationName ? { customInitializationName } : {}),
  }

  customInitializationName &&
    (urlParams.customInitializationName = customInitializationName)

  if (
    productSubsetDuringOnboarding &&
    productSubsetDuringOnboarding.length > 0
  ) {
    urlParams.productSubsetDuringOnboarding =
      productSubsetDuringOnboarding.join(',')
  }

  const queryString = Object.entries(urlParams)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
    )
    .join('&')

  return `${baseUrl}/connect?${queryString}`
}

let subscription: EmitterSubscription | null = null

interface ShowArgs {
  component?: KanmonConnectComponent
  sessionToken?: string
}

const nativeSdk = {
  start(params: KanmonConnectParams) {
    validateParams(params)

    const kanmonEnvToUrl = {
      [KanmonConnectEnviroment.production]: 'https://connect.kanmon.com',
      [KanmonConnectEnviroment.sandbox]: 'https://connect.kanmon.dev',
      staging: 'https://connect.concar.dev',
      // This needs to be 10.0.2.2 for Android emulator
      development: 'http://localhost:4200',
    }

    const baseUrl =
      kanmonEnvToUrl[params.environment || KanmonConnectEnviroment.production]

    const url = buildUrl({
      connectToken: params.connectToken,
      baseUrl,
      customInitializationName: params.customInitializationName,
      productSubsetDuringOnboarding: params.productSubsetDuringOnboarding,
    })

    console.log('startKanmon', url)

    KanmonModule.start(url)

    subscription?.remove()

    // Set up WebView message listener first
    subscription = WebViewEventEmitter.addListener(
      'onWebViewMessage',
      (message) => {
        const data: ReceivedFromKanmonMessage = JSON.parse(message)

        console.log('DATA', data)

        switch (data.action) {
          case ReceivedFromKanmonActions.HIDE:
            params.onEvent?.({
              eventType: OnEventCallbackEventType.HIDE,
            })
            break
          case ReceivedFromKanmonActions.WORKFLOW_UPDATED_V2:
            params.onEvent?.({
              eventType: OnEventCallbackEventType.USER_STATE_CHANGED,
              data: data.data,
            })
            break
          case ReceivedFromKanmonActions.ERROR:
            params.onError?.({
              errorType: data.errorType,
              message: data.message,
            })
            break
          case ReceivedFromKanmonActions.USER_CONFIRMED_INVOICE:
            params.onEvent?.({
              eventType: OnEventCallbackEventType.USER_CONFIRMED_INVOICE,
              data: data.data,
            })
            break
          case ReceivedFromKanmonActions.INVOICES_ALREADY_CONFIRMED:
            params.onEvent?.({
              eventType: OnEventCallbackEventType.INVOICES_ALREADY_CONFIRMED,
              data: data.data,
            })
            break
          case ReceivedFromKanmonActions.USER_CONFIRMED_DRAW_REQUEST:
            params.onEvent?.({
              eventType: OnEventCallbackEventType.USER_CONFIRMED_DRAW_REQUEST,
              data: data.data,
            })
            break
        }
      },
    )
  },

  show(showArgs: ShowArgs = {}) {
    validateShowArgs(showArgs)

    const args: SentToKanmonConnectMessage = {
      action: SentToKanmonConnectActions.SHOW_KANMON_CONNECT,
      ...showArgs,
    }

    KanmonModule.show(JSON.stringify(args))
  },

  stop() {
    KanmonModule.stop()
    subscription?.remove()
  },
}

export default nativeSdk
