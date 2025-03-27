import {KanmonConnectComponent} from './types';

interface BaseSentToKanmonConnectMessage {
  action: SentToKanmonConnectActions;
}

export enum SentToKanmonConnectActions {
  SHOW_KANMON_CONNECT = 'SHOW_KANMON_CONNECT',
}

// Callback was invoked
export interface ShowKanmonConnectMessage
  extends BaseSentToKanmonConnectMessage {
  action: SentToKanmonConnectActions.SHOW_KANMON_CONNECT;
  sessionToken?: string;
  component?: KanmonConnectComponent;
}

export type SentToKanmonConnectMessage = ShowKanmonConnectMessage;
