/**
 * QUICK-POS — SUBSCRIPTION MANAGEMENT & AUTOMATED REMINDERS ENGINE
 * Standard 11: Subscription lifecycle, multi-tier automated WhatsApp reminders,
 * configurable grace periods, offline grace policies, and verified payment reconciliation.
 */

export type SubscriptionStatus = "paid" | "due" | "grace_period" | "restricted" | "suspended";

export type ReminderTier =
  | "DUE_IN_3_DAYS"
  | "DUE_TODAY"
  | "IN_GRACE_PERIOD"
  | "GRACE_EXPIRED_RESTRICTED"
  | "PAYMENT_VERIFIED_REACTIVATED";

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  upfrontAmountPkr: number; // e.g. PKR 5,000 (Installment 1)
  secondInstallmentPkr: number; // e.g. PKR 6,000 (Installment 2)
  monthlySaasPkr: number; // e.g. PKR 1,000 / month from Month 3
  hardwareIncluded: "none" | "printer_58mm" | "printer_80mm";
  gracePeriodDays: number; // default: 5 days
  offlineGraceDays: number; // default: 7 days
}

export interface VerifiedPaymentEntry {
  paymentId: string;
  amountPkr: number;
  paymentMethod: "jazzcash" | "easypaisa" | "raast" | "bank_transfer";
  referenceId: string; // Mandatory bank/gateway reference (Never screenshot alone)
  paidAt: string;
  verifiedAt: string;
  verifiedByAdminUid: string;
  notes?: string;
}

export interface RenewalHistoryEntry {
  cycleId: string;
  periodStart: string;
  periodEnd: string;
  amountPkr: number;
  status: "paid" | "waived" | "overdue";
  paymentReference?: string;
  renewedAt: string;
}

export interface SubscriptionRecord {
  id: string;
  tenantId: string;
  storeCode: string;
  storeName: string;
  ownerName: string;
  phone: string;
  planId: string;
  planName: string;
  startDate: string;
  dueDate: string;
  status: SubscriptionStatus;
  monthlyAmountPkr: number;
  gracePeriodDays: number;
  graceEndsAt: string;
  offlineGraceDays: number;
  lastServerSyncAt: string;
  renewalHistory: RenewalHistoryEntry[];
  verifiedPayments: VerifiedPaymentEntry[];
  lastReminderSentTier?: ReminderTier;
  lastReminderSentAt?: string;
  reminderLogs: {
    tier: ReminderTier;
    sentAt: string;
    channel: "whatsapp_cloud_api" | "whatsapp_direct" | "sms";
    recipientPhone: string;
    messagePreview: string;
  }[];
}

export interface ConfigurableSubscriptionPolicy {
  monthlySaasFeePkr: number; // 1,000
  gracePeriodDays: number; // 5
  offlineGraceLimitDays: number; // 7
  autoRestrictedOnGraceExpiry: boolean; // true
  enable3DayReminder: boolean; // true
  enableDueDateReminder: boolean; // true
  enableGraceReminder: boolean; // true
  enableRestrictedNotice: boolean; // true
  enableReactivationReceipt: boolean; // true
  whatsappProvider: "meta_cloud_api" | "approved_gateway" | "direct_link";
  paymentRecipientInfo: {
    jazzcashTill: string;
    easypaisaTitle: string;
    easypaisaNumber: string;
    raastId: string;
    bankName: string;
    accountTitle: string;
    iban: string;
  };
}

export const DEFAULT_SUBSCRIPTION_POLICY: ConfigurableSubscriptionPolicy = {
  monthlySaasFeePkr: 1000,
  gracePeriodDays: 5,
  offlineGraceLimitDays: 7,
  autoRestrictedOnGraceExpiry: true,
  enable3DayReminder: true,
  enableDueDateReminder: true,
  enableGraceReminder: true,
  enableRestrictedNotice: true,
  enableReactivationReceipt: true,
  whatsappProvider: "direct_link",
  paymentRecipientInfo: {
    jazzcashTill: "QP-99420 (Quick-POS Tech)",
    easypaisaTitle: "Quick-POS Solutions",
    easypaisaNumber: "0300-8271940",
    raastId: "03008271940",
    bankName: "Meezan Bank Limited (Shah Faisal Colony Branch)",
    accountTitle: "Quick-POS Technology Pvt Ltd",
    iban: "PK74MEZN0099281726354819",
  },
};

