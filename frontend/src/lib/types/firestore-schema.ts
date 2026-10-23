/**
 * QUICK-POS — CLOUD FIRESTORE DATA SCHEMA DEFINITION
 * 
 * Strict TypeScript interfaces, enums, validation helpers,
 * and transaction contracts for all 21 Firestore collections and subcollections.
 * 
 * Core Mandates:
 * 1. Zero-Trust Client Verification
 * 2. Unbounded Document Elimination (Subcollections & Bounded Counters)
 * 3. Immutable Financial Ledgers & Explicit Reversals
 * 4. Safe Idempotent Payment & Sync Processing
 */

// =============================================================================
// 0. COMMON & BASE TYPES
// =============================================================================

export interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
  toDate?: () => Date;
}

export type FirestoreDateInput = string | FirestoreTimestamp | Date;

export interface BaseFirestoreDocument {
  id: string;
  createdAt: string; // ISO 8601 string or converted Firestore timestamp
  updatedAt?: string;
}

export interface TenantScopedFirestoreDocument extends BaseFirestoreDocument {
  tenantId: string;
}

// =============================================================================
// 1. USERS COLLECTION (/users/{userId})
// =============================================================================
export type GlobalPlatformRole = "super_admin" | "sales_rep" | "merchant_user";

export interface FirestoreUserDocument extends BaseFirestoreDocument {
  uid: string; // Document ID matches Firebase Auth UID
  fullName: string;
  phone: string; // Pakistani E.164 (+923001234567)
  email?: string;
  isSuperAdmin: boolean;
  assignedRole: GlobalPlatformRole;
  status: "active" | "suspended";
  avatarUrl?: string;
}

// =============================================================================
// 2. TENANTS COLLECTION (/tenants/{tenantId})
// =============================================================================
export type BusinessTemplateId =
  | "kiryana"
  | "meat"
  | "biryani"
  | "tailor"
  | "boutique"
  | "custom";

export type TenantSubscriptionStatus = "paid" | "due" | "overdue" | "grace_period";

export interface FirestoreTenantDocument extends BaseFirestoreDocument {
  tenantId: string; // e.g. "MADINA-KIR", "ALMAKKAH-MEAT"
  businessName: string;
  slug: string;
  ownerUid: string; // FK to /users/{userId}
  ownerName: string;
  ownerPhone: string;
  area: string;
  city: string;
  address: string;
  templateId: BusinessTemplateId;
  status: "active" | "suspended" | "grace_period" | "trial";
  activePlanId: string; // FK to /plans/{planId}
  subscriptionStatus: TenantSubscriptionStatus;
  nextDueDate: string;
  defaultPaperWidth: "58mm" | "80mm";
  printerMacAddress?: string;
  balanceCounters: {
    totalSalesCount: number;
    totalRevenuePkr: number;
    totalUdhaarOutstandingPkr: number;
  };
}

// =============================================================================
// 3. MEMBERSHIPS SUBCOLLECTION (/tenants/{tenantId}/memberships/{userId})
// =============================================================================
export type TenantStaffRole = "owner" | "manager" | "cashier" | "worker";

export type TenantStaffPermission =
  | "pos.bill"
  | "pos.discount"
  | "pos.price_override"
  | "pos.void"
  | "inventory.manage"
  | "khata.credit"
  | "khata.settle"
  | "expenses.record"
  | "reports.view"
  | "staff.commission_manage"
  | "tenant.settings";

export interface FirestoreMembershipDocument extends TenantScopedFirestoreDocument {
  userId: string; // Document ID matches user UID
  role: TenantStaffRole;
  pinHash: string; // Salted SHA-256 hash of 4-digit terminal cash PIN
  status: "active" | "suspended" | "revoked";
  permissions: TenantStaffPermission[];
  assignedWorkerId?: string; // Optional FK to /workers/{workerId}
  joinedAt: string;
  lastActiveAt?: string;
}

// =============================================================================
// 4. PRODUCTS SUBCOLLECTION (/tenants/{tenantId}/products/{productId})
// =============================================================================
export type MeasurementUnit =
  | "kg"
  | "gram"
  | "pao"
  | "pcs"
  | "packet"
  | "dozen"
  | "suit"
  | "plate"
  | "job";

export interface FirestoreProductDocument extends TenantScopedFirestoreDocument {
  productId: string;
  barcode: string; // Scannable barcode or SKU
  name: string;
  categoryName: string;
  unit: MeasurementUnit;
  costPrice: number; // Wholesale cost in PKR (Protected by Security Rules from Cashiers)
  salePrice: number; // Selling retail price in PKR
  stockQuantity: number; // Decimal (e.g. 14.5 kg or 50 pcs)
  minStockAlert: number;
  imageUrl?: string;
  isActive: boolean;
  pricingTierId?: string;
}

