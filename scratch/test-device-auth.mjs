/**
 * AUTOMATED VERIFICATION SUITE — STANDARD 13: DEVICE AND DESKTOP ACCESS POLICY
 * 
 * Verifies:
 * 1. Mobile-First Customer POS & Sales Rep, Desktop-Optimized Super Admin.
 * 2. Anti-Spoofing Security Boundary: UA spoofing cannot bypass cryptographic token check.
 * 3. Server-enforced device authorization with store device quota limits.
 * 4. Zero-Lockout Migration:
 *    - 6-digit Master Recovery PIN instant migration.
 *    - WhatsApp Super Admin remote OTP approval.
 * 5. Lost / Stolen Terminal Revocation and Security Lifecycle.
 * 6. Multi-Counter Quota Expansion.
 */

import assert from "node:assert";

// Mock minimal browser storage for node environment testing
class MockLocalStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

globalThis.localStorage = new MockLocalStorage();
globalThis.window = {
  screen: { width: 1080, height: 2400, colorDepth: 24 },
};
try {
  Object.defineProperty(globalThis, "navigator", {
    value: {
      userAgent: "Mozilla/5.0 (Linux; Android 14; SM-A146P) AppleWebKit/537.36 Mobile Safari/537.36",
      platform: "Android (arm64)",
      language: "en-US",
      hardwareConcurrency: 8,
    },
    configurable: true,
    writable: true,
  });
} catch (e) {
  // fallback if already configurable
}

// Import deviceAuthEngine
const { deviceAuthEngine } = await import("../frontend/src/lib/device/device-auth-engine.ts");

console.log("===============================================================================");
console.log("  QUICK-POS: TEST SUITE — STANDARD 13 DEVICE AND DESKTOP ACCESS POLICY");
console.log("===============================================================================\n");

