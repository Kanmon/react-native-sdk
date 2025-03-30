import {
  ExternalDrawRequestDTO,
  ExternalInvoiceDTO,
  type Section,
} from './General.types';

/**
 * Enumerated event type
 * START_FLOW: The user has not started the flow yet
 * USER_INPUT_REQUIRED: There are additional steps for the user to complete before
 *                      we evaluate them for financial product(s)
 * VIEW_OFFERS: Offers for financial product(s) are available to be viewed
 */
export type UserState =
  | 'START_FLOW'
  | 'IN_MANUAL_REVIEW'
  | 'OTHER_USER_INPUT_REQUIRED'
  | 'USER_INPUT_REQUIRED'
  | 'WAITING_FOR_OFFERS'
  | 'NO_OFFERS_EXTENDED'
  | 'OFFERS_EXPIRED'
  | 'VIEW_OFFERS'
  | 'OFFER_ACCEPTED'
  | 'SERVICING'
  | 'LOAN_APPLICATION_INCOMPLETE'
  | 'LOAN_APPLICATION_WITHDRAWN';

export interface UserStateWithActionMessage {
  userState: UserState;
  actionMessage: string;
  actionRequired: boolean;
  section: Section;
}

export enum OnEventCallbackEventType {
  'USER_STATE_CHANGED' = 'USER_STATE_CHANGED',
  'USER_CONFIRMED_INVOICE' = 'USER_CONFIRMED_INVOICE',
  'INVOICES_ALREADY_CONFIRMED' = 'INVOICES_ALREADY_CONFIRMED',
  'USER_CONFIRMED_DRAW_REQUEST' = 'USER_CONFIRMED_DRAW_REQUEST',
  'HIDE' = 'HIDE',
}

interface BaseOnEventCallbackEvent {
  eventType: OnEventCallbackEventType;
}

interface UserStateChangedEvent extends BaseOnEventCallbackEvent {
  eventType: OnEventCallbackEventType.USER_STATE_CHANGED;
  data: UserStateWithActionMessage;
}

interface UserConfirmedInvoiceEvent extends BaseOnEventCallbackEvent {
  eventType: OnEventCallbackEventType.USER_CONFIRMED_INVOICE;
  data: {
    remainingLimitCents: number;
    invoice: ExternalInvoiceDTO;
  };
}

interface UserConfirmedDrawRequestEvent extends BaseOnEventCallbackEvent {
  eventType: OnEventCallbackEventType.USER_CONFIRMED_DRAW_REQUEST;
  data: {
    drawRequest: ExternalDrawRequestDTO;
    remainingLimitCents: number;
  };
}

interface HideEvent extends BaseOnEventCallbackEvent {
  eventType: OnEventCallbackEventType.HIDE;
}

interface InvoicesAlreadyConfirmedEvent extends BaseOnEventCallbackEvent {
  eventType: OnEventCallbackEventType.INVOICES_ALREADY_CONFIRMED;
  data: {
    invoices: ExternalInvoiceDTO[];
  };
}

export type OnEventCallbackEvent =
  | UserStateChangedEvent
  | UserConfirmedInvoiceEvent
  | UserConfirmedDrawRequestEvent
  | HideEvent
  | InvoicesAlreadyConfirmedEvent;