// =============================================================================
// 5. SALES & SALE ITEMS (/tenants/{tenantId}/sales/{saleId})
// =============================================================================
export type PosPaymentMethod =
  | "cash"
  | "jazzcash"
  | "easypaisa"
  | "raast"
  | "udhaar"
  | "card"
  | "split";

export type SaleStatus = "completed" | "refunded" | "partially_refunded" | "voided";

export interface FirestoreSaleDocument extends TenantScopedFirestoreDocument {
  saleId: string;
  clientTransactionId: string; // Idempotency token (e.g. "QP-TXN-...")
  invoiceNumber: string; // e.g. "INV-202610-0042"
  customerId?: string; // FK to /customers/{customerId}
  customerName?: string;
  cashierUid: string;
  cashierName: string;
  workerId?: string; // Attributed commission worker
  itemCount: number; // Bounded summary
  totalQuantity: number;
  subtotalPkr: number;
  discountPkr: number;
  taxPkr: number;
  finalTotalPkr: number;
  paymentMethod: PosPaymentMethod;
  amountPaidPkr: number;
  changeReturnedPkr: number;
  udhaarAmountPkr: number;
  paymentSplitBreakdown?: {
    cashPkr?: number;
    jazzcashPkr?: number;
    easypaisaPkr?: number;
    udhaarPkr?: number;
  };
  status: SaleStatus;
  reversalId?: string;
  syncStatus: "synced" | "pending_sync" | "failed";
}

// Subcollection: /tenants/{tenantId}/sales/{saleId}/saleItems/{itemId}
export interface FirestoreSaleItemDocument extends BaseFirestoreDocument {
  itemId: string;
  saleId: string;
  tenantId: string;
  productId: string;
  productName: string;
  unit: MeasurementUnit;
  quantity: number;
  unitCostPrice: number;
  unitSalePrice: number;
  discountPkr: number;
  totalPkr: number;
}

// Subcollection: /tenants/{tenantId}/sales/{saleId}/reversals/{reversalId}
export interface FirestoreSaleReversalDocument extends BaseFirestoreDocument {
  reversalId: string;
  saleId: string;
  tenantId: string;
  reversalType: "full_refund" | "partial_return" | "void_mistake";
  refundAmountPkr: number;
  refundMethod: "cash" | "khata_credit";
  returnedItems: Array<{
    productId: string;
    productName: string;
    quantityReturned: number;
    unitPricePkr: number;
    restockInventory: boolean;
  }>;
  reason: string;
  authorizedByUid: string; // Manager or Owner UID
  clawedBackCommissionEntryId?: string;
}

// =============================================================================
// 6. PURCHASES SUBCOLLECTION (/tenants/{tenantId}/purchases/{purchaseId})
// =============================================================================
export interface FirestorePurchaseDocument extends TenantScopedFirestoreDocument {
  purchaseId: string;
  supplierId: string; // FK to /suppliers/{supplierId}
  supplierName: string;
  vendorInvoiceNumber: string;
  totalBillPkr: number;
  paidAmountPkr: number;
  balanceDuePkr: number;
  paymentMethod: "cash" | "bank_transfer" | "cheque" | "credit";
  receivedByUid: string;
  status: "received" | "partial" | "returned";
  purchasedAt: string;
}

// Subcollection: /tenants/{tenantId}/purchases/{purchaseId}/purchaseItems/{itemId}
export interface FirestorePurchaseItemDocument extends BaseFirestoreDocument {
  itemId: string;
  purchaseId: string;
  tenantId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitCostPkr: number;
  totalCostPkr: number;
}

// =============================================================================
// 7. PAYMENTS SUBCOLLECTION (/tenants/{tenantId}/payments/{paymentId})
// =============================================================================
export type FinancialPaymentType =
  | "customer_khata_settlement"
  | "supplier_invoice_payment"
  | "saas_onboarding_installment"
  | "saas_monthly_subscription"
  | "worker_advance";

export interface FirestorePaymentDocument extends TenantScopedFirestoreDocument {
  paymentId: string;
  clientTransactionId: string;
  paymentType: FinancialPaymentType;
  referenceEntityId: string; // customerId, supplierId, subscriptionId
  referenceDocId?: string; // Specific sale or invoice ID
  amountPkr: number;
  paymentMethod: PosPaymentMethod;
  transactionReference?: string; // Electronic TID (JazzCash / EasyPaisa)
  recordedByUid: string;
  notes?: string;
}