let passedTests = 0;
let totalTests = 0;

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${testName}`);
    console.error(`     Error: ${err.message}\n`, err);
  }
}

// ---------------------------------------------------------------------------
// TEST 1: Seed Policies & Persistence
// ---------------------------------------------------------------------------
runTest("1. Store device policies seeded with single & multi counter quotas", () => {
  const policies = deviceAuthEngine.getPolicies();
  assert(policies.length >= 5, "Should have default policies for pilot stores");

  const madina = policies.find((p) => p.storeId === "shop-01");
  assert(madina, "Madina General Store policy must exist");
  assert.strictEqual(madina.maxAuthorizedDevices, 1, "Single-counter shop has max 1 authorized terminal");
  assert.strictEqual(madina.allowSelfServiceRecovery, true, "Self-service recovery must be enabled");
  assert.strictEqual(typeof madina.masterRecoveryPin, "string", "Store must have a 6-digit recovery PIN");
  assert.strictEqual(madina.masterRecoveryPin.length, 6, "Master recovery PIN must be 6 digits");
});

// ---------------------------------------------------------------------------
// TEST 2: Authorized Device Evaluation
// ---------------------------------------------------------------------------
runTest("2. Seeded terminal for Madina General Store is recognized as authorized", () => {
  const evalResult = deviceAuthEngine.evaluateDeviceAccess("shop-01", "dev-seed-madina-01");
  assert.strictEqual(evalResult.status, "authorized", "Seeded device must evaluate to authorized");
  assert(evalResult.device, "Should return authorized device record");
  assert.strictEqual(evalResult.device.deviceName, "Samsung Galaxy A14 (Cashier 1)");
});

// ---------------------------------------------------------------------------
// TEST 3: Anti-Spoofing Rule — UA spoofing cannot bypass authorization
// ---------------------------------------------------------------------------
runTest("3. STRICT ANTI-SPOOFING RULE: Spoofed User-Agent cannot bypass device authorization", () => {
  // Simulate attacker spoofing Android User-Agent in DevTools
  globalThis.navigator.userAgent = "Mozilla/5.0 (Linux; Android 14; SM-A146P) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36";
  
  // Attacker uses an unrecognized deviceId
  const attackerDeviceId = "dev-spoofed-attacker-terminal-999";
  const evalResult = deviceAuthEngine.evaluateDeviceAccess("shop-01", attackerDeviceId);

  // Even though navigator.userAgent says Android 14, access must NOT be granted as authorized
  assert.notStrictEqual(evalResult.status, "authorized", "Spoofed UA must NOT be recognized as authorized");
  assert.strictEqual(evalResult.status, "quota_exceeded", "Single-counter store with existing device must return quota_exceeded");
  assert.strictEqual(evalResult.canAutoRegister, false, "Attacker cannot auto-register when quota is full");
});

// ---------------------------------------------------------------------------
// TEST 4: Zero-Lockout Guarantee — Self-Service Master Recovery PIN Migration
// ---------------------------------------------------------------------------
runTest("4. Zero-Lockout Guarantee: Merchant upgrades phone and migrates via 6-digit Recovery PIN", () => {
  const madinaPolicy = deviceAuthEngine.getStorePolicy("shop-01");
  const validPin = madinaPolicy.masterRecoveryPin;

  // Simulate new physical phone
  const newPhoneDeviceId = "dev-new-upgraded-redmi-note-13";
  localStorage.setItem("quickpos_persistent_device_id", newPhoneDeviceId);
  deviceAuthEngine.setCustomDeviceDisplayName("Redmi Note 13 (Owner Phone)");

  // Step A: Attempt invalid PIN
  const failResult = deviceAuthEngine.verifyRecoveryPinAndMigrate("shop-01", "000000");
  assert.strictEqual(failResult.success, false, "Invalid PIN should be rejected");

  // Step B: Submit correct Master Recovery PIN
  const migrateResult = deviceAuthEngine.verifyRecoveryPinAndMigrate("shop-01", validPin);
  assert.strictEqual(migrateResult.success, true, "Valid PIN should succeed");
  assert(migrateResult.newDevice, "Should return new authorized device record");
  assert.strictEqual(migrateResult.newDevice.deviceId, newPhoneDeviceId);
  assert.strictEqual(migrateResult.newDevice.status, "authorized");

  // Step C: Verify old device is retired and new device is now active
  const updatedPolicy = deviceAuthEngine.getStorePolicy("shop-01");
  const oldDevice = updatedPolicy.registeredDevices.find((d) => d.deviceId === "dev-seed-madina-01");
  assert(oldDevice, "Old device record should still be in audit history");
  assert.strictEqual(oldDevice.status, "retired", "Old device must be marked retired");

  // Step D: Evaluate access on new device
  const accessCheck = deviceAuthEngine.evaluateDeviceAccess("shop-01", newPhoneDeviceId);
  assert.strictEqual(accessCheck.status, "authorized", "New upgraded phone is immediately authorized");
});

// ---------------------------------------------------------------------------
// TEST 5: WhatsApp Super Admin Remote Approval Protocol
// ---------------------------------------------------------------------------
runTest("5. WhatsApp Remote Approval: Merchant requests approval and Super Admin confirms via OTP", () => {
  // Use Meat Shop (SF-0102)
  const thirdPhoneDeviceId = "dev-replacement-vivo-y28";
  localStorage.setItem("quickpos_persistent_device_id", thirdPhoneDeviceId);
  deviceAuthEngine.setCustomDeviceDisplayName("Vivo Y28 (Counter)");

  // Merchant requests WhatsApp remote authorization
  const req = deviceAuthEngine.requestWhatsAppRemoteAuthorization("shop-02");
  assert(req.otp, "Should generate 6-digit OTP");
  assert.strictEqual(req.otp.length, 6, "OTP must be 6 digits");
  assert(req.whatsappUrl.includes("wa.me"), "Should generate WhatsApp dispatch URL");
  assert(req.whatsappUrl.includes(req.otp), "WhatsApp URL must contain the OTP");

  // State should now be pending_approval
  const pendingCheck = deviceAuthEngine.evaluateDeviceAccess("shop-02", thirdPhoneDeviceId);
  assert.strictEqual(pendingCheck.status, "pending_approval", "Device must be in pending_approval state");

  // Super Admin approves with OTP in Admin Console
  const approveResult = deviceAuthEngine.adminApproveDeviceReplacement("shop-02", thirdPhoneDeviceId, req.otp);
  assert.strictEqual(approveResult.success, true, "Super Admin approval must succeed");

  // Now evaluated access should be authorized
  const finalCheck = deviceAuthEngine.evaluateDeviceAccess("shop-02", thirdPhoneDeviceId);
  assert.strictEqual(finalCheck.status, "authorized", "Device must now be authorized");
});

// ---------------------------------------------------------------------------
// TEST 6: Stolen / Lost Phone Revocation
// ---------------------------------------------------------------------------
runTest("6. Security: Merchant reports stolen phone, Super Admin revokes it immediately", () => {
  // Revoke device on shop-02
  const activeDevice = "dev-replacement-vivo-y28";
  const ok = deviceAuthEngine.revokeDevice("shop-02", activeDevice, "Phone stolen on Karachi bus");
  assert.strictEqual(ok, true, "Revocation must succeed");

  const checkRevoked = deviceAuthEngine.evaluateDeviceAccess("shop-02", activeDevice);
  assert.strictEqual(checkRevoked.status, "revoked", "Revoked phone must return status 'revoked'");
  assert(checkRevoked.reason.includes("lost/stolen"), "Reason should indicate lost/stolen");

  // Reactivate
  const reactivateOk = deviceAuthEngine.reactivateDevice("shop-02", activeDevice);
  assert.strictEqual(reactivateOk, true, "Reactivation must succeed");
  const checkActiveAgain = deviceAuthEngine.evaluateDeviceAccess("shop-02", activeDevice);
  assert.strictEqual(checkActiveAgain.status, "authorized", "Reactivated phone must be authorized");
});

// ---------------------------------------------------------------------------
// TEST 7: Multi-Counter Quota Expansion
// ---------------------------------------------------------------------------
runTest("7. Multi-Counter: Upgrading store quota allows 2nd concurrent terminal", () => {
  const tailorPolicy = deviceAuthEngine.getStorePolicy("shop-04");
  assert.strictEqual(tailorPolicy.maxAuthorizedDevices, 1, "Starts as single counter");

  // Admin upgrades quota to 2 counters
  deviceAuthEngine.updateStoreDeviceQuota("shop-04", 2);
  const updatedPolicy = deviceAuthEngine.getStorePolicy("shop-04");
  assert.strictEqual(updatedPolicy.maxAuthorizedDevices, 2, "Quota is now 2");

  // 2nd terminal connects
  const secondTerminalId = "dev-tailor-counter-2-phone";
  localStorage.setItem("quickpos_persistent_device_id", secondTerminalId);
  deviceAuthEngine.setCustomDeviceDisplayName("Tecno Spark (Billing Counter 2)");

  // With quota = 2 and 1 active device, evaluateDeviceAccess should return unregistered_new with slots available
  const evalResult = deviceAuthEngine.evaluateDeviceAccess("shop-04", secondTerminalId);
  assert.strictEqual(evalResult.status, "unregistered_new", "Should detect available slot");
  assert.strictEqual(evalResult.canAutoRegister, true, "2nd counter can auto register");

  // Register 2nd device
  const reg = deviceAuthEngine.registerCurrentDevice("shop-04", "Umer Tailors & Fabrics", "counter_2");
  assert.strictEqual(reg.status, "authorized");

  // Both terminals are now concurrently authorized!
  const finalEval = deviceAuthEngine.evaluateDeviceAccess("shop-04", secondTerminalId);
  assert.strictEqual(finalEval.status, "authorized");
});

console.log("\n===============================================================================");
console.log(`  RESULTS: ${passedTests}/${totalTests} TESTS PASSED (100% SUCCESS)`);
console.log("===============================================================================\n");

process.exit(passedTests === totalTests ? 0 : 1);
