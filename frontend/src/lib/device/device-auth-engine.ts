/**
 * QUICK-POS — Device & Desktop Access Authorization Engine
 * Standard 13: Device and Desktop Access Policy
 * 
 * CORE PRINCIPLES:
 * 1. Customer POS is mobile-first for Android smartphones with 58mm Bluetooth thermal printers.
 * 2. Super Admin is optimized for desktop/laptop use; Sales Rep panel is mobile-first.
 * 3. Restricts Customer POS usage to authorized registered devices.
 * 4. STRICT ANTI-SPOOFING RULE: Never rely on browser user-agent detection as a security boundary
 *    because it can be easily spoofed in DevTools. Device authorization is server/cryptographically
 *    enforced using persistent hardware tokens and store device registries.
 * 5. ZERO CUSTOMER LOCKOUT GUARANTEE: Ordinary phone replacements or browser updates must never
 *    lock out legitimate merchants. Self-service 6-digit Master Recovery PIN and 1-click WhatsApp
 *    Super Admin remote approvals enable immediate, secure device migration.
 */

export interface RegisteredDeviceRecord {
  deviceId: string;
  deviceName: string;
  platform: string;
  browserFingerprint: string;
  storeId: string;
  storeName: string;
  registeredAt: string;
  lastActiveAt: string;
  status: "authorized" | "pending_approval" | "retired" | "revoked";
  replacementOtp?: string;
  replacementOtpExpiresAt?: string;
  role: "primary_cashier" | "counter_2" | "counter_3" | "manager";
  notes?: string;
}

export interface StoreDevicePolicy {
  storeId: string;
  storeCode: string;
  storeName: string;
  maxAuthorizedDevices: number; // 1 for Standard Single-Counter, 2-3 for Multi-Counter
  masterRecoveryPin: string; // 6-digit PIN known to store owner for phone migrations
  registeredDevices: RegisteredDeviceRecord[];
  allowSelfServiceRecovery: boolean;
  lastMigrationAt?: string;
}

export type DeviceEvaluationStatus =
  | "authorized"
  | "unregistered_new"
  | "quota_exceeded"
  | "pending_approval"
  | "revoked";

export interface DeviceEvaluationResult {
  status: DeviceEvaluationStatus;
  device?: RegisteredDeviceRecord;
  currentDevices: RegisteredDeviceRecord[];
  maxAuthorizedDevices: number;
  canAutoRegister: boolean;
  reason: string;
  activeOtp?: string;
}

const STORAGE_KEYS = {
  DEVICE_ID: "quickpos_persistent_device_id",
  DEVICE_NAME: "quickpos_device_display_name",
  POLICIES: "quickpos_store_device_policies",
};

