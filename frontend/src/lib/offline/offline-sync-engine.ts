/**
 * QUICK-POS — DURABLE OFFLINE-FIRST TRANSACTION QUEUE & SYNCHRONIZATION ENGINE
 * Standard 9: High-Reliability Local Billing, Idempotent Sync, Conflict Handling,
 * Network Recovery, and Primary Device Scoping.
 */

export type SyncState = "pending" | "syncing" | "synced" | "failed";

export interface SyncLogEntry {
  timestamp: string;
  attemptNumber: number;
  status: "success" | "failure" | "aborted" | "retrying";
  message: string;
  httpStatus?: number;
  errorDetail?: string;
}

export interface QueuedSaleItem {
  productId: string;
  productName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  costPrice?: number;
  discount: number;
  totalPrice: number;
  category?: string;
}

export interface QueuedSaleTransaction {
  clientTransactionId: string; // Stable unique ID: QP-TXN-{STORE}-{TIMESTAMP}-{RANDOM}
  tenantId: string;
  invoiceNumber: string;
  cashierUid: string;
  cashierName: string;
  workerId?: string;
  workerName?: string;
  customerId?: string;
  customerName?: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod: "cash" | "jazzcash" | "easypaisa" | "raast" | "udhaar" | "card" | "split";
  amountPaid: number;
  changeReturned: number;
  udhaarAmount: number;
  items: QueuedSaleItem[];
  createdLocallyAt: string;
  deviceId: string;
  isPrimaryDevice: boolean;
  syncStatus: SyncState;
  attemptsCount: number;
  lastAttemptAt?: string;
  lastError?: string;
  syncedAt?: string;
  serverSaleId?: string;
  syncLogs: SyncLogEntry[];
  conflictResolutionNote?: string;
}

const STORAGE_QUEUE_KEY = "quickpos_durable_offline_queue_v1";
const STORAGE_PRIMARY_DEVICE_KEY = "quickpos_primary_device_id_v1";
const STORAGE_SIMULATED_OFFLINE_KEY = "quickpos_simulated_offline_v1";

export class OfflineSyncEngine {
  private static instance: OfflineSyncEngine;
  private isSyncing = false;
  private listeners: Array<() => void> = [];
  private syncIntervalTimer: NodeJS.Timeout | null = null;
  private simulatedOffline = false;

  private constructor() {
    this.initNetworkListeners();
    this.loadSimulatedState();
    this.startPeriodicSyncWorker();
  }

  public static getInstance(): OfflineSyncEngine {
    if (!OfflineSyncEngine.instance) {
      OfflineSyncEngine.instance = new OfflineSyncEngine();
    }
    return OfflineSyncEngine.instance;
  }

  private isBrowser(): boolean {
    return typeof window !== "undefined" && typeof localStorage !== "undefined";
  }

  private loadSimulatedState() {
    if (!this.isBrowser()) return;
    this.simulatedOffline = localStorage.getItem(STORAGE_SIMULATED_OFFLINE_KEY) === "true";
  }

  private initNetworkListeners() {
    if (!this.isBrowser()) return;

    window.addEventListener("online", () => {
      this.logEngineEvent("Network online event detected. Initiating automatic sync...");
      this.notifyListeners();
      // Auto-trigger sync when connectivity returns
      this.syncPendingTransactions();
    });

    window.addEventListener("offline", () => {
      this.logEngineEvent("Network offline event detected. Switching to local billing queue.");
      this.notifyListeners();
    });
  }

  private startPeriodicSyncWorker() {
    if (!this.isBrowser()) return;
    // Periodic background retry every 15 seconds for pending or failed queue items
    this.syncIntervalTimer = setInterval(() => {
      if (this.isOnline() && !this.isSyncing) {
        const pending = this.getQueue().filter((q) => q.syncStatus === "pending" || q.syncStatus === "failed");
        if (pending.length > 0) {
          this.syncPendingTransactions();
        }
      }
    }, 15000);
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((l) => {
      try {
        l();
      } catch (err) {
        console.error("Error in sync listener:", err);
      }
    });
  }

