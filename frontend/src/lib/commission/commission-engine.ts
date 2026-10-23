/**
 * QUICK-POS — STAFF & WORKER COMMISSION MANAGEMENT ENGINE
 * Standard 7: Configuration-driven Worker Commission, Rules, Entries, and Settlement Ledger.
 *
 * Implements:
 * 1. Worker profiles (name, phone, role, joining date, active status, payment types, targets)
 * 2. 7 Commission methods:
 *    - Percentage of eligible sales (e.g. 5% of PKR 100,000 = PKR 5,000)
 *    - Fixed amount per sale (e.g. PKR 50 per receipt)
 *    - Product-based commission (e.g. PKR 150 on specific item)
 *    - Category-based commission (e.g. 8% on Pret Wear)
 *    - Fixed commission per completed order (e.g. PKR 350 per stitched suit)
 *    - Target-based bonus (e.g. PKR 5,000 if target reached)
 *    - Commission split among multiple workers (e.g. Cutter 60% / Stitcher 40%)
 * 3. Explicit financial policies (deduct discounts, allow/block credit sales, refund clawbacks)
 * 4. Collections: workers, commissionRules, commissionEntries, commissionSettlements
 * 5. Immutable settlement history & duplicate settlement prevention
 * 6. Daily, Weekly, and Monthly worker performance reports
 */

export type WorkerPaymentType =
  | "fixed_salary"
  | "commission_only"
  | "salary_plus_commission";

export type CommissionMethod =
  | "percentage_sales"
  | "fixed_per_sale"
  | "product_based"
  | "category_based"
  | "fixed_per_order"
  | "target_bonus"
  | "split_commission";

export interface CommissionFinancialPolicies {
  deduct_discounts: boolean; // calculate commission after bill discount is subtracted
  allow_credit_sales: boolean; // if false, credit/udhaar sales do not accrue until paid
  refund_clawback: boolean; // reverse commission on item return or order cancellation
  split_enabled: boolean; // whether order commission can be split across multiple workers
}

export interface CommissionSplitRule {
  role: string;
  workerId?: string;
  sharePercentage: number; // e.g. 60 for 60%
}

export interface CommissionRule {
  id: string;
  tenantId: string;
  name: string;
  method: CommissionMethod;
  rate: number; // percentage (e.g. 5) or fixed PKR amount (e.g. 350)
  applicableProductIds?: string[];
  applicableCategories?: string[];
  splitRules?: CommissionSplitRule[];
  targetThreshold?: number; // for target_bonus (e.g. sales > PKR 200,000)
  bonusAmount?: number; // for target_bonus (e.g. PKR 5,000)
  policies: CommissionFinancialPolicies;
  is_active: boolean;
  description: string;
}

export interface WorkerSalesTarget {
  targetAmount: number; // e.g. 200,000
  period: "daily" | "weekly" | "monthly";
  currentSales: number;
  bonusAmount: number; // e.g. 5,000
  bonusUnlocked: boolean;
}

export interface WorkerRecord {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  role: string; // "Master Cutter" | "Senior Stitcher" | "Boutique Sales Staff" | "Cashier"
  joiningDate: string; // ISO date e.g. "2025-01-15"
  status: "active" | "inactive";
  paymentType: WorkerPaymentType;
  baseSalary: number; // PKR/month (for fixed_salary or salary_plus_commission)
  applicableRuleIds: string[];
  salesTarget: WorkerSalesTarget;
  notes?: string;
  created_at: string;
}

export interface CommissionEntry {
  id: string;
  tenantId: string;
  workerId: string;
  workerName: string;
  originatingSaleId: string; // Reference to originating sale or order
  originatingOrderId?: string; // Optional custom order id e.g. ST-101
  ruleId: string;
  ruleName: string;
  entryType: "earned" | "refund_clawback" | "target_bonus" | "manual_adjustment";
  grossAmount: number;
  discountDeducted: number;
  eligibleAmount: number;
  commissionRate: number;
  commissionAmount: number; // Positive for earned/bonus, negative for clawback
  isCreditSale: boolean;
  status: "pending" | "settled" | "clawbacked";
  settlementId?: string;
  createdAt: string; // ISO timestamp
  notes?: string;
}

