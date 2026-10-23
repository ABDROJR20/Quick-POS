/**
 * QUICK-POS — DIGITAL PAYMENT MANAGEMENT ENGINE
 * Standard 12: Centralized digital payment workflow, transaction tracking,
 * gateway webhook idempotency, sales representative verification restrictions,
 * refund/reversal lifecycle, and strict separation of hardware payments from subscription revenue.
 */

export type PaymentPurpose =
  | "hardware_installment_1" // Upfront PKR 5,000 for 58mm printer & onboarding
  | "hardware_installment_2" // PKR 6,000 final printer ownership settlement
  | "subscription_monthly_saas" // PKR 1,000 / month recurring SaaS license
  | "enterprise_multi_counter" // PKR 2,500 / month enterprise tier
  | "pos_counter_bill" // Counter retail sale
  | "custom_onboarding";

export type PaymentProvider =
  | "jazzcash"
  | "easypaisa"
  | "raast"
  | "bank_transfer"
  | "cash";

export type PaymentStatus = "pending" | "verified" | "failed" | "refunded";

export type RevenueCategory = "hardware_capex" | "recurring_saas" | "merchant_gross_sales";

export interface ReversalInfo {
  refundId: string;
  amountPkr: number;
  reason: string;
  reversedAt: string;
  reversedByUid: string;
  reversedByRole: "super_admin" | "authorized_auditor";
  gatewayReversalRef?: string;
  notes?: string;
}

export interface DigitalPaymentRecord {
  id: string; // e.g. "PMT-20261024-9982"
  tenantId: string; // Shop identifier (e.g. "shop-01" or "MADINA-KIR")
  storeCode: string;
  storeName: string;
  customerId?: string;
  customerName?: string;
  amountPkr: number;
  currency: "PKR";
  paymentReference: string; // Mandatory TID / RRN / Gateway Transaction Reference
  paymentPurpose: PaymentPurpose;
  revenueCategory: RevenueCategory; // Strictly separates hardware payments from recurring SaaS
  paymentProvider: PaymentProvider;
  status: PaymentStatus;
  createdAt: string;
  verificationTimestamp?: string;
  verifiedByUid?: string;
  verifiedByRole?: "super_admin" | "gateway_webhook" | "authorized_auditor";
  verificationMethod?: "gateway_webhook" | "admin_reconciliation" | "audited_override";
  webhookEventId?: string; // Used for idempotent webhook ingestion
  failureReason?: string;
  reversal?: ReversalInfo;
  payerDetails?: {
    senderName?: string;
    senderPhone?: string;
    bankName?: string;
    accountMasked?: string;
  };
  notes?: string;
}

export interface RevenueBreakdown {
  totalGrossVerifiedPkr: number;
  hardwareRevenuePkr: number; // Installment 1 & 2
  recurringSaasRevenuePkr: number; // Monthly SaaS & Enterprise
  merchantGrossSalesPkr: number; // Counter billings
  totalRefundedPkr: number;
  pendingVerificationCount: number;
  pendingVerificationAmountPkr: number;
}

export class DigitalPaymentEngine {
  private static instance: DigitalPaymentEngine;
  private storageKey = "quickpos_digital_payments_v1";
  private processedWebhookEventsKey = "quickpos_webhook_events_v1";

  private constructor() {}

  public static getInstance(): DigitalPaymentEngine {
    if (!DigitalPaymentEngine.instance) {
      DigitalPaymentEngine.instance = new DigitalPaymentEngine();
    }
    return DigitalPaymentEngine.instance;
  }

  private isBrowser(): boolean {
    return typeof window !== "undefined" && typeof localStorage !== "undefined";
  }