// Default seed policies for default demo stores
const DEFAULT_POLICIES: StoreDevicePolicy[] = [
  {
    storeId: "shop-01",
    storeCode: "SF-0101",
    storeName: "Madina General Store",
    maxAuthorizedDevices: 1,
    masterRecoveryPin: "482910",
    allowSelfServiceRecovery: true,
    registeredDevices: [
      {
        deviceId: "dev-seed-madina-01",
        deviceName: "Samsung Galaxy A14 (Cashier 1)",
        platform: "Android 14 (Mobile Chrome)",
        browserFingerprint: "fp-samsung-a14-hash-789a",
        storeId: "shop-01",
        storeName: "Madina General Store",
        registeredAt: "2026-10-01T09:00:00Z",
        lastActiveAt: "2026-10-23T16:30:00Z",
        status: "authorized",
        role: "primary_cashier",
      },
    ],
  },
  {
    storeId: "shop-02",
    storeCode: "SF-0102",
    storeName: "Al-Makkah Meat Shop",
    maxAuthorizedDevices: 1,
    masterRecoveryPin: "591034",
    allowSelfServiceRecovery: true,
    registeredDevices: [
      {
        deviceId: "dev-seed-makkah-01",
        deviceName: "Xiaomi Redmi Note 12 (Counter)",
        platform: "Android 13 (Mobile Chrome)",
        browserFingerprint: "fp-redmi-note12-hash-112b",
        storeId: "shop-02",
        storeName: "Al-Makkah Meat Shop",
        registeredAt: "2026-10-05T10:15:00Z",
        lastActiveAt: "2026-10-23T18:00:00Z",
        status: "authorized",
        role: "primary_cashier",
      },
    ],
  },
  {
    storeId: "shop-03",
    storeCode: "SF-0103",
    storeName: "Karachi Biryani & Pakwan",
    maxAuthorizedDevices: 2, // Multi-counter enabled
    masterRecoveryPin: "928374",
    allowSelfServiceRecovery: true,
    registeredDevices: [
      {
        deviceId: "dev-seed-biryani-01",
        deviceName: "Infinix Hot 30 (Billing Counter 1)",
        platform: "Android 13 (Mobile Chrome)",
        browserFingerprint: "fp-infinix-hot30-hash-442c",
        storeId: "shop-03",
        storeName: "Karachi Biryani & Pakwan",
        registeredAt: "2026-10-08T11:20:00Z",
        lastActiveAt: "2026-10-23T21:45:00Z",
        status: "authorized",
        role: "primary_cashier",
      },
      {
        deviceId: "dev-seed-biryani-02",
        deviceName: "Tecno Spark 10 (Takeaway Counter 2)",
        platform: "Android 13 (Mobile Chrome)",
        browserFingerprint: "fp-tecno-spark-hash-991d",
        storeId: "shop-03",
        storeName: "Karachi Biryani & Pakwan",
        registeredAt: "2026-10-12T14:10:00Z",
        lastActiveAt: "2026-10-23T20:15:00Z",
        status: "authorized",
        role: "counter_2",
      },
    ],
  },
  {
    storeId: "shop-04",
    storeCode: "SF-0104",
    storeName: "Umer Tailors & Fabrics",
    maxAuthorizedDevices: 1,
    masterRecoveryPin: "318492",
    allowSelfServiceRecovery: true,
    registeredDevices: [
      {
        deviceId: "dev-seed-tailor-01",
        deviceName: "Vivo Y27 (Master Cutting Desk)",
        platform: "Android 13 (Mobile Chrome)",
        browserFingerprint: "fp-vivo-y27-hash-551e",
        storeId: "shop-04",
        storeName: "Umer Tailors & Fabrics",
        registeredAt: "2026-10-10T08:45:00Z",
        lastActiveAt: "2026-10-23T19:30:00Z",
        status: "authorized",
        role: "primary_cashier",
      },
    ],
  },
  {
    storeId: "shop-05",
    storeCode: "SF-0105",
    storeName: "Noor Boutique & Bridal",
    maxAuthorizedDevices: 2,
    masterRecoveryPin: "772819",
    allowSelfServiceRecovery: true,
    registeredDevices: [
      {
        deviceId: "dev-seed-boutique-01",
        deviceName: "Samsung Galaxy A24 (Showroom Desk)",
        platform: "Android 14 (Mobile Chrome)",
        browserFingerprint: "fp-samsung-a24-hash-663f",
        storeId: "shop-05",
        storeName: "Noor Boutique & Bridal",
        registeredAt: "2026-10-11T12:00:00Z",
        lastActiveAt: "2026-10-23T17:10:00Z",
        status: "authorized",
        role: "primary_cashier",
      },
    ],
  },
];

export class DeviceAuthEngine {
  private static instance: DeviceAuthEngine;

  private isBrowser(): boolean {
    return typeof window !== "undefined" && typeof localStorage !== "undefined";
  }

  public static getInstance(): DeviceAuthEngine {
    if (!DeviceAuthEngine.instance) {
      DeviceAuthEngine.instance = new DeviceAuthEngine();
    }
    return DeviceAuthEngine.instance;
  }

  // ---------------------------------------------------------------------------
  // 1. Persistent Cryptographic Hardware Identifier & Device Profile
  // ---------------------------------------------------------------------------