export interface CommissionSettlement {
  id: string;
  tenantId: string;
  receiptNumber: string; // e.g. SET-20261020-001
  workerId: string;
  workerName: string;
  period: "daily" | "weekly" | "monthly" | "ad_hoc";
  periodStart: string;
  periodEnd: string;
  settlementType: "commission" | "salary" | "salary_plus_commission" | "adjustment";
  baseSalaryPaid: number;
  commissionPaid: number;
  advanceDeducted: number;
  totalPaid: number;
  paymentMethod: "cash" | "bank_transfer" | "easypaisa" | "jazzcash";
  paymentReference?: string;
  coveredEntryIds: string[]; // List of entry IDs settled to prevent duplicates
  previousPendingBalance: number;
  remainingPendingBalance: number;
  settledBy: string;
  settledAt: string;
  notes?: string;
}

export interface WorkerPerformanceReport {
  worker: WorkerRecord;
  timeRange: "daily" | "weekly" | "monthly";
  salesAttributed: number;
  orderCount: number;
  commissionEarned: number;
  commissionClawbacked: number;
  commissionPending: number;
  commissionPaid: number;
  salaryPaid: number;
  advancesDeducted: number;
  netPendingDue: number;
  targetProgressPercent: number;
  targetBonusUnlocked: boolean;
  recentEntries: CommissionEntry[];
  settlementHistory: CommissionSettlement[];
}

const STORAGE_KEYS = {
  WORKERS: "quickpos_workers",
  RULES: "quickpos_commission_rules",
  ENTRIES: "quickpos_commission_entries",
  SETTLEMENTS: "quickpos_commission_settlements",
};

export class CommissionEngine {
  private static instance: CommissionEngine;

  private isBrowser(): boolean {
    return typeof window !== "undefined";
  }

  public static getInstance(): CommissionEngine {
    if (!CommissionEngine.instance) {
      CommissionEngine.instance = new CommissionEngine();
    }
    return CommissionEngine.instance;
  }