  // --- Initial Demonstration Data ---
  private getInitialPayments(): DigitalPaymentRecord[] {
    return [
      {
        id: "PMT-101",
        tenantId: "shop-01",
        storeCode: "MADINA-KIR",
        storeName: "Madina Kiryana Store",
        amountPkr: 5000,
        currency: "PKR",
        paymentReference: "JC-882910123",
        paymentPurpose: "hardware_installment_1",
        revenueCategory: "hardware_capex",
        paymentProvider: "jazzcash",
        status: "verified",
        createdAt: "2026-10-15T09:30:00.000Z",
        verificationTimestamp: "2026-10-15T09:35:12.000Z",
        verifiedByUid: "admin-root",
        verifiedByRole: "super_admin",
        verificationMethod: "admin_reconciliation",
        payerDetails: {
          senderName: "Muhammad Tariq",
          senderPhone: "0300-1234567",
        },
        notes: "Installment 1 paid for 58mm printer & initial software activation",
      },
      {
        id: "PMT-102",
        tenantId: "shop-01",
        storeCode: "MADINA-KIR",
        storeName: "Madina Kiryana Store",
        amountPkr: 6000,
        currency: "PKR",
        paymentReference: "HBL-44910299",
        paymentPurpose: "hardware_installment_2",
        revenueCategory: "hardware_capex",
        paymentProvider: "bank_transfer",
        status: "verified",
        createdAt: "2026-10-18T06:20:00.000Z",
        verificationTimestamp: "2026-10-18T06:25:00.000Z",
        verifiedByUid: "admin-root",
        verifiedByRole: "super_admin",
        verificationMethod: "admin_reconciliation",
        payerDetails: {
          senderName: "Muhammad Tariq",
          bankName: "Habib Bank Limited",
          accountMasked: "PK**HABB0012****4491",
        },
        notes: "Installment 2 paid. Hardware ownership transferred to merchant.",
      },
      {
        id: "PMT-103",
        tenantId: "shop-02",
        storeCode: "ALMAKKAH-MEAT",
        storeName: "Al-Makkah Meat & Poultry",
        amountPkr: 5000,
        currency: "PKR",
        paymentReference: "EP-99120488",
        paymentPurpose: "hardware_installment_1",
        revenueCategory: "hardware_capex",
        paymentProvider: "easypaisa",
        status: "verified",
        createdAt: "2026-10-19T11:45:00.000Z",
        verificationTimestamp: "2026-10-19T11:46:10.000Z",
        verifiedByUid: "gateway-easypaisa",
        verifiedByRole: "gateway_webhook",
        verificationMethod: "gateway_webhook",
        webhookEventId: "wh_ep_8829102",
        payerDetails: {
          senderName: "Haji Abdul Rasheed",
          senderPhone: "0333-9876543",
        },
        notes: "Auto-verified via EasyPaisa Instant Merchant IPN Webhook",
      },
      {
        id: "PMT-104",
        tenantId: "shop-03",
        storeCode: "STUDENT-BIRYANI",
        storeName: "Karachi Biryani & Pulao",
        amountPkr: 1000,
        currency: "PKR",
        paymentReference: "RAAST-88129033",
        paymentPurpose: "subscription_monthly_saas",
        revenueCategory: "recurring_saas",
        paymentProvider: "raast",
        status: "pending",
        createdAt: "2026-10-22T05:15:00.000Z",
        payerDetails: {
          senderName: "Kashif Ali",
          senderPhone: "0312-3456789",
        },
        notes: "Pending verification: Raast ID matching in Meezan Bank portal required.",
      },
      {
        id: "PMT-105",
        tenantId: "shop-04",
        storeCode: "MASTER-TAILORS",
        storeName: "Master Asif Tailors & Fabrics",
        amountPkr: 1000,
        currency: "PKR",
        paymentReference: "JC-11223344",
        paymentPurpose: "subscription_monthly_saas",
        revenueCategory: "recurring_saas",
        paymentProvider: "jazzcash",
        status: "verified",
        createdAt: "2026-10-23T08:00:00.000Z",
        verificationTimestamp: "2026-10-23T08:02:15.000Z",
        verifiedByUid: "admin-root",
        verifiedByRole: "super_admin",
        verificationMethod: "admin_reconciliation",
        payerDetails: {
          senderName: "Master Asif",
          senderPhone: "0300-8877665",
        },
        notes: "Monthly SaaS license renewal confirmed.",
      },
      {
        id: "PMT-106",
        tenantId: "shop-05",
        storeCode: "NOOR-BOUTIQUE",
        storeName: "Noor Designer Boutique",
        amountPkr: 2500,
        currency: "PKR",
        paymentReference: "RAAST-99441122",
        paymentPurpose: "enterprise_multi_counter",
        revenueCategory: "recurring_saas",
        paymentProvider: "raast",
        status: "verified",
        createdAt: "2026-10-20T10:00:00.000Z",
        verificationTimestamp: "2026-10-20T10:05:00.000Z",
        verifiedByUid: "admin-root",
        verifiedByRole: "super_admin",
        verificationMethod: "admin_reconciliation",
        notes: "Enterprise multi-counter monthly plan.",
      },
      {
        id: "PMT-107",
        tenantId: "shop-01",
        storeCode: "MADINA-KIR",
        storeName: "Madina Kiryana Store",
        amountPkr: 1200,
        currency: "PKR",
        paymentReference: "POS-INV-1002",
        paymentPurpose: "pos_counter_bill",
        revenueCategory: "merchant_gross_sales",
        paymentProvider: "raast",
        status: "verified",
        createdAt: "2026-10-23T14:30:00.000Z",
        verificationTimestamp: "2026-10-23T14:30:00.000Z",
        verifiedByUid: "cashier-01",
        customerName: "Rashid Minhas",
        notes: "Customer scanned Raast QR at checkout counter",
      },
    ];
  }

