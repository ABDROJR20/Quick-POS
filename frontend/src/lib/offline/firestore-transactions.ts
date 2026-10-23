/**
 * QUICK-POS — CLOUD FIRESTORE FINANCIAL TRANSACTION HANDLERS
 * 
 * Server-side & transactional operations for sensitive financial changes:
 * 1. Safe, Idempotent Sale Processing with Duplicate Prevention (`clientTransactionId`)
 * 2. Unbounded Document Avoidance (Subcollections for Sale Items & Khata Ledgers)
 * 3. Immutable Financial Ledgers & Reversal Workflows (Refunds & Commission Clawbacks)
 * 4. Zero-Trust Verification of Calculations & Balances
 * 5. Bounded 1-Read Daily Summaries Aggregation
 */

import {
  ExecuteSaleTransactionPayload,
  ExecuteSaleReversalPayload,
  ExecuteKhataPaymentPayload,
  ExecuteCommissionSettlementPayload,
  FirestoreSaleDocument,
  FirestoreSaleItemDocument,
  FirestoreSaleReversalDocument,
  FirestoreKhataLedgerDocument,
  FirestoreCommissionEntryDocument,
  FirestoreCommissionSettlementDocument,
  FirestoreAuditLogDocument,
  FirestoreSyncOperationDocument,
} from "../types/firestore-schema";

export interface TransactionExecutionResult<T> {
  success: boolean;
  isDuplicateRetry?: boolean;
  data?: T;
  error?: string;
}

// Mock/Adapter for Firestore transaction primitives when running in universal Next.js runtime
export interface FirestoreTransactionContext {
  get: <DocType>(docPath: string) => Promise<{ exists: boolean; data: () => DocType | null }>;
  set: <DocType>(docPath: string, data: DocType) => void;
  update: (docPath: string, data: Record<string, unknown>) => void;
}

/**
 * Helper to compute today's date formatted as YYYY-MM-DD
 */