  // --- Network State ---
  public isOnline(): boolean {
    if (this.simulatedOffline) return false;
    if (!this.isBrowser()) return true;
    return navigator.onLine;
  }

  public setSimulatedOffline(offline: boolean) {
    this.simulatedOffline = offline;
    if (this.isBrowser()) {
      localStorage.setItem(STORAGE_SIMULATED_OFFLINE_KEY, String(offline));
    }
    this.logEngineEvent(
      offline
        ? "SIMULATION: Network manually disconnected (Offline Testing Mode Active)."
        : "SIMULATION: Network restored to real connection state."
    );
    this.notifyListeners();
    if (!offline) {
      this.syncPendingTransactions();
    }
  }

  public isSimulatingOffline(): boolean {
    return this.simulatedOffline;
  }

  // --- Primary POS Device Authorization ---
  public getDeviceId(): string {
    if (!this.isBrowser()) return "SERVER_RUNTIME";
    let deviceId = localStorage.getItem(STORAGE_PRIMARY_DEVICE_KEY);
    if (!deviceId) {
      deviceId = `QP-DEV-PRIMARY-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      localStorage.setItem(STORAGE_PRIMARY_DEVICE_KEY, deviceId);
    }
    return deviceId;
  }

  // --- Queue Retrieval & Persistence ---
  public getQueue(): QueuedSaleTransaction[] {
    if (!this.isBrowser()) return [];
    try {
      const data = localStorage.getItem(STORAGE_QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveQueue(queue: QueuedSaleTransaction[]) {
    if (!this.isBrowser()) return;
    localStorage.setItem(STORAGE_QUEUE_KEY, JSON.stringify(queue));
    this.notifyListeners();
  }

  public getPendingCount(): number {
    return this.getQueue().filter((q) => q.syncStatus === "pending").length;
  }

  public getFailedCount(): number {
    return this.getQueue().filter((q) => q.syncStatus === "failed").length;
  }

  public getSyncedCount(): number {
    return this.getQueue().filter((q) => q.syncStatus === "synced").length;
  }

  // --- Enqueue New Sale (Offline or Online) ---
  public enqueueSale(input: {
    tenantId: string;
    invoiceNumber: string;
    cashierUid: string;
    cashierName: string;
    workerId?: string;
    workerName?: string;
    customerId?: string;
    customerName?: string;
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    totalAmount: number;
    paymentMethod: "cash" | "jazzcash" | "easypaisa" | "raast" | "udhaar" | "card" | "split";
    amountPaid: number;
    changeReturned: number;
    udhaarAmount: number;
    items: QueuedSaleItem[];
  }): QueuedSaleTransaction {
    const timestamp = Date.now();
    const cleanStoreCode = input.tenantId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const clientTransactionId = `QP-TXN-${cleanStoreCode}-${timestamp}-${randomSuffix}`;
    const deviceId = this.getDeviceId();

    const queuedSale: QueuedSaleTransaction = {
      ...input,
      clientTransactionId,
      deviceId,
      isPrimaryDevice: true,
      createdLocallyAt: new Date().toISOString(),
      syncStatus: "pending",
      attemptsCount: 0,
      syncLogs: [
        {
          timestamp: new Date().toISOString(),
          attemptNumber: 0,
          status: "retrying",
          message: "Transaction captured locally and enqueued into durable offline store.",
        },
      ],
    };

    const queue = this.getQueue();
    queue.unshift(queuedSale);
    this.saveQueue(queue);

    // If online, immediately trigger background sync attempt
    if (this.isOnline()) {
      setTimeout(() => this.syncPendingTransactions(), 50);
    }

    return queuedSale;
  }

  // --- Synchronization Worker ---
  public async syncPendingTransactions(): Promise<{
    syncedCount: number;
    failedCount: number;
    inFlightCount: number;
  }> {
    if (this.isSyncing) {
      return { syncedCount: 0, failedCount: 0, inFlightCount: this.getPendingCount() };
    }

    if (!this.isOnline()) {
      return { syncedCount: 0, failedCount: 0, inFlightCount: this.getPendingCount() };
    }

    this.isSyncing = true;
    this.notifyListeners();

    let syncedCount = 0;
    let failedCount = 0;

    try {
      const queue = this.getQueue();
      const eligibleItems = queue.filter(
        (item) => item.syncStatus === "pending" || item.syncStatus === "failed"
      );

      for (const item of eligibleItems) {
        // Mark in-flight
        item.syncStatus = "syncing";
        item.attemptsCount += 1;
        item.lastAttemptAt = new Date().toISOString();
        this.saveQueue(queue);

        try {
          const result = await this.dispatchTransactionToServer(item);
          if (result.success) {
            item.syncStatus = "synced";
            item.syncedAt = new Date().toISOString();
            item.serverSaleId = result.saleId;
            item.lastError = undefined;
            item.syncLogs.push({
              timestamp: new Date().toISOString(),
              attemptNumber: item.attemptsCount,
              status: "success",
              message: result.isDuplicate
                ? "Server acknowledged duplicate packet (idempotent receipt confirmed)."
                : `Successfully synced with Cloud Firestore. Server ID: ${result.saleId}`,
            });
            syncedCount++;
          } else {
            throw new Error(result.error || "Unknown server sync rejection");
          }
        } catch (err: any) {
          item.syncStatus = "failed";
          item.lastError = err?.message || String(err);
          item.syncLogs.push({
            timestamp: new Date().toISOString(),
            attemptNumber: item.attemptsCount,
            status: "failure",
            message: `Sync failed on attempt #${item.attemptsCount}: ${item.lastError}`,
            errorDetail: String(err),
          });
          failedCount++;
        }

        // Persist state after each individual item
        this.saveQueue(queue);
      }
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }

    return {
      syncedCount,
      failedCount,
      inFlightCount: this.getPendingCount(),
    };
  }

  // --- Dispatch Single Packet to API ---
  private async dispatchTransactionToServer(
    tx: QueuedSaleTransaction
  ): Promise<{ success: boolean; saleId?: string; isDuplicate?: boolean; error?: string }> {
    try {
      const response = await fetch("/api/pos/sync-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tx),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.message || `Server returned status HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        saleId: data.saleId,
        isDuplicate: data.isDuplicate || false,
      };
    } catch (networkErr: any) {
      return {
        success: false,
        error: `Network transport failure: ${networkErr.message || "Connection timeout"}`,
      };
    }
  }

  // --- Retry Single Failed Transaction ---
  public async retrySingleTransaction(clientTransactionId: string): Promise<boolean> {
    const queue = this.getQueue();
    const item = queue.find((q) => q.clientTransactionId === clientTransactionId);
    if (!item) return false;

    item.syncStatus = "syncing";
    item.attemptsCount += 1;
    item.lastAttemptAt = new Date().toISOString();
    this.saveQueue(queue);

    try {
      const res = await this.dispatchTransactionToServer(item);
      if (res.success) {
        item.syncStatus = "synced";
        item.syncedAt = new Date().toISOString();
        item.serverSaleId = res.saleId;
        item.lastError = undefined;
        item.syncLogs.push({
          timestamp: new Date().toISOString(),
          attemptNumber: item.attemptsCount,
          status: "success",
          message: `Manual retry succeeded! Server ID: ${res.saleId}`,
        });
        this.saveQueue(queue);
        return true;
      } else {
        throw new Error(res.error || "Manual retry rejected by server");
      }
    } catch (err: any) {
      item.syncStatus = "failed";
      item.lastError = err?.message || String(err);
      item.syncLogs.push({
        timestamp: new Date().toISOString(),
        attemptNumber: item.attemptsCount,
        status: "failure",
        message: `Manual retry failed: ${item.lastError}`,
      });
      this.saveQueue(queue);
      return false;
    }
  }

  // --- Logging helper ---
  private logEngineEvent(msg: string) {
    if (typeof console !== "undefined") {
      console.log(`[Quick-POS OfflineEngine] ${new Date().toLocaleTimeString()} — ${msg}`);
    }
  }
}

export const offlineSyncEngine = OfflineSyncEngine.getInstance();
