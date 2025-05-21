import { ExternalDrawRequestDTO, ExternalInvoiceDTO } from './General.types'
import type { UserStateWithActionMessage } from './OnEventCallbackEvent.types'

export enum ReceivedFromKanmonActions {
  HIDE = 'HIDE',
  WORKFLOW_UPDATED_V2 = 'WORKFLOW_UPDATED_V2',
  ERROR = 'ERROR',
  MESSAGING_READY = 'MESSAGING_READY',
  USER_CONFIRMED_INVOICE = 'USER_CONFIRMED_INVOICE',
  INVOICES_ALREADY_CONFIRMED = 'INVOICES_ALREADY_CONFIRMED',
  USER_CONFIRMED_DRAW_REQUEST = 'USER_CONFIRMED_DRAW_REQUEST',
}

interface BaseReceivedFromKanmonMessage {
  action: ReceivedFromKanmonActions
}

export enum ErrorType {
  INVALID_SESSION_TOKEN_EXCEPTION = 'INVALID_SESSION_TOKEN_EXCEPTION',
  UNEXPECTED_ERROR = 'UNEXPECTED_ERROR',
  CUSTOM_INITIALIZATION_NAME_NOT_FOUND = 'CUSTOM_INITIALIZATION_NAME_NOT_FOUND',
}

// Messages from widget -> parent
export interface HideMessage extends BaseReceivedFromKanmonMessage {
  action: ReceivedFromKanmonActions.HIDE
}

export interface WorkflowUpdatedMessageV2
  extends BaseReceivedFromKanmonMessage {
  action: ReceivedFromKanmonActions.WORKFLOW_UPDATED_V2
  data: UserStateWithActionMessage
}

export interface ErrorMessage extends BaseReceivedFromKanmonMessage {
  action: ReceivedFromKanmonActions.ERROR
  errorType: ErrorType
  message: string
}

export interface MessagingReadyMessage extends BaseReceivedFromKanmonMessage {
  action: ReceivedFromKanmonActions.MESSAGING_READY
}

export interface UserConfirmedInvoiceMessage
  extends BaseReceivedFromKanmonMessage {
  action: ReceivedFromKanmonActions.USER_CONFIRMED_INVOICE
  data: {
    invoice: ExternalInvoiceDTO
    remainingLimitCents: number
  }
}

export interface InvoicesAlreadyConfirmedMessage {
  action: ReceivedFromKanmonActions.INVOICES_ALREADY_CONFIRMED
  data: {
    invoices: ExternalInvoiceDTO[]
  }
}

export interface UserConfirmedDrawRequestMessage
  extends BaseReceivedFromKanmonMessage {
  action: ReceivedFromKanmonActions.USER_CONFIRMED_DRAW_REQUEST
  data: {
    drawRequest: ExternalDrawRequestDTO
    remainingLimitCents: number
  }
}

export type ReceivedFromKanmonMessage =
  | HideMessage
  | WorkflowUpdatedMessageV2
  | MessagingReadyMessage
  | ErrorMessage
  | UserConfirmedInvoiceMessage
  | InvoicesAlreadyConfirmedMessage
  | UserConfirmedDrawRequestMessage