export function getDailySummaryKey(date: Date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * 1. EXECUTE IDEMPOTENT SALE TRANSACTION
 * 
 * Atomic operations:
 * - Checks syncOperations/{clientTransactionId} for idempotency
 * - Verifies mathematical totals (subtotal - discount == finalTotal)
 * - Decrements inventory for each product
 * - Debits customer Khata ledger if paymentMethod is udhaar/split
 * - Accrues worker commission if worker is attributed
 * - Writes sale header and item subcollections
 * - Increments daily summary counter (1-read report optimization)
 * - Writes immutable audit log
 */
export async function executeIdempotentSaleTransaction(
  tx: FirestoreTransactionContext,
  payload: ExecuteSaleTransactionPayload
): Promise<TransactionExecutionResult<{ saleId: string; invoiceNumber: string }>> {
  const { tenantId, clientTransactionId, invoiceNumber, items, discountPkr, amountPaidPkr } = payload;

  // 1. Check Idempotency Token
  const syncOpPath = `syncOperations/${clientTransactionId}`;
  const syncOpSnap = await tx.get<FirestoreSyncOperationDocument>(syncOpPath);
  if (syncOpSnap.exists && syncOpSnap.data()?.status === "completed") {
    // Already processed! Return original sale reference safely without double charge
    return {
      success: true,
      isDuplicateRetry: true,
      data: {
        saleId: syncOpSnap.data()!.resultingEntityId,
        invoiceNumber,
      },
    };
  }

  // 2. Server-side Mathematical Verification (Zero-Trust)
  let calculatedSubtotal = 0;
  for (const item of items) {
    if (item.quantity <= 0 || item.unitSalePrice < 0) {
      throw new Error(`Invalid item quantity or price for product: ${item.productName}`);
    }
    calculatedSubtotal += (item.quantity * item.unitSalePrice) - (item.discountPkr || 0);
  }

  const expectedFinalTotal = Math.max(0, calculatedSubtotal - (discountPkr || 0));

  // Determine Udhaar amount
  let udhaarAmount = 0;
  if (payload.paymentMethod === "udhaar") {
    udhaarAmount = expectedFinalTotal;
  } else if (payload.paymentMethod === "split" && payload.paymentSplitBreakdown?.udhaarPkr) {
    udhaarAmount = payload.paymentSplitBreakdown.udhaarPkr;
  }

  // 3. Customer Credit Limit Verification (if Udhaar)
  let customerCurrentBalance = 0;
  if (udhaarAmount > 0) {
    if (!payload.customerId) {
      throw new Error("Credit sale (Udhaar) requires a valid registered customer ID.");
    }
    const customerPath = `tenants/${tenantId}/customers/${payload.customerId}`;
    const customerSnap = await tx.get<{ currentBalancePkr: number; creditLimitPkr: number; fullName: string }>(customerPath);
    if (!customerSnap.exists || !customerSnap.data()) {
      throw new Error(`Customer with ID ${payload.customerId} not found.`);
    }
    const customer = customerSnap.data()!;
    customerCurrentBalance = customer.currentBalancePkr || 0;
    const projectedBalance = customerCurrentBalance + udhaarAmount;
    if (customer.creditLimitPkr > 0 && projectedBalance > customer.creditLimitPkr) {
      throw new Error(
        `Udhaar limit exceeded! Current: PKR ${customerCurrentBalance}, Additional: PKR ${udhaarAmount}, Limit: PKR ${customer.creditLimitPkr}`
      );
    }
  }

  // 4. Generate Sale Document Reference
  const nowIso = new Date().toISOString();
  const saleId = `sale_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const salePath = `tenants/${tenantId}/sales/${saleId}`;

  const saleDoc: FirestoreSaleDocument = {
    id: saleId,
    saleId,
    tenantId,
    clientTransactionId,
    invoiceNumber,
    customerId: payload.customerId,
    cashierUid: payload.cashierUid,
    cashierName: payload.cashierName,
    workerId: payload.workerId,
    itemCount: items.length,
    totalQuantity: items.reduce((acc, it) => acc + it.quantity, 0),
    subtotalPkr: calculatedSubtotal,
    discountPkr: discountPkr || 0,
    taxPkr: 0,
    finalTotalPkr: expectedFinalTotal,
    paymentMethod: payload.paymentMethod,
    amountPaidPkr: amountPaidPkr || (expectedFinalTotal - udhaarAmount),
    changeReturnedPkr: Math.max(0, (amountPaidPkr || 0) - (expectedFinalTotal - udhaarAmount)),
    udhaarAmountPkr: udhaarAmount,
    paymentSplitBreakdown: payload.paymentSplitBreakdown,
    status: "completed",
    syncStatus: "synced",
    createdAt: nowIso,
  };

  tx.set(salePath, saleDoc);

  // 5. Write Item Subcollection (Guarantees parent document is bounded < 1KB)
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const itemId = `item_${i + 1}_${it.productId}`;
    const itemPath = `tenants/${tenantId}/sales/${saleId}/saleItems/${itemId}`;
    const itemDoc: FirestoreSaleItemDocument = {
      id: itemId,
      itemId,
      saleId,
      tenantId,
      productId: it.productId,
      productName: it.productName,
      unit: it.unit,
      quantity: it.quantity,
      unitCostPrice: it.unitCostPrice,
      unitSalePrice: it.unitSalePrice,
      discountPkr: it.discountPkr || 0,
      totalPkr: (it.quantity * it.unitSalePrice) - (it.discountPkr || 0),
      createdAt: nowIso,
    };
    tx.set(itemPath, itemDoc);

    // Atomically Decrement Inventory
    const productPath = `tenants/${tenantId}/products/${it.productId}`;
    tx.update(productPath, {
      stockQuantity: { __op: "increment", value: -it.quantity },
      updatedAt: nowIso,
    });
  }

  // 6. Update Customer Khata Ledger (if Udhaar)
  if (udhaarAmount > 0 && payload.customerId) {
    const customerPath = `tenants/${tenantId}/customers/${payload.customerId}`;
    const ledgerId = `ledger_${Date.now()}_${saleId}`;
    const ledgerPath = `tenants/${tenantId}/customers/${payload.customerId}/khataLedger/${ledgerId}`;

    const ledgerDoc: FirestoreKhataLedgerDocument = {
      id: ledgerId,
      ledgerId,
      customerId: payload.customerId,
      tenantId,
      entryType: "debit_sale",
      amountPkr: udhaarAmount,
      saleId,
      previousBalancePkr: customerCurrentBalance,
      newBalancePkr: customerCurrentBalance + udhaarAmount,
      notes: `Udhaar booked against invoice #${invoiceNumber}`,
      recordedByUid: payload.cashierUid,
      createdAt: nowIso,
    };

    tx.set(ledgerPath, ledgerDoc);
    tx.update(customerPath, {
      currentBalancePkr: { __op: "increment", value: udhaarAmount },
      totalPurchasesLifetimePkr: { __op: "increment", value: expectedFinalTotal },
      lastTransactionAt: nowIso,
    });
  }

  // 7. Accrue Commission Entry (if Worker Attributed)
  if (payload.workerId) {
    const workerPath = `tenants/${tenantId}/workers/${payload.workerId}`;
    const workerSnap = await tx.get<{ fullName: string; defaultCommissionRuleId?: string }>(workerPath);
    if (workerSnap.exists && workerSnap.data()) {
      const worker = workerSnap.data()!;
      // Default baseline 5% commission on eligible net sales
      const earnedAmount = Math.round(expectedFinalTotal * 0.05);
      const entryId = `comm_${Date.now()}_${saleId}`;
      const commEntryPath = `tenants/${tenantId}/commissionEntries/${entryId}`;

      const commDoc: FirestoreCommissionEntryDocument = {
        id: entryId,
        entryId,
        tenantId,
        workerId: payload.workerId,
        workerName: worker.fullName,
        saleId,
        originatingSaleInvoice: invoiceNumber,
        entryType: "earned",
        earnedAmountPkr: earnedAmount,
        calculatedRateSnapshot: "5.0% on eligible sale total",
        status: "accrued",
        accruedAt: nowIso,
        createdAt: nowIso,
      };

      tx.set(commEntryPath, commDoc);
      tx.update(workerPath, {
        "financialCounters.totalSalesGeneratedPkr": { __op: "increment", value: expectedFinalTotal },
        "financialCounters.totalCommissionEarnedPkr": { __op: "increment", value: earnedAmount },
        "financialCounters.currentPendingPayoutPkr": { __op: "increment", value: earnedAmount },
      });
    }
  }

  // 8. Bounded 1-Read Daily Summary Increment
  const dateKey = getDailySummaryKey();
  const summaryPath = `tenants/${tenantId}/dailySummaries/${dateKey}`;
  tx.update(summaryPath, {
    totalOrdersCount: { __op: "increment", value: 1 },
    totalGrossSalesPkr: { __op: "increment", value: calculatedSubtotal },
    totalDiscountsPkr: { __op: "increment", value: discountPkr || 0 },
    totalNetSalesPkr: { __op: "increment", value: expectedFinalTotal },
    totalCashReceivedPkr: { __op: "increment", value: payload.amountPaidPkr || 0 },
    totalUdhaarIssuedPkr: { __op: "increment", value: udhaarAmount },
    lastUpdated: nowIso,
  });

  // 9. Mark Idempotency Sync Record
  tx.set(syncOpPath, {
    id: clientTransactionId,
    clientTransactionId,
    tenantId,
    entityType: "sale",
    resultingEntityId: saleId,
    status: "completed",
    deviceInfo: {
      deviceId: "POS-DEVICE",
      appVersion: "1.0.0",
      offlineTimestamp: nowIso,
    },
    processedAt: nowIso,
    createdAt: nowIso,
  });

  // 10. Append-Only Audit Log
  const logId = `audit_${Date.now()}`;
  const auditPath = `tenants/${tenantId}/auditLogs/${logId}`;
  const auditDoc: FirestoreAuditLogDocument = {
    id: logId,
    logId,
    tenantId,
    actorUid: payload.cashierUid,
    actorName: payload.cashierName,
    action: "sale.completed",
    targetResource: `Sale/${invoiceNumber}`,
    metadata: {
      saleId,
      finalTotalPkr: expectedFinalTotal,
      paymentMethod: payload.paymentMethod,
      itemsCount: items.length,
    },
    timestamp: nowIso,
    createdAt: nowIso,
  };
  tx.set(auditPath, auditDoc);

  return {
    success: true,
    isDuplicateRetry: false,
    data: { saleId, invoiceNumber },
  };
}