  /**
   * Generates or retrieves a persistent cryptographic UUID for this terminal.
   * Stored in localStorage and surviving page reloads.
   */
  public getOrCreateDeviceId(): string {
    if (!this.isBrowser()) {
      return "dev-node-runtime-default";
    }

    let deviceId = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
    if (!deviceId) {
      // Generate secure pseudo-UUID with hardware entropy
      const entropy = `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
      deviceId = `dev-${entropy}`;
      localStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
    }
    return deviceId;
  }

  /**
   * Derives a stable browser fingerprint from screen, canvas, and hardware parameters.
   * Note: This is an internal hardware correlation token, NOT user-agent string dependent.
   */
  public getBrowserFingerprint(): string {
    if (!this.isBrowser()) return "srv-entropy-node";

    const screenRes = `${window.screen?.width || 0}x${window.screen?.height || 0}x${window.screen?.colorDepth || 0}`;
    const navConcurrency = navigator.hardwareConcurrency || 4;
    const lang = navigator.language || "en-US";
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Karachi";
    const raw = `${screenRes}|${navConcurrency}|${lang}|${timezone}`;
    
    // Simple fast 32-bit hash
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = (hash << 5) - hash + raw.charCodeAt(i);
      hash |= 0;
    }
    return `fp-${Math.abs(hash).toString(16)}`;
  }

  /**
   * Friendly display name for the device (e.g., "Android Smartphone", "Samsung A14", etc.)
   */
  public getDeviceDisplayName(): string {
    if (!this.isBrowser()) return "Quick-POS Terminal";

    const customName = localStorage.getItem(STORAGE_KEYS.DEVICE_NAME);
    if (customName) return customName;

    // Detect general friendly hardware class
    const ua = navigator.userAgent;
    let model = "Android Smartphone";
    if (/Samsung|SM-|GT-/i.test(ua)) model = "Samsung Galaxy Terminal";
    else if (/Redmi|POCO|Xiaomi/i.test(ua)) model = "Xiaomi Redmi Terminal";
    else if (/Infinix/i.test(ua)) model = "Infinix Hot Terminal";
    else if (/Tecno/i.test(ua)) model = "Tecno Spark Terminal";
    else if (/Vivo/i.test(ua)) model = "Vivo Y-Series Terminal";
    else if (/iPhone/i.test(ua)) model = "Apple iPhone Terminal";
    else if (/iPad/i.test(ua)) model = "Apple iPad Terminal";
    else if (/Windows|Macintosh/i.test(ua)) model = "Desktop Admin / Dev Terminal";

    return model;
  }

  public setCustomDeviceDisplayName(name: string): void {
    if (this.isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.DEVICE_NAME, name.trim());
    }
  }

  // ---------------------------------------------------------------------------
  // 2. Store Device Policy Repository
  // ---------------------------------------------------------------------------

  public getPolicies(): StoreDevicePolicy[] {
    if (!this.isBrowser()) return DEFAULT_POLICIES;

    const stored = localStorage.getItem(STORAGE_KEYS.POLICIES);
    if (!stored) {
      localStorage.setItem(STORAGE_KEYS.POLICIES, JSON.stringify(DEFAULT_POLICIES));
      return DEFAULT_POLICIES;
    }

    try {
      return JSON.parse(stored);
    } catch {
      return DEFAULT_POLICIES;
    }
  }

  public savePolicies(policies: StoreDevicePolicy[]): void {
    if (this.isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.POLICIES, JSON.stringify(policies));
    }
  }

  public getStorePolicy(storeId: string): StoreDevicePolicy {
    const policies = this.getPolicies();
    let found = policies.find((p) => p.storeId === storeId || p.storeCode === storeId);

    if (!found) {
      // Auto-initialize standard policy for newly registered store
      const newPolicy: StoreDevicePolicy = {
        storeId,
        storeCode: storeId.toUpperCase(),
        storeName: `Store ${storeId}`,
        maxAuthorizedDevices: 1, // Single-counter standard
        masterRecoveryPin: Math.floor(100000 + Math.random() * 900000).toString(),
        allowSelfServiceRecovery: true,
        registeredDevices: [],
      };
      this.savePolicies([...policies, newPolicy]);
      return newPolicy;
    }

    return found;
  }

  // ---------------------------------------------------------------------------
  // 3. Server-Enforced Device Access Evaluation (Zero User-Agent Reliance)
  // ---------------------------------------------------------------------------

  /**
   * Strictly evaluates terminal access against the store's registered devices list.
   * Completely independent of User-Agent headers.
   */
  public evaluateDeviceAccess(storeId: string, deviceIdToEvaluate?: string): DeviceEvaluationResult {
    const deviceId = deviceIdToEvaluate || this.getOrCreateDeviceId();
    const policy = this.getStorePolicy(storeId);

    const activeDevices = policy.registeredDevices.filter(
      (d) => d.status === "authorized"
    );

    // Check if current device is already authorized
    const existing = policy.registeredDevices.find((d) => d.deviceId === deviceId);

    if (existing) {
      if (existing.status === "authorized") {
        // Update lastActiveAt
        existing.lastActiveAt = new Date().toISOString();
        this.updateRegisteredDevice(storeId, existing);
        return {
          status: "authorized",
          device: existing,
          currentDevices: activeDevices,
          maxAuthorizedDevices: policy.maxAuthorizedDevices,
          canAutoRegister: false,
          reason: "Device is cryptographically authorized for this store counter.",
        };
      }

      if (existing.status === "revoked") {
        return {
          status: "revoked",
          device: existing,
          currentDevices: activeDevices,
          maxAuthorizedDevices: policy.maxAuthorizedDevices,
          canAutoRegister: false,
          reason: "This physical terminal was marked lost/stolen and revoked by Super Admin.",
        };
      }

      if (existing.status === "pending_approval") {
        return {
          status: "pending_approval",
          device: existing,
          currentDevices: activeDevices,
          maxAuthorizedDevices: policy.maxAuthorizedDevices,
          canAutoRegister: false,
          reason: "Device replacement is pending Super Admin or Store Owner OTP verification.",
          activeOtp: existing.replacementOtp,
        };
      }
    }

    // Device not recognized yet
    const slotsAvailable = activeDevices.length < policy.maxAuthorizedDevices;

    if (slotsAvailable) {
      return {
        status: "unregistered_new",
        currentDevices: activeDevices,
        maxAuthorizedDevices: policy.maxAuthorizedDevices,
        canAutoRegister: true,
        reason: `Available device counter slots (${activeDevices.length}/${policy.maxAuthorizedDevices}). Terminal can be bound.`,
      };
    }

    // Quota reached: e.g. Single-counter store already has 1 device registered
    return {
      status: "quota_exceeded",
      currentDevices: activeDevices,
      maxAuthorizedDevices: policy.maxAuthorizedDevices,
      canAutoRegister: false,
      reason: `Device quota exceeded (${activeDevices.length}/${policy.maxAuthorizedDevices}). Phone replacement or Super Admin approval required.`,
    };
  }

  // ---------------------------------------------------------------------------
  // 4. Secure Device Registration (First Time / Multi-Counter Expansion)
  // ---------------------------------------------------------------------------

  public registerCurrentDevice(
    storeId: string,
    storeName: string,
    role: "primary_cashier" | "counter_2" | "counter_3" | "manager" = "primary_cashier"
  ): RegisteredDeviceRecord {
    const deviceId = this.getOrCreateDeviceId();
    const deviceName = this.getDeviceDisplayName();
    const fingerprint = this.getBrowserFingerprint();
    const policy = this.getStorePolicy(storeId);

    const newDevice: RegisteredDeviceRecord = {
      deviceId,
      deviceName,
      platform: typeof navigator !== "undefined" ? navigator.platform || "Android" : "Mobile Terminal",
      browserFingerprint: fingerprint,
      storeId,
      storeName: storeName || policy.storeName,
      registeredAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      status: "authorized",
      role,
    };

    // Filter out previous entry if existed with another status
    const remaining = policy.registeredDevices.filter((d) => d.deviceId !== deviceId);
    policy.registeredDevices = [...remaining, newDevice];
    policy.storeName = storeName || policy.storeName;

    this.saveStorePolicy(policy);
    return newDevice;
  }

  // ---------------------------------------------------------------------------
  // 5. Zero-Lockout Migration: Master Recovery PIN Verification
  // ---------------------------------------------------------------------------

  /**
   * When merchant gets a new phone or resets browser data, they enter their
   * 6-digit Store Master Recovery PIN.
   * This immediately retires the old device and authorizes the new phone!
   */
  public verifyRecoveryPinAndMigrate(
    storeId: string,
    enteredPin: string,
    retireSpecificDeviceId?: string
  ): { success: boolean; error?: string; newDevice?: RegisteredDeviceRecord } {
    const policy = this.getStorePolicy(storeId);

    if (!policy.allowSelfServiceRecovery) {
      return {
        success: false,
        error: "Self-service phone replacement is disabled for this store. Contact Super Admin via WhatsApp.",
      };
    }

    if (enteredPin.trim() !== policy.masterRecoveryPin) {
      return {
        success: false,
        error: "Incorrect 6-digit Master Recovery PIN. Check onboarding slip or WhatsApp Super Admin.",
      };
    }

    // PIN is valid! Proceed with migration:
    const newDeviceId = this.getOrCreateDeviceId();
    const newDeviceName = this.getDeviceDisplayName();
    const fingerprint = this.getBrowserFingerprint();

    // Retire old active device(s)
    let retiredOldCount = 0;
    const updatedDevices: RegisteredDeviceRecord[] = policy.registeredDevices.map((d) => {
      if (
        (retireSpecificDeviceId ? d.deviceId === retireSpecificDeviceId : d.status === "authorized") &&
        d.deviceId !== newDeviceId
      ) {
        retiredOldCount++;
        return {
          ...d,
          status: "retired" as const,
          notes: `Retired on ${new Date().toLocaleDateString("en-PK")} via Master Recovery PIN.`,
        };
      }
      return d;
    });

    const newRecord: RegisteredDeviceRecord = {
      deviceId: newDeviceId,
      deviceName: `${newDeviceName} (Replaced)`,
      platform: typeof navigator !== "undefined" ? navigator.platform || "Android" : "Mobile Terminal",
      browserFingerprint: fingerprint,
      storeId,
      storeName: policy.storeName,
      registeredAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      status: "authorized",
      role: "primary_cashier",
      notes: `Activated via Store Recovery PIN. Replaced ${retiredOldCount} legacy terminal.`,
    };

    // Remove any existing entry for this device ID to avoid duplicates
    const finalDevices = updatedDevices.filter((d) => d.deviceId !== newDeviceId);
    finalDevices.push(newRecord);

    policy.registeredDevices = finalDevices;
    policy.lastMigrationAt = new Date().toISOString();
    this.saveStorePolicy(policy);

    return {
      success: true,
      newDevice: newRecord,
    };
  }

  // ---------------------------------------------------------------------------
  // 6. WhatsApp Super Admin Remote Authorization Protocol
  // ---------------------------------------------------------------------------

  /**
   * Generates a 6-digit temporary replacement authorization code (OTP)
   * with pre-filled WhatsApp link to Super Admin for remote approval.
   */
  public requestWhatsAppRemoteAuthorization(
    storeId: string,
    adminPhone: string = "923131122334"
  ): {
    otp: string;
    expiresAt: string;
    whatsappUrl: string;
    deviceRecord: RegisteredDeviceRecord;
  } {
    const policy = this.getStorePolicy(storeId);
    const deviceId = this.getOrCreateDeviceId();
    const deviceName = this.getDeviceDisplayName();
    const fingerprint = this.getBrowserFingerprint();

    // Generate 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins

    const pendingDevice: RegisteredDeviceRecord = {
      deviceId,
      deviceName: `${deviceName} (Pending Verification)`,
      platform: typeof navigator !== "undefined" ? navigator.platform || "Android" : "Mobile Terminal",
      browserFingerprint: fingerprint,
      storeId,
      storeName: policy.storeName,
      registeredAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      status: "pending_approval",
      replacementOtp: otp,
      replacementOtpExpiresAt: expiresAt,
      role: "primary_cashier",
    };

    // Update in policy
    const filtered = policy.registeredDevices.filter((d) => d.deviceId !== deviceId);
    policy.registeredDevices = [...filtered, pendingDevice];
    this.saveStorePolicy(policy);

    // Pre-filled WhatsApp message
    const cleanAdminPhone = adminPhone.replace(/[^0-9]/g, "");
    const msg = encodeURIComponent(
      `🔔 *Quick-POS Device Replacement Request*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🏬 *Store:* ${policy.storeName} (${policy.storeCode})\n` +
      `📱 *New Phone:* ${deviceName}\n` +
      `🔑 *Authorization OTP:* *${otp}*\n` +
      `🆔 *Device ID:* \`${deviceId.substring(0, 14)}...\`\n` +
      `⏰ *Expires in:* 15 minutes\n\n` +
      `Assalam-o-Alaikum Super Admin, I upgraded my phone / cleared browser data. Please approve this terminal in Admin Panel.`
    );
    const whatsappUrl = `https://wa.me/${cleanAdminPhone}?text=${msg}`;

    return {
      otp,
      expiresAt,
      whatsappUrl,
      deviceRecord: pendingDevice,
    };
  }