export const STANDARD_PLANS: SubscriptionPlan[] = [
  {
    id: "plan-onboarding-bundle",
    name: "Shah Faisal Town Onboarding Package",
    description: "Includes 58mm Bluetooth thermal printer, installation, staff training, and 2 months platform access",
    upfrontAmountPkr: 5000,
    secondInstallmentPkr: 6000,
    monthlySaasPkr: 1000,
    hardwareIncluded: "printer_58mm",
    gracePeriodDays: 5,
    offlineGraceDays: 7,
  },
  {
    id: "plan-monthly-saas",
    name: "Standard Monthly Retail SaaS",
    description: "Standard monthly platform license from Month 3 onward. Includes unlimited billing and cloud backup",
    upfrontAmountPkr: 0,
    secondInstallmentPkr: 0,
    monthlySaasPkr: 1000,
    hardwareIncluded: "none",
    gracePeriodDays: 5,
    offlineGraceDays: 7,
  },
  {
    id: "plan-multi-counter",
    name: "Enterprise Multi-Counter Plan",
    description: "Supports up to 3 cash registers, barcode catalog sync, and multi-staff commission settlements",
    upfrontAmountPkr: 0,
    secondInstallmentPkr: 0,
    monthlySaasPkr: 2500,
    hardwareIncluded: "none",
    gracePeriodDays: 7,
    offlineGraceDays: 7,
  },
];

export class SubscriptionEngine {
  private static instance: SubscriptionEngine;
  private storageKey = "quickpos_subscriptions_v1";
  private policyKey = "quickpos_subscription_policy_v1";

  private constructor() {}

  public static getInstance(): SubscriptionEngine {
    if (!SubscriptionEngine.instance) {
      SubscriptionEngine.instance = new SubscriptionEngine();
    }
    return SubscriptionEngine.instance;
  }

  private isBrowser(): boolean {
    return typeof window !== "undefined" && typeof localStorage !== "undefined";
  }

  // --- Policy Management ---
  public getPolicy(): ConfigurableSubscriptionPolicy {
    if (!this.isBrowser()) return DEFAULT_SUBSCRIPTION_POLICY;
    const raw = localStorage.getItem(this.policyKey);
    if (!raw) return DEFAULT_SUBSCRIPTION_POLICY;
    try {
      return { ...DEFAULT_SUBSCRIPTION_POLICY, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_SUBSCRIPTION_POLICY;
    }
  }

  public updatePolicy(updates: Partial<ConfigurableSubscriptionPolicy>): void {
    if (!this.isBrowser()) return;
    const current = this.getPolicy();
    const updated = { ...current, ...updates };
    localStorage.setItem(this.policyKey, JSON.stringify(updated));
  }

  // --- Subscriptions Repository ---
  public getSubscriptions(): SubscriptionRecord[] {
    if (!this.isBrowser()) return this.getInitialSampleSubscriptions();
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      const initial = this.getInitialSampleSubscriptions();
      this.saveSubscriptions(initial);
      return initial;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return this.getInitialSampleSubscriptions();
    }
  }

  public saveSubscriptions(subs: SubscriptionRecord[]): void {
    if (!this.isBrowser()) return;
    localStorage.setItem(this.storageKey, JSON.stringify(subs));
  }

  public getSubscriptionByTenant(tenantId: string): SubscriptionRecord | null {
    const list = this.getSubscriptions();
    return list.find((s) => s.tenantId === tenantId || s.storeCode.toLowerCase() === tenantId.toLowerCase()) || null;
  }

  // --- Date Math & Status Calculation ---
  public calculateSubscriptionStatus(
    dueDateStr: string,
    gracePeriodDays: number = 5,
    verifiedPaid: boolean = false
  ): { status: SubscriptionStatus; daysRemaining: number; isOverdue: boolean; inGrace: boolean } {
    if (verifiedPaid) {
      return { status: "paid", daysRemaining: 30, isOverdue: false, inGrace: false };
    }

    const now = new Date();
    const dueDate = new Date(dueDateStr);
    const msPerDay = 1000 * 60 * 60 * 24;
    const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / msPerDay);

