export type Section = 'OFFER' | 'SERVICING' | 'ONBOARDING'

export enum ExternalDrawRequestStatus {
  DRAW_REQUEST_CREATED = 'DRAW_REQUEST_CREATED',
  DRAW_REQUEST_FUNDED = 'DRAW_REQUEST_FUNDED',
  DRAW_REQUEST_PAID_IN_FULL = 'DRAW_REQUEST_PAID_IN_FULL',
  REJECTED = 'REJECTED',
  DEFAULTED = 'DEFAULTED',
}

export class ExternalDrawRequestDTO {
  id!: string
  issuedProductId!: string
  amountCents!: number
  disbursementAmountCents!: number
  feeAmountCents!: number
  interestRatePercentage!: number
  feePercentage!: number
  status!: ExternalDrawRequestStatus
  repaymentDurationMonths!: number
  createdAt!: string
  updatedAt!: string
}

export class InvoiceRepaymentScheduleItem {
  repaymentDate!: string
  repaymentAmountCents!: number
  repaymentFeeAmountCents!: number
  repaymentPrincipalAmountCents!: number
}

export class InvoiceRepaymentSchedule {
  schedule!: InvoiceRepaymentScheduleItem[]
}

export enum ExternalInvoiceStatus {
  INVOICE_CREATED = 'INVOICE_CREATED',
  INVOICE_FUNDED = 'INVOICE_FUNDED',
  INVOICE_PAID_IN_FULL = 'INVOICE_PAID_IN_FULL',
  REJECTED = 'REJECTED',
  DEFAULTED = 'DEFAULTED',
  LATE = 'LATE',
}

export class Address {
  addressLineOne!: string
  addressLineTwo?: string | null
  city!: string
  state!: string
  zipcode!: string
  country!: string
  verified?: boolean
}

export enum PayorType {
  BUSINESS = 'BUSINESS',
  INDIVIDUAL = 'INDIVIDUAL',
}

export class ExternalInvoiceDTO {
  id!: string
  platformInvoiceId!: string | null
  platformInvoiceNumber!: string | null
  invoiceAmountCents!: number
  invoiceDueDate!: string | null
  invoiceIssuedDate!: string | null
  payorType!: PayorType | null
  payorBusinessName!: string | null
  payorEmail!: string | null
  payorAddress!: Address | null
  payorFirstName!: string | null
  payorMiddleName!: string | null
  payorLastName!: string | null
  state?: ExternalInvoiceStatus
  issuedProductId!: string
  feeAmountCents!: number
  principalAmountCents!: number
  invoiceAdvanceAmountCents!: number
  repaymentAmountCents!: number
  repaymentSchedule!: InvoiceRepaymentSchedule
  advanceRatePercentage!: number
  transactionFeePercentage!: number
  amountRequestedForFinancingCents!: number
  createdAt!: string
  updatedAt!: string
}

export const onboardingStepsArray = [
  'ONBOARDING.COLLECT_PERSONAL_DETAILS',
  'ONBOARDING.START_FLOW',
  'ONBOARDING.SELECT_PRODUCTS',
  'ONBOARDING.COLLECT_BUSINESS_DETAILS',
  'ONBOARDING.COLLECT_SECONDARY_BUSINESS_OWNER_DETAILS',
  'ONBOARDING.COLLECT_PERSONAL_PLAID',
  'ONBOARDING.COLLECT_PLAID',
  'ONBOARDING.COLLECT_RAILZ',
  'ONBOARDING.COLLECT_EXISTING_DEBT',
  'ONBOARDING.COLLECT_REFINANCE_OPTIONS',
  'ONBOARDING.COLLECT_CONSENT',
] as const

export const onboardingStaticStep = [
  'ONBOARDING.START_FLOW',
  'ONBOARDING.SELECT_PRODUCTS',
]

// TODO - eventually we will remove offers from the workflow steps array  https://linear.app/kanmon/issue/KAN-1688/cleanup-onboarding-workflow
export const WorkflowStepsArray = [
  ...onboardingStepsArray,
  'COLLECT_BANK_STATEMENTS',
  'COLLECT_BANK_INFO',
  'WAITING_FOR_OFFERS',
  'ONBOARDING_ERROR',
  'REQUEST_ADDITIONAL_USER_INPUT',
] as const

export const offerStepsArray = [
  'OFFERS_PENDING',
  'DISPLAY_OFFERS',
  'COLLECT_LEGAL_AGREEMENTS',
  'SELECT_PRIMARY_BANK_ACCOUNT',
  'COLLECT_TAX_ID',
  'COLLECT_PERSONA',
  'COLLECT_PERSONAL_PHONE_NUMBER',
  'OFFER_ACCEPTED',
  'OFFERS_EXPIRED',
  'NO_OFFERS_EXTENDED',
  'ISSUED_PRODUCT_CREATED',
  'OFFER_REFRESH_PENDING',
  'LOAN_APPLICATION_INCOMPLETE',
  'LOAN_APPLICATION_WITHDRAWN',
] as const

export const ServicingStepsArray = [
  'INIT_SERVICING_FLOW',
  'READY_FOR_SERVICING',
] as const

export type OfferWorkflowStep = typeof offerStepsArray[number]

// For nested states like ONBOARDING.START_FLOW, the states are delimited by a `.`.
// The xstate library knows how to interpret this string by default.
export type WorkflowStep = typeof WorkflowStepsArray[number]
export type ServicingWorkflowStep = typeof ServicingStepsArray[number]

export type PreOnboardingSteps =
  | 'SELECT_USER_ROLES'
  // This happens when a user has a role like OPERATOR, but the
  // business is not in SERVICING yet
  | 'BLOCKED_ON_PRIMARY_OWNER'
  // This happens when a user chooses PRIMARY_OWNER when one
  // already exists
  | 'PRIMARY_OWNER_CONFLICT'

export type AllSteps =
  | WorkflowStep
  | OfferWorkflowStep
  | ServicingWorkflowStep
  | PreOnboardingSteps
