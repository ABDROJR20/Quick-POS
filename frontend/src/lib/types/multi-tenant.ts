/**
 * QUICK-POS — MULTI-TENANT DOMAIN TYPES & RELATIONSHIPS
 * Standard 5: Clear entity relationships, strict tenantId scoping,
 * and server-side RBAC role validation contracts.
 */

// =============================================================================
// 1. BASE TENANT-SCOPED INTERFACE
// =============================================================================
export interface TenantScopedEntity {
  tenantId: string;
  createdAt: string;
  updatedAt?: string;
}

// =============================================================================
// 2. USERS, MEMBERSHIPS & ROLES
// =============================================================================
export type PlatformRole = "super_admin" | "sales_rep" | "standard_user";
export type TenantRole = "owner" | "manager" | "cashier" | "worker";

export interface User {
  id: string; // Global User UID (e.g. Firebase Auth UID)
  name: string;
  email?: string;
  phone: string;
  isSuperAdmin: boolean;
  avatarUrl?: string;
  createdAt: string;
}

export interface Membership extends TenantScopedEntity {
  id: string; // Join ID (tenantId_userId)
  userId: string;
  role: TenantRole;
  pinCode: string; // 4-digit terminal cash drawer PIN
  status: "active" | "suspended" | "revoked";
  permissions: TenantPermission[];
  joinedAt: string;
}

export type TenantPermission =
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

// =============================================================================
// 3. SHOPS / TENANTS
// =============================================================================
export type BusinessTemplateCode =
  | "kiryana"
  | "meat"
  | "biryani"
  | "tailor"
  | "boutique"
  | "custom";

export interface Shop {
  id: string; // tenantId (e.g. "MADINA-KIR", "ALMADAD-01")
  tenantId: string; // Consistent alias matching id
  name: string;
  slug: string;
  ownerId: string; // FK to User
  ownerName: string;
  phone: string;
  area: string; // e.g. "Shah Faisal Colony # 2, Karachi"
  address?: string;
  templateId: BusinessTemplateCode;
  customCategoryName?: string;
  status: "active" | "suspended" | "grace_period" | "trial";
  subscriptionStatus: "paid" | "due" | "overdue";
  nextDueDate: string;
  defaultPaperWidth: "58mm" | "80mm";
  createdAt: string;
}

// =============================================================================
// 4. PRODUCTS & INVENTORY
// =============================================================================
export interface Product extends TenantScopedEntity {
  id: string; // PK
  categoryId?: string;
  categoryName: string;
  name: string;
  barcode: string;
  sku?: string;
  unit: "kg" | "gram" | "pao" | "pcs" | "packet" | "dozen" | "suit" | "plate" | "job";
  costPrice: number;
  salePrice: number;
  stockQuantity: number;
  minStockAlert: number;
  isActive: boolean;
}

// =============================================================================
// 5. SALES & SALE ITEMS
// =============================================================================
export type PaymentMethod =
  | "cash"
  | "jazzcash"
  | "easypaisa"
  | "raast"
  | "udhaar"
  | "card"
  | "split";

export interface Sale extends TenantScopedEntity {
  id: string; // PK
  clientTransactionId: string; // Unique offline idempotent token (QP-TXN-...)
  invoiceNumber: string;
  customerId?: string; // FK to Customer
  customerName?: string;
  cashierId: string; // FK to User / Cashier
  cashierName: string;
  workerId?: string; // Optional commission worker attributed
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  changeReturned: number;
  udhaarAmount?: number;
  items: SaleItem[];
  syncStatus: "synced" | "pending_sync" | "failed";
}

export interface SaleItem extends TenantScopedEntity {
  id: string;
  saleId: string; // FK to Sale
  productId: string; // FK to Product
  productName: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  totalPrice: number;
  discountAmount?: number;
}

// =============================================================================
// 6. PURCHASES (Wholesale Stock-In)
// =============================================================================
export interface Purchase extends TenantScopedEntity {
  id: string;
  supplierId: string; // FK to Supplier
  supplierName: string;
  invoiceNumber: string;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  status: "received" | "partial" | "pending";
  purchasedAt: string;
}

// =============================================================================
// 7. EXPENSES (Operating Overheads)
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

export interface Expense extends TenantScopedEntity {
  id: string;
  category: ExpenseCategory;
  title: string;
  amount: number;
  paymentMethod: "cash" | "jazzcash" | "easypaisa" | "bank";
  recordedByUserId: string;
  notes?: string;
  expenseDate: string;
}

// =============================================================================
// 8. CUSTOMERS & KHATA / UDHAAR LEDGER
// =============================================================================
export interface Customer extends TenantScopedEntity {
  id: string;
  name: string;
  phone: string;
  area: string;
  creditLimit: number;
  currentBalance: number; // Positive = customer owes money (Udhaar)
  totalPurchases: number;
  lastVisitAt?: string;
}

// =============================================================================
// 9. SUPPLIERS (Wholesale Vendors)
// =============================================================================
export interface Supplier extends TenantScopedEntity {
  id: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  area: string; // e.g. "Jodia Bazar, Karachi"
  currentBalance: number; // Positive = Shop owes supplier
}

// =============================================================================
// 10. PAYMENTS (Financial Ledger Transactions)
// =============================================================================
export type PaymentType =
  | "customer_khata_settlement"
  | "supplier_invoice_payment"
  | "saas_onboarding_installment"
  | "saas_monthly_subscription";

export interface Payment extends TenantScopedEntity {
  id: string;
  paymentType: PaymentType;
  referenceId: string; // FK to Sale / Purchase / Subscription
  amount: number;
  paymentMethod: PaymentMethod;
  transactionReference?: string; // JazzCash / EasyPaisa TID
  recordedByUserId: string;
  notes?: string;
  paidAt: string;
}

