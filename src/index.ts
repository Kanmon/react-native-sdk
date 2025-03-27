import { type EmitterSubscription } from 'react-native';
import KanmonModule, { WebViewEventEmitter } from './KanmonModule';
import {
  type AllSteps,
  type Section,
  type WorkflowStep,
} from './types/General.types';
import {
  OnEventCallbackEventType,
  type UserStateWithActionMessage,
} from './types/OnEventCallbackEvent.types';
import {
  ReceivedFromKanmonActions,
  type ReceivedFromKanmonMessage,
} from './types/ReceivedFromBizexMessages.types';
import {
  ExternalProductType,
  KanmonConnectComponent,
  KanmonConnectEnviroment,
  type KanmonConnectParams,
} from './types/types';

const validateParams = ({ connectToken }: KanmonConnectParams) => {
  if (!connectToken || typeof connectToken !== 'string') {
    throw new Error('connect token must be defined');
  }
};

const validateShowArgs = (showArgs: ShowArgs) => {
  const { component, sessionToken } = showArgs;
  const allComponents = Object.values(KanmonConnectComponent);
  if (component && !allComponents.includes(component)) {
    throw new Error(`Component ${component} must be one of ${allComponents}.`);
  }

  if (sessionToken && typeof sessionToken !== 'string') {
    throw new Error(`sessionToken must be a string.`);
  }

  const componentsThatRequireSessionToken = [
    KanmonConnectComponent.SESSION_INVOICE_FLOW,
    KanmonConnectComponent.SESSION_INVOICE_FLOW_WITH_INVOICE_FILE,
    KanmonConnectComponent.SESSION_ACCOUNTS_PAYABLE_INVOICE_FLOW,
    KanmonConnectComponent.SESSION_ACCOUNTS_PAYABLE_INVOICE_FLOW_WITH_INVOICE_FILE,
  ];

  if (
    component &&
    componentsThatRequireSessionToken.includes(component) &&
    !sessionToken
  ) {
    throw new Error(`sessionToken must be a string.`);
  }
};

const stepToUserState = (
  step: AllSteps,
  section: Section
): UserStateWithActionMessage => {
  switch (step) {
    case 'BLOCKED_ON_PRIMARY_OWNER':
      return {
        actionMessage: 'Check back soon',
        userState: 'OTHER_USER_INPUT_REQUIRED',
        actionRequired: false,
        section,
      };
    case 'PRIMARY_OWNER_CONFLICT':
      return {
        actionMessage: 'In manual review',
        userState: 'IN_MANUAL_REVIEW',
        actionRequired: false,
        section,
      };
    case 'ONBOARDING.START_FLOW':
      return {
        actionMessage: 'Need financing?',
        userState: 'START_FLOW',
        actionRequired: true,
        section,
      };
    case 'SELECT_USER_ROLES':
    case 'ONBOARDING.SELECT_PRODUCTS':
    case 'ONBOARDING.COLLECT_PERSONAL_DETAILS':
    case 'ONBOARDING.COLLECT_SECONDARY_BUSINESS_OWNER_DETAILS':
    case 'ONBOARDING.COLLECT_BUSINESS_DETAILS':
    case 'COLLECT_BANK_STATEMENTS':
    case 'COLLECT_BANK_INFO':
    case 'ONBOARDING.COLLECT_PERSONAL_PLAID':
    case 'ONBOARDING.COLLECT_PLAID':
    case 'ONBOARDING.COLLECT_RAILZ':
    case 'ONBOARDING.COLLECT_EXISTING_DEBT':
    case 'ONBOARDING.COLLECT_REFINANCE_OPTIONS':
    case 'ONBOARDING.COLLECT_CONSENT':
      return {
        actionMessage: `You're almost there!`,
        userState: 'USER_INPUT_REQUIRED',
        actionRequired: true,
        section,
      };
    case 'OFFERS_PENDING':
    case 'WAITING_FOR_OFFERS':
      return {
        actionMessage: 'Offer processing',
        userState: 'WAITING_FOR_OFFERS',
        actionRequired: false,
        section,
      };
    case 'LOAN_APPLICATION_INCOMPLETE':
      return {
        actionMessage: 'Loan application incomplete',
        userState: 'LOAN_APPLICATION_INCOMPLETE',
        actionRequired: false,
        section,
      };
    case 'LOAN_APPLICATION_WITHDRAWN':
      return {
        actionMessage: 'Loan application withdrawn',
        userState: 'LOAN_APPLICATION_WITHDRAWN',
        actionRequired: false,
        section,
      };
    case 'NO_OFFERS_EXTENDED':
      return {
        actionMessage: 'No offers',
        userState: 'NO_OFFERS_EXTENDED',
        actionRequired: false,
        section,
      };
    case 'ONBOARDING_ERROR':
      return {
        actionMessage: 'Error',
        userState: 'IN_MANUAL_REVIEW',
        actionRequired: false,
        section,
      };
    case 'REQUEST_ADDITIONAL_USER_INPUT':
      return {
        actionMessage: 'Action required',
        userState: 'USER_INPUT_REQUIRED',
        actionRequired: true,
        section,
      };
    case 'DISPLAY_OFFERS':
      return {
        actionMessage: 'View your offers 🎉',
        userState: 'VIEW_OFFERS',
        actionRequired: true,
        section,
      };
    case 'COLLECT_LEGAL_AGREEMENTS':
    case 'COLLECT_TAX_ID':
    case 'COLLECT_PERSONA':
    case 'COLLECT_PERSONAL_PHONE_NUMBER':
    case 'SELECT_PRIMARY_BANK_ACCOUNT':
      return {
        actionMessage: `You're almost there!`,
        userState: 'USER_INPUT_REQUIRED',
        actionRequired: true,
        section,
      };
    case 'OFFER_ACCEPTED':
    case 'ISSUED_PRODUCT_CREATED':
      return {
        actionMessage: 'Pending disbursement',
        userState: 'OFFER_ACCEPTED',
        actionRequired: false,
        section,
      };
    case 'OFFER_REFRESH_PENDING':
    case 'OFFERS_EXPIRED':
      return {
        actionMessage: 'Offer expired',
        userState: 'OFFERS_EXPIRED',
        actionRequired: false,
        section,
      };
    case 'INIT_SERVICING_FLOW':
    case 'READY_FOR_SERVICING':
      return {
        actionMessage: 'My Dashboard',
        userState: 'SERVICING',
        actionRequired: true,
        section,
      };
  }
};

