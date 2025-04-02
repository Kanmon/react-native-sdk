import { ErrorType } from './ReceivedFromBizexMessages.types'
import type { OnEventCallbackEvent } from './OnEventCallbackEvent.types'

export enum KanmonConnectComponent {
  SUMMARY = 'SUMMARY',
  SESSION_INVOICE_FLOW = 'SESSION_INVOICE_FLOW',
  SESSION_INVOICE_FLOW_WITH_INVOICE_FILE = 'SESSION_INVOICE_FLOW_WITH_INVOICE_FILE',
  SESSION_ACCOUNTS_PAYABLE_INVOICE_FLOW = 'SESSION_ACCOUNTS_PAYABLE_INVOICE_FLOW',
  SESSION_ACCOUNTS_PAYABLE_INVOICE_FLOW_WITH_INVOICE_FILE = 'SESSION_ACCOUNTS_PAYABLE_INVOICE_FLOW_WITH_INVOICE_FILE',
  UPLOAD_INVOICE = 'UPLOAD_INVOICE',
  DRAW_REQUEST = 'DRAW_REQUEST',
  INVOICE_HISTORY = 'INVOICE_HISTORY',
  PAY_NOW = 'PAY_NOW',
  DOWNLOAD_AGREEMENTS = 'DOWNLOAD_AGREEMENTS',
  PAYMENT_HISTORY = 'PAYMENT_HISTORY',
  STATEMENTS = 'STATEMENTS',
}

export interface ErrorEvent {
  errorType: ErrorType
  message: string
}

export enum KanmonConnectEnviroment {
  production = 'production',
  sandbox = 'sandbox',
}

export enum ExternalProductType {
  ACCOUNTS_PAYABLE_FINANCING = 'ACCOUNTS_PAYABLE_FINANCING',
  INVOICE_FINANCING = 'INVOICE_FINANCING',
  TERM_LOAN = 'TERM_LOAN',
  MCA = 'MCA',
  LINE_OF_CREDIT = 'LINE_OF_CREDIT',
  INTEGRATED_MCA = 'INTEGRATED_MCA',
}

export type KanmonConnectParams = {
  connectToken: string
  environment?: KanmonConnectEnviroment
  onEvent?: (event: OnEventCallbackEvent) => void
  onError?: (errorEvent: ErrorEvent) => void
  customInitializationName?: string
  productSubsetDuringOnboarding?: ExternalProductType[]
}