  // =========================================================================
  // SEED DEFAULTS FOR MULTI-TENANT SYSTEM
  // =========================================================================
  public ensureInitialized(): void {
    if (!this.isBrowser()) return;

    // 1. Initialize Rules if not present
    if (!localStorage.getItem(STORAGE_KEYS.RULES)) {
      const defaultRules: CommissionRule[] = [
        {
          id: "rule-pct-sales-5",
          tenantId: "shop-05", // Noor Boutique
          name: "Boutique Sales Rep 5% Commission",
          method: "percentage_sales",
          rate: 5, // 5%
          policies: {
            deduct_discounts: true,
            allow_credit_sales: false,
            refund_clawback: true,
            split_enabled: false,
          },
          is_active: true,
          description: "Earn 5% on net eligible sales after discounts. Reversible on refunds.",
        },
        {
          id: "rule-tailor-stitch-fixed",
          tenantId: "shop-04", // Umer Tailors
          name: "Suit Stitching PKR 350 / Order",
          method: "fixed_per_order",
          rate: 350,
          policies: {
            deduct_discounts: false,
            allow_credit_sales: true,
            refund_clawback: true,
            split_enabled: true,
          },
          splitRules: [
            { role: "Master Cutter", sharePercentage: 55 },
            { role: "Stitching Tailor", sharePercentage: 45 },
          ],
          is_active: true,
          description: "Fixed PKR 350 per suit split between Master Cutter (55%) and Stitcher (45%).",
        },
        {
          id: "rule-pret-category-8",
          tenantId: "shop-05", // Noor Boutique
          name: "Pret Wear Category 8% Commission",
          method: "category_based",
          rate: 8,
          applicableCategories: ["Pret Wear"],
          policies: {
            deduct_discounts: true,
            allow_credit_sales: false,
            refund_clawback: true,
            split_enabled: false,
          },
          is_active: true,
          description: "8% commission on ready-to-wear Pret items.",
        },
        {
          id: "rule-target-bonus-5k",
          tenantId: "shop-05",
          name: "Monthly Target Incentive Bonus",
          method: "target_bonus",
          rate: 0,
          targetThreshold: 200000,
          bonusAmount: 5000,
          policies: {
            deduct_discounts: true,
            allow_credit_sales: false,
            refund_clawback: true,
            split_enabled: false,
          },
          is_active: true,
          description: "PKR 5,000 cash bonus awarded when monthly sales exceed PKR 200,000.",
        },
        {
          id: "rule-fixed-sale-50",
          tenantId: "shop-01", // Kiryana
          name: "Floor Cashier PKR 25 / Sale",
          method: "fixed_per_sale",
          rate: 25,
          policies: {
            deduct_discounts: false,
            allow_credit_sales: true,
            refund_clawback: true,
            split_enabled: false,
          },
          is_active: true,
          description: "Fixed PKR 25 incentive per completed Kiryana billing checkout.",
        },
      ];
      localStorage.setItem(STORAGE_KEYS.RULES, JSON.stringify(defaultRules));
    }

    // 2. Initialize Workers if not present
    if (!localStorage.getItem(STORAGE_KEYS.WORKERS)) {
      const defaultWorkers: WorkerRecord[] = [
        {
          id: "wrk-101",
          tenantId: "shop-05", // Noor Boutique
          name: "Ayesha Malik",
          phone: "0302-8877665",
          role: "Boutique Sales Consultant",
          joiningDate: "2025-04-01",
          status: "active",
          paymentType: "salary_plus_commission",
          baseSalary: 28000,
          applicableRuleIds: ["rule-pct-sales-5", "rule-pret-category-8", "rule-target-bonus-5k"],
          salesTarget: {
            targetAmount: 200000,
            period: "monthly",
            currentSales: 145000,
            bonusAmount: 5000,
            bonusUnlocked: false,
          },
          notes: "Top performer in Pret & Unstitched Lawn sales.",
          created_at: "2025-04-01",
        },
        {
          id: "wrk-102",
          tenantId: "shop-04", // Umer Tailor
          name: "Master Asif",
          phone: "0300-3344556",
          role: "Master Cutter",
          joiningDate: "2024-11-10",
          status: "active",
          paymentType: "commission_only",
          baseSalary: 0,
          applicableRuleIds: ["rule-tailor-stitch-fixed"],
          salesTarget: {
            targetAmount: 60, // 60 suits/month
            period: "monthly",
            currentSales: 44,
            bonusAmount: 4000,
            bonusUnlocked: false,
          },
          notes: "Specialist in Gents Shalwar Kameez cutting & fitting.",
          created_at: "2024-11-10",
        },
        {
          id: "wrk-103",
          tenantId: "shop-04", // Umer Tailor
          name: "Sajid Karigar",
          phone: "0333-5566778",
          role: "Stitching Karigar",
          joiningDate: "2025-02-01",
          status: "active",
          paymentType: "commission_only",
          baseSalary: 0,
          applicableRuleIds: ["rule-tailor-stitch-fixed"],
          salesTarget: {
            targetAmount: 50,
            period: "monthly",
            currentSales: 38,
            bonusAmount: 3000,
            bonusUnlocked: false,
          },
          notes: "Overlock, collar and buttoning specialist.",
          created_at: "2025-02-01",
        },
        {
          id: "wrk-104",
          tenantId: "shop-01", // Madina Kiryana
          name: "Bilal Cashier",
          phone: "0345-7788990",
          role: "Counter Cashier",
          joiningDate: "2025-06-15",
          status: "active",
          paymentType: "fixed_salary",
          baseSalary: 25000,
          applicableRuleIds: ["rule-fixed-sale-50"],
          salesTarget: {
            targetAmount: 300000,
            period: "monthly",
            currentSales: 210000,
            bonusAmount: 2500,
            bonusUnlocked: false,
          },
          notes: "Handles morning shift cash drawer.",
          created_at: "2025-06-15",
        },
      ];
      localStorage.setItem(STORAGE_KEYS.WORKERS, JSON.stringify(defaultWorkers));
    }

    // 3. Initialize Entries if not present
    if (!localStorage.getItem(STORAGE_KEYS.ENTRIES)) {
      const defaultEntries: CommissionEntry[] = [
        {
          id: "cme-201",
          tenantId: "shop-05",
          workerId: "wrk-101",
          workerName: "Ayesha Malik",
          originatingSaleId: "REC-1082",
          ruleId: "rule-pct-sales-5",
          ruleName: "Boutique Sales Rep 5% Commission",
          entryType: "earned",
          grossAmount: 12500,
          discountDeducted: 500,
          eligibleAmount: 12000,
          commissionRate: 5,
          commissionAmount: 600, // 5% of 12,000
          isCreditSale: false,
          status: "settled",
          settlementId: "SET-20261015-01",
          createdAt: "2026-10-15T14:30:00Z",
          notes: "Sale of 2x Embroidered Lawn Suits",
        },
        {
          id: "cme-202",
          tenantId: "shop-05",
          workerId: "wrk-101",
          workerName: "Ayesha Malik",
          originatingSaleId: "REC-1095",
          ruleId: "rule-pret-category-8",
          ruleName: "Pret Wear Category 8% Commission",
          entryType: "earned",
          grossAmount: 8500,
          discountDeducted: 0,
          eligibleAmount: 8500,
          commissionRate: 8,
          commissionAmount: 680,
          isCreditSale: false,
          status: "pending",
          createdAt: "2026-10-19T11:20:00Z",
          notes: "Sale of Pret Kurti & Silk Dupatta",
        },
        {
          id: "cme-203",
          tenantId: "shop-05",
          workerId: "wrk-101",
          workerName: "Ayesha Malik",
          originatingSaleId: "REC-1102",
          ruleId: "rule-pct-sales-5",
          ruleName: "Boutique Sales Rep 5% Commission",
          entryType: "refund_clawback",
          grossAmount: 4500,
          discountDeducted: 0,
          eligibleAmount: 4500,
          commissionRate: 5,
          commissionAmount: -225, // Clawback negative entry
          isCreditSale: false,
          status: "pending",
          createdAt: "2026-10-19T16:45:00Z",
          notes: "Customer return adjustment on unstitched lawn defect",
        },
        {
          id: "cme-204",
          tenantId: "shop-04",
          workerId: "wrk-102",
          workerName: "Master Asif",
          originatingSaleId: "ST-101",
          originatingOrderId: "ST-101",
          ruleId: "rule-tailor-stitch-fixed",
          ruleName: "Suit Stitching PKR 350 / Order",
          entryType: "earned",
          grossAmount: 1200,
          discountDeducted: 0,
          eligibleAmount: 1200,
          commissionRate: 55, // 55% of 350 = 192.5 => 195 rounded
          commissionAmount: 195,
          isCreditSale: false,
          status: "pending",
          createdAt: "2026-10-18T10:00:00Z",
          notes: "Cutting share for White Cotton Shalwar Kameez",
        },
        {
          id: "cme-205",
          tenantId: "shop-04",
          workerId: "wrk-103",
          workerName: "Sajid Karigar",
          originatingSaleId: "ST-101",
          originatingOrderId: "ST-101",
          ruleId: "rule-tailor-stitch-fixed",
          ruleName: "Suit Stitching PKR 350 / Order",
          entryType: "earned",
          grossAmount: 1200,
          discountDeducted: 0,
          eligibleAmount: 1200,
          commissionRate: 45, // 45% of 350 = 155
          commissionAmount: 155,
          isCreditSale: false,
          status: "pending",
          createdAt: "2026-10-18T10:00:00Z",
          notes: "Stitching share for White Cotton Shalwar Kameez",
        },
      ];
      localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(defaultEntries));
    }

