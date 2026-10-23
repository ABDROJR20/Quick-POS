/**
 * Automated Verification Script for Standard 12: Digital Payment Management
 */
import assert from "node:assert";

// Mock minimal browser storage for node environment
globalThis.window = {};
const mockStorage = new Map();
globalThis.localStorage = {
  getItem: (k) => mockStorage.get(k) || null,
  setItem: (k, v) => mockStorage.set(k, String(v)),
  removeItem: (k) => mockStorage.delete(k),
  clear: () => mockStorage.clear(),
};

// Import DigitalPaymentEngine
import {
  DigitalPaymentEngine,
} from "../frontend/src/lib/payments/digital-payment-engine.ts";

console.log("=====================================================");
console.log("🚀 TESTING STANDARD 12: DIGITAL PAYMENT MANAGEMENT");
console.log("=====================================================\n");

const paymentEngine = DigitalPaymentEngine.getInstance();

// TEST 1: Track all required fields & Seed Data Integrity
console.log("--- TEST 1: Payment Fields Tracking & Initial Repository ---");
const payments = paymentEngine.getPayments();
assert.ok(payments.length >= 7, "Repository must contain seed transactions");

const firstPmt = payments[0];
assert.ok(firstPmt.id, "Must track payment id");
assert.ok(firstPmt.tenantId, "Must track tenant/customer");
assert.ok(firstPmt.amountPkr > 0, "Must track amount");
assert.strictEqual(firstPmt.currency, "PKR", "Must track currency as PKR");
assert.ok(firstPmt.paymentReference, "Must track payment reference");
assert.ok(firstPmt.paymentPurpose, "Must track payment purpose");
assert.ok(firstPmt.paymentProvider, "Must track payment provider");
assert.ok(firstPmt.status, "Must track payment status");
assert.ok(firstPmt.createdAt, "Must track created timestamp");
console.log("✅ All required payment fields properly tracked.");

// TEST 2: Strict Revenue Separation (Hardware vs. Recurring SaaS vs. Counter Sales)
console.log("\n--- TEST 2: Hardware vs. Recurring SaaS Revenue Separation ---");
const breakdown = paymentEngine.getRevenueBreakdown();

console.log(`  • Gross Verified: PKR ${breakdown.totalGrossVerifiedPkr.toLocaleString()}`);
console.log(`  • Hardware CapEx Recovery (Installments 1 & 2): PKR ${breakdown.hardwareRevenuePkr.toLocaleString()}`);
console.log(`  • Recurring SaaS MRR: PKR ${breakdown.recurringSaasRevenuePkr.toLocaleString()}`);
console.log(`  • Counter Retail Gross Billings: PKR ${breakdown.merchantGrossSalesPkr.toLocaleString()}`);
console.log(`  • Total Refunded: PKR ${breakdown.totalRefundedPkr.toLocaleString()}`);

// Hardware + SaaS + Counter Sales must strictly equal Gross Verified
const calculatedGross = breakdown.hardwareRevenuePkr + breakdown.recurringSaasRevenuePkr + breakdown.merchantGrossSalesPkr;
assert.strictEqual(
  calculatedGross,
  breakdown.totalGrossVerifiedPkr,
  "Hardware, SaaS, and Counter buckets must cleanly partition gross revenue"
);
assert.ok(breakdown.hardwareRevenuePkr > 0, "Hardware recovery revenue must be tracked separately");
assert.ok(breakdown.recurringSaasRevenuePkr > 0, "Recurring SaaS MRR must be tracked separately");
console.log("✅ Revenue separation verified: Hardware payments strictly isolated from SaaS MRR.");

// TEST 3: Safe Idempotent Gateway Webhook Deliveries
console.log("\n--- TEST 3: Gateway Webhook Ingestion & Idempotency Guarantee ---");
const testEventId = `wh_test_${Date.now()}`;
const testTid = `TEST-TID-${Date.now().toString().slice(-6)}`;

// First Delivery
const delivery1 = paymentEngine.ingestGatewayWebhook({
  eventId: testEventId,
  gatewayProvider: "jazzcash",
  transactionReference: testTid,
  amountPkr: 1000,
  tenantId: "shop-03",
  storeCode: "STUDENT-BIRYANI",
  paymentPurpose: "subscription_monthly_saas",
  payerName: "Kashif Ali",
  gatewayStatus: "SUCCESS",
});