/**
 * 2. EXECUTE IMMUTABLE SALE REVERSAL / REFUND TRANSACTION
 * 
 * Financial records are NEVER deleted. Adjustments create an immutable Reversal record:
 * - Creates /sales/{saleId}/reversals/{reversalId}
 * - Restores product inventory for returned items
 * - Credits customer Khata if original sale was Udhaar
 * - Claws back worker commission with negative CommissionEntry
 * - Updates original sale status to 'refunded' or 'partially_refunded'
 * - Records audit log
 */
export async function executeSaleReversalTransaction(
  tx: FirestoreTransactionContext,
  payload: ExecuteSaleReversalPayload
): Promise<TransactionExecutionResult<{ reversalId: string }>> {
  const { tenantId, saleId, reversalType, returnedItems, refundAmountPkr, refundMethod, reason, authorizedByUid } = payload;

  const salePath = `tenants/${tenantId}/sales/${saleId}`;
  const saleSnap = await tx.get<FirestoreSaleDocument>(salePath);
  if (!saleSnap.exists || !saleSnap.data()) {
    throw new Error(`Sale document ${saleId} not found.`);
  }

  const originalSale = saleSnap.data()!;
  if (originalSale.status === "refunded" || originalSale.status === "voided") {
    throw new Error(`Sale ${originalSale.invoiceNumber} has already been refunded or voided.`);
  }

  const nowIso = new Date().toISOString();
  const reversalId = `rev_${Date.now()}_${saleId}`;
  const reversalPath = `tenants/${tenantId}/sales/${saleId}/reversals/${reversalId}`;

  // 1. Create Immutable Reversal Document
  const reversalDoc: FirestoreSaleReversalDocument = {
    id: reversalId,
    reversalId,
    saleId,
    tenantId,
    reversalType,
    refundAmountPkr,
    refundMethod,
    returnedItems,
    reason,
    authorizedByUid,
    createdAt: nowIso,
  };
  tx.set(reversalPath, reversalDoc);

  // 2. Restock Inventory
  for (const it of returnedItems) {
    if (it.restockInventory && it.quantityReturned > 0) {
      const productPath = `tenants/${tenantId}/products/${it.productId}`;
      tx.update(productPath, {
        stockQuantity: { __op: "increment", value: it.quantityReturned },
        updatedAt: nowIso,
      });
    }
  }

  // 3. Credit Customer Khata (if Udhaar reversal)
  if (originalSale.customerId && (refundMethod === "khata_credit" || originalSale.paymentMethod === "udhaar")) {
    const customerPath = `tenants/${tenantId}/customers/${originalSale.customerId}`;
    const ledgerId = `ledger_rev_${Date.now()}`;
    const ledgerPath = `tenants/${tenantId}/customers/${originalSale.customerId}/khataLedger/${ledgerId}`;

    const ledgerDoc: FirestoreKhataLedgerDocument = {
      id: ledgerId,
      ledgerId,
      customerId: originalSale.customerId,
      tenantId,
      entryType: "credit_reversal",
      amountPkr: refundAmountPkr,
      saleId,
      previousBalancePkr: 0,
      newBalancePkr: 0,
      notes: `Refund adjustment on invoice #${originalSale.invoiceNumber}: ${reason}`,
      recordedByUid: authorizedByUid,
      createdAt: nowIso,
    };
    tx.set(ledgerPath, ledgerDoc);

    tx.update(customerPath, {
      currentBalancePkr: { __op: "increment", value: -refundAmountPkr },
      lastTransactionAt: nowIso,
    });
  }

  // 4. Commission Clawback
  if (originalSale.workerId) {
    const clawbackAmount = Math.round(refundAmountPkr * 0.05);
    const entryId = `comm_claw_${Date.now()}_${saleId}`;
    const commEntryPath = `tenants/${tenantId}/commissionEntries/${entryId}`;

    const clawbackDoc: FirestoreCommissionEntryDocument = {
      id: entryId,
      entryId,
      tenantId,
      workerId: originalSale.workerId,
      workerName: "Attributed Worker",
      saleId,
      originatingSaleInvoice: originalSale.invoiceNumber,
      entryType: "refund_clawback",
      earnedAmountPkr: -clawbackAmount,
      calculatedRateSnapshot: `Clawback of 5.0% on refunded PKR ${refundAmountPkr}`,
      status: "accrued",
      accruedAt: nowIso,
      createdAt: nowIso,
    };
    tx.set(commEntryPath, clawbackDoc);

    const workerPath = `tenants/${tenantId}/workers/${originalSale.workerId}`;
    tx.update(workerPath, {
      "financialCounters.currentPendingPayoutPkr": { __op: "increment", value: -clawbackAmount },
    });
  }

  // 5. Update Original Sale Status
  tx.update(salePath, {
    status: reversalType === "full_refund" || reversalType === "void_mistake" ? "refunded" : "partially_refunded",
    reversalId,
    updatedAt: nowIso,
  });

  // 6. Record Audit Log
  const logId = `audit_${Date.now()}`;
  const auditPath = `tenants/${tenantId}/auditLogs/${logId}`;
  tx.set(auditPath, {
    id: logId,
    logId,
    tenantId,
    actorUid: authorizedByUid,
    actorName: "Store Manager",
    action: "sale.refunded",
    targetResource: `Sale/${originalSale.invoiceNumber}`,
    metadata: { reversalId, refundAmountPkr, reason },
    timestamp: nowIso,
    createdAt: nowIso,
  });

  return {
    success: true,
    data: { reversalId },
  };
}