    // 4. Initialize Settlements if not present
    if (!localStorage.getItem(STORAGE_KEYS.SETTLEMENTS)) {
      const defaultSettlements: CommissionSettlement[] = [
        {
          id: "SET-20261015-01",
          tenantId: "shop-05",
          receiptNumber: "SET-20261015-01",
          workerId: "wrk-101",
          workerName: "Ayesha Malik",
          period: "weekly",
          periodStart: "2026-10-08",
          periodEnd: "2026-10-14",
          settlementType: "commission",
          baseSalaryPaid: 0,
          commissionPaid: 3200,
          advanceDeducted: 1000,
          totalPaid: 2200,
          paymentMethod: "easypaisa",
          paymentReference: "EP-982173491",
          coveredEntryIds: ["cme-201"],
          previousPendingBalance: 3200,
          remainingPendingBalance: 0,
          settledBy: "Mrs. Sadia Khan (Owner)",
          settledAt: "2026-10-15T18:00:00Z",
          notes: "Weekly commission paid via EasyPaisa with advance adjustment.",
        },
      ];
      localStorage.setItem(STORAGE_KEYS.SETTLEMENTS, JSON.stringify(defaultSettlements));
    }
  }

  // =========================================================================
  // WORKERS CRUD
  // =========================================================================
  public getWorkers(tenantId?: string): WorkerRecord[] {
    if (!this.isBrowser()) return [];
    this.ensureInitialized();
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.WORKERS);
      if (!raw) return [];
      const list = JSON.parse(raw) as WorkerRecord[];
      if (!tenantId) return list;
      return list.filter((w) => w.tenantId === tenantId);
    } catch {
      return [];
    }
  }

  public saveWorker(worker: WorkerRecord): void {
    if (!this.isBrowser()) return;
    const list = this.getWorkers();
    const existingIndex = list.findIndex((w) => w.id === worker.id);
    if (existingIndex >= 0) {
      list[existingIndex] = worker;
    } else {
      list.unshift(worker);
    }
    localStorage.setItem(STORAGE_KEYS.WORKERS, JSON.stringify(list));
  }

  public createWorker(data: Omit<WorkerRecord, "id" | "created_at">): WorkerRecord {
    const newWorker: WorkerRecord = {
      ...data,
      id: `wrk-${Date.now().toString(36)}`,
      created_at: new Date().toISOString().split("T")[0],
    };
    this.saveWorker(newWorker);
    return newWorker;
  }

  // =========================================================================
  // COMMISSION RULES CRUD
  // =========================================================================
  public getRules(tenantId?: string): CommissionRule[] {
    if (!this.isBrowser()) return [];
    this.ensureInitialized();
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.RULES);
      if (!raw) return [];
      const list = JSON.parse(raw) as CommissionRule[];
      if (!tenantId) return list;
      return list.filter((r) => r.tenantId === tenantId);
    } catch {
      return [];
    }
  }

  public saveRule(rule: CommissionRule): void {
    if (!this.isBrowser()) return;
    const list = this.getRules();
    const idx = list.findIndex((r) => r.id === rule.id);
    if (idx >= 0) {
      list[idx] = rule;
    } else {
      list.unshift(rule);
    }
    localStorage.setItem(STORAGE_KEYS.RULES, JSON.stringify(list));
  }

  // =========================================================================
  // COMMISSION ENTRIES (CALCULATIONS & INTEGRITY)
  // =========================================================================
  public getEntries(tenantId?: string, workerId?: string): CommissionEntry[] {
    if (!this.isBrowser()) return [];
    this.ensureInitialized();
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ENTRIES);
      if (!raw) return [];
      let list = JSON.parse(raw) as CommissionEntry[];
      if (tenantId) {
        list = list.filter((e) => e.tenantId === tenantId);
      }
      if (workerId) {
        list = list.filter((e) => e.workerId === workerId);
      }
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch {
      return [];
    }
  }

  public addEntry(entry: CommissionEntry): void {
    if (!this.isBrowser()) return;
    const list = this.getEntries();
    list.unshift(entry);
    localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(list));
  }

  /**
   * Calculates commission for an originating sale or order adhering to explicit financial policies:
   * - Deduct discounts policy
   * - Allow/disallow credit sales policy
   * - Product or category filtering
   * - Split commission across workers
   */
  public recordSaleCommission(params: {
    tenantId: string;
    originatingSaleId: string;
    originatingOrderId?: string;
    workerId: string;
    workerName: string;
    grossBill: number;
    discountAmount: number;
    isCreditSale: boolean;
    items?: { id: string; category?: string; price: number; quantity: number }[];
    notes?: string;
  }): CommissionEntry[] {
    const rules = this.getRules(params.tenantId).filter((r) => r.is_active);
    const worker = this.getWorkers(params.tenantId).find((w) => w.id === params.workerId);
    if (!worker || worker.status !== "active") return [];

    // Filter rules applicable to this worker
    const applicableRules = rules.filter((r) =>
      worker.applicableRuleIds.includes(r.id)
    );

    const generatedEntries: CommissionEntry[] = [];

    for (const rule of applicableRules) {
      // 1. Check Credit Sale policy
      if (params.isCreditSale && !rule.policies.allow_credit_sales) {
        // Commission does not accrue immediately on unpaid udhaar
        continue;
      }

      // 2. Calculate eligible amount
      let eligibleAmount = params.grossBill;
      if (rule.policies.deduct_discounts) {
        eligibleAmount = Math.max(0, params.grossBill - params.discountAmount);
      }

      let commAmount = 0;

      switch (rule.method) {
        case "percentage_sales": {
          commAmount = Math.round((eligibleAmount * rule.rate) / 100);
          break;
        }

        case "fixed_per_sale": {
          commAmount = rule.rate;
          break;
        }

        case "fixed_per_order": {
          commAmount = rule.rate;
          break;
        }

        case "category_based": {
          if (params.items && rule.applicableCategories) {
            const categoryTotal = params.items
              .filter((i) => i.category && rule.applicableCategories?.includes(i.category))
              .reduce((sum, i) => sum + i.price * i.quantity, 0);
            const netCat = rule.policies.deduct_discounts
              ? Math.max(0, categoryTotal - params.discountAmount)
              : categoryTotal;
            commAmount = Math.round((netCat * rule.rate) / 100);
          }
          break;
        }

        case "product_based": {
          if (params.items && rule.applicableProductIds) {
            const matchingCount = params.items
              .filter((i) => rule.applicableProductIds?.includes(i.id))
              .reduce((sum, i) => sum + i.quantity, 0);
            commAmount = matchingCount * rule.rate;
          }
          break;
        }

        default:
          break;
      }

      if (commAmount > 0) {
        const entry: CommissionEntry = {
          id: `cme-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
          tenantId: params.tenantId,
          workerId: worker.id,
          workerName: worker.name,
          originatingSaleId: params.originatingSaleId,
          originatingOrderId: params.originatingOrderId,
          ruleId: rule.id,
          ruleName: rule.name,
          entryType: "earned",
          grossAmount: params.grossBill,
          discountDeducted: params.discountAmount,
          eligibleAmount,
          commissionRate: rule.rate,
          commissionAmount: commAmount,
          isCreditSale: params.isCreditSale,
          status: "pending",
          createdAt: new Date().toISOString(),
          notes: params.notes || `Sale commission earned on ${params.originatingSaleId}`,
        };

        this.addEntry(entry);
        generatedEntries.push(entry);

        // Update worker target progress
        worker.salesTarget.currentSales += eligibleAmount;
        if (
          worker.salesTarget.currentSales >= worker.salesTarget.targetAmount &&
          !worker.salesTarget.bonusUnlocked
        ) {
          worker.salesTarget.bonusUnlocked = true;
          // Trigger automatic bonus entry if configured
          this.recordTargetBonus(worker, rule);
        }
        this.saveWorker(worker);
      }
    }

    return generatedEntries;
  }

  /**
   * Target-based Bonus Generator
   */
  public recordTargetBonus(worker: WorkerRecord, rule: CommissionRule): CommissionEntry | null {
    if (worker.salesTarget.bonusAmount <= 0) return null;

    const bonusEntry: CommissionEntry = {
      id: `cme-bonus-${Date.now().toString(36)}`,
      tenantId: worker.tenantId,
      workerId: worker.id,
      workerName: worker.name,
      originatingSaleId: `TARGET-BONUS-${new Date().toISOString().substring(0, 7)}`,
      ruleId: rule.id,
      ruleName: "Monthly Target Incentive Bonus",
      entryType: "target_bonus",
      grossAmount: worker.salesTarget.currentSales,
      discountDeducted: 0,
      eligibleAmount: worker.salesTarget.currentSales,
      commissionRate: 0,
      commissionAmount: worker.salesTarget.bonusAmount,
      isCreditSale: false,
      status: "pending",
      createdAt: new Date().toISOString(),
      notes: `Target milestone reached: PKR ${worker.salesTarget.currentSales.toLocaleString()} of PKR ${worker.salesTarget.targetAmount.toLocaleString()}`,
    };

    this.addEntry(bonusEntry);
    return bonusEntry;
  }

  /**
   * Refund / Cancellation Adjustment (Clawback):
   * Reverses commission without overwriting history. References originating sale ID.
   */
  public recordRefundClawback(params: {
    tenantId: string;
    originatingSaleId: string;
    workerId: string;
    refundAmount: number;
    reason: string;
  }): CommissionEntry | null {
    const entries = this.getEntries(params.tenantId, params.workerId);
    const origEntry = entries.find(
      (e) => e.originatingSaleId === params.originatingSaleId && e.entryType === "earned"
    );

    if (!origEntry) {
      // Create manual clawback adjustment
      const worker = this.getWorkers(params.tenantId).find((w) => w.id === params.workerId);
      if (!worker) return null;

      const clawback: CommissionEntry = {
        id: `cme-clawback-${Date.now().toString(36)}`,
        tenantId: params.tenantId,
        workerId: worker.id,
        workerName: worker.name,
        originatingSaleId: params.originatingSaleId,
        ruleId: "manual-adjustment",
        ruleName: "Manual Refund Adjustment",
        entryType: "refund_clawback",
        grossAmount: params.refundAmount,
        discountDeducted: 0,
        eligibleAmount: params.refundAmount,
        commissionRate: 5,
        commissionAmount: -Math.round((params.refundAmount * 5) / 100),
        isCreditSale: false,
        status: "pending",
        createdAt: new Date().toISOString(),
        notes: `Refund clawback: ${params.reason}`,
      };
      this.addEntry(clawback);
      return clawback;
    }

    const clawbackRate = origEntry.commissionRate || 5;
    const clawbackAmount = -Math.abs(Math.round((params.refundAmount * clawbackRate) / 100));

    const clawbackEntry: CommissionEntry = {
      id: `cme-clawback-${Date.now().toString(36)}`,
      tenantId: params.tenantId,
      workerId: origEntry.workerId,
      workerName: origEntry.workerName,
      originatingSaleId: params.originatingSaleId,
      ruleId: origEntry.ruleId,
      ruleName: origEntry.ruleName,
      entryType: "refund_clawback",
      grossAmount: params.refundAmount,
      discountDeducted: 0,
      eligibleAmount: params.refundAmount,
      commissionRate: clawbackRate,
      commissionAmount: clawbackAmount,
      isCreditSale: false,
      status: "pending",
      createdAt: new Date().toISOString(),
      notes: `Order cancellation / return clawback: ${params.reason}`,
    };

    this.addEntry(clawbackEntry);
    return clawbackEntry;
  }

  // =========================================================================
  // SETTLEMENTS (PREVENTS DUPLICATE SETTLEMENTS & OVERWRITING)
  // =========================================================================
  public getSettlements(tenantId?: string, workerId?: string): CommissionSettlement[] {
    if (!this.isBrowser()) return [];
    this.ensureInitialized();
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SETTLEMENTS);
      if (!raw) return [];
      let list = JSON.parse(raw) as CommissionSettlement[];
      if (tenantId) list = list.filter((s) => s.tenantId === tenantId);
      if (workerId) list = list.filter((s) => s.workerId === workerId);
      return list.sort((a, b) => new Date(b.settledAt).getTime() - new Date(a.settledAt).getTime());
    } catch {
      return [];
    }
  }

  public executeSettlement(params: {
    tenantId: string;
    workerId: string;
    settlementType: "commission" | "salary" | "salary_plus_commission" | "adjustment";
    amountToPay: number;
    advanceToDeduct: number;
    paymentMethod: "cash" | "bank_transfer" | "easypaisa" | "jazzcash";
    paymentReference?: string;
    period: "daily" | "weekly" | "monthly" | "ad_hoc";
    settledBy: string;
    notes?: string;
  }): { success: boolean; settlement?: CommissionSettlement; message: string } {
    const worker = this.getWorkers(params.tenantId).find((w) => w.id === params.workerId);
    if (!worker) {
      return { success: false, message: "Worker record not found." };
    }

    // Fetch all pending entries for this worker
    const allEntries = this.getEntries(params.tenantId, params.workerId);
    const pendingEntries = allEntries.filter((e) => e.status === "pending");

    const totalPendingCommission = pendingEntries.reduce((sum, e) => sum + e.commissionAmount, 0);
    const baseSalary =
      worker.paymentType === "fixed_salary" || worker.paymentType === "salary_plus_commission"
        ? worker.baseSalary
        : 0;

    const previousPendingBalance =
      params.settlementType === "salary"
        ? baseSalary
        : params.settlementType === "salary_plus_commission"
        ? baseSalary + totalPendingCommission
        : totalPendingCommission;

    if (params.amountToPay <= 0) {
      return { success: false, message: "Settlement amount must be greater than zero." };
    }

    const netPaid = Math.max(0, params.amountToPay - params.advanceToDeduct);
    const coveredEntryIds = pendingEntries.map((e) => e.id);

    const receiptNumber = `SET-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(
      1000 + Math.random() * 9000
    )}`;

    const settlement: CommissionSettlement = {
      id: `set-${Date.now().toString(36)}`,
      tenantId: params.tenantId,
      receiptNumber,
      workerId: worker.id,
      workerName: worker.name,
      period: params.period,
      periodStart: new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0],
      periodEnd: new Date().toISOString().split("T")[0],
      settlementType: params.settlementType,
      baseSalaryPaid: params.settlementType.includes("salary") ? baseSalary : 0,
      commissionPaid: params.amountToPay,
      advanceDeducted: params.advanceToDeduct,
      totalPaid: netPaid,
      paymentMethod: params.paymentMethod,
      paymentReference: params.paymentReference || "Direct Cash Voucher",
      coveredEntryIds,
      previousPendingBalance,
      remainingPendingBalance: Math.max(0, previousPendingBalance - params.amountToPay),
      settledBy: params.settledBy,
      settledAt: new Date().toISOString(),
      notes: params.notes || `Payout settled via ${params.paymentMethod.toUpperCase()}`,
    };

    // 1. Mark covered entries as settled (prevents duplicate settlements)
    const updatedEntries = allEntries.map((entry) => {
      if (coveredEntryIds.includes(entry.id)) {
        return {
          ...entry,
          status: "settled" as const,
          settlementId: settlement.id,
        };
      }
      return entry;
    });
    localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(updatedEntries));

    // 2. Append immutable settlement record
    const settlements = this.getSettlements();
    settlements.unshift(settlement);
    localStorage.setItem(STORAGE_KEYS.SETTLEMENTS, JSON.stringify(settlements));

    return {
      success: true,
      settlement,
      message: `Settlement ${receiptNumber} completed successfully for ${worker.name}.`,
    };
  }

  // =========================================================================
  // WORKER-WISE DAILY, WEEKLY, AND MONTHLY REPORTS
  // =========================================================================
  public getWorkerPerformanceReport(
    tenantId: string,
    workerId: string,
    timeRange: "daily" | "weekly" | "monthly" = "monthly"
  ): WorkerPerformanceReport | null {
    const worker = this.getWorkers(tenantId).find((w) => w.id === workerId);
    if (!worker) return null;

    const allEntries = this.getEntries(tenantId, workerId);
    const settlements = this.getSettlements(tenantId, workerId);

    // Filter by timeframe
    const now = new Date();
    const rangeThreshold = new Date();
    if (timeRange === "daily") {
      rangeThreshold.setHours(0, 0, 0, 0);
    } else if (timeRange === "weekly") {
      rangeThreshold.setDate(now.getDate() - 7);
    } else {
      // Monthly
      rangeThreshold.setDate(now.getDate() - 30);
    }

    const filteredEntries = allEntries.filter(
      (e) => new Date(e.createdAt).getTime() >= rangeThreshold.getTime()
    );

    const salesAttributed = filteredEntries
      .filter((e) => e.entryType === "earned")
      .reduce((sum, e) => sum + e.grossAmount, 0);

    const orderCount = new Set(filteredEntries.map((e) => e.originatingSaleId)).size;

    const commissionEarned = filteredEntries
      .filter((e) => e.entryType === "earned" || e.entryType === "target_bonus")
      .reduce((sum, e) => sum + e.commissionAmount, 0);

    const commissionClawbacked = filteredEntries
      .filter((e) => e.entryType === "refund_clawback")
      .reduce((sum, e) => sum + Math.abs(e.commissionAmount), 0);

    const pendingEntries = allEntries.filter((e) => e.status === "pending");
    const commissionPending = pendingEntries.reduce((sum, e) => sum + e.commissionAmount, 0);

    const commissionPaid = settlements.reduce((sum, s) => sum + s.commissionPaid, 0);
    const salaryPaid = settlements.reduce((sum, s) => sum + s.baseSalaryPaid, 0);
    const advancesDeducted = settlements.reduce((sum, s) => sum + s.advanceDeducted, 0);

    const netPendingDue = Math.max(0, commissionPending);
    const targetProgressPercent =
      worker.salesTarget.targetAmount > 0
        ? Math.min(100, Math.round((worker.salesTarget.currentSales / worker.salesTarget.targetAmount) * 100))
        : 0;

    return {
      worker,
      timeRange,
      salesAttributed,
      orderCount,
      commissionEarned,
      commissionClawbacked,
      commissionPending,
      commissionPaid,
      salaryPaid,
      advancesDeducted,
      netPendingDue,
      targetProgressPercent,
      targetBonusUnlocked: worker.salesTarget.bonusUnlocked,
      recentEntries: filteredEntries.slice(0, 10),
      settlementHistory: settlements.slice(0, 5),
    };
  }

  // =========================================================================
  // STORE-WIDE COMMISSION SUMMARY KPIS
  // =========================================================================
  public getStoreCommissionKPIs(tenantId: string) {
    const workers = this.getWorkers(tenantId);
    const entries = this.getEntries(tenantId);
    const settlements = this.getSettlements(tenantId);

    const totalSalesAttributed = entries
      .filter((e) => e.entryType === "earned")
      .reduce((sum, e) => sum + e.grossAmount, 0);

    const totalEarned = entries
      .filter((e) => e.entryType === "earned" || e.entryType === "target_bonus")
      .reduce((sum, e) => sum + e.commissionAmount, 0);

    const totalClawbacks = entries
      .filter((e) => e.entryType === "refund_clawback")
      .reduce((sum, e) => sum + Math.abs(e.commissionAmount), 0);

    const pendingEntries = entries.filter((e) => e.status === "pending");
    const totalPending = pendingEntries.reduce((sum, e) => sum + e.commissionAmount, 0);

    const totalPaidOut = settlements.reduce((sum, s) => sum + s.totalPaid, 0);

    return {
      activeWorkersCount: workers.filter((w) => w.status === "active").length,
      totalSalesAttributed,
      totalEarned,
      totalClawbacks,
      totalPending: Math.max(0, totalPending),
      totalPaidOut,
    };
  }
}

export const commissionEngine = CommissionEngine.getInstance();