assert.strictEqual(delivery1.success, true, "Initial webhook must succeed");
assert.strictEqual(delivery1.idempotent, false, "Initial delivery is not a duplicate");
assert.strictEqual(delivery1.status, "verified", "Initial delivery must mark as verified");

// Repeated / Retry Delivery of the same event
const delivery2 = paymentEngine.ingestGatewayWebhook({
  eventId: testEventId, // Same event ID
  gatewayProvider: "jazzcash",
  transactionReference: testTid,
  amountPkr: 1000,
  tenantId: "shop-03",
  storeCode: "STUDENT-BIRYANI",
  paymentPurpose: "subscription_monthly_saas",
  payerName: "Kashif Ali",
  gatewayStatus: "SUCCESS",
});

assert.strictEqual(delivery2.success, true, "Duplicate delivery must succeed safely");
assert.strictEqual(delivery2.idempotent, true, "Must flag repeated webhook as idempotent duplicate");
assert.strictEqual(delivery2.status, "verified", "Status remains verified");
assert.ok(delivery2.message.includes("Idempotent duplicate webhook ignored"));
console.log("✅ Webhook idempotency verified: Repeated deliveries safely handled with no duplication.");

// TEST 4: Anti-Fraud Sales Representative Verification Restrictions
console.log("\n--- TEST 4: Sales Representative RBAC Verification Restriction ---");

// Find pending payment
const pendingPmt = paymentEngine.getPayments().find((p) => p.status === "pending") || payments[3];

// Attempt A: Sales Rep attempts manual verification -> MUST BE BLOCKED
const repAttempt = paymentEngine.verifyPayment(pendingPmt.id, {
  uid: "rep-usman",
  role: "sales_rep", // RESTRICTED ROLE
  confirmedTid: "RAAST-88129033",
});

assert.strictEqual(repAttempt.success, false, "Sales Rep MUST NOT be permitted to verify payments");
assert.ok(repAttempt.error.includes("UNAUTHORIZED"), "Must return authorization error");
assert.ok(repAttempt.error.includes("Sales Representatives are strictly forbidden"));

// Attempt B: Super Admin reconciliation -> ALLOWED
const adminAttempt = paymentEngine.verifyPayment(pendingPmt.id, {
  uid: "admin-root",
  role: "super_admin", // AUTHORIZED ROLE
  confirmedTid: "RAAST-88129033",
  notes: "Cross-checked in Meezan Bank portal",
});

assert.strictEqual(adminAttempt.success, true, "Super Admin must be authorized to reconcile");
assert.strictEqual(adminAttempt.paymentRecord.status, "verified");
assert.strictEqual(adminAttempt.paymentRecord.verifiedByRole, "super_admin");
console.log("✅ Anti-fraud verification policy verified: Sales Reps blocked; Super Admins authorized.");

// TEST 5: Refund & Reversal Lifecycle
console.log("\n--- TEST 5: Refund / Reversal Lifecycle ---");
const pmtToRefund = adminAttempt.paymentRecord;

const refundRes = paymentEngine.refundOrReversePayment(pmtToRefund.id, {
  amountPkr: pmtToRefund.amountPkr,
  reason: "Merchant accidentally duplicated Raast transfer",
  operatorUid: "admin-root",
  operatorRole: "super_admin",
});

assert.strictEqual(refundRes.success, true, "Refund must succeed");
assert.strictEqual(refundRes.paymentRecord.status, "refunded", "Status must become 'refunded'");
assert.ok(refundRes.paymentRecord.reversal, "Must contain reversal info");
assert.strictEqual(refundRes.paymentRecord.reversal.amountPkr, pmtToRefund.amountPkr);
assert.ok(refundRes.paymentRecord.reversal.refundId.startsWith("REF-"));

// Double refund attempt must fail
const doubleRefund = paymentEngine.refundOrReversePayment(pmtToRefund.id, {
  amountPkr: pmtToRefund.amountPkr,
  reason: "Duplicate refund attempt",
  operatorUid: "admin-root",
  operatorRole: "super_admin",
});
assert.strictEqual(doubleRefund.success, false, "Double refund must be rejected");
console.log("✅ Reversal and refund lifecycle verified with immutable audit tracking.");

console.log("\n=====================================================");
console.log("🎉 ALL STANDARD 12 UNIT & INTEGRATION TESTS PASSED!");
console.log("=====================================================");