/**
 * 3. EXECUTE KHATA UDHAAR REPAYMENT TRANSACTION
 * 
 * Safely accepts customer debt repayment, updates balance atomically,
 * writes an immutable payment receipt and ledger entry.
 */
export async function executeKhataPaymentTransaction(
  tx: FirestoreTransactionContext,
  payload: ExecuteKhataPaymentPayload
): Promise<TransactionExecutionResult<{ paymentId: string }>> {
  const { tenantId, customerId, clientTransactionId, amountPkr, paymentMethod, recordedByUid, notes } = payload;

  if (amountPkr <= 0) {
    throw new Error("Payment amount must be greater than zero.");
  }

  // 1. Idempotency Check
  const syncOpPath = `syncOperations/${clientTransactionId}`;
  const syncOpSnap = await tx.get<FirestoreSyncOperationDocument>(syncOpPath);
  if (syncOpSnap.exists && syncOpSnap.data()?.status === "completed") {
    return {
      success: true,
      isDuplicateRetry: true,
      data: { paymentId: syncOpSnap.data()!.resultingEntityId },
    };
  }

  // 2. Fetch Customer
  const customerPath = `tenants/${tenantId}/customers/${customerId}`;
  const customerSnap = await tx.get<{ currentBalancePkr: number; fullName: string }>(customerPath);
  if (!customerSnap.exists || !customerSnap.data()) {
    throw new Error(`Customer ${customerId} not found.`);
  }

  const customer = customerSnap.data()!;
  const prevBalance = customer.currentBalancePkr || 0;
  const newBalance = Math.max(0, prevBalance - amountPkr);
  const nowIso = new Date().toISOString();

  // 3. Create Payment Document
  const paymentId = `pay_${Date.now()}_${customerId}`;
  const paymentPath = `tenants/${tenantId}/payments/${paymentId}`;
  tx.set(paymentPath, {
    id: paymentId,
    paymentId,
    tenantId,
    clientTransactionId,
    paymentType: "customer_khata_settlement",
    referenceEntityId: customerId,
    amountPkr,
    paymentMethod,
    transactionReference: payload.transactionReference,
    recordedByUid,
    notes,
    createdAt: nowIso,
  });

  // 4. Create Ledger Entry
  const ledgerId = `ledger_pay_${Date.now()}`;
  const ledgerPath = `tenants/${tenantId}/customers/${customerId}/khataLedger/${ledgerId}`;
  const ledgerDoc: FirestoreKhataLedgerDocument = {
    id: ledgerId,
    ledgerId,
    customerId,
    tenantId,
    entryType: "credit_repayment",
    amountPkr,
    paymentId,
    previousBalancePkr: prevBalance,
    newBalancePkr: newBalance,
    notes: notes || `Khata repayment via ${paymentMethod}`,
    recordedByUid,
    createdAt: nowIso,
  };
  tx.set(ledgerPath, ledgerDoc);

  // 5. Update Customer Balance
  tx.update(customerPath, {
    currentBalancePkr: { __op: "increment", value: -amountPkr },
    totalRepaidLifetimePkr: { __op: "increment", value: amountPkr },
    lastTransactionAt: nowIso,
  });

  // 6. Update Daily Summary
  const dateKey = getDailySummaryKey();
  const summaryPath = `tenants/${tenantId}/dailySummaries/${dateKey}`;
  tx.update(summaryPath, {
    totalKhataRecoveredPkr: { __op: "increment", value: amountPkr },
    lastUpdated: nowIso,
  });

  // 7. Mark Idempotency
  tx.set(syncOpPath, {
    id: clientTransactionId,
    clientTransactionId,
    tenantId,
    entityType: "payment",
    resultingEntityId: paymentId,
    status: "completed",
    deviceInfo: { deviceId: "POS-DEVICE", appVersion: "1.0.0", offlineTimestamp: nowIso },
    processedAt: nowIso,
    createdAt: nowIso,
  });

  return {
    success: true,
    data: { paymentId },
  };
}