// =============================================================================
// 8. EXPENSES SUBCOLLECTION (/tenants/{tenantId}/expenses/{expenseId})
// =============================================================================
export type ExpenseCategory =
  | "shop_rent"
  | "electricity"
  | "generator_fuel"
  | "tea_refreshments"
  | "transport_fare"
  | "packaging_bags"
  | "printer_paper_rolls"
  | "maintenance"
  | "staff_salary"
  | "miscellaneous";

export interface FirestoreExpenseDocument extends TenantScopedFirestoreDocument {
  expenseId: string;
  category: ExpenseCategory;
  title: string;
  amountPkr: number;
  paymentMethod: "cash" | "jazzcash" | "easypaisa" | "bank";
  recordedByUid: string;
  expenseDate: string; // "YYYY-MM-DD"
  receiptImageUrl?: string;
  notes?: string;
}

// =============================================================================
// 9. CUSTOMERS & KHATA LEDGER (/tenants/{tenantId}/customers/{customerId})
// =============================================================================
export interface FirestoreCustomerDocument extends TenantScopedFirestoreDocument {
  customerId: string;
  fullName: string;
  phone: string;
  area: string;
  creditLimitPkr: number; // Hard cap
  currentBalancePkr: number; // Positive = Customer owes shop (Udhaar)
  totalPurchasesLifetimePkr: number;
  totalRepaidLifetimePkr: number;
  isActive: boolean;
  lastTransactionAt: string;
}

// Subcollection: /tenants/{tenantId}/customers/{customerId}/khataLedger/{ledgerId}
export interface FirestoreKhataLedgerDocument extends BaseFirestoreDocument {
  ledgerId: string;
  customerId: string;
  tenantId: string;
  entryType: "debit_sale" | "credit_repayment" | "credit_reversal" | "adjustment";
  amountPkr: number;
  saleId?: string;
  paymentId?: string;
  previousBalancePkr: number;
  newBalancePkr: number;
  notes?: string;
  recordedByUid: string;
}

// =============================================================================
// 10. SUPPLIERS & SUPPLIER LEDGER (/tenants/{tenantId}/suppliers/{supplierId})
// =============================================================================
export interface FirestoreSupplierDocument extends TenantScopedFirestoreDocument {
  supplierId: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  area: string;
  currentPayableBalancePkr: number; // Positive = Shop owes supplier
  isActive: boolean;
}

// Subcollection: /tenants/{tenantId}/suppliers/{supplierId}/supplierLedger/{ledgerId}
export interface FirestoreSupplierLedgerDocument extends BaseFirestoreDocument {
  ledgerId: string;
  supplierId: string;
  tenantId: string;
  entryType: "debit_purchase" | "credit_payment" | "adjustment";
  amountPkr: number;
  purchaseId?: string;
  paymentId?: string;
  previousBalancePkr: number;
  newBalancePkr: number;
  notes?: string;
  recordedByUid: string;
}

// =============================================================================
// 11. SUBSCRIPTIONS SUBCOLLECTION (/tenants/{tenantId}/subscriptions/{subscriptionId})
// =============================================================================
export interface FirestoreSubscriptionDocument extends TenantScopedFirestoreDocument {
  subscriptionId: string;
  planId: string; // FK to /plans/{planId}
  planName: string;
  hardwareIncluded: boolean;
  totalContractPkr: number; // e.g. PKR 11,000
  installment1AmountPkr: number; // PKR 5,000
  installment1Paid: boolean;
  installment2AmountPkr: number; // PKR 6,000
  installment2Paid: boolean;
  monthlyRecurringPkr: number; // PKR 1,000
  status: "trial" | "active_paid" | "due" | "grace_period" | "suspended";
  currentPeriodStart: string;
  currentPeriodEnd: string;
  gracePeriodEndsAt: string;
  lastPaymentDate?: string;
  lastPaymentAmountPkr?: number;
  verifiedBySuperAdminUid?: string;
}

// =============================================================================
// 12. PLANS ROOT COLLECTION (/plans/{planId})
// =============================================================================
export interface FirestorePlanDocument extends BaseFirestoreDocument {
  planId: string;
  title: string;
  description: string;
  upfrontInstallmentPkr: number;
  secondInstallmentPkr: number;
  monthlySaasPkr: number;
  hardwareBundle: "none" | "printer_58mm" | "printer_80mm";
  maxProducts: number;
  maxDevices: number;
  features: string[];
  isActive: boolean;
}