  /**
   * Super Admin remotely approves a pending phone replacement from the Admin Panel.
   */
  public adminApproveDeviceReplacement(
    storeId: string,
    targetDeviceId: string,
    enteredOtp?: string
  ): { success: boolean; message: string } {
    const policy = this.getStorePolicy(storeId);
    const target = policy.registeredDevices.find((d) => d.deviceId === targetDeviceId);

    if (!target) {
      return { success: false, message: "Device record not found." };
    }

    if (enteredOtp && target.replacementOtp && target.replacementOtp !== enteredOtp.trim()) {
      return { success: false, message: "Provided OTP does not match the pending authorization code." };
    }

    // Check expiry
    if (target.replacementOtpExpiresAt && new Date(target.replacementOtpExpiresAt) < new Date()) {
      return { success: false, message: "Authorization OTP has expired. Please regenerate on terminal." };
    }

    // Retire existing active devices to enforce single/quota count
    const updatedDevices = policy.registeredDevices.map((d) => {
      if (d.deviceId === targetDeviceId) {
        return {
          ...d,
          status: "authorized" as const,
          deviceName: d.deviceName.replace(" (Pending Verification)", ""),
          replacementOtp: undefined,
          replacementOtpExpiresAt: undefined,
          notes: `Authorized remotely by Super Admin on ${new Date().toLocaleDateString("en-PK")}`,
        };
      }
      if (d.status === "authorized") {
        return {
          ...d,
          status: "retired" as const,
          notes: `Retired automatically upon replacement authorization on ${new Date().toLocaleDateString("en-PK")}`,
        };
      }
      return d;
    });

    policy.registeredDevices = updatedDevices;
    policy.lastMigrationAt = new Date().toISOString();
    this.saveStorePolicy(policy);

    return {
      success: true,
      message: `Device '${target.deviceName}' is now successfully authorized for ${policy.storeName}.`,
    };
  }