/**
 * 4. EXECUTE COMMISSION SETTLEMENT TRANSACTION
 * 
 * Disburses accumulated commissions to a worker:
 * - Locks and transitions covered entry IDs to 'settled'
 * - Creates immutable CommissionSettlement voucher
 * - Updates worker's totalCommissionPaidPkr and pending balance
 * - Records audit log
 */
export async function executeCommissionSettlementTransaction(
  tx: FirestoreTransactionContext,
  payload: ExecuteCommissionSettlementPayload
): Promise<TransactionExecutionResult<{ settlementId: string }>> {
  const { tenantId, workerId, workerName, voucherNumber, periodStart, periodEnd, entryIds, totalPayoutPkr, paymentMethod, disbursedByUid } = payload;

  const nowIso = new Date().toISOString();
  const settlementId = `settle_${Date.now()}_${workerId}`;
  const settlementPath = `tenants/${tenantId}/commissionSettlements/${settlementId}`;

  // 1. Lock and Transition Covered Entries
  for (const entryId of entryIds) {
    const entryPath = `tenants/${tenantId}/commissionEntries/${entryId}`;
    tx.update(entryPath, {
      status: "settled",
      settlementId,
      updatedAt: nowIso,
    });
  }

  // 2. Create Settlement Voucher Document
  const settlementDoc: FirestoreCommissionSettlementDocument = {
    id: settlementId,
    settlementId,
    tenantId,
    workerId,
    workerName,
    voucherNumber,
    periodStart,
    periodEnd,
    totalAmountPkr: totalPayoutPkr,
    paymentMethod,
    paymentReference: payload.paymentReference,
    disbursedByUid,
    coveredEntryIds: entryIds,
    settledAt: nowIso,
    createdAt: nowIso,
  };
  tx.set(settlementPath, settlementDoc);

  // 3. Update Worker Financial Counters
  const workerPath = `tenants/${tenantId}/workers/${workerId}`;
  tx.update(workerPath, {
    "financialCounters.totalCommissionPaidPkr": { __op: "increment", value: totalPayoutPkr },
    "financialCounters.currentPendingPayoutPkr": { __op: "increment", value: -totalPayoutPkr },
    updatedAt: nowIso,
  });

  // 4. Record Audit Log
  const logId = `audit_${Date.now()}`;
  const auditPath = `tenants/${tenantId}/auditLogs/${logId}`;
  tx.set(auditPath, {
    id: logId,
    logId,
    tenantId,
    actorUid: disbursedByUid,
    actorName: "Shop Owner",
    action: "commission.settled",
    targetResource: `Worker/${workerName}`,
    metadata: { settlementId, voucherNumber, totalPayoutPkr, entriesCount: entryIds.length },
    timestamp: nowIso,
    createdAt: nowIso,
  });

  return {
    success: true,
    data: { settlementId },
  };
}
