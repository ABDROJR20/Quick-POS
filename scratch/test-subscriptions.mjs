/**
 * Automated Verification Script for Section 11: Subscriptions and Automated Reminders
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

// Import compiled or source modules
import {
  SubscriptionEngine,
  DEFAULT_SUBSCRIPTION_POLICY,
  STANDARD_PLANS,
} from "../frontend/src/lib/subscription/subscription-engine.ts";

console.log("=================================================");
console.log("🚀 TESTING STANDARD 11: SUBSCRIPTIONS & REMINDERS");
console.log("=================================================\n");

const engine = SubscriptionEngine.getInstance();

// TEST 1: Default Policy & Standard Plans
console.log("--- TEST 1: Policy and Standard Plans ---");
const policy = engine.getPolicy();
assert.strictEqual(policy.monthlySaasFeePkr, 1000, "Monthly SaaS fee must default to PKR 1,000");
assert.strictEqual(policy.gracePeriodDays, 5, "Default grace period must be 5 days");
assert.strictEqual(policy.offlineGraceLimitDays, 7, "Safe offline grace limit must be 7 days");
assert.strictEqual(policy.autoRestrictedOnGraceExpiry, true, "Must auto-restrict after grace expiry");
assert.strictEqual(STANDARD_PLANS.length, 3, "Must provide 3 standard retail SaaS plans");
console.log("✅ Policy and Plan configuration verified.");

// TEST 2: Status Calculation & Grace Period Date Math
console.log("\n--- TEST 2: Subscription Status & Date Math ---");
const now = new Date();
const msPerDay = 1000 * 60 * 60 * 24;

// Case A: Due in 10 days -> Paid / Active
const futureDate = new Date(now.getTime() + 10 * msPerDay).toISOString().split("T")[0];
const statusA = engine.calculateSubscriptionStatus(futureDate, 5, false);
assert.strictEqual(statusA.status, "paid", "10 days out must be paid/active");
assert.strictEqual(statusA.inGrace, false);

// Case B: Due in 2 days -> Due
const dueSoonDate = new Date(now.getTime() + 2 * msPerDay).toISOString().split("T")[0];
const statusB = engine.calculateSubscriptionStatus(dueSoonDate, 5, false);
assert.strictEqual(statusB.status, "due", "2 days out must be in 'due' window");
assert.strictEqual(statusB.isOverdue, false);

// Case C: Overdue by 3 days (within 5-day grace period) -> grace_period
const graceDate = new Date(now.getTime() - 3 * msPerDay).toISOString().split("T")[0];
const statusC = engine.calculateSubscriptionStatus(graceDate, 5, false);
assert.strictEqual(statusC.status, "grace_period", "3 days overdue must be in grace_period");
assert.strictEqual(statusC.inGrace, true);

// Case D: Overdue by 8 days (past 5-day grace period) -> restricted
const expiredDate = new Date(now.getTime() - 8 * msPerDay).toISOString().split("T")[0];
const statusD = engine.calculateSubscriptionStatus(expiredDate, 5, false);
assert.strictEqual(statusD.status, "restricted", "8 days overdue must be restricted");
assert.strictEqual(statusD.inGrace, false);
console.log("✅ Subscription lifecycle status math verified.");

// TEST 3: Safe Offline Grace Policy
console.log("\n--- TEST 3: Safe Offline Grace Policy ---");
const sampleSub = engine.getSubscriptions()[0];

// Case A: Recent sync (1 day ago) -> Allowed offline
const recentSyncDate = new Date(now.getTime() - 1 * msPerDay);
const checkA = engine.checkOfflineGracePolicy(
  { ...sampleSub, status: "paid", lastServerSyncAt: recentSyncDate.toISOString() },
  now
);
assert.strictEqual(checkA.allowed, true, "1 day offline must be allowed");
assert.strictEqual(checkA.requiresSync, false);

// Case B: Stale sync (9 days ago, exceeds 7 days limit) -> Disallowed
const staleSyncDate = new Date(now.getTime() - 9 * msPerDay);
const checkB = engine.checkOfflineGracePolicy(
  { ...sampleSub, status: "paid", lastServerSyncAt: staleSyncDate.toISOString() },
  now
);
assert.strictEqual(checkB.allowed, false, "9 days offline exceeds 7-day limit and must be blocked");
assert.strictEqual(checkB.requiresSync, true);

// Case C: Account is restricted -> Disallowed immediately
const checkC = engine.checkOfflineGracePolicy(
  { ...sampleSub, status: "restricted", lastServerSyncAt: recentSyncDate.toISOString() },
  now
);
assert.strictEqual(checkC.allowed, false, "Restricted account must not be allowed offline");
console.log("✅ Safe offline grace policy verified.");

// TEST 4: 5-Tier Reminder Schedule & WhatsApp Payload Generation
console.log("\n--- TEST 4: 5-Tier WhatsApp Reminder Schedules ---");
const tiers = [
  "DUE_IN_3_DAYS",
  "DUE_TODAY",
  "IN_GRACE_PERIOD",
  "GRACE_EXPIRED_RESTRICTED",
  "PAYMENT_VERIFIED_REACTIVATED",
];

for (const tier of tiers) {
  const reminder = engine.generateReminder(sampleSub, tier);
  assert.ok(reminder.subject, `Tier ${tier} must have a subject`);
  assert.ok(reminder.bodyUrdu.length > 20, `Tier ${tier} must have comprehensive Urdu body`);
  assert.ok(reminder.bodyEn.length > 20, `Tier ${tier} must have English fallback body`);
  assert.ok(reminder.whatsappUrl.startsWith("https://wa.me/"), `Tier ${tier} must generate wa.me link`);
  assert.strictEqual(reminder.cloudApiPayload.messaging_product, "whatsapp");
  assert.strictEqual(reminder.cloudApiPayload.template.name, `quickpos_${tier.toLowerCase()}`);
  console.log(`  ✓ Tier verified: ${tier} -> wa.me URL length: ${reminder.whatsappUrl.length} chars`);
}
console.log("✅ All 5 reminder tiers generated with bilingual templates and Meta Cloud API payloads.");

// TEST 5: Zero-Trust Payment Reconciliation
console.log("\n--- TEST 5: Zero-Trust Payment Reconciliation (No Screenshots Rule) ---");

// Attempt 1: Reject empty reference ID
const badRes1 = engine.verifyPaymentAndReactivate(sampleSub.tenantId, {
  amountPkr: 1000,
  paymentMethod: "jazzcash",
  referenceId: "", // Empty
  verifiedByAdminUid: "admin-root",
});
assert.strictEqual(badRes1.success, false, "Must reject blank reference ID");
assert.ok(badRes1.message.includes("Screenshots alone are not permitted"));

// Attempt 2: Reject whitespace-only reference ID
const badRes2 = engine.verifyPaymentAndReactivate(sampleSub.tenantId, {
  amountPkr: 1000,
  paymentMethod: "easypaisa",
  referenceId: "    ",
  verifiedByAdminUid: "admin-root",
});
assert.strictEqual(badRes2.success, false, "Must reject whitespace reference ID");
assert.ok(badRes2.message.includes("Screenshots alone are not permitted"));

// Attempt 3: Valid Bank Reference ID -> Reactivates & updates renewal history
const validTid = "JC-9988112244";
const goodRes = engine.verifyPaymentAndReactivate(sampleSub.tenantId, {
  amountPkr: 1000,
  paymentMethod: "jazzcash",
  referenceId: validTid,
  verifiedByAdminUid: "admin-root",
  notes: "Verified via JazzCash Merchant Statement",
});

assert.strictEqual(goodRes.success, true, "Must succeed with valid transaction reference");
assert.strictEqual(goodRes.updatedSub.status, "paid", "Status must become 'paid'");
assert.strictEqual(goodRes.updatedSub.verifiedPayments.length >= 1, true, "Payment must be appended");
assert.strictEqual(goodRes.updatedSub.verifiedPayments[0].referenceId, validTid);
console.log("✅ Zero-trust reconciliation enforcement verified: Screenshots solely rejected; valid TID required.");

console.log("\n=================================================");
console.log("🎉 ALL STANDARD 11 UNIT & INTEGRATION TESTS PASSED!");
console.log("=================================================");
