import { NextRequest, NextResponse } from "next/server";
import { digitalPaymentEngine, PaymentProvider, PaymentPurpose } from "@/lib/payments/digital-payment-engine";

/**
 * QUICK-POS CENTRAL DIGITAL PAYMENT WEBHOOK ENDPOINT
 * Handles incoming gateway IPN/webhooks (EasyPaisa, JazzCash, Raast, 1Link).
 * Implements strict idempotency guarantees for repeated webhook deliveries.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Basic Gateway Payload Validation
    const eventId = body.eventId || body.event_id || body.ipn_id || `evt_${Date.now()}`;
    const transactionReference =
      body.transactionReference ||
      body.transaction_reference ||
      body.pp_TxnRefNo || // JazzCash
      body.orderId || // EasyPaisa
      body.rrn || // Raast
      body.reference;

    const amountPkr = Number(body.amountPkr || body.amount || body.pp_Amount || 0);
    const tenantId = body.tenantId || body.storeCode || "shop-01";
    const storeCode = body.storeCode || tenantId;
    const storeName = body.storeName;
    const gatewayProvider: PaymentProvider = (body.gatewayProvider || body.provider || "jazzcash").toLowerCase();
    const paymentPurpose: PaymentPurpose = body.paymentPurpose || "subscription_monthly_saas";
    const gatewayStatus = (body.gatewayStatus || body.status || "SUCCESS").toUpperCase();

    if (!transactionReference) {
      return NextResponse.json(
        {
          error: "Invalid Payload: Missing gateway transactionReference or TID.",
        },
        { status: 400 }
      );
    }

    // Ingest through Idempotent Payment Engine
    const ingestionResult = digitalPaymentEngine.ingestGatewayWebhook({
      eventId,
      gatewayProvider,
      transactionReference,
      amountPkr,
      tenantId,
      storeCode,
      storeName,
      paymentPurpose,
      payerName: body.payerName || body.senderName,
      payerPhone: body.payerPhone || body.senderPhone,
      gatewayStatus: gatewayStatus === "SUCCESS" || gatewayStatus === "000" ? "SUCCESS" : "FAILED",
    });

    return NextResponse.json(
      {
        success: ingestionResult.success,
        idempotent: ingestionResult.idempotent,
        status: ingestionResult.status,
        message: ingestionResult.message,
        payment: ingestionResult.paymentRecord,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "Webhook Ingestion Failed",
        details: err?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
