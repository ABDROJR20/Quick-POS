import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { QueuedSaleTransaction } from "@/lib/offline/offline-sync-engine";

export async function POST(req: NextRequest) {
  try {
    const payload: QueuedSaleTransaction = await req.json();

    if (!payload.clientTransactionId || !payload.tenantId || !payload.invoiceNumber) {
      return NextResponse.json(
        { success: false, message: "Missing required transaction identification fields." },
        { status: 400 }
      );
    }

    const { tenantId, clientTransactionId, invoiceNumber } = payload;
    const syncOpRef = adminDb.collection("syncOperations").doc(clientTransactionId);

    // Run atomic Firestore transaction
    const result = await adminDb.runTransaction(async (t) => {
      // 1. Idempotency Check
      const syncDoc = await t.get(syncOpRef);
      if (syncDoc.exists && syncDoc.data()?.status === "completed") {
        return {
          isDuplicate: true,
          saleId: syncDoc.data()?.resultingEntityId || `sale-${clientTransactionId}`,
        };
      }

      // 2. Prepare Unique IDs
      const saleId = `sale-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const saleRef = adminDb.collection("tenants").doc(tenantId).collection("sales").doc(saleId);
      const nowIso = new Date().toISOString();

      // 3. Write Sale Header
      t.set(saleRef, {
        saleId,
        tenantId,
        clientTransactionId,
        invoiceNumber,
        cashierUid: payload.cashierUid || "cashier-01",
        cashierName: payload.cashierName || "POS Cashier",
        workerId: payload.workerId || null,
        workerName: payload.workerName || null,
        customerId: payload.customerId || null,
        customerName: payload.customerName || null,
        subtotalPkr: payload.subtotal,
        discountPkr: payload.discountAmount || 0,
        taxPkr: payload.taxAmount || 0,
        finalTotalPkr: payload.totalAmount,
        paymentMethod: payload.paymentMethod,
        amountPaidPkr: payload.amountPaid,
        changeReturnedPkr: payload.changeReturned,
        udhaarAmountPkr: payload.udhaarAmount || 0,
        itemCount: payload.items.length,
        status: "completed",
        syncStatus: "synced",
        createdLocallyAt: payload.createdLocallyAt,
        syncedToServerAt: nowIso,
        deviceId: payload.deviceId || "UNKNOWN-DEV",
        createdAt: nowIso,
      });

      // 4. Write Sale Items Subcollection (Prevents unbounded parent document limits)
      for (let i = 0; i < payload.items.length; i++) {
        const it = payload.items[i];
        const itemId = `item-${i + 1}-${it.productId}`;
        const itemRef = saleRef.collection("saleItems").doc(itemId);
        t.set(itemRef, {
          itemId,
          saleId,
          tenantId,
          productId: it.productId,
          productName: it.productName,
          unit: it.unit,
          quantity: it.quantity,
          unitSalePrice: it.unitPrice,
          totalPkr: it.totalPrice,
          discountPkr: it.discount || 0,
          category: it.category || "General",
        });

        // Decrement Product Stock Counter
        const productRef = adminDb.collection("tenants").doc(tenantId).collection("products").doc(it.productId);
        t.set(
          productRef,
          {
            stockQuantity: FieldValue.increment(-it.quantity),
            updatedAt: nowIso,
          },
          { merge: true }
        );
      }

      // 5. Customer Khata Update (if Udhaar booked)
      if (payload.udhaarAmount > 0 && payload.customerId) {
        const custRef = adminDb.collection("tenants").doc(tenantId).collection("customers").doc(payload.customerId);
        const ledgerId = `ledger-${Date.now()}`;
        const ledgerRef = custRef.collection("khataLedger").doc(ledgerId);

        t.set(ledgerRef, {
          ledgerId,
          customerId: payload.customerId,
          tenantId,
          entryType: "debit_sale",
          amountPkr: payload.udhaarAmount,
          saleId,
          invoiceNumber,
          notes: `Offline POS sale Udhaar debit`,
          recordedByUid: payload.cashierUid,
          createdAt: nowIso,
        });

        t.set(
          custRef,
          {
            currentBalancePkr: FieldValue.increment(payload.udhaarAmount),
            lastTransactionAt: nowIso,
          },
          { merge: true }
        );
      }

      // 6. Worker Commission Accrual (if Attributed)
      if (payload.workerId) {
        const commId = `comm-${Date.now()}`;
        const commRef = adminDb.collection("tenants").doc(tenantId).collection("commissionEntries").doc(commId);
        const earnedPkr = Math.round(payload.totalAmount * 0.05); // 5% standard rate

        t.set(commRef, {
          entryId: commId,
          tenantId,
          workerId: payload.workerId,
          workerName: payload.workerName || "Worker",
          saleId,
          originatingSaleInvoice: invoiceNumber,
          entryType: "earned",
          earnedAmountPkr: earnedPkr,
          status: "accrued",
          accruedAt: nowIso,
          createdAt: nowIso,
        });

        const workerRef = adminDb.collection("tenants").doc(tenantId).collection("workers").doc(payload.workerId);
        t.set(
          workerRef,
          {
            "financialCounters.totalSalesGeneratedPkr": FieldValue.increment(payload.totalAmount),
            "financialCounters.currentPendingPayoutPkr": FieldValue.increment(earnedPkr),
          },
          { merge: true }
        );
      }

      // 7. Bounded Daily Summary Rollup (1-read report optimization)
      const dateKey = nowIso.slice(0, 10);
      const summaryRef = adminDb.collection("tenants").doc(tenantId).collection("dailySummaries").doc(dateKey);
      t.set(
        summaryRef,
        {
          date: dateKey,
          tenantId,
          totalOrdersCount: FieldValue.increment(1),
          totalGrossSalesPkr: FieldValue.increment(payload.subtotal),
          totalNetSalesPkr: FieldValue.increment(payload.totalAmount),
          totalCashReceivedPkr: FieldValue.increment(payload.paymentMethod === "cash" ? payload.amountPaid : 0),
          totalUdhaarIssuedPkr: FieldValue.increment(payload.udhaarAmount || 0),
          lastUpdated: nowIso,
        },
        { merge: true }
      );

      // 8. Mark Global Idempotency Registry
      t.set(syncOpRef, {
        clientTransactionId,
        tenantId,
        entityType: "sale",
        resultingEntityId: saleId,
        status: "completed",
        deviceInfo: {
          deviceId: payload.deviceId,
          appVersion: "1.0.0",
          offlineTimestamp: payload.createdLocallyAt,
        },
        processedAt: nowIso,
      });

      // 9. Append-Only Audit Log
      const logId = `audit-${Date.now()}`;
      const auditRef = adminDb.collection("tenants").doc(tenantId).collection("auditLogs").doc(logId);
      t.set(auditRef, {
        logId,
        tenantId,
        actorUid: payload.cashierUid,
        actorName: payload.cashierName,
        action: "sale.completed",
        targetResource: `Sale/${invoiceNumber}`,
        metadata: {
          saleId,
          clientTransactionId,
          amountPkr: payload.totalAmount,
          itemCount: payload.items.length,
          paymentMethod: payload.paymentMethod,
        },
        timestamp: nowIso,
      });

      return {
        isDuplicate: false,
        saleId,
      };
    });

    return NextResponse.json({
      success: true,
      saleId: result.saleId,
      invoiceNumber,
      isDuplicate: result.isDuplicate,
      serverTimestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error syncing POS transaction:", error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Internal server sync failure",
      },
      { status: 500 }
    );
  }
}