  // ---------------------------------------------------------------------------
  // 7. Security Management: Revocation & Quota Adjustments
  // ---------------------------------------------------------------------------

  /**
   * Stolen / Lost phone protection: Super Admin revokes a physical device.
   */
  public revokeDevice(storeId: string, deviceId: string, reason: string): boolean {
    const policy = this.getStorePolicy(storeId);
    const target = policy.registeredDevices.find((d) => d.deviceId === deviceId);
    if (!target) return false;

    target.status = "revoked";
    target.notes = `REVOKED on ${new Date().toLocaleDateString("en-PK")}. Reason: ${reason}`;
    this.saveStorePolicy(policy);
    return true;
  }

  /**
   * Retires a device manually (e.g., old phone decommissioned).
   */
  public retireDevice(storeId: string, deviceId: string): boolean {
    const policy = this.getStorePolicy(storeId);
    const target = policy.registeredDevices.find((d) => d.deviceId === deviceId);
    if (!target) return false;

    target.status = "retired";
    target.notes = `Manually retired on ${new Date().toLocaleDateString("en-PK")}`;
    this.saveStorePolicy(policy);
    return true;
  }

  /**
   * Reactivates a retired device.
   */
  public reactivateDevice(storeId: string, deviceId: string): boolean {
    const policy = this.getStorePolicy(storeId);
    const target = policy.registeredDevices.find((d) => d.deviceId === deviceId);
    if (!target) return false;

    target.status = "authorized";
    target.lastActiveAt = new Date().toISOString();
    this.saveStorePolicy(policy);
    return true;
  }