    if (diffDays > 3) {
      return { status: "paid", daysRemaining: diffDays, isOverdue: false, inGrace: false };
    } else if (diffDays >= 0 && diffDays <= 3) {
      return { status: "due", daysRemaining: diffDays, isOverdue: false, inGrace: false };
    } else {
      // Due date has passed
      const overdueDays = Math.abs(diffDays);
      if (overdueDays <= gracePeriodDays) {
        return { status: "grace_period", daysRemaining: gracePeriodDays - overdueDays, isOverdue: true, inGrace: true };
      } else {
        return { status: "restricted", daysRemaining: 0, isOverdue: true, inGrace: false };
      }
    }
  }

  // --- Safe Offline Grace Policy Checker ---
  public checkOfflineGracePolicy(
    sub: SubscriptionRecord,
    currentDeviceTime: Date = new Date()
  ): { allowed: boolean; reason: string; requiresSync: boolean } {
    const policy = this.getPolicy();
    const lastSync = new Date(sub.lastServerSyncAt || sub.startDate);
    const msPerDay = 1000 * 60 * 60 * 24;
    const offlineDays = (currentDeviceTime.getTime() - lastSync.getTime()) / msPerDay;

    if (sub.status === "restricted") {
      return {
        allowed: false,
        reason: "Subscription expired past grace period. New billing and printing are restricted.",
        requiresSync: true,
      };
    }

    if (offlineDays > policy.offlineGraceLimitDays) {
      return {
        allowed: false,
        reason: `Offline grace limit exceeded (${Math.floor(offlineDays)} days without server check). Connect to internet to verify license.`,
        requiresSync: true,
      };
    }

    return { allowed: true, reason: "Offline billing within authorized safety window.", requiresSync: false };
  }

  // --- 5-Tier Reminder Schedule Generator ---
  public generateReminder(
    sub: SubscriptionRecord,
    tier: ReminderTier
  ): {
    tier: ReminderTier;
    subject: string;
    bodyUrdu: string;
    bodyEn: string;
    whatsappUrl: string;
    cloudApiPayload: any;
  } {
    const policy = this.getPolicy();
    const { paymentRecipientInfo } = policy;
    const formattedAmount = `PKR ${sub.monthlyAmountPkr.toLocaleString()}`;
    const cleanPhone = sub.phone.replace(/[^0-9]/g, "");
    const waPhone = cleanPhone.startsWith("0") ? "92" + cleanPhone.slice(1) : cleanPhone;

    let bodyUrdu = "";
    let bodyEn = "";
    let subject = "";

    switch (tier) {
      case "DUE_IN_3_DAYS":
        subject = `Quick-POS Renewal Reminder (Due in 3 Days) — ${sub.storeName}`;
        bodyUrdu = `محترم ${sub.ownerName} صاحب (${sub.storeName})،\n\nآپ کے Quick-POS سسٹم کی ماہانہ سبسکرپشن فیس (${formattedAmount}) کی ادائیگی 3 دن بعد مورخہ ${sub.dueDate} کو واجب الادا ہے۔\n\nبغیر کسی تعطل کے بلنگ جاری رکھنے کے لیے برائے مہربانی ڈیجیٹل پیمنٹ ارسال کریں:\n\n• Raast ID: ${paymentRecipientInfo.raastId}\n• EasyPaisa: ${paymentRecipientInfo.easypaisaNumber} (${paymentRecipientInfo.easypaisaTitle})\n• JazzCash Till: ${paymentRecipientInfo.jazzcashTill}\n\nادائیگی کے بعد ٹرانزیکشن ID بذریعہ واٹس ایپ شیئر کریں۔ شکریہ!`;
        bodyEn = `Dear ${sub.ownerName} (${sub.storeName}),\n\nYour Quick-POS monthly subscription of ${formattedAmount} is due in 3 days on ${sub.dueDate}.\n\nPlease remit payment via:\n• Raast: ${paymentRecipientInfo.raastId}\n• EasyPaisa: ${paymentRecipientInfo.easypaisaNumber}\n• JazzCash Till: ${paymentRecipientInfo.jazzcashTill}\n\nShare transaction reference for instant reconciliation.`;
        break;

      case "DUE_TODAY":
        subject = `Subscription Due Today — ${sub.storeName}`;
        bodyUrdu = `محترم ${sub.ownerName} صاحب،\n\nآج آپ کے Quick-POS کی ماہانہ سبسکرپشن فیس (${formattedAmount}) جمع کروانے کی آخری تاریخ (${sub.dueDate}) ہے۔\n\nکسی بھی پریشانی سے بچنے کے لیے ابھی آن لائن ادائیگی فرمائیں:\n• Raast ID: ${paymentRecipientInfo.raastId}\n• EasyPaisa: ${paymentRecipientInfo.easypaisaNumber}\n\nشکریہ!`;
        bodyEn = `Dear ${sub.ownerName},\n\nYour Quick-POS subscription payment of ${formattedAmount} is due today (${sub.dueDate}). Please remit payment to maintain uninterrupted register service.`;
        break;

      case "IN_GRACE_PERIOD":
        subject = `⚠️ Urgent: Grace Period Active — ${sub.storeName}`;
        bodyUrdu = `محترم ${sub.ownerName} صاحب،\n\nآپ کی سبسکرپشن کی آخری تاریخ گزر چکی ہے۔ کمپنی پالیسی کے تحت آپ کو ${sub.gracePeriodDays} دن کا گریس پیریڈ دیا گیا ہے جو ${sub.graceEndsAt} کو ختم ہو جائے گا۔\n\nگریس پیریڈ کے بعد ٹرمینل پر بلنگ اور پرنٹنگ عارضی طور پر معطل کر دی جائے گی۔ برائے مہربانی فوری ادائیگی فرمائیں۔\n• واجب الادا رقم: ${formattedAmount}`;
        bodyEn = `Urgent Notice: Your Quick-POS subscription is overdue. A ${sub.gracePeriodDays}-day grace period is active until ${sub.graceEndsAt}. Please pay ${formattedAmount} to avoid register restriction.`;
        break;

      case "GRACE_EXPIRED_RESTRICTED":
        subject = `⛔ Account Restricted: Grace Period Expired — ${sub.storeName}`;
        bodyUrdu = `محترم دکاندار (${sub.storeName})،\n\nگریس پیریڈ ختم ہونے کی وجہ سے آپ کا Quick-POS ٹرمینل ریڈ اونلی (Restricted Mode) پر منتقل کر دیا گیا ہے۔ نیا بل اور تھرمل پرنٹ بند ہے۔\n\nٹرمینل کو دوبارہ بحال کروانے کے لیے ${formattedAmount} جمع کروا کر ٹرانزیکشن ریفرنس ہمارے ہیلپ لائن نمبر پر بھیجیں۔`;
        bodyEn = `Account Restricted: Your Quick-POS terminal has entered Read-Only mode due to unpaid subscription. New billing & printing are disabled. Pay ${formattedAmount} to reactivate immediately.`;
        break;

      case "PAYMENT_VERIFIED_REACTIVATED":
        subject = `✅ Payment Verified & Terminal Reactivated — ${sub.storeName}`;
        bodyUrdu = `محترم ${sub.ownerName} صاحب (${sub.storeName})،\n\nآپ کی ڈیجیٹل پیمنٹ بمبلغ ${formattedAmount} تصدیق ہو چکی ہے۔ آپ کا Quick-POS ٹرمینل مکمل بحال کر دیا گیا ہے۔\n\n• اگلی تاریخ ادائیگی: ${sub.dueDate}\n\nQuick-POS پر اعتماد کا شکریہ!`;
        bodyEn = `Payment Verified: Your payment of ${formattedAmount} has been verified by administration. Your terminal is fully reactivated. Next due date: ${sub.dueDate}.`;
        break;
    }

    const whatsappUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(bodyUrdu)}`;

    const cloudApiPayload = {
      messaging_product: "whatsapp",
      to: waPhone,
      type: "template",
      template: {
        name: `quickpos_${tier.toLowerCase()}`,
        language: { code: "ur" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: sub.ownerName },
              { type: "text", text: sub.storeName },
              { type: "text", text: formattedAmount },
              { type: "text", text: sub.dueDate },
            ],
          },
        ],
      },
    };

    return { tier, subject, bodyUrdu, bodyEn, whatsappUrl, cloudApiPayload };
  }

  // Record reminder dispatch to avoid spamming
  public logReminderSent(
    tenantId: string,
    tier: ReminderTier,
    channel: "whatsapp_cloud_api" | "whatsapp_direct" | "sms"
  ): void {
    const list = this.getSubscriptions();
    const updated = list.map((s) => {
      if (s.tenantId === tenantId || s.storeCode.toLowerCase() === tenantId.toLowerCase()) {
        const reminderLog = {
          tier,
          sentAt: new Date().toISOString(),
          channel,
          recipientPhone: s.phone,
          messagePreview: `Tier: ${tier} sent via ${channel}`,
        };
        return {
          ...s,
          lastReminderSentTier: tier,
          lastReminderSentAt: new Date().toISOString(),
          reminderLogs: [reminderLog, ...(s.reminderLogs || [])].slice(0, 20),
        };
      }
      return s;
    });
    this.saveSubscriptions(updated);
  }

  // --- Strict Verified Payment & Reactivation ---
  // RULE: Do not reactivate subscriptions solely from payment screenshots.
  public verifyPaymentAndReactivate(
    tenantId: string,
    payment: {
      amountPkr: number;
      paymentMethod: "jazzcash" | "easypaisa" | "raast" | "bank_transfer";
      referenceId: string;
      verifiedByAdminUid: string;
      notes?: string;
    }
  ): { success: boolean; message: string; updatedSub?: SubscriptionRecord } {
    if (!payment.referenceId || payment.referenceId.trim().length < 4) {
      return {
        success: false,
        message: "Rejected: Verified transaction reference ID (Bank/Raast/JazzCash) is required. Screenshots alone are not permitted.",
      };
    }

    const list = this.getSubscriptions();
    const sub = list.find((s) => s.tenantId === tenantId || s.storeCode.toLowerCase() === tenantId.toLowerCase());
    if (!sub) {
      return { success: false, message: "Subscription record not found for tenant." };
    }

    const now = new Date();
    // Extend due date by 30 days
    const nextDue = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const nextGrace = new Date(nextDue.getTime() + (sub.gracePeriodDays || 5) * 24 * 60 * 60 * 1000);

    const verifiedEntry: VerifiedPaymentEntry = {
      paymentId: "PAY-" + Date.now().toString().slice(-6),
      amountPkr: payment.amountPkr,
      paymentMethod: payment.paymentMethod,
      referenceId: payment.referenceId.trim().toUpperCase(),
      paidAt: now.toISOString(),
      verifiedAt: now.toISOString(),
      verifiedByAdminUid: payment.verifiedByAdminUid,
      notes: payment.notes || "Verified by Super Admin",
    };

    const renewalEntry: RenewalHistoryEntry = {
      cycleId: "CYC-" + Date.now().toString().slice(-6),
      periodStart: now.toISOString().split("T")[0],
      periodEnd: nextDue.toISOString().split("T")[0],
      amountPkr: payment.amountPkr,
      status: "paid",
      paymentReference: payment.referenceId.trim().toUpperCase(),
      renewedAt: now.toISOString(),
    };

    const updatedSub: SubscriptionRecord = {
      ...sub,
      status: "paid",
      dueDate: nextDue.toISOString().split("T")[0],
      graceEndsAt: nextGrace.toISOString().split("T")[0],
      lastServerSyncAt: now.toISOString(),
      verifiedPayments: [verifiedEntry, ...(sub.verifiedPayments || [])],
      renewalHistory: [renewalEntry, ...(sub.renewalHistory || [])],
    };

    const updatedList = list.map((s) => (s.id === sub.id ? updatedSub : s));
    this.saveSubscriptions(updatedList);

    return {
      success: true,
      message: `Verified successfully! Subscription extended to ${updatedSub.dueDate}. Terminal fully reactivated.`,
      updatedSub,
    };
  }

  // --- Initial Seed Data for Shah Faisal Town Pilot Shops ---
  private getInitialSampleSubscriptions(): SubscriptionRecord[] {
    return [
      {
        id: "sub-madina",
        tenantId: "store-madina",
        storeCode: "MADINA-KIR",
        storeName: "Madina Kiryana & General Store",
        ownerName: "Tariq Mehmood",
        phone: "0300-1234567",
        planId: "plan-onboarding-bundle",
        planName: "Shah Faisal Town Onboarding Package",
        startDate: "2026-08-20",
        dueDate: "2026-11-20",
        status: "paid",
        monthlyAmountPkr: 1000,
        gracePeriodDays: 5,
        graceEndsAt: "2026-11-25",
        offlineGraceDays: 7,
        lastServerSyncAt: new Date().toISOString(),
        renewalHistory: [
          { cycleId: "CYC-01", periodStart: "2026-08-20", periodEnd: "2026-10-20", amountPkr: 5000, status: "paid", paymentReference: "EP-882194", renewedAt: "2026-08-20" },
        ],
        verifiedPayments: [
          { paymentId: "P-101", amountPkr: 5000, paymentMethod: "easypaisa", referenceId: "EP-882194", paidAt: "2026-08-20", verifiedAt: "2026-08-20", verifiedByAdminUid: "ADMIN-ROOT" },
        ],
        reminderLogs: [],
      },
      {
        id: "sub-almakkah",
        tenantId: "store-almakkah",
        storeCode: "ALMAKKAH-MEAT",
        storeName: "Al-Makkah Fresh Meat Shop",
        ownerName: "Haji Munawwar",
        phone: "0333-9876543",
        planId: "plan-monthly-saas",
        planName: "Standard Monthly Retail SaaS",
        startDate: "2026-09-01",
        dueDate: "2026-10-25", // Due in 2 days (Trigger Tier 1)
        status: "due",
        monthlyAmountPkr: 1000,
        gracePeriodDays: 5,
        graceEndsAt: "2026-10-30",
        offlineGraceDays: 7,
        lastServerSyncAt: new Date().toISOString(),
        renewalHistory: [],
        verifiedPayments: [],
        reminderLogs: [],
      },
      {
        id: "sub-biryani",
        tenantId: "store-biryani",
        storeCode: "STUDENT-BIRYANI",
        storeName: "Student Biryani & Food Corner",
        ownerName: "Farhan Siddiqui",
        phone: "0321-4455667",
        planId: "plan-monthly-saas",
        planName: "Standard Monthly Retail SaaS",
        startDate: "2026-08-15",
        dueDate: "2026-10-21", // 2 days overdue (In Grace Period)
        status: "grace_period",
        monthlyAmountPkr: 1000,
        gracePeriodDays: 5,
        graceEndsAt: "2026-10-26",
        offlineGraceDays: 7,
        lastServerSyncAt: new Date().toISOString(),
        renewalHistory: [],
        verifiedPayments: [],
        reminderLogs: [],
      },
      {
        id: "sub-tailors",
        tenantId: "store-tailors",
        storeCode: "MASTER-TAILORS",
        storeName: "Master Asif Tailors & Fabrics",
        ownerName: "Master Asif",
        phone: "0345-1122334",
        planId: "plan-monthly-saas",
        planName: "Standard Monthly Retail SaaS",
        startDate: "2026-07-10",
        dueDate: "2026-10-10", // 13 days overdue (Restricted / Read-Only)
        status: "restricted",
        monthlyAmountPkr: 1000,
        gracePeriodDays: 5,
        graceEndsAt: "2026-10-15",
        offlineGraceDays: 7,
        lastServerSyncAt: new Date().toISOString(),
        renewalHistory: [],
        verifiedPayments: [],
        reminderLogs: [],
      },
      {
        id: "sub-boutique",
        tenantId: "store-boutique",
        storeCode: "NOOR-BOUTIQUE",
        storeName: "Noor Designer Boutique",
        ownerName: "Syeda Noor",
        phone: "0301-7788990",
        planId: "plan-monthly-saas",
        planName: "Standard Monthly Retail SaaS",
        startDate: "2026-09-15",
        dueDate: "2026-11-15",
        status: "paid",
        monthlyAmountPkr: 1000,
        gracePeriodDays: 5,
        graceEndsAt: "2026-11-20",
        offlineGraceDays: 7,
        lastServerSyncAt: new Date().toISOString(),
        renewalHistory: [],
        verifiedPayments: [],
        reminderLogs: [],
      },
    ];
  }
}

export const subscriptionEngine = SubscriptionEngine.getInstance();