  // --- Repository Methods ---
  public getPayments(): DigitalPaymentRecord[] {
    if (!this.isBrowser()) return this.getInitialPayments();
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      const initial = this.getInitialPayments();
      this.savePayments(initial);
      return initial;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return this.getInitialPayments();
    }
  }

  public savePayments(payments: DigitalPaymentRecord[]): void {
    if (!this.isBrowser()) return;
    localStorage.setItem(this.storageKey, JSON.stringify(payments));
  }

  public getPaymentById(id: string): DigitalPaymentRecord | null {
    const list = this.getPayments();
    return list.find((p) => p.id === id) || null;
  }

  public getPaymentsByTenant(tenantId: string): DigitalPaymentRecord[] {
    const list = this.getPayments();
    return list.filter(
      (p) => p.tenantId === tenantId || p.storeCode.toLowerCase() === tenantId.toLowerCase()
    );
  }

  // --- Clean Revenue Separation Accounting ---
  public getRevenueBreakdown(): RevenueBreakdown {
    const payments = this.getPayments();
    let totalGrossVerifiedPkr = 0;
    let hardwareRevenuePkr = 0;
    let recurringSaasRevenuePkr = 0;
    let merchantGrossSalesPkr = 0;
    let totalRefundedPkr = 0;
    let pendingVerificationCount = 0;
    let pendingVerificationAmountPkr = 0;

    for (const p of payments) {
      if (p.status === "verified") {
        totalGrossVerifiedPkr += p.amountPkr;
        if (p.revenueCategory === "hardware_capex") {
          hardwareRevenuePkr += p.amountPkr;
        } else if (p.revenueCategory === "recurring_saas") {
          recurringSaasRevenuePkr += p.amountPkr;
        } else if (p.revenueCategory === "merchant_gross_sales") {
          merchantGrossSalesPkr += p.amountPkr;
        }
      } else if (p.status === "pending") {
        pendingVerificationCount++;
        pendingVerificationAmountPkr += p.amountPkr;
      } else if (p.status === "refunded") {
        totalRefundedPkr += p.amountPkr;
      }
    }

    return {
      totalGrossVerifiedPkr,
      hardwareRevenuePkr,
      recurringSaasRevenuePkr,
      merchantGrossSalesPkr,
      totalRefundedPkr,
      pendingVerificationCount,
      pendingVerificationAmountPkr,
    };
  }

  // --- Idempotent Webhook Delivery Ingestion ---
  public ingestGatewayWebhook(payload: {
    eventId: string;
    gatewayProvider: PaymentProvider;
    transactionReference: string;
    amountPkr: number;
    tenantId: string;
    storeCode: string;
    storeName?: string;
    paymentPurpose: PaymentPurpose;
    payerName?: string;
    payerPhone?: string;
    gatewayStatus: "SUCCESS" | "FAILED";
  }): {
    success: boolean;
    idempotent: boolean;
    status: PaymentStatus;
    message: string;
    paymentRecord?: DigitalPaymentRecord;
  } {
    // 1. Check idempotency log
    const processedEvents = this.getProcessedWebhookEvents();
    if (processedEvents.includes(payload.eventId)) {
      const existing = this.getPayments().find(
        (p) => p.webhookEventId === payload.eventId || p.paymentReference === payload.transactionReference
      );
      return {
        success: true,
        idempotent: true,
        status: existing?.status || "verified",
        message: `Idempotent duplicate webhook ignored. Event '${payload.eventId}' was already safely reconciled.`,
        paymentRecord: existing,
      };
    }

    // 2. Determine target revenue category
    let revenueCategory: RevenueCategory = "recurring_saas";
    if (
      payload.paymentPurpose === "hardware_installment_1" ||
      payload.paymentPurpose === "hardware_installment_2"
    ) {
      revenueCategory = "hardware_capex";
    } else if (payload.paymentPurpose === "pos_counter_bill") {
      revenueCategory = "merchant_gross_sales";
    }

    const targetStatus: PaymentStatus = payload.gatewayStatus === "SUCCESS" ? "verified" : "failed";
    const now = new Date().toISOString();

    const list = this.getPayments();
    // Check if pending transaction exists with this reference
    const existingIndex = list.findIndex(
      (p) => p.paymentReference.toUpperCase() === payload.transactionReference.toUpperCase()
    );

    let record: DigitalPaymentRecord;

    if (existingIndex >= 0) {
      record = {
        ...list[existingIndex],
        status: targetStatus,
        webhookEventId: payload.eventId,
        verificationTimestamp: targetStatus === "verified" ? now : undefined,
        verifiedByUid: `gateway-${payload.gatewayProvider}`,
        verifiedByRole: "gateway_webhook",
        verificationMethod: "gateway_webhook",
        failureReason: targetStatus === "failed" ? "Gateway returned FAILED status" : undefined,
      };
      list[existingIndex] = record;
    } else {
      record = {
        id: `PMT-${Date.now().toString().slice(-6)}`,
        tenantId: payload.tenantId,
        storeCode: payload.storeCode,
        storeName: payload.storeName || payload.storeCode,
        amountPkr: payload.amountPkr,
        currency: "PKR",
        paymentReference: payload.transactionReference.toUpperCase(),
        paymentPurpose: payload.paymentPurpose,
        revenueCategory,
        paymentProvider: payload.gatewayProvider,
        status: targetStatus,
        createdAt: now,
        verificationTimestamp: targetStatus === "verified" ? now : undefined,
        verifiedByUid: `gateway-${payload.gatewayProvider}`,
        verifiedByRole: "gateway_webhook",
        verificationMethod: "gateway_webhook",
        webhookEventId: payload.eventId,
        payerDetails: {
          senderName: payload.payerName,
          senderPhone: payload.payerPhone,
        },
        notes: `Processed via ${payload.gatewayProvider.toUpperCase()} automated webhook`,
      };
      list.unshift(record);
    }

    this.savePayments(list);
    this.recordProcessedWebhookEvent(payload.eventId);

    return {
      success: true,
      idempotent: false,
      status: targetStatus,
      message: `Gateway webhook processed successfully. Payment marked as ${targetStatus}.`,
      paymentRecord: record,
    };
  }

  // --- Strict RBAC Verification Workflow ---
  // RULE: "Do not allow Sales Representatives to manually mark a payment as verified
  // unless an explicitly authorized and audited reconciliation workflow permits it."
  public verifyPayment(
    paymentId: string,
    verifierInfo: {
      uid: string;
      role: "super_admin" | "sales_rep" | "authorized_auditor";
      confirmedTid: string;
      notes?: string;
    }
  ): { success: boolean; error?: string; paymentRecord?: DigitalPaymentRecord } {
    // Hard RBAC Guard
    if (verifierInfo.role === "sales_rep") {
      return {
        success: false,
        error:
          "UNAUTHORIZED: Sales Representatives are strictly forbidden from manually verifying payments. Verification requires Super Admin reconciliation.",
      };
    }

    if (!verifierInfo.confirmedTid || verifierInfo.confirmedTid.trim().length < 4) {
      return {
        success: false,
        error: "Rejection: Transaction Reference ID (TID) is required. Screenshots alone are strictly prohibited.",
      };
    }

    const list = this.getPayments();
    const index = list.findIndex((p) => p.id === paymentId);
    if (index === -1) {
      return { success: false, error: "Payment record not found." };
    }

    const current = list[index];
    if (current.status === "verified") {
      return { success: true, paymentRecord: current };
    }

    const updated: DigitalPaymentRecord = {
      ...current,
      status: "verified",
      paymentReference: verifierInfo.confirmedTid.trim().toUpperCase(),
      verificationTimestamp: new Date().toISOString(),
      verifiedByUid: verifierInfo.uid,
      verifiedByRole: verifierInfo.role,
      verificationMethod: "admin_reconciliation",
      notes: verifierInfo.notes || current.notes || "Reconciled against bank statement",
    };

    list[index] = updated;
    this.savePayments(list);

    return { success: true, paymentRecord: updated };
  }

  // --- Refund & Reversal Workflow ---
  public refundOrReversePayment(
    paymentId: string,
    reversalData: {
      amountPkr: number;
      reason: string;
      operatorUid: string;
      operatorRole: "super_admin" | "authorized_auditor";
      gatewayReversalRef?: string;
      notes?: string;
    }
  ): { success: boolean; error?: string; paymentRecord?: DigitalPaymentRecord } {
    const list = this.getPayments();
    const index = list.findIndex((p) => p.id === paymentId);
    if (index === -1) {
      return { success: false, error: "Payment record not found." };
    }

    const current = list[index];
    if (current.status === "refunded") {
      return { success: false, error: "Payment has already been refunded." };
    }

    const reversal: ReversalInfo = {
      refundId: `REF-${Date.now().toString().slice(-6)}`,
      amountPkr: reversalData.amountPkr,
      reason: reversalData.reason,
      reversedAt: new Date().toISOString(),
      reversedByUid: reversalData.operatorUid,
      reversedByRole: reversalData.operatorRole,
      gatewayReversalRef: reversalData.gatewayReversalRef || `REV-${Date.now().toString().slice(-8)}`,
      notes: reversalData.notes,
    };

    const updated: DigitalPaymentRecord = {
      ...current,
      status: "refunded",
      reversal,
      notes: `${current.notes || ""} | Refunded on ${new Date().toISOString().split("T")[0]} (${reversalData.reason})`,
    };

    list[index] = updated;
    this.savePayments(list);

    return { success: true, paymentRecord: updated };
  }

  // --- Idempotency Key Helpers ---
  private getProcessedWebhookEvents(): string[] {
    if (!this.isBrowser()) return [];
    const raw = localStorage.getItem(this.processedWebhookEventsKey);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  private recordProcessedWebhookEvent(eventId: string): void {
    if (!this.isBrowser()) return;
    const list = this.getProcessedWebhookEvents();
    if (!list.includes(eventId)) {
      list.push(eventId);
      localStorage.setItem(this.processedWebhookEventsKey, JSON.stringify(list.slice(-200)));
    }
  }
}

export const digitalPaymentEngine = DigitalPaymentEngine.getInstance();