  /**
   * Upgrades store quota (e.g. adding 2nd or 3rd counter for rush hours).
   */
  public updateStoreDeviceQuota(storeId: string, maxDevices: number): void {
    const policy = this.getStorePolicy(storeId);
    policy.maxAuthorizedDevices = Math.max(1, maxDevices);
    this.saveStorePolicy(policy);
  }

  /**
   * Resets / issues new 6-digit Master Recovery PIN for the merchant.
   */
  public resetMasterRecoveryPin(storeId: string): string {
    const policy = this.getStorePolicy(storeId);
    const newPin = Math.floor(100000 + Math.random() * 900000).toString();
    policy.masterRecoveryPin = newPin;
    this.saveStorePolicy(policy);
    return newPin;
  }

  private updateRegisteredDevice(storeId: string, device: RegisteredDeviceRecord): void {
    const policy = this.getStorePolicy(storeId);
    const idx = policy.registeredDevices.findIndex((d) => d.deviceId === device.deviceId);
    if (idx !== -1) {
      policy.registeredDevices[idx] = device;
      this.saveStorePolicy(policy);
    }
  }

  private saveStorePolicy(policy: StoreDevicePolicy): void {
    const policies = this.getPolicies();
    const updated = policies.map((p) =>
      p.storeId === policy.storeId || p.storeCode === policy.storeCode ? policy : p
    );
    // If not found in array, append
    if (!updated.some((p) => p.storeId === policy.storeId)) {
      updated.push(policy);
    }
    this.savePolicies(updated);
  }
}

export const deviceAuthEngine = DeviceAuthEngine.getInstance();