const buildUrl = ({
  connectToken,
  baseUrl,
  customInitializationName,
  productSubsetDuringOnboarding,
}: {
  connectToken: string;
  baseUrl: string;
  customInitializationName?: string;
  productSubsetDuringOnboarding?: ExternalProductType[];
}) => {
  const urlParams: Record<string, string> = {
    connectToken,
    disableModalTransition: 'true',
    ...(customInitializationName ? { customInitializationName } : {}),
  };

  customInitializationName &&
    (urlParams['customInitializationName'] = customInitializationName);

  if (
    productSubsetDuringOnboarding &&
    productSubsetDuringOnboarding.length > 0
  ) {
    urlParams['productSubsetDuringOnboarding'] =
      productSubsetDuringOnboarding.join(',');
  }

  const queryString = Object.entries(urlParams)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
    )
    .join('&');

  return `${baseUrl}/connect?${queryString}`;
};

let subscription: EmitterSubscription | null = null;

interface ShowArgs {
  component?: KanmonConnectComponent;
  sessionToken?: string;
}

const nativeSdk = {
  start(params: KanmonConnectParams) {
    validateParams(params);

    const kanmonEnvToUrl = {
      [KanmonConnectEnviroment.production]: 'https://connect.kanmon.com',
      [KanmonConnectEnviroment.sandbox]: 'https://connect.kanmon.dev',
      staging: 'https://connect.concar.dev',
      development: 'http://localhost:4200',
    };

    const baseUrl =
      kanmonEnvToUrl[params.environment || KanmonConnectEnviroment.production];

    const url = buildUrl({
      connectToken: params.connectToken,
      baseUrl,
      customInitializationName: params.customInitializationName,
      productSubsetDuringOnboarding: params.productSubsetDuringOnboarding,
    });

    KanmonModule.start(url);

    subscription?.remove();

    // Set up WebView message listener first
    subscription = WebViewEventEmitter.addListener(
      'onWebViewMessage',
      (message) => {
        const data: ReceivedFromKanmonMessage = JSON.parse(message);

        switch (data.action) {
          case ReceivedFromKanmonActions.HIDE:
            params.onEvent?.({
              eventType: OnEventCallbackEventType.HIDE,
            });
            break;
          case ReceivedFromKanmonActions.WORKFLOW_UPDATED:
            params.onEvent?.({
              eventType: OnEventCallbackEventType.USER_STATE_CHANGED,
              data: stepToUserState(
                data.nextStep as WorkflowStep,
                data.section
              ),
            });
            break;
          case ReceivedFromKanmonActions.ERROR:
            params.onError?.({
              errorType: data.errorType,
              message: data.message,
            });
            break;
          case ReceivedFromKanmonActions.USER_CONFIRMED_INVOICE:
            params.onEvent?.({
              eventType: OnEventCallbackEventType.USER_CONFIRMED_INVOICE,
              data: data.data,
            });
            break;
          case ReceivedFromKanmonActions.INVOICES_ALREADY_CONFIRMED:
            params.onEvent?.({
              eventType: OnEventCallbackEventType.INVOICES_ALREADY_CONFIRMED,
              data: data.data,
            });
            break;
          case ReceivedFromKanmonActions.USER_CONFIRMED_DRAW_REQUEST:
            params.onEvent?.({
              eventType: OnEventCallbackEventType.USER_CONFIRMED_DRAW_REQUEST,
              data: data.data,
            });
            break;
        }
      }
    );
  },

  show(showArgs: ShowArgs = {}) {
    validateShowArgs(showArgs);
    KanmonModule.show(JSON.stringify(showArgs));
  },

  stop() {
    KanmonModule.stop();
    subscription?.remove();
  },
};

export default nativeSdk;