// =============================================================================
// 11. SUBSCRIPTIONS & PACKAGES
// =============================================================================
export interface Subscription extends TenantScopedEntity {
  id: string;
  planName: string; // "Shah Faisal Town Pilot Package"
  onboardingTotal: number; // PKR 11,000
  installment1Amount: number; // PKR 5,000
  installment1Paid: boolean;
  installment2Amount: number; // PKR 6,000
  installment2Paid: boolean;
  monthlySaasAmount: number; // PKR 1,000
  status: "paid" | "due" | "overdue" | "grace_period" | "restricted";
  currentPeriodStart: string;
  currentPeriodEnd: string;
  graceEndsAt: string;
  lastPaymentDate?: string;
}

// =============================================================================
// 12. WORKERS & COMMISSIONS
// =============================================================================
export interface Worker extends TenantScopedEntity {
  id: string;
  name: string;
  phone: string;
  designation: string; // e.g. "Master Tailor", "Counter Salesman", "Biryani Chef"
  isActive: boolean;
  defaultRuleId?: string; // FK to CommissionRule
  totalCommissionEarned: number;
  totalCommissionPaid: number;
  currentPendingPayout: number;
}

export type CommissionRuleType =
  | "percentage_of_sale"
  | "fixed_per_order"
  | "fixed_per_item"
  | "tiered_monthly_target"
  | "stitching_per_suit";

export interface CommissionRule extends TenantScopedEntity {
  id: string;
  name: string;
  ruleType: CommissionRuleType;
  rate: number; // e.g. 5.0 for 5%, or 200 for PKR 200 per suit
  applicableCategory?: string;
  minOrderAmount?: number;
  isActive: boolean;
}

export interface CommissionEntry extends TenantScopedEntity {
  id: string;
  workerId: string; // FK to Worker
  workerName: string;
  saleId: string; // FK to Sale
  saleItemId?: string;
  ruleId: string; // FK to CommissionRule
  earnedAmount: number;
  status: "accrued" | "settled" | "cancelled_refund";
  settlementId?: string; // FK to CommissionSettlement
  accruedAt: string;
}

export interface CommissionSettlement extends TenantScopedEntity {
  id: string;
  workerId: string;
  workerName: string;
  periodStart: string;
  periodEnd: string;
  totalAmount: number;
  paymentMethod: "cash" | "jazzcash" | "easypaisa" | "bank";
  paymentReference?: string;
  settledByUserId: string;
  settledAt: string;
}

// =============================================================================
// 13. DEVICES & HARDWARE
// =============================================================================
export interface Device extends TenantScopedEntity {
  id: string;
  deviceType: "pos_smartphone" | "bluetooth_printer";
  model: string; // e.g. "MPT-II 58mm", "POS-58"
  serialNumber?: string;
  macAddress?: string;
  paperWidth: "58mm" | "80mm";
  isAuthorized: boolean;
  lastPairedAt?: string;
}

// =============================================================================
// 14. TEMPLATES & ENABLED MODULES
// =============================================================================
export interface Template {
  id: BusinessTemplateCode;
  displayName: string;
  description: string;
  defaultUnits: string[];
  defaultCategories: string[];
  recommendedModules: string[];
}

export interface EnabledModule extends TenantScopedEntity {
  id: string;
  moduleCode:
    | "billing"
    | "inventory"
    | "khata_udhaar"
    | "thermal_printing"
    | "worker_commissions"
    | "purchases"
    | "expenses"
    | "daily_reports";
  isEnabled: boolean;
  configuredAt: string;
}

// =============================================================================
// 15. AUDIT LOGS (APPEND-ONLY SECURITY TRAIL)
// =============================================================================
export type AuditActionType =
  | "shop.login"
  | "shop.pin_reset"
  | "sale.completed"
  | "sale.voided"
  | "price.overridden"
  | "khata.credit_limit_changed"
  | "expense.recorded"
  | "commission.settled"
  | "device.paired"
  | "subscription.status_changed"
  | "shop.suspended";

export interface AuditLog extends TenantScopedEntity {
  id: string;
  userId: string;
  userName: string;
  action: AuditActionType;
  resourceType: string; // e.g. "Sale", "Product", "Worker"
  resourceId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

// =============================================================================
// 16. TENANT ISOLATION & VALIDATION CONTRACTS
// =============================================================================

/**
 * Validates that an incoming payload matches the tenant context.
 * Throws an error if a user attempts cross-tenant parameter tampering.
 */
export function validateTenantScopedPayload(
  payload: { tenantId?: string },
  contextTenantId: string
): boolean {
  if (!payload.tenantId) {
    throw new Error(`Security Violation: Payload lacks required tenantId parameter.`);
  }

  if (payload.tenantId.trim().toUpperCase() !== contextTenantId.trim().toUpperCase()) {
    throw new Error(
      `Cross-Tenant Tampering Detected: Payload tenantId (${payload.tenantId}) does not match session tenantId (${contextTenantId}). Access Denied.`
    );
  }

  return true;
}

/**
 * Evaluates whether a membership grants access to a specific role-gated operation.
 */
export function assertTenantRole(
  membership: Membership | null,
  requiredRoles: TenantRole[]
): boolean {
  if (!membership || membership.status !== "active") {
    throw new Error("Unauthorized: Active tenant membership required.");
  }

  if (!requiredRoles.includes(membership.role)) {
    throw new Error(
      `Forbidden: Action requires one of roles [${requiredRoles.join(", ")}]. Current role: ${membership.role}.`
    );
  }

  return true;
}
