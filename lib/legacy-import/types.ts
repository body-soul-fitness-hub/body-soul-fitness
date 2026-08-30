export type LegacyCustomerRow = {
  rowIndex: number;
  code: string;
  name: string;
  isdCode: string;
  number: string;
  email: string;
  gender: string;
  dateOfEnquiry: string;
  conversionDate: string;
  handledBy: string;
  notes: string;
  leadType: string;
  sourceOfPromo: string;
  employmentType: string;
  appInstalled: string;
  assignedTrainer: string;
  membershipStatus: string;
  dob: string;
  address: string;
  emergencyContactNo: string;
  whatsappNumbers: string;
  referenceNo: string;
};

export type LegacySaleRow = {
  rowIndex: number;
  invoiceNo: string;
  invoiceDate: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAlternatePhone: string;
  planName: string;
  startDate: string;
  endDate: string;
  planStatus: string;
  netSaleAmount: number;
  gst: number;
  totalSaleAmount: number;
  paymentStatus: string;
  trainerName: string;
  trainerId: string;
  paymentType: string;
  staffName: string;
  staffId: string;
  sourceOfPromotion: string;
  paidAmount: number;
  referenceNumber: string;
  note: string;
};

export type ValidationLevel = "error" | "warning";

export type ValidationIssue = {
  level: ValidationLevel;
  code: string;
  message: string;
  rowIndex?: number;
  legacyCode?: string;
  legacySaleRowKey?: string;
};

export type ExistingMemberLookup = {
  byLegacyCode: Map<string, { id: string; full_name: string; mobile_number: string }>;
  byNormalizedPhone: Map<string, { id: string; full_name: string; mobile_number: string; legacy_customer_code: string | null }>;
};

export type ImportSummary = {
  customerRows: number;
  salesRows: number;
  joinedRows: number;
  customersWithoutSales: number;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  parseErrors: string[];
  blockedCustomerRowIndexes: number[];
  blockedSaleRowIndexes: number[];
};

export type ParsedWorkbooks = {
  customers: LegacyCustomerRow[];
  sales: LegacySaleRow[];
  parseErrors: string[];
};

export type CommitRowOutcome = {
  legacyCode?: string;
  legacySaleRowKey?: string;
  status: "created" | "skipped_existing" | "skipped_invalid" | "failed";
  message?: string;
};

export type CommitSummary = ImportSummary & {
  membersCreated: number;
  membersSkippedExisting: number;
  membersSkippedInvalid: number;
  subscriptionsCreated: number;
  subscriptionsSkippedExisting: number;
  subscriptionsSkippedInvalid: number;
  invoicesCreated: number;
  paymentsCreated: number;
  rowOutcomes: CommitRowOutcome[];
};
