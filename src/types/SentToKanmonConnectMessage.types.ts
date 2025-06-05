import { KanmonConnectComponent } from './types'

export enum SentToKanmonConnectActions {
  SHOW_KANMON_CONNECT = 'SHOW_KANMON_CONNECT',
}

export const SESSION_REQUIRED_COMPONENTS = [
  KanmonConnectComponent.SESSION_INVOICE_FLOW,
  KanmonConnectComponent.SESSION_INVOICE_FLOW_WITH_INVOICE_FILE,
  KanmonConnectComponent.SESSION_ACCOUNTS_PAYABLE_INVOICE_FLOW,
  KanmonConnectComponent.SESSION_ACCOUNTS_PAYABLE_INVOICE_FLOW_WITH_INVOICE_FILE,
] as const

type SessionRequiredComponents = (typeof SESSION_REQUIRED_COMPONENTS)[number]

export const isShowKanmonConnectMessageWithSessionToken = (
  message: ShowKanmonConnectMessage,
): message is ShowKanmonConnectMessageWithSessionToken => {
  return SESSION_REQUIRED_COMPONENTS.includes(
    (message as ShowKanmonConnectMessageWithSessionToken).component,
  )
}

export interface ShowKanmonConnectMessageWithSessionToken {
  sessionToken: string
  component: SessionRequiredComponents
}

export interface ShowKanmonConnectMessageWithPayNow {
  component: KanmonConnectComponent.PAY_NOW
  invoiceId?: string
  platformInvoiceId?: string
}
type OtherComponents = Exclude<
  KanmonConnectComponent,
  SessionRequiredComponents | KanmonConnectComponent.PAY_NOW
>

export interface ShowKanmonConnectMessageOtherComponents {
  component?: OtherComponents
}

export type ShowKanmonConnectMessage =
  | ShowKanmonConnectMessageWithSessionToken
  | ShowKanmonConnectMessageWithPayNow
  | ShowKanmonConnectMessageOtherComponents

export type SentToKanmonConnectMessage = ShowKanmonConnectMessage & {
  action: SentToKanmonConnectActions.SHOW_KANMON_CONNECT
}