// =============================================================================
// 13. TEMPLATES ROOT COLLECTION (/templates/{templateId})
// =============================================================================
export interface FirestoreTemplateDocument extends BaseFirestoreDocument {
  templateId: BusinessTemplateId;
  displayName: string;
  description: string;
  defaultUnits: MeasurementUnit[];
  defaultCategories: string[];
  recommendedModules: string[];
  supportsWeightScale: boolean;
  supportsPortions: boolean;
  supportsMeasurements: boolean;
}

// =============================================================================
// 14. TENANT MODULES SUBCOLLECTION (/tenants/{tenantId}/tenantModules/{moduleId})
// =============================================================================
export interface FirestoreTenantModuleDocument extends TenantScopedFirestoreDocument {
  moduleId: string; // e.g. "worker_commissions", "khata_udhaar"
  isEnabled: boolean;
  configuredAt: string;
  updatedByUid: string;
}

// =============================================================================
// 15. DEVICES SUBCOLLECTION (/tenants/{tenantId}/devices/{deviceId})
// =============================================================================
export interface FirestoreDeviceDocument extends TenantScopedFirestoreDocument {
  deviceId: string;
  deviceType: "bluetooth_printer" | "pos_smartphone" | "cash_drawer";
  modelName: string;
  macAddress?: string;
  paperWidth?: "58mm" | "80mm";
  isAuthorized: boolean;
  lastPairedAt: string;
}

// =============================================================================
// 16. SYNC OPERATIONS ROOT COLLECTION (/syncOperations/{clientTransactionId})
// =============================================================================
export interface FirestoreSyncOperationDocument extends BaseFirestoreDocument {
  clientTransactionId: string; // Document ID (Unique Idempotency Key)
  tenantId: string;
  entityType: "sale" | "payment" | "expense" | "khata_entry" | "refund";
  resultingEntityId: string;
  status: "processing" | "completed" | "rejected";
  deviceInfo: {
    deviceId: string;
    appVersion: string;
    offlineTimestamp: string;
  };
  processedAt: string;
}

// =============================================================================
// 17. AUDIT LOGS SUBCOLLECTION (/tenants/{tenantId}/auditLogs/{logId})
// =============================================================================
export type AuditLogAction =
  | "shop.login"
  | "shop.pin_reset"
  | "sale.completed"
  | "sale.voided"
  | "sale.refunded"
  | "price.overridden"
  | "khata.credit_limit_changed"
  | "expense.recorded"
  | "commission.settled"
  | "device.paired"
  | "subscription.status_changed"
  | "shop.suspended";

export interface FirestoreAuditLogDocument extends TenantScopedFirestoreDocument {
  logId: string;
  actorUid: string;
  actorName: string;
  action: AuditLogAction;
  targetResource: string;
  metadata: Record<string, unknown>;
  ipAddress?: string;
  timestamp: string;
}

// =============================================================================
// 18. SALES VISITS ROOT COLLECTION (/salesVisits/{visitId})
// =============================================================================
export interface FirestoreSalesVisitDocument extends BaseFirestoreDocument {
  visitId: string;
  salesRepUid: string;
  salesRepName: string;
  merchantName: string;
  shopName: string;
  marketArea: string;
  city: string;
  phone: string;
  businessCategory: BusinessTemplateId | "other";
  outcome: "interested" | "demo_scheduled" | "onboarded_paid" | "rejected";
  onboardedTenantId?: string;
  printerDelivered: boolean;
  collectedAmountPkr: number;
  gpsCoordinates?: {
    latitude: number;
    longitude: number;
  };
  notes?: string;
  visitedAt: string;
}

// =============================================================================
// 19. WORKERS SUBCOLLECTION (/tenants/{tenantId}/workers/{workerId})
// =============================================================================
export type WorkerPaymentType = "fixed_salary" | "commission_only" | "salary_plus_commission";

export interface FirestoreWorkerDocument extends TenantScopedFirestoreDocument {
  workerId: string;
  fullName: string;
  phone: string;
  designation: string;
  joiningDate: string;
  isActive: boolean;
  paymentType: WorkerPaymentType;
  baseSalaryPkr: number;
  defaultCommissionRuleId?: string;
  monthlySalesTargetPkr: number;
  financialCounters: {
    totalSalesGeneratedPkr: number;
    totalCommissionEarnedPkr: number;
    totalCommissionPaidPkr: number;
    currentPendingPayoutPkr: number; // Earned - Paid - Clawbacks
  };
}

// =============================================================================
// 20. COMMISSION RULES SUBCOLLECTION (/tenants/{tenantId}/commissionRules/{ruleId})
// =============================================================================
export type CommissionCalculationMethod =
  | "percentage_of_sales"
  | "fixed_amount_per_sale"
  | "product_based"
  | "category_based"
  | "fixed_per_completed_order"
  | "target_bonus"
  | "multi_worker_split";

export interface FirestoreCommissionRuleDocument extends TenantScopedFirestoreDocument {
  ruleId: string;
  name: string;
  method: CommissionCalculationMethod;
  rateValue: number; // e.g. 5.0 (for 5%) or 250 (for PKR 250)
  applicableCategory?: string;
  applicableProductId?: string;
  minimumOrderPkr?: number;
  policies: {
    deductDiscountsFirst: boolean;
    allowCreditSales: boolean;
    autoClawbackOnRefund: boolean;
    splitEnabled: boolean;
  };
  isActive: boolean;
}

// =============================================================================
// 21. COMMISSION ENTRIES & SETTLEMENTS
// =============================================================================
export interface FirestoreCommissionEntryDocument extends TenantScopedFirestoreDocument {
  entryId: string;
  workerId: string;
  workerName: string;
  saleId: string;
  originatingSaleInvoice: string;
  entryType: "earned" | "target_bonus" | "refund_clawback";
  earnedAmountPkr: number; // Positive for earnings, Negative for clawbacks
  calculatedRateSnapshot: string;
  status: "accrued" | "locked_in_settlement" | "settled";
  settlementId?: string;
  accruedAt: string;
}

export interface FirestoreCommissionSettlementDocument extends TenantScopedFirestoreDocument {
  settlementId: string;
  workerId: string;
  workerName: string;
  voucherNumber: string;
  periodStart: string;
  periodEnd: string;
  totalAmountPkr: number;
  paymentMethod: "cash" | "jazzcash" | "easypaisa" | "bank_transfer";
  paymentReference?: string;
  disbursedByUid: string;
  coveredEntryIds: string[];
  settledAt: string;
}

// =============================================================================
// 22. BOUNDED AGGREGATION: DAILY SUMMARIES (/tenants/{tenantId}/dailySummaries/{YYYYMMDD})
// =============================================================================
export interface FirestoreDailySummaryDocument extends TenantScopedFirestoreDocument {
  date: string; // "YYYY-MM-DD"
  totalOrdersCount: number;
  totalGrossSalesPkr: number;
  totalDiscountsPkr: number;
  totalNetSalesPkr: number;
  totalCashReceivedPkr: number;
  totalDigitalReceivedPkr: number;
  totalUdhaarIssuedPkr: number;
  totalKhataRecoveredPkr: number;
  totalExpensesPkr: number;
  totalRefundsPkr: number;
  netCashInDrawerPkr: number;
  lastUpdated: string;
}

// =============================================================================
// 23. FINANCIAL TRANSACTION PAYLOAD CONTRACTS
// =============================================================================

export interface ExecuteSaleTransactionPayload {
  tenantId: string;
  clientTransactionId: string;
  invoiceNumber: string;
  cashierUid: string;
  cashierName: string;
  customerId?: string;
  workerId?: string;
  items: Array<{
    productId: string;
    productName: string;
    unit: MeasurementUnit;
    quantity: number;
    unitCostPrice: number;
    unitSalePrice: number;
    discountPkr: number;
  }>;
  discountPkr: number;
  paymentMethod: PosPaymentMethod;
  amountPaidPkr: number;
  paymentSplitBreakdown?: {
    cashPkr?: number;
    jazzcashPkr?: number;
    easypaisaPkr?: number;
    udhaarPkr?: number;
  };
}

export interface ExecuteSaleReversalPayload {
  tenantId: string;
  saleId: string;
  reversalType: "full_refund" | "partial_return" | "void_mistake";
  returnedItems: Array<{
    productId: string;
    productName: string;
    quantityReturned: number;
    unitPricePkr: number;
    restockInventory: boolean;
  }>;
  refundAmountPkr: number;
  refundMethod: "cash" | "khata_credit";
  reason: string;
  authorizedByUid: string;
}

export interface ExecuteKhataPaymentPayload {
  tenantId: string;
  customerId: string;
  clientTransactionId: string;
  amountPkr: number;
  paymentMethod: PosPaymentMethod;
  transactionReference?: string;
  recordedByUid: string;
  notes?: string;
}

export interface ExecuteCommissionSettlementPayload {
  tenantId: string;
  workerId: string;
  workerName: string;
  voucherNumber: string;
  periodStart: string;
  periodEnd: string;
  entryIds: string[];
  totalPayoutPkr: number;
  paymentMethod: "cash" | "jazzcash" | "easypaisa" | "bank_transfer";
  paymentReference?: string;
  disbursedByUid: string;
}
