"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { DeviceGuard } from "@/components/layout/DeviceGuard";
import {
  sqliteDb,
  ProductRecord,
  PrinterConfigRecord,
  SaleRecord,
} from "@/lib/offline/sqlite-db";
import { escposPrinter, StoreProfile, PrinterConnectionStatus } from "@/lib/printer/escpos";
import { ThermalReceiptModal } from "@/components/printer/ThermalReceiptModal";
import { PrinterTroubleshootingModal } from "@/components/printer/PrinterTroubleshootingModal";
import { storeRegistry, StoreAccount } from "@/lib/stores/store-registry";
import {
  getTemplateConfig,
  POSTabId,
  TemplateConfig,
  BusinessTemplateId,
  BUSINESS_TEMPLATES,
} from "@/lib/templates/template-engine";
import {
  commissionEngine,
  WorkerRecord,
  CommissionRule,
  CommissionEntry,
  CommissionSettlement,
} from "@/lib/commission/commission-engine";
import {
  offlineSyncEngine,
  QueuedSaleTransaction,
  SyncState,
} from "@/lib/offline/offline-sync-engine";
import {
  subscriptionEngine,
  SubscriptionRecord,
} from "@/lib/subscription/subscription-engine";
import { AccountRecoveryModal } from "@/components/subscription/AccountRecoveryModal";
import {
  deviceAuthEngine,
  RegisteredDeviceRecord,
} from "@/lib/device/device-auth-engine";
import { DeviceReplacementModal } from "@/components/device/DeviceReplacementModal";

interface CartItem {
  product: ProductRecord;
  quantity: number;
}

export interface StitchingOrder {
  id: string;
  customerName: string;
  phone: string;
  suitType: string;
  length: number;
  chest: number;
  waist: number;
  collar: number;
  tera: number;
  sleeves: number;
  shalwar: number;
  ghera: number;
  deliveryDate: string;
  totalAmount: number;
  advancePaid: number;
  balanceDue: number;
  workerAssigned: string;
  workerCommission: number;
  status: "Cutting" | "In Stitching" | "Quality Check" | "Ready for Pickup" | "Delivered";
}

export interface WastageRecord {
  id: string;
  date: string;
  cutName: string;
  weightKg: number;
  reason: "Fat Trimming" | "Bone Discard" | "Spoilage" | "Cutting Loss";
  costImpact: number;
}

export interface KitchenExpense {
  id: string;
  title: string;
  amount: number;
  category: "Fuel/Gas" | "Cooking Oil" | "Spices/Ingredients" | "Helper Wage" | "Packaging";
  time: string;
}

export interface WholesalePurchase {
  id: string;
  supplierName: string;
  invoiceNo: string;
  date: string;
  itemsSummary: string;
  totalAmount: number;
  status: "Paid" | "Credit/Due";
}

export interface WorkerCommissionRecord {
  id: string;
  name: string;
  role: string;
  unitsCompleted: number;
  commissionRate: number;
  totalAccrued: number;
  advanceWithdrawn: number;
  netPayable: number;
}

export default function CustomerPOSPage() {
  // Store Multi-Tenant & Cashier PIN Authentication State
  const [activeStore, setActiveStore] = useState<StoreAccount | null>(null);
  const [storeIdentifier, setStoreIdentifier] = useState("");
  const [storePin, setStorePin] = useState("");
  const [storeLoginError, setStoreLoginError] = useState("");
  const [availableStores, setAvailableStores] = useState<StoreAccount[]>([]);
  const [isCashierUnlocked, setIsCashierUnlocked] = useState(false);

  // Section 11: Subscriptions and Automated Reminders State
  const [storeSubscription, setStoreSubscription] = useState<SubscriptionRecord | null>(null);
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);

  // Section 13: Device and Desktop Access Policy State
  const [currentTerminalDevice, setCurrentTerminalDevice] = useState<RegisteredDeviceRecord | null>(null);
  const [isDeviceReplacementModalOpen, setIsDeviceReplacementModalOpen] = useState(false);
  const [pendingStoreToAuthorize, setPendingStoreToAuthorize] = useState<StoreAccount | null>(null);

  const refreshSubscriptionStatus = (storeId?: string) => {
    const targetId = storeId || activeStore?.id;
    if (!targetId) {
      setStoreSubscription(null);
      return;
    }
    const sub = subscriptionEngine.getSubscriptionByTenant(targetId);
    setStoreSubscription(sub);
  };

  useEffect(() => {
    if (activeStore) {
      refreshSubscriptionStatus(activeStore.id);
    }
  }, [activeStore]);

  // Safe Offline Grace Check
  const offlineGraceCheck = storeSubscription
    ? subscriptionEngine.checkOfflineGracePolicy(storeSubscription)
    : { allowed: true, reason: "", requiresSync: false };

  const isStoreRestricted = Boolean(
    storeSubscription && (storeSubscription.status === "restricted" || !offlineGraceCheck.allowed)
  );

  // Configuration-driven Template & Tabs
  const currentTemplate: TemplateConfig = getTemplateConfig(activeStore?.template_type);
  const [subTab, setSubTab] = useState<POSTabId>("billing");
  const [isStoreSwitcherOpen, setIsStoreSwitcherOpen] = useState(false);

  // Template B: Meat Shop Live Weighing Scale State
  const [weighGrams, setWeighGrams] = useState<number>(750);
  const [selectedMeatItem, setSelectedMeatItem] = useState<ProductRecord | null>(null);

  // Template C: Biryani / Food Stall Portion & Takeaway State
  const [biryaniPortion, setBiryaniPortion] = useState<"full" | "half" | "double">("full");
  const [isTakeawayParcel, setIsTakeawayParcel] = useState<boolean>(false);

  // Template D: Tailor Stitching State
  const [isBookingModalOpen, setIsBookingModalOpen] = useState<boolean>(false);
  const [stitchingOrders, setStitchingOrders] = useState<StitchingOrder[]>([
    {
      id: "ST-101",
      customerName: "Muhammad Farhan",
      phone: "0300-9876543",
      suitType: "Shalwar Kameez (White Cotton)",
      length: 40.5,
      chest: 38,
      waist: 34,
      collar: 15.5,
      tera: 17.5,
      sleeves: 23,
      shalwar: 38.5,
      ghera: 16,
      deliveryDate: "2026-10-24",
      totalAmount: 1200,
      advancePaid: 500,
      balanceDue: 700,
      workerAssigned: "Master Asif (Cutter)",
      workerCommission: 350,
      status: "In Stitching",
    },
    {
      id: "ST-102",
      customerName: "Kamran Akram",
      phone: "0333-1122334",
      suitType: "Kurta Pajama (Navy Blue)",
      length: 41,
      chest: 40,
      waist: 36,
      collar: 16,
      tera: 18,
      sleeves: 24,
      shalwar: 39,
      ghera: 17,
      deliveryDate: "2026-10-26",
      totalAmount: 950,
      advancePaid: 950,
      balanceDue: 0,
      workerAssigned: "Sajid Karigar",
      workerCommission: 300,
      status: "Cutting",
    },
    {
      id: "ST-103",
      customerName: "Chaudhry Riaz",
      phone: "0321-4455667",
      suitType: "Safari Suit (Charcoal)",
      length: 30,
      chest: 42,
      waist: 38,
      collar: 16.5,
      tera: 18.5,
      sleeves: 24.5,
      shalwar: 40,
      ghera: 18,
      deliveryDate: "2026-10-22",
      totalAmount: 1800,
      advancePaid: 800,
      balanceDue: 1000,
      workerAssigned: "Master Asif (Cutter)",
      workerCommission: 500,
      status: "Ready for Pickup",
    },
  ]);

  const [newBooking, setNewBooking] = useState({
    customerName: "",
    phone: "",
    suitType: "Shalwar Kameez (Standard Stitching)",
    length: 40.5,
    chest: 38,
    waist: 34,
    collar: 15.5,
    tera: 17.5,
    sleeves: 23,
    shalwar: 38.5,
    ghera: 16,
    deliveryDate: "2026-10-28",
    totalAmount: 1200,
    advancePaid: 500,
    workerAssigned: "Master Asif (Cutter)",
    workerCommission: 350,
  });

  // Template E: Boutique State
  const [boutiqueVariantSize, setBoutiqueVariantSize] = useState<"S" | "M" | "L" | "XL">("M");
  const [boutiqueSalesRep, setBoutiqueSalesRep] = useState<string>("Ayesha (3% Commission)");

  // Template B: Meat Wastage State
  const [wastageRecords, setWastageRecords] = useState<WastageRecord[]>([
    { id: "w-01", date: "Today, 08:30 AM", cutName: "Fresh Beef Boti (Bone & Fat)", weightKg: 4.2, reason: "Bone Discard", costImpact: 3570 },
    { id: "w-02", date: "Today, 11:15 AM", cutName: "Broiler Chicken (Feather & Head)", weightKg: 2.8, reason: "Fat Trimming", costImpact: 1120 },
    { id: "w-03", date: "Yesterday, 06:00 PM", cutName: "Mutton Leg Trimming", weightKg: 1.5, reason: "Cutting Loss", costImpact: 2250 },
  ]);
  const [newWastageCut, setNewWastageCut] = useState("Fresh Beef Boti");
  const [newWastageKg, setNewWastageKg] = useState("1.5");
  const [newWastageReason, setNewWastageReason] = useState<"Fat Trimming" | "Bone Discard" | "Spoilage" | "Cutting Loss">("Fat Trimming");

  // Template C: Biryani Daily Kitchen Expenses State
  const [kitchenExpenses, setKitchenExpenses] = useState<KitchenExpense[]>([
    { id: "exp-01", title: "LPG Gas Cylinder 45kg Refill", amount: 3500, category: "Fuel/Gas", time: "09:00 AM" },
    { id: "exp-02", title: "Dalda Cooking Oil 16L Tin", amount: 7200, category: "Cooking Oil", time: "10:30 AM" },
    { id: "exp-03", title: "Deg Spices & Saffron Essence", amount: 1850, category: "Spices/Ingredients", time: "11:00 AM" },
    { id: "exp-04", title: "Disposable Food Boxes & Spoons (200 pcs)", amount: 950, category: "Packaging", time: "12:15 PM" },
    { id: "exp-05", title: "Daily Helper / Dishwasher Wage", amount: 1200, category: "Helper Wage", time: "01:00 PM" },
  ]);
  const [newExpenseTitle, setNewExpenseTitle] = useState("");
  const [newExpenseAmount, setNewExpenseAmount] = useState("");
  const [newExpenseCat, setNewExpenseCat] = useState<"Fuel/Gas" | "Cooking Oil" | "Spices/Ingredients" | "Helper Wage" | "Packaging">("Spices/Ingredients");

  // Template A & E: Wholesale Purchases & Suppliers State
  const [wholesalePurchases, setWholesalePurchases] = useState<WholesalePurchase[]>([
    { id: "pur-01", supplierName: "Metro Wholesale Cash & Carry", invoiceNo: "INV-9841", date: "2026-10-19", itemsSummary: "Dal Chana (100kg), Basmati Rice (120kg)", totalAmount: 48500, status: "Paid" },
    { id: "pur-02", supplierName: "Dalda Distributor Shah Faisal", invoiceNo: "INV-5512", date: "2026-10-18", itemsSummary: "Dalda Cooking Oil 1L (10 Cartons)", totalAmount: 58800, status: "Paid" },
    { id: "pur-03", supplierName: "Tapal Tea Agencies", invoiceNo: "INV-3321", date: "2026-10-15", itemsSummary: "Danedar Tea 450g (50 packs)", totalAmount: 29000, status: "Credit/Due" },
  ]);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newInvoiceNo, setNewInvoiceNo] = useState("");
  const [newPurchaseAmount, setNewPurchaseAmount] = useState("");
  const [newPurchaseItems, setNewPurchaseItems] = useState("");

  // Template D & E: Workers Commission State
  const [workersList, setWorkersList] = useState<WorkerCommissionRecord[]>([
    { id: "wrk-01", name: "Master Asif (Cutter)", role: "Master Cutter", unitsCompleted: 14, commissionRate: 350, totalAccrued: 4900, advanceWithdrawn: 1500, netPayable: 3400 },
    { id: "wrk-02", name: "Sajid Karigar", role: "Stitching Tailor", unitsCompleted: 11, commissionRate: 300, totalAccrued: 3300, advanceWithdrawn: 1000, netPayable: 2300 },
    { id: "wrk-03", name: "Ayesha Khan", role: "Boutique Sales Staff", unitsCompleted: 8, commissionRate: 200, totalAccrued: 1600, advanceWithdrawn: 500, netPayable: 1100 },
  ]);

  // Standard 7: Staff & Worker Commission Management State
  const [commissionWorkers, setCommissionWorkers] = useState<WorkerRecord[]>([]);
  const [commissionRules, setCommissionRules] = useState<CommissionRule[]>([]);
  const [commissionEntries, setCommissionEntries] = useState<CommissionEntry[]>([]);
  const [commissionSettlements, setCommissionSettlements] = useState<CommissionSettlement[]>([]);
  const [commissionTimeframe, setCommissionTimeframe] = useState<"daily" | "weekly" | "monthly">("monthly");

  // Modals for Worker Commission
  const [activeWorkerModal, setActiveWorkerModal] = useState<
    null | "add_worker" | "settle" | "entries" | "clawback" | "rules" | "history" | "receipt"
  >(null);
  const [selectedCommissionWorker, setSelectedCommissionWorker] = useState<WorkerRecord | null>(null);
  const [lastCompletedSettlement, setLastCompletedSettlement] = useState<CommissionSettlement | null>(null);

  // Settlement Form State
  const [settleType, setSettleType] = useState<"commission" | "salary" | "salary_plus_commission" | "adjustment">("commission");
  const [settleAmount, setSettleAmount] = useState<number>(0);
  const [settleAdvanceDeduction, setSettleAdvanceDeduction] = useState<number>(0);
  const [settleMethod, setSettleMethod] = useState<"cash" | "bank_transfer" | "easypaisa" | "jazzcash">("easypaisa");
  const [settleReference, setSettleReference] = useState<string>("");
  const [settleNotes, setSettleNotes] = useState<string>("");

  // Refund / Clawback Form State
  const [clawbackSaleId, setClawbackSaleId] = useState<string>("");
  const [clawbackAmount, setClawbackAmount] = useState<number>(0);
  const [clawbackReason, setClawbackReason] = useState<string>("Customer return on defective piece");

  // New Worker Form State
  const [newWorkerName, setNewWorkerName] = useState<string>("");
  const [newWorkerPhone, setNewWorkerPhone] = useState<string>("");
  const [newWorkerRole, setNewWorkerRole] = useState<string>("Boutique Sales Specialist");
  const [newWorkerPaymentType, setNewWorkerPaymentType] = useState<"fixed_salary" | "commission_only" | "salary_plus_commission">("salary_plus_commission");
  const [newWorkerBaseSalary, setNewWorkerBaseSalary] = useState<number>(25000);
  const [newWorkerTarget, setNewWorkerTarget] = useState<number>(200000);
  const [newWorkerBonus, setNewWorkerBonus] = useState<number>(5000);

  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartExpanded, setIsCartExpanded] = useState<boolean>(true);

  // Checkout & Payment State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "qr" | "udhaar" | "card">("cash");
  const [cashTendered, setCashTendered] = useState<number>(0);
  const [selectedCustomer, setSelectedCustomer] = useState({
    name: "Tariq Mehmood",
    phone: "0300-1234567",
    tag: "VIP Kiryana",
    balance: 4350,
    credit_limit: 15000,
  });
  const [isPrintingThermal, setIsPrintingThermal] = useState(true);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(true);
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);
  const [saleSuccessMessage, setSaleSuccessMessage] = useState("");

  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Standard 10: Bluetooth Thermal Printer Hardware State
  const [printerConfig, setPrinterConfig] = useState<PrinterConfigRecord>(() => sqliteDb.getPrinterConfig());
  const [printerStatus, setPrinterStatus] = useState<PrinterConnectionStatus>(escposPrinter.status);
  const [selectedPaperWidth, setSelectedPaperWidth] = useState<"58mm" | "80mm">("58mm");
  const [selectedConnectionMode, setSelectedConnectionMode] = useState<"bluetooth_ble" | "rawbt_intent" | "browser_print">("bluetooth_ble");
  const [isTroubleshootOpen, setIsTroubleshootOpen] = useState(false);
  const [activeReceiptModalSale, setActiveReceiptModalSale] = useState<{ sale: SaleRecord; isReprint: boolean; isDraftPreview?: boolean } | null>(null);
  const [alwaysPreviewSlip, setAlwaysPreviewSlip] = useState(false);
  const [customHeaderNote, setCustomHeaderNote] = useState("");
  const [customFooterNote, setCustomFooterNote] = useState("");
  const [printerDensity, setPrinterDensity] = useState<"Normal" | "Dark Ink">("Dark Ink");
  const [activePrinterName, setActivePrinterName] = useState("MPT-II 58mm Mini");
  const [isScanningPrinters, setIsScanningPrinters] = useState(false);
  const [printAlertMessage, setPrintAlertMessage] = useState<string | null>(null);

  // Standard 9: Offline-First Transaction Queue & Cloud Sync State
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState(false);
  const [offlineQueueTab, setOfflineQueueTab] = useState<"pending" | "synced" | "failed" | "logs">("pending");
  const [offlineQueue, setOfflineQueue] = useState<QueuedSaleTransaction[]>([]);
  const [isOnlineState, setIsOnlineState] = useState(true);
  const [isSyncingState, setIsSyncingState] = useState(false);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Udhaar Khata State
  const [customersList] = useState([
    { id: "c1", name: "Tariq Mehmood", phone: "0300-1234567", area: "Shah Faisal Colony # 3", balance: 4350, limit: 15000, lastDate: "Today" },
    { id: "c2", name: "Chaudhry Riaz", phone: "0333-9876543", area: "Shah Faisal Colony # 2", balance: 12400, limit: 20000, lastDate: "Yesterday" },
    { id: "c3", name: "Haji Munawwar", phone: "0301-7788990", area: "Shah Faisal Block 1", balance: 6800, limit: 10000, lastDate: "3 days ago" },
    { id: "c4", name: "Bhai Bilal Baker", phone: "0321-4567890", area: "Shah Faisal Main Bazar", balance: 1950, limit: 8000, lastDate: "5 days ago" },
    { id: "c5", name: "Suleman Tea Stall", phone: "0345-1122334", area: "Shah Faisal Colony # 4", balance: 0, limit: 12000, lastDate: "Cleared" },
  ]);

  // Categories Strip - Dynamically derived from active store products
  const categories = [
    "All",
    ...Array.from(new Set(products.map((p) => p.category))).filter(Boolean),
  ];

  useEffect(() => {
    const stores = storeRegistry.getStores();
    setAvailableStores(stores);

    // Support direct query param switching for automated testing & deep-linking
    let storeToActivate: StoreAccount | null = null;
    let initialTab: POSTabId | null = null;
    let initialModal: string | null = null;
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const qStore = params.get("store");
      const qTemplate = params.get("template");
      const qTab = params.get("tab") || params.get("subtab");
      initialModal = params.get("modal");

      if (qTab) {
        initialTab = qTab as POSTabId;
      }

      if (qStore) {
        storeToActivate = stores.find(
          (s) => s.store_code.toUpperCase() === qStore.toUpperCase() || s.id === qStore
        ) || null;
      } else if (qTemplate) {
        storeToActivate = stores.find(
          (s) => s.template_type.toLowerCase() === qTemplate.toLowerCase()
        ) || null;
      }
    }

    if (storeToActivate) {
      storeRegistry.setActiveStoreSession(storeToActivate);
      setActiveStore(storeToActivate);
      setIsCashierUnlocked(true);
      const storeProducts =
        storeToActivate.products && storeToActivate.products.length > 0
          ? storeToActivate.products
          : sqliteDb.getProducts();
      setProducts(storeProducts);
      if (storeProducts.length > 0) {
        setSelectedMeatItem(storeProducts[0]);
      }
      if (initialTab) {
        setSubTab(initialTab);
      }
      if (initialModal === "booking") {
        setIsBookingModalOpen(true);
      }
      if (initialModal === "offline") {
        setIsOfflineModalOpen(true);
      }
      refreshCommissionData(storeToActivate.id);
      return;
    }

    const savedStore = storeRegistry.getActiveStoreSession();
    if (savedStore) {
      setActiveStore(savedStore);
      setIsCashierUnlocked(true);
      const storeProducts =
        savedStore.products && savedStore.products.length > 0
          ? savedStore.products
          : sqliteDb.getProducts();
      setProducts(storeProducts);
      if (storeProducts.length > 0) {
        setSelectedMeatItem(storeProducts[0]);
      }
      if (initialTab) {
        setSubTab(initialTab);
      }
      if (initialModal === "booking") {
        setIsBookingModalOpen(true);
      }
      if (initialModal === "offline") {
        setIsOfflineModalOpen(true);
      }
      refreshCommissionData(savedStore.id);
    } else {
      setIsCashierUnlocked(false);
      refreshCommissionData();
    }
  }, []);

  // Standard 9: Subscribe to Real-Time Offline Queue and Network Changes
  useEffect(() => {
    const updateSyncState = () => {
      setOfflineQueue(offlineSyncEngine.getQueue());
      setIsOnlineState(offlineSyncEngine.isOnline());
      setIsSimulatedOffline(offlineSyncEngine.isSimulatingOffline());
    };
    updateSyncState();
    const unsubscribe = offlineSyncEngine.subscribe(updateSyncState);
    return () => unsubscribe();
  }, []);

  // Standard 10: Sync Printer State and Observe Connection Changes
  useEffect(() => {
    const cfg = sqliteDb.getPrinterConfig();
    setPrinterConfig(cfg);
    setPrinterStatus(escposPrinter.status);
    setSelectedPaperWidth(cfg.paper_width || "58mm");
    setSelectedConnectionMode(cfg.connection_mode || "bluetooth_ble");
    setCustomHeaderNote(cfg.custom_header_note || "Welcome to our shop");
    setCustomFooterNote(cfg.custom_footer_message || "Aapki Aamad Ka Shukriya! No Exchange without Receipt.");
    setActivePrinterName(cfg.device_name || "MPT-II 58mm Mini");
    setIsPrintingThermal(cfg.auto_print_on_checkout ?? true);

    escposPrinter.onStatusChange = (status) => {
      setPrinterStatus(status);
      sqliteDb.updatePrinterConfig({ is_connected: status === "CONNECTED" ? 1 : 0 });
      setPrinterConfig(sqliteDb.getPrinterConfig());
    };

    return () => {
      escposPrinter.onStatusChange = undefined;
    };
  }, []);

  const handleConnectBluetooth = async () => {
    setIsScanningPrinters(true);
    try {
      showToast("Requesting Bluetooth device pairing dialog...");
      const connected = await escposPrinter.connect();
      if (connected) {
        const name = escposPrinter.getConnectedDeviceName();
        setActivePrinterName(name);
        sqliteDb.updatePrinterConfig({
          device_name: name,
          is_connected: 1,
        });
        setPrinterConfig(sqliteDb.getPrinterConfig());
        showToast("Connected to Bluetooth printer: " + name);
      } else {
        showToast("Bluetooth device was not connected.");
      }
    } catch (err: any) {
      showToast("Bluetooth error: " + (err?.message || "Failed to pair printer"));
    } finally {
      setIsScanningPrinters(false);
    }
  };

  const handleDisconnectBluetooth = () => {
    escposPrinter.disconnect();
    sqliteDb.updatePrinterConfig({ is_connected: 0 });
    setPrinterConfig(sqliteDb.getPrinterConfig());
    showToast("Bluetooth printer disconnected");
  };

  const handleTestPrint = async () => {
    try {
      showToast("Printing ESC/POS hardware diagnostic slip...");
      const storeProfile: StoreProfile = {
        name: activeStore?.name,
        area: activeStore?.area,
        phone: activeStore?.phone,
        ntn: activeStore?.ntn || "Exempt",
        tagline: currentTemplate.name,
        customHeader: customHeaderNote,
        customFooter: customFooterNote,
      };
      const ok = await escposPrinter.testPrint(selectedPaperWidth, storeProfile);
      if (ok) {
        showToast("Diagnostic slip dispatched to printer!");
      } else {
        showToast("Printing error: Check connection or RawBT app.");
      }
    } catch (err: any) {
      showToast("Test print failed: " + (err?.message || err));
    }
  };

  const handleFeedPaper = async () => {
    try {
      await escposPrinter.feedPaper(printerConfig.feed_lines || 3);
      showToast(`Fed ${printerConfig.feed_lines || 3} lines of thermal paper`);
    } catch {
      showToast("Paper feed command executed");
    }
  };

  const handleCutPaper = async () => {
    try {
      await escposPrinter.cutPaper(false);
      showToast("Partial cut command executed");
    } catch {
      showToast("Paper cut command executed");
    }
  };

  const handleKickDrawer = async () => {
    try {
      await escposPrinter.kickCashDrawer();
      showToast("Cash drawer kick pulse sent");
    } catch {
      showToast("Cash drawer kick pulse sent");
    }
  };

  const handleBeepBuzzer = async () => {
    try {
      await escposPrinter.beepBuzzer(2);
      showToast("Printer sound notification triggered");
    } catch {
      showToast("Sound buzzer triggered");
    }
  };

  const handleSavePrinterSettings = () => {
    sqliteDb.updatePrinterConfig({
      paper_width: selectedPaperWidth,
      connection_mode: selectedConnectionMode,
      custom_header_note: customHeaderNote,
      custom_footer_message: customFooterNote,
      print_density: printerDensity === "Dark Ink" ? "dark" : "normal",
      auto_print_on_checkout: isPrintingThermal,
    });
    setPrinterConfig(sqliteDb.getPrinterConfig());
    showToast("Printer preferences saved successfully!");
  };

  const handleManualSyncNow = async () => {
    setIsSyncingState(true);
    setSyncFeedback("Syncing pending queue with Cloud Firestore...");
    try {
      const res = await offlineSyncEngine.syncPendingTransactions();
      if (res.syncedCount > 0) {
        showToast(`Successfully synced ${res.syncedCount} sale(s) to cloud!`);
        setSyncFeedback(`Sync complete! ${res.syncedCount} synced, ${res.failedCount} failed.`);
      } else if (res.failedCount > 0) {
        showToast(`Sync alert: ${res.failedCount} transaction(s) failed. Check logs.`);
        setSyncFeedback(`Sync alert: ${res.failedCount} failed.`);
      } else {
        showToast("Queue is already up to date with cloud.");
        setSyncFeedback("All transactions are synchronized.");
      }
    } catch (err: any) {
      showToast("Sync error: Check network connection.");
      setSyncFeedback(`Sync error: ${err?.message || "Network issue"}`);
    } finally {
      setIsSyncingState(false);
      setTimeout(() => setSyncFeedback(null), 4000);
    }
  };

  const handleToggleSimulatedOffline = () => {
    const nextState = !isSimulatedOffline;
    offlineSyncEngine.setSimulatedOffline(nextState);
    setIsSimulatedOffline(nextState);
    setIsOnlineState(!nextState);
    showToast(
      nextState
        ? "Offline Simulation ACTIVE: Disconnected from cloud."
        : "Network RESTORED: Online sync resumed."
    );
  };

  const handleRetryFailedTransaction = async (clientTransactionId: string) => {
    showToast(`Retrying transaction ${clientTransactionId}...`);
    const success = await offlineSyncEngine.retrySingleTransaction(clientTransactionId);
    if (success) {
      showToast(`Transaction synced successfully!`);
    } else {
      showToast(`Retry failed. Check network or server log.`);
    }
  };

  const refreshCommissionData = (tenantId?: string) => {
    commissionEngine.ensureInitialized();
    const tId = tenantId || activeStore?.id || "shop-05";
    setCommissionWorkers(commissionEngine.getWorkers(tId));
    setCommissionRules(commissionEngine.getRules(tId));
    setCommissionEntries(commissionEngine.getEntries(tId));
    setCommissionSettlements(commissionEngine.getSettlements(tId));
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  };

  const loadProducts = () => {
    const store = activeStore || storeRegistry.getActiveStoreSession();
    if (store && store.products && store.products.length > 0) {
      setProducts(store.products);
    } else {
      setProducts(sqliteDb.getProducts());
    }
  };

  const handleStoreLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setStoreLoginError("");

    if (!storeIdentifier.trim() || !storePin.trim()) {
      setStoreLoginError("Please enter both Store ID and PIN.");
      return;
    }

    const matched = storeRegistry.authenticateStore(storeIdentifier, storePin);
    if (matched) {
      // Standard 13: Server-Enforced Device Authorization & Anti-Spoofing Check
      const deviceAuth = deviceAuthEngine.evaluateDeviceAccess(matched.id);
      if (deviceAuth.status === "revoked") {
        setStoreLoginError("ACCESS DENIED: This physical terminal was reported lost/stolen and revoked by Super Admin.");
        return;
      }
      if (deviceAuth.status === "quota_exceeded") {
        setPendingStoreToAuthorize(matched);
        setIsDeviceReplacementModalOpen(true);
        setStoreLoginError("New Phone Detected: Device quota reached. Use 6-Digit Master Recovery PIN or WhatsApp Admin to migrate terminal.");
        return;
      }
      if (deviceAuth.status === "unregistered_new" && deviceAuth.canAutoRegister) {
        const reg = deviceAuthEngine.registerCurrentDevice(matched.id, matched.name, "primary_cashier");
        setCurrentTerminalDevice(reg);
        showToast(`Hardware Terminal Registered: ${reg.deviceName}`);
      } else if (deviceAuth.status === "authorized" && deviceAuth.device) {
        setCurrentTerminalDevice(deviceAuth.device);
      }

      setActiveStore(matched);
      setIsCashierUnlocked(true);
      const storeProducts =
        matched.products && matched.products.length > 0
          ? matched.products
          : sqliteDb.getProducts();
      setProducts(storeProducts);
      if (storeProducts.length > 0) {
        setSelectedMeatItem(storeProducts[0]);
      }
      setSubTab("billing");
      setCart([]);
      setStoreLoginError("");
      setStoreIdentifier("");
      setStorePin("");
      refreshCommissionData(matched.id);
      showToast(`Welcome! Logged into ${matched.name} (${matched.template_type.toUpperCase()})`);
    } else {
      setStoreLoginError("Invalid Store ID or PIN. Check credentials issued by Admin.");
    }
  };

  const handleQuickDemoStoreSelect = (shop: StoreAccount) => {
    setStoreIdentifier(shop.store_code);
    setStorePin(shop.login_pin);
    const matched = storeRegistry.authenticateStore(shop.store_code, shop.login_pin);
    if (matched) {
      // Standard 13: Server-Enforced Device Authorization & Anti-Spoofing Check
      const deviceAuth = deviceAuthEngine.evaluateDeviceAccess(shop.id);
      if (deviceAuth.status === "revoked") {
        setStoreLoginError("ACCESS DENIED: This terminal was revoked.");
        return;
      }
      if (deviceAuth.status === "quota_exceeded") {
        setPendingStoreToAuthorize(matched);
        setIsDeviceReplacementModalOpen(true);
        setStoreLoginError("New Phone Detected: Single-counter limit reached. Open replacement modal to migrate terminal.");
        return;
      }
      if (deviceAuth.status === "unregistered_new" && deviceAuth.canAutoRegister) {
        const reg = deviceAuthEngine.registerCurrentDevice(shop.id, shop.name, "primary_cashier");
        setCurrentTerminalDevice(reg);
      } else if (deviceAuth.status === "authorized" && deviceAuth.device) {
        setCurrentTerminalDevice(deviceAuth.device);
      }

      setActiveStore(matched);
      setIsCashierUnlocked(true);
      const storeProducts =
        matched.products && matched.products.length > 0
          ? matched.products
          : sqliteDb.getProducts();
      setProducts(storeProducts);
      if (storeProducts.length > 0) {
        setSelectedMeatItem(storeProducts[0]);
      }
      setSubTab("billing");
      setCart([]);
      setStoreLoginError("");
      refreshCommissionData(matched.id);
      showToast(`Logged into ${matched.name} (${matched.template_type.toUpperCase()})`);
    }
  };

  const handleSignOutStore = () => {
    storeRegistry.clearStoreSession();
    setActiveStore(null);
    setIsCashierUnlocked(false);
    setCart([]);
    setStoreLoginError("");
    showToast("Signed out of store terminal.");
  };

  // Add Item to Cart
  const addToCart = (product: ProductRecord) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    showToast(`Added: ${product.name} (PKR ${product.sale_price})`);
  };

  // Template B (Meat): Add Weighed Cut to Cart
  const addWeighedMeatToCart = (product: ProductRecord, grams: number) => {
    const kg = grams / 1000;
    const itemTotal = Math.round(product.sale_price * kg);
    const customId = `${product.id}-w-${Date.now()}`;
    const weighedItem: ProductRecord = {
      ...product,
      id: customId,
      name: `${product.name} (${grams >= 1000 ? `${(grams / 1000).toFixed(2)} KG` : `${grams}g`})`,
      sale_price: itemTotal,
      unit: grams >= 1000 ? "kg" : "g",
    };
    setCart((prev) => [...prev, { product: weighedItem, quantity: 1 }]);
    showToast(`Added Weighed Meat: ${weighedItem.name} = PKR ${itemTotal.toLocaleString()}`);
  };

  // Template C (Biryani): Add Portion to Cart
  const addBiryaniPortionToCart = (
    product: ProductRecord,
    portion: "full" | "half" | "double",
    takeaway: boolean
  ) => {
    let multiplier = 1.0;
    let label = "Full Plate";
    if (portion === "half") {
      multiplier = 0.6;
      label = "Half Plate";
    } else if (portion === "double") {
      multiplier = 1.25;
      label = "Double Boti Special";
    }
    const packagingCharge = takeaway ? 20 : 0;
    const finalPrice = Math.round(product.sale_price * multiplier) + packagingCharge;
    const customId = `${product.id}-p-${Date.now()}`;
    const portionItem: ProductRecord = {
      ...product,
      id: customId,
      name: `${product.name} [${label}${takeaway ? " • Parcel" : " • Dine-In"}]`,
      sale_price: finalPrice,
      unit: "plate",
    };
    setCart((prev) => [...prev, { product: portionItem, quantity: 1 }]);
    showToast(`Added: ${portionItem.name} = PKR ${finalPrice}`);
  };

  // Template C (Biryani): Quick Add-on
  const handleAddBiryaniAddon = (name: string, price: number) => {
    const addonItem: ProductRecord = {
      id: `addon-${Date.now()}`,
      name: name,
      category: "Sides & Extras",
      barcode: `addon-${Date.now()}`.slice(-12),
      unit: "pcs",
      cost_price: Math.round(price * 0.6),
      sale_price: price,
      stock_quantity: 99,
      min_stock_alert: 5,
      is_active: 1,
    };
    addToCart(addonItem);
  };

  // Template D (Tailor): Record Stitching Booking
  const handleRecordStitchingBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (isStoreRestricted) {
      showToast("⛔ Registration Restricted: Account is in Read-Only mode due to overdue subscription.");
      setIsRecoveryModalOpen(true);
      return;
    }
    if (!newBooking.customerName.trim() || !newBooking.phone.trim()) {
      showToast("Please enter customer name and phone.");
      return;
    }
    const orderId = `ST-${100 + stitchingOrders.length + 1}`;
    const balance = Math.max(0, newBooking.totalAmount - newBooking.advancePaid);
    const order: StitchingOrder = {
      id: orderId,
      customerName: newBooking.customerName.trim(),
      phone: newBooking.phone.trim(),
      suitType: newBooking.suitType,
      length: Number(newBooking.length),
      chest: Number(newBooking.chest),
      waist: Number(newBooking.waist),
      collar: Number(newBooking.collar),
      tera: Number(newBooking.tera),
      sleeves: Number(newBooking.sleeves),
      shalwar: Number(newBooking.shalwar),
      ghera: Number(newBooking.ghera),
      deliveryDate: newBooking.deliveryDate,
      totalAmount: Number(newBooking.totalAmount),
      advancePaid: Number(newBooking.advancePaid),
      balanceDue: balance,
      workerAssigned: newBooking.workerAssigned,
      workerCommission: Number(newBooking.workerCommission),
      status: "Cutting",
    };

    setStitchingOrders([order, ...stitchingOrders]);
    setIsBookingModalOpen(false);

    // Also add Advance to cart so it can be receipted & printed immediately
    const customItem: ProductRecord = {
      id: `booking-${order.id}`,
      name: `Stitching Order #${order.id} Advance (${order.customerName})`,
      category: "Stitching Advance",
      barcode: `ST-${Date.now()}`.slice(-12),
      unit: "job",
      cost_price: order.workerCommission,
      sale_price: order.advancePaid,
      stock_quantity: 1,
      min_stock_alert: 0,
      is_active: 1,
    };
    setCart((prev) => [...prev, { product: customItem, quantity: 1 }]);
    showToast(`Order #${order.id} booked! Advance PKR ${order.advancePaid} added to register.`);
  };

  // Template D (Tailor): Advance Stitching Order Status
  const handleAdvanceOrderStatus = (orderId: string) => {
    setStitchingOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        let nextStatus: StitchingOrder["status"] = "In Stitching";
        if (o.status === "Cutting") nextStatus = "In Stitching";
        else if (o.status === "In Stitching") nextStatus = "Quality Check";
        else if (o.status === "Quality Check") nextStatus = "Ready for Pickup";
        else if (o.status === "Ready for Pickup") nextStatus = "Delivered";
        else nextStatus = "Delivered";
        return { ...o, status: nextStatus };
      })
    );
    showToast(`Order #${orderId} status updated.`);
  };

  // Template B (Meat): Add Trimming Wastage Log
  const handleAddWastage = (e: React.FormEvent) => {
    e.preventDefault();
    const kg = parseFloat(newWastageKg);
    if (!kg || kg <= 0) return;
    const cost = Math.round(kg * 850);
    const entry: WastageRecord = {
      id: `w-${Date.now()}`,
      date: "Just now",
      cutName: newWastageCut,
      weightKg: kg,
      reason: newWastageReason,
      costImpact: cost,
    };
    setWastageRecords([entry, ...wastageRecords]);
    setNewWastageKg("1.0");
    showToast(`Logged ${kg} KG trimming loss (${newWastageReason})`);
  };

  // Template C (Biryani): Add Kitchen Expense
  const handleAddKitchenExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(newExpenseAmount);
    if (!newExpenseTitle.trim() || !amt || amt <= 0) return;
    const entry: KitchenExpense = {
      id: `exp-${Date.now()}`,
      title: newExpenseTitle.trim(),
      amount: amt,
      category: newExpenseCat,
      time: "Just now",
    };
    setKitchenExpenses([entry, ...kitchenExpenses]);
    setNewExpenseTitle("");
    setNewExpenseAmount("");
    showToast(`Recorded Kitchen Expense: PKR ${amt.toLocaleString()}`);
  };

  // Template A & E (Wholesale Purchases): Add Purchase Log
  const handleAddWholesalePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(newPurchaseAmount);
    if (!newSupplierName.trim() || !amt || amt <= 0) return;
    const entry: WholesalePurchase = {
      id: `pur-${Date.now()}`,
      supplierName: newSupplierName.trim(),
      invoiceNo: newInvoiceNo.trim() || `INV-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString().split("T")[0],
      itemsSummary: newPurchaseItems.trim() || "Wholesale stock-in consignment",
      totalAmount: amt,
      status: "Paid",
    };
    setWholesalePurchases([entry, ...wholesalePurchases]);
    setNewSupplierName("");
    setNewInvoiceNo("");
    setNewPurchaseAmount("");
    setNewPurchaseItems("");
    showToast(`Recorded Purchase Invoice: PKR ${amt.toLocaleString()}`);
  };

  // Standard 7: Worker Commission Handlers
  const handleOpenSettleModal = (worker: WorkerRecord) => {
    setSelectedCommissionWorker(worker);
    const report = commissionEngine.getWorkerPerformanceReport(
      activeStore?.id || "shop-05",
      worker.id,
      commissionTimeframe
    );
    const pending = report ? report.netPendingDue : 0;
    setSettleType("commission");
    setSettleAmount(pending);
    setSettleAdvanceDeduction(0);
    setSettleMethod("easypaisa");
    setSettleReference("");
    setSettleNotes(`Weekly settlement for ${worker.name}`);
    setActiveWorkerModal("settle");
  };

  const handleExecuteSettlement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCommissionWorker) return;
    if (settleAmount <= 0) {
      showToast("Settlement amount must be greater than zero.");
      return;
    }

    const res = commissionEngine.executeSettlement({
      tenantId: activeStore?.id || "shop-05",
      workerId: selectedCommissionWorker.id,
      settlementType: settleType,
      amountToPay: settleAmount,
      advanceToDeduct: settleAdvanceDeduction,
      paymentMethod: settleMethod,
      paymentReference: settleReference || "Voucher-Cash",
      period: commissionTimeframe,
      settledBy: activeStore?.owner_name || "Store Admin",
      notes: settleNotes || `Settled via ${settleMethod.toUpperCase()}`,
    });

    if (res.success && res.settlement) {
      setLastCompletedSettlement(res.settlement);
      refreshCommissionData();
      setActiveWorkerModal("receipt");
      showToast(`Settlement ${res.settlement.receiptNumber} recorded!`);
    } else {
      showToast(res.message);
    }
  };

  const handleOpenEntriesModal = (worker: WorkerRecord) => {
    setSelectedCommissionWorker(worker);
    setActiveWorkerModal("entries");
  };

  const handleOpenClawbackModal = (worker: WorkerRecord) => {
    setSelectedCommissionWorker(worker);
    setClawbackSaleId("REC-1095");
    setClawbackAmount(4500);
    setClawbackReason("Defective fabric return by customer");
    setActiveWorkerModal("clawback");
  };

  const handleExecuteClawback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCommissionWorker || !clawbackSaleId.trim() || clawbackAmount <= 0) {
      showToast("Please provide valid originating sale ID and amount.");
      return;
    }

    const claw = commissionEngine.recordRefundClawback({
      tenantId: activeStore?.id || "shop-05",
      originatingSaleId: clawbackSaleId.trim(),
      workerId: selectedCommissionWorker.id,
      refundAmount: clawbackAmount,
      reason: clawbackReason,
    });

    if (claw) {
      refreshCommissionData();
      setActiveWorkerModal(null);
      showToast(`Refund clawback entry ${claw.id} recorded (${claw.commissionAmount} PKR)!`);
    }
  };

  const handleCreateNewWorker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkerName.trim() || !newWorkerPhone.trim()) {
      showToast("Worker Name and Phone are required.");
      return;
    }

    const created = commissionEngine.createWorker({
      tenantId: activeStore?.id || "shop-05",
      name: newWorkerName.trim(),
      phone: newWorkerPhone.trim(),
      role: newWorkerRole.trim(),
      joiningDate: new Date().toISOString().split("T")[0],
      status: "active",
      paymentType: newWorkerPaymentType,
      baseSalary: newWorkerBaseSalary,
      applicableRuleIds: commissionRules.map((r) => r.id),
      salesTarget: {
        targetAmount: newWorkerTarget,
        period: "monthly",
        currentSales: 0,
        bonusAmount: newWorkerBonus,
        bonusUnlocked: false,
      },
      notes: "Newly onboarded staff member.",
    });

    refreshCommissionData();
    setActiveWorkerModal(null);
    setNewWorkerName("");
    setNewWorkerPhone("");
    showToast(`Worker ${created.name} added successfully!`);
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  // Cart Calculations
  const subtotal = cart.reduce(
    (sum, item) => sum + item.product.sale_price * item.quantity,
    0
  );
  const totalAmount = subtotal;

  // Open Checkout
  const handleOpenCheckout = () => {
    if (isStoreRestricted) {
      showToast("⛔ Registration Restricted: Account is in Read-Only mode due to overdue subscription.");
      setIsRecoveryModalOpen(true);
      return;
    }
    if (cart.length === 0) {
      showToast("Cart is empty! Add products to proceed.");
      return;
    }
    setCashTendered(totalAmount);
    setIsCheckoutOpen(true);
  };

  // Standard Pre-Print Receipt Preview Generator
  const generateDraftSaleRecord = (): SaleRecord => {
    const changeDue = Math.max(0, (cashTendered || totalAmount) - totalAmount);
    return {
      id: "draft-preview",
      client_transaction_id: "draft-" + Date.now(),
      invoice_number: "PREVIEW-" + Math.floor(1000 + Math.random() * 9000),
      customer_name: selectedCustomer.name,
      subtotal: subtotal,
      discount_amount: 0,
      tax_amount: 0,
      total_amount: totalAmount,
      payment_method: (paymentMethod === "qr" ? "raast" : paymentMethod) as any,
      amount_paid: cashTendered || totalAmount,
      change_returned: changeDue,
      sync_status: "pending",
      created_at: new Date().toISOString(),
      items: cart.map((c) => ({
        id: `item-${c.product.id}`,
        sale_id: "draft-preview",
        product_id: c.product.id,
        product_name: c.product.name,
        unit: c.product.unit,
        quantity: c.quantity,
        unit_price: c.product.sale_price,
        total_price: c.product.sale_price * c.quantity,
      })),
    };
  };

  const handleOpenSlipPreview = () => {
    if (isStoreRestricted) {
      showToast("⛔ Registration Restricted: Account is in Read-Only mode.");
      setIsRecoveryModalOpen(true);
      return;
    }
    if (cart.length === 0) {
      showToast("Cart is empty! Add products to preview slip.");
      return;
    }
    const draft = generateDraftSaleRecord();
    setActiveReceiptModalSale({
      sale: draft,
      isReprint: false,
      isDraftPreview: true,
    });
  };

  // Execute Sale Transaction
  const executeSaleTransaction = async (shouldPrint: boolean = isPrintingThermal) => {
    if (isStoreRestricted) {
      showToast("⛔ Registration Restricted: Account is in Read-Only mode. New billing disabled.");
      setIsRecoveryModalOpen(true);
      return;
    }
    setIsSubmittingSale(true);

    try {
      const changeDue = Math.max(0, (cashTendered || totalAmount) - totalAmount);

      // Create Sale Record in SQLite
      const sale = sqliteDb.createSale(
        {
          customer_name: selectedCustomer.name,
          subtotal: subtotal,
          discount_amount: 0,
          tax_amount: 0,
          total_amount: totalAmount,
          payment_method: paymentMethod === "qr" ? "raast" : paymentMethod,
          amount_paid: cashTendered || totalAmount,
          change_returned: changeDue,
        },
        cart
      );

      // Standard 7: Automatically record Commission Entry for active staff member
      const activeWorker = commissionWorkers.find((w) => w.status === "active");
      if (activeWorker) {
        commissionEngine.recordSaleCommission({
          tenantId: activeStore?.id || "shop-05",
          originatingSaleId: sale.invoice_number,
          workerId: activeWorker.id,
          workerName: activeWorker.name,
          grossBill: totalAmount,
          discountAmount: 0,
          isCreditSale: paymentMethod === "udhaar",
          items: cart.map((c) => ({
            id: c.product.id,
            price: c.product.sale_price,
            quantity: c.quantity,
            category: c.product.category,
          })),
          notes: `POS Checkout receipt #${sale.invoice_number}`,
        });
        refreshCommissionData();
      }

      // Standard 9: Durable Offline Transaction Queue with Stable clientTransactionId
      const queuedSale = offlineSyncEngine.enqueueSale({
        tenantId: activeStore?.store_code || "MADINA-KIR",
        invoiceNumber: sale.invoice_number,
        cashierUid: "cashier-01",
        cashierName: activeStore?.owner_name || "Store Cashier",
        workerId: activeWorker?.id,
        workerName: activeWorker?.name,
        customerId: paymentMethod === "udhaar" ? "cust-02" : undefined,
        customerName: selectedCustomer.name,
        subtotal: subtotal,
        discountAmount: 0,
        taxAmount: 0,
        totalAmount: totalAmount,
        paymentMethod: paymentMethod === "qr" ? "raast" : paymentMethod,
        amountPaid: cashTendered || totalAmount,
        changeReturned: changeDue,
        udhaarAmount: paymentMethod === "udhaar" ? totalAmount : 0,
        items: cart.map((c) => ({
          productId: c.product.id,
          productName: c.product.name,
          unit: c.product.unit,
          quantity: c.quantity,
          unitPrice: c.product.sale_price,
          costPrice: c.product.cost_price,
          discount: 0,
          totalPrice: c.product.sale_price * c.quantity,
          category: c.product.category,
        })),
      });

      // Trigger Web Bluetooth ESC/POS Printing
      if (shouldPrint) {
        const storeProfile: StoreProfile = {
          name: activeStore?.name,
          area: activeStore?.area,
          phone: activeStore?.phone,
          ntn: activeStore?.ntn || "Exempt",
          tagline: currentTemplate.name,
          customHeader: customHeaderNote,
          customFooter: customFooterNote,
        };
        await escposPrinter.printSale(sale, selectedPaperWidth, storeProfile, false);
      }

      setSaleSuccessMessage(`Order #${sale.invoice_number} Finalized! (Queue ID: ${queuedSale.clientTransactionId.slice(-8)})`);
      showToast(`Sale #${sale.invoice_number} saved locally & queued for Cloud Sync!`);

      // Reset cart and reload inventory
      setTimeout(() => {
        setCart([]);
        setIsCheckoutOpen(false);
        setActiveReceiptModalSale(null);
        setIsSubmittingSale(false);
        setSaleSuccessMessage("");
        loadProducts();
      }, 1400);
    } catch {
      setIsSubmittingSale(false);
      showToast("Transaction error: Check SQLite connection.");
    }
  };

  // Filter Products
  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      selectedCategory === "All" || p.category.toLowerCase().includes(selectedCategory.toLowerCase());
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.includes(searchQuery);
    return matchesCategory && matchesSearch;
  });

  return (
    <DeviceGuard panelTitle="Quick-POS Terminal" panelType="pos">
      <div className="bg-[#F8FAFC] min-h-screen text-[#0F172A] flex flex-col antialiased selection:bg-[#1447E6] selection:text-white">
        
        {/* ========================================================= */}
        {/* MERCHANT STORE LOGIN SCREEN (ADMIN ISSUED CREDENTIALS)    */}
        {/* ========================================================= */}
        {!isCashierUnlocked ? (
          <div className="flex-1 min-h-screen flex flex-col justify-between p-4 bg-[#F8FAFC]">
            
            {/* Top Minimal Bar */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#1447E6] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  QP
                </div>
                <span className="font-extrabold text-sm text-slate-900">Quick-POS Merchant</span>
              </div>
              <span className="text-[11px] font-bold text-[#1447E6] bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                Shah Faisal Town Pilot
              </span>
            </div>

            {/* Center Login Form */}
            <div className="flex-1 flex items-center justify-center py-4">
              <div className="w-full max-w-sm bg-white rounded-3xl border border-[#E2E8F0] p-6 shadow-xl shadow-blue-500/5">
                
                {/* Branding Icon */}
                <div className="text-center space-y-1 mb-5">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-[#EFF4FF] border border-[#DBEAFE] text-[#1447E6] flex items-center justify-center mb-2 shadow-xs">
                    <span className="material-symbols-outlined text-2xl">storefront</span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    Store Terminal Login
                  </h2>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Enter the Store ID &amp; PIN issued by your Quick-POS Super Administrator.
                  </p>
                </div>

                {/* Important Policy Notice: NO SIGN UP */}
                <div className="mb-4 p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-800 flex items-start gap-2">
                  <span className="material-symbols-outlined text-amber-600 text-sm mt-0.5 shrink-0">verified_user</span>
                  <span>
                    <strong>Strict Admin Policy:</strong> Public signup is disabled. Your shop credentials are generated directly from the Super Admin console.
                  </span>
                </div>

                {storeLoginError && (
                  <div className="mb-3.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                    <span className="material-symbols-outlined text-rose-500 text-base">error</span>
                    <span>{storeLoginError}</span>
                  </div>
                )}

                <form onSubmit={handleStoreLogin} className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                      Store ID / Code or Phone
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 text-lg">
                        badge
                      </span>
                      <input
                        type="text"
                        required
                        value={storeIdentifier}
                        onChange={(e) => setStoreIdentifier(e.target.value)}
                        placeholder="e.g. MADINA-KIR or 0300-1234567"
                        className="w-full h-11 bg-slate-50 border border-slate-200 focus:border-[#1447E6] focus:bg-white rounded-xl pl-9 pr-3 text-xs font-bold text-slate-900 placeholder-slate-400 outline-none uppercase tracking-wide transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                        Store Access PIN
                      </label>
                      <span className="text-[10px] text-slate-400">4-Digit Code</span>
                    </div>
                    <div className="relative">
                      <span className="material-symbols-outlined text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 text-lg">
                        lock
                      </span>
                      <input
                        type="password"
                        required
                        maxLength={6}
                        value={storePin}
                        onChange={(e) => setStorePin(e.target.value)}
                        placeholder="••••"
                        className="w-full h-11 bg-slate-50 border border-slate-200 focus:border-[#1447E6] focus:bg-white rounded-xl pl-9 pr-3 text-sm font-mono font-bold text-slate-900 placeholder-slate-400 outline-none tracking-widest transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full h-12 bg-[#1447E6] hover:bg-[#0F3BC4] text-white font-bold text-xs rounded-xl shadow-[0_4px_16px_rgba(20,71,230,0.25)] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    <span className="material-symbols-outlined text-lg">login</span>
                    <span>Sign In to Store POS</span>
                  </button>
                </form>

                {/* Instant Store Switcher (Admin Provisioned Demos) */}
                <div className="mt-5 pt-4 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left mb-2">
                    SELECT REGISTERED MERCHANT FOR DEMO:
                  </p>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar">
                    {availableStores.map((store) => (
                      <button
                        key={store.id}
                        type="button"
                        onClick={() => handleQuickDemoStoreSelect(store)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-[#1447E6] bg-slate-50 hover:bg-[#EFF4FF] text-left flex items-center justify-between transition-all group"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 group-hover:text-[#1447E6] truncate">
                            {store.name}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">
                            Code: <span className="font-mono font-bold">{store.store_code}</span> • PIN: <span className="font-mono font-bold">{store.login_pin}</span>
                          </p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-[#1447E6] capitalize shrink-0 ml-2">
                          {store.template_type}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </div>

            <p className="text-center text-[11px] text-slate-400 pb-2">
              Quick-POS Pakistan SaaS &bull; Shah Faisal Town Pilot
            </p>
          </div>
        ) : (
          <>
            {/* ========================================================= */}
            {/* TOP STATUS BAR HEADER (Cobalt & White System)            */}
            {/* ========================================================= */}
            <header className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-md pt-safe border-b border-[#E2E8F0] shadow-[0_1px_4px_rgba(15,23,42,0.04)]">
              <div className="min-h-[104px] sm:h-28 px-3 sm:px-4 flex flex-col justify-between py-2 gap-1.5">
                <div className="flex items-center justify-between gap-2 sm:gap-3">
                  <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#1447E6] flex items-center justify-center text-white shadow-sm shrink-0">
                      <span className="material-symbols-outlined text-[20px] sm:text-[22px]">store</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm sm:text-[16px] font-extrabold text-[#0F172A] tracking-tight truncate leading-tight">
                        {activeStore ? activeStore.name : "Quick-POS"}
                      </span>
                      <span className="text-[10px] sm:text-[11px] font-medium text-[#64748B] truncate">
                        {activeStore ? `${activeStore.owner_name} • ${activeStore.area}` : "Shah Faisal Town, Karachi"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border shrink-0 ${currentTemplate.badgeColor}`}>
                      {currentTemplate.badgeLabel}
                    </span>
                    {/* Instant Template Switcher Button */}
                    <button
                      onClick={() => setIsStoreSwitcherOpen(true)}
                      title="Switch Store Template"
                      className="h-8 px-2 rounded-xl bg-blue-50 text-[#1447E6] border border-blue-200 hover:bg-blue-100 flex items-center gap-1 transition-colors text-xs font-bold shrink-0"
                    >
                      <span className="material-symbols-outlined text-base">swap_horiz</span>
                      <span className="hidden xs:inline">Templates</span>
                    </button>
                    {/* Shift Lock Button */}
                    <button
                      onClick={handleSignOutStore}
                      title="Lock & Switch Store"
                      className="h-8 px-2 sm:px-2.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700 flex items-center gap-1 ring-1 ring-slate-200 transition-colors text-xs font-bold shrink-0"
                    >
                      <span className="material-symbols-outlined text-base">logout</span>
                      <span className="hidden xs:inline">Lock</span>
                    </button>
                  </div>
                </div>

                {/* Hardware & Template Info Bar */}
                <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-0.5">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200/80 text-[#64748B] shrink-0 whitespace-nowrap">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                      <span className="text-[11px] font-semibold tracking-tight text-slate-700 whitespace-nowrap">
                        {currentTemplate.name}
                      </span>
                    </div>
                    <button
                      onClick={() => setSubTab("printer")}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200/80 text-[#64748B] hover:border-[#1447E6] transition-colors shrink-0 whitespace-nowrap"
                    >
                      <span className="material-symbols-outlined text-[13px] text-[#1447E6]">print</span>
                      <span className="text-[11px] font-semibold text-slate-700 whitespace-nowrap">BT: 58mm</span>
                    </button>

                    {/* Standard 13: Authorized Device Badge */}
                    <button
                      type="button"
                      onClick={() => {
                        if (activeStore) {
                          setPendingStoreToAuthorize(activeStore);
                          setIsDeviceReplacementModalOpen(true);
                        }
                      }}
                      title="Authorized Hardware Terminal (Standard 13 Device Policy)"
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200/80 text-slate-700 hover:border-blue-400 transition-colors shrink-0 whitespace-nowrap"
                    >
                      <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0"></span>
                      <span className="text-[11px] font-semibold text-slate-700 truncate max-w-[110px] whitespace-nowrap">
                        {currentTerminalDevice?.deviceName || "Terminal: Auth"}
                      </span>
                    </button>

                    {/* Standard 9: Offline Queue & Cloud Sync Pill */}
                    <button
                      type="button"
                      onClick={() => setIsOfflineModalOpen(true)}
                      title="Offline-First Transaction Queue & Cloud Sync Status"
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border transition-all text-[11px] font-bold cursor-pointer shrink-0 whitespace-nowrap ${
                        !isOnlineState
                          ? "bg-amber-50 border-amber-300 text-amber-800 animate-pulse"
                          : offlineSyncEngine.getFailedCount() > 0
                          ? "bg-rose-50 border-rose-300 text-rose-700"
                          : offlineSyncEngine.getPendingCount() > 0
                          ? "bg-blue-50 border-blue-300 text-[#1447E6]"
                          : "bg-emerald-50 border-emerald-300 text-emerald-700"
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          !isOnlineState
                            ? "bg-amber-500"
                            : offlineSyncEngine.getFailedCount() > 0
                            ? "bg-rose-500"
                            : offlineSyncEngine.getPendingCount() > 0
                            ? "bg-blue-500 animate-ping"
                            : "bg-emerald-500"
                        }`}
                      ></span>
                      <span className="whitespace-nowrap">
                        {!isOnlineState
                          ? `Offline (${offlineSyncEngine.getPendingCount()} Q)`
                          : offlineSyncEngine.getFailedCount() > 0
                          ? `Sync Alert (${offlineSyncEngine.getFailedCount()})`
                          : offlineSyncEngine.getPendingCount() > 0
                          ? `Syncing (${offlineSyncEngine.getPendingCount()})`
                          : "Cloud Synced"}
                      </span>
                    </button>
                  </div>
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200/80 text-[#64748B] shrink-0 whitespace-nowrap">
                    <span className="material-symbols-outlined text-[13px] text-slate-500">straighten</span>
                    <span className="text-[10px] font-semibold text-slate-700 truncate whitespace-nowrap">
                      Units: {currentTemplate.supportedUnits.slice(0, 3).join(", ")}
                    </span>
                  </div>
                </div>
              </div>
            </header>

            <main className="flex-1 flex flex-col relative w-full pt-28 pb-24 bg-[#F8FAFC]">

              {/* Standard 11: Subscription Restriction & Reminder Banners */}
              {isStoreRestricted && (
                <div className="mx-4 mt-2 mb-1 p-3.5 rounded-2xl bg-gradient-to-r from-rose-950 via-red-900 to-rose-950 text-white shadow-xl border border-red-500/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-white text-xl">lock</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-[10px] tracking-wider uppercase bg-red-950 px-2 py-0.5 rounded text-rose-300 border border-rose-800">
                          Restricted Mode (Read-Only)
                        </span>
                        <span className="font-bold text-xs">Subscription Expired Past Grace Period</span>
                      </div>
                      <p className="text-[11px] text-rose-200 mt-0.5">
                        New billing &amp; thermal printing are disabled. Past invoices and customer ledgers remain accessible.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsRecoveryModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-white text-rose-800 font-extrabold text-xs shrink-0 shadow hover:bg-rose-50 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">payment</span>
                    <span>View Payment &amp; Reactivate</span>
                  </button>
                </div>
              )}

              {!isStoreRestricted && storeSubscription && storeSubscription.status === "grace_period" && (
                <div className="mx-4 mt-2 mb-1 p-2.5 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md border border-amber-400/50 flex items-center justify-between gap-2 animate-in fade-in">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="material-symbols-outlined text-lg shrink-0">warning</span>
                    <span className="text-xs font-bold truncate">
                      Grace Period Active &bull; Pay PKR {storeSubscription.monthlyAmountPkr.toLocaleString()} by {storeSubscription.graceEndsAt} to avoid terminal restriction
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsRecoveryModalOpen(true)}
                    className="px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white font-bold text-xs shrink-0 transition-colors"
                  >
                    Pay Online
                  </button>
                </div>
              )}

              {!isStoreRestricted && storeSubscription && storeSubscription.status === "due" && (
                <div className="mx-4 mt-2 mb-1 px-3.5 py-1.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 flex items-center justify-between text-xs animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-600 text-base shrink-0">schedule</span>
                    <span>
                      Subscription renewal due on <strong>{storeSubscription.dueDate}</strong> ({storeSubscription.monthlyAmountPkr.toLocaleString()} PKR)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsRecoveryModalOpen(true)}
                    className="text-[#1447E6] font-bold hover:underline"
                  >
                    View Details
                  </button>
                </div>
              )}
              
              {/* ======================================================= */}
              {/* TAB 1: POS BILLING & EXPRESS CHECKOUT                   */}
              {/* ======================================================= */}
              {subTab === "billing" && (
                <div className="flex flex-col w-full pb-36">
                  
                  {/* Offline Ready Micro Banner */}
                  <div className="px-4 pt-2.5 pb-1">
                    <div className="flex items-center justify-between bg-white border border-[#E2E8F0] px-3 py-1.5 rounded-xl shadow-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="material-symbols-outlined text-[#1447E6] text-[18px] shrink-0">
                          offline_bolt
                        </span>
                        <span className="text-[11px] font-semibold text-slate-700 truncate">
                          {currentTemplate.tagline}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-[#1447E6] shrink-0 bg-[#EFF4FF] border border-[#DBEAFE] px-2 py-0.5 rounded-md">
                        {activeStore ? activeStore.store_code : "QP-DEMO"}
                      </span>
                    </div>
                  </div>

                  {/* Search & Barcode Trigger Utility Zone */}
                  <div className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1 flex items-center bg-white rounded-xl border border-[#E2E8F0] shadow-xs focus-within:border-[#1447E6] transition-colors">
                        <span className="material-symbols-outlined absolute left-3.5 text-[#94A3B8] text-[20px]">
                          search
                        </span>
                        <input
                          type="text"
                          id="product-search"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder={
                            currentTemplate.billingFeatures.hasBarcodeScanner
                              ? "Search items by name or scan barcode..."
                              : "Search items or menu..."
                          }
                          className="w-full h-11 pl-10 pr-10 bg-transparent text-[13.5px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none"
                        />
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-2 p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
                          >
                            <span className="material-symbols-outlined text-[17px]">close</span>
                          </button>
                        )}
                      </div>

                      {/* Barcode Scanner Button - Only for Barcode-enabled Templates (Kiryana, Boutique, Custom) */}
                      {currentTemplate.billingFeatures.hasBarcodeScanner && (
                        <button
                          type="button"
                          id="btn-scan"
                          onClick={() => showToast("Barcode Scanner active: Point at retail product")}
                          className="h-11 px-3.5 bg-[#1447E6] hover:bg-[#0F3BC4] text-white rounded-xl flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all shrink-0"
                        >
                          <span className="material-symbols-outlined text-[20px]">barcode_scanner</span>
                          <span className="text-[12px] font-bold hidden xs:inline">Scan</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Category Quick Filter Strip */}
                  <div className="py-1.5 overflow-x-auto no-scrollbar flex items-center gap-2 px-4">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`cat-pill shrink-0 px-3.5 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
                          selectedCategory === cat
                            ? "bg-[#1447E6] text-white shadow-xs"
                            : "bg-white border border-[#E2E8F0] text-slate-600 hover:text-[#0F172A]"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* ========================================================= */}
                  {/* CONFIGURATION-DRIVEN TEMPLATE BILLING WIDGETS             */}
                  {/* ========================================================= */}

                  {/* 1. TEMPLATE B (MEAT SHOP): DIGITAL WEIGHING SCALE BAR */}
                  {currentTemplate.billingFeatures.hasWeightCalculator && (
                    <div className="mx-4 my-2 p-3 bg-white border border-rose-200 rounded-2xl shadow-xs space-y-2.5">
                      <div className="flex items-center justify-between pb-1.5 border-b border-rose-100">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-rose-600 text-lg">scale</span>
                          <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
                            Live Weighing Scale &amp; Rate Calculator
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                          Formula: Weight × Rate / KG
                        </span>
                      </div>

                      {/* Meat Item Select */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Select Meat Cut:
                        </label>
                        <select
                          value={selectedMeatItem?.id || (products[0]?.id ?? "")}
                          onChange={(e) => {
                            const found = products.find((p) => p.id === e.target.value);
                            if (found) setSelectedMeatItem(found);
                          }}
                          className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-900 focus:outline-none"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} — PKR {p.sale_price.toLocaleString()}/KG
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Weight Chips & Manual Input */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Scale Weight:
                          </label>
                          <span className="text-xs font-mono font-extrabold text-rose-600">
                            {weighGrams} Grams ({((weighGrams) / 1000).toFixed(3)} KG)
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                          {[250, 500, 750, 1000, 1500, 2000].map((g) => (
                            <button
                              key={g}
                              type="button"
                              onClick={() => setWeighGrams(g)}
                              className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                                weighGrams === g
                                  ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              {g === 250 ? "250g (Pao)" : g === 500 ? "500g (1/2 KG)" : g === 1000 ? "1 KG" : `${g / 1000} KG`}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Live Calculation Output & Add Button */}
                      <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-200 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-rose-700 font-bold uppercase tracking-wider block">
                            Calculated Price:
                          </span>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-xs font-bold text-rose-700">PKR</span>
                            <span className="text-xl font-black text-rose-700 tabular-nums">
                              {Math.round(
                                (((selectedMeatItem || products[0])?.sale_price || 980) * weighGrams) / 1000
                              ).toLocaleString()}
                            </span>
                            <span className="text-[10px] text-slate-500 ml-1">
                              ({weighGrams}g @ PKR {(selectedMeatItem || products[0])?.sale_price || 980}/kg)
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const cut = selectedMeatItem || products[0];
                            if (cut) addWeighedMeatToCart(cut, weighGrams);
                          }}
                          className="h-10 px-3 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-base">scale</span>
                          <span>Weigh &amp; Add</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 2. TEMPLATE C (BIRYANI / FOOD STALL): PORTION & ADD-ONS CONTROLLER */}
                  {currentTemplate.billingFeatures.hasPortionSelector && (
                    <div className="mx-4 my-2 p-3 bg-white border border-amber-200 rounded-2xl shadow-xs space-y-2.5">
                      <div className="flex items-center justify-between pb-1.5 border-b border-amber-100">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-amber-600 text-lg">fastfood</span>
                          <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
                            Portion &amp; Takeaway Controller
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsTakeawayParcel(!isTakeawayParcel)}
                          className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-colors flex items-center gap-1 ${
                            isTakeawayParcel
                              ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                              : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          <span className="material-symbols-outlined text-sm">
                            {isTakeawayParcel ? "takeout_dining" : "table_restaurant"}
                          </span>
                          <span>{isTakeawayParcel ? "Takeaway Parcel (+PKR 20 Box)" : "Counter Dine-In"}</span>
                        </button>
                      </div>

                      {/* Portion Size Toggle */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          SELECT ACTIVE PORTION:
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { id: "full", label: "Full Plate (100%)", icon: "dinner_dining" },
                            { id: "half", label: "Half Plate (60%)", icon: "lunch_dining" },
                            { id: "double", label: "Double Boti (+PKR 80)", icon: "set_meal" },
                          ].map((portion) => (
                            <button
                              key={portion.id}
                              type="button"
                              onClick={() => setBiryaniPortion(portion.id as "full" | "half" | "double")}
                              className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center ${
                                biryaniPortion === portion.id
                                  ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              <span className="material-symbols-outlined text-base">{portion.icon}</span>
                              <span className="text-[10px] truncate">{portion.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Quick Add-ons Strip */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          1-TAP QUICK ADD-ONS:
                        </label>
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                          {[
                            { name: "Zeera Raita Cup", price: 40, icon: "local_cafe" },
                            { name: "Crispy Shami Kabab", price: 60, icon: "restaurant" },
                            { name: "Pepsi / 7Up 345ml", price: 70, icon: "sports_bar" },
                            { name: "Extra Masala Aloo", price: 30, icon: "egg_alt" },
                          ].map((addon) => (
                            <button
                              key={addon.name}
                              type="button"
                              onClick={() => handleAddBiryaniAddon(addon.name, addon.price)}
                              className="shrink-0 px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-amber-50 text-slate-800 hover:text-amber-800 border border-slate-200 hover:border-amber-300 text-xs font-bold flex items-center gap-1 transition-all active:scale-95"
                            >
                              <span className="material-symbols-outlined text-amber-600 text-sm">{addon.icon}</span>
                              <span>+ {addon.name} (PKR {addon.price})</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3. TEMPLATE D (TAILOR): MEASUREMENTS & STITCHING BOOKING CTA */}
                  {currentTemplate.billingFeatures.hasStitchingOrderForm && (
                    <div className="mx-4 my-2 p-3 bg-white border border-indigo-200 rounded-2xl shadow-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center">
                            <span className="material-symbols-outlined text-lg">straighten</span>
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-slate-900 uppercase">
                              Tailor Measurements &amp; Booking
                            </h4>
                            <p className="text-[11px] text-slate-500">Record suit dimensions, delivery date &amp; advance</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsBookingModalOpen(true)}
                          className="h-9 px-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-base">add</span>
                          <span>New Stitching</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 4. TEMPLATE E (BOUTIQUE): SIZE VARIANTS & SALES STAFF ATTRIBUTION */}
                  {currentTemplate.billingFeatures.hasProductVariants && (
                    <div className="mx-4 my-2 p-3 bg-white border border-purple-200 rounded-2xl shadow-xs space-y-2">
                      <div className="flex items-center justify-between pb-1.5 border-b border-purple-100">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-purple-600 text-base">style</span>
                          <span className="text-xs font-black text-slate-900 uppercase">Size Variant &amp; Sales Staff</span>
                        </div>
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                          Ready-to-Wear Pret
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] font-bold text-slate-500 mr-1">Size:</span>
                          {(["S", "M", "L", "XL"] as const).map((sz) => (
                            <button
                              key={sz}
                              type="button"
                              onClick={() => setBoutiqueVariantSize(sz)}
                              className={`w-7 h-7 rounded-lg text-xs font-bold border transition-all ${
                                boutiqueVariantSize === sz
                                  ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              {sz}
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] font-bold text-slate-500">Staff:</span>
                          <select
                            value={boutiqueSalesRep}
                            onChange={(e) => setBoutiqueSalesRep(e.target.value)}
                            className="h-7 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2 focus:outline-none"
                          >
                            <option value="Ayesha (3% Commission)">Ayesha (3%)</option>
                            <option value="Zoya (3% Commission)">Zoya (3%)</option>
                            <option value="Counter General">Counter General</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Product Catalog Grid */}
                  <div className="px-4 pt-2">
                    <div className="flex items-center justify-between pb-2.5">
                      <span className="text-[15px] text-[#0F172A] font-extrabold tracking-tight">
                        {currentTemplate.name} Catalog
                      </span>
                      <span className="text-[11px] text-[#1447E6] font-bold bg-[#EFF4FF] px-2 py-0.5 rounded-full border border-[#DBEAFE]">
                        {filteredProducts.length} Items Available
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-2.5 sm:gap-3">
                      {filteredProducts.map((product) => (
                        <div
                          key={product.id}
                          className="product-card flex flex-col justify-between bg-white rounded-xl p-2.5 border border-[#E2E8F0] shadow-xs hover:border-[#1447E6]/40 transition-all relative overflow-hidden"
                        >
                          <div>
                            {/* Product Image Preview */}
                            <div className="relative w-full h-24 sm:h-28 rounded-lg overflow-hidden bg-slate-100 mb-2 border border-slate-100 flex items-center justify-center">
                              {product.image_url ? (
                                <Image
                                  src={product.image_url}
                                  alt={product.name}
                                  fill
                                  unoptimized
                                  sizes="(max-width: 768px) 50vw, 33vw"
                                  className="object-cover"
                                />
                              ) : (
                                <div className="flex flex-col items-center justify-center text-slate-400">
                                  <span className="material-symbols-outlined text-3xl">inventory_2</span>
                                  <span className="text-[10px] font-semibold mt-1">Quick-POS</span>
                                </div>
                              )}
                              <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-white/95 border border-slate-200/80 text-[10px] font-bold text-slate-700 shadow-xs">
                                {product.stock_quantity} {product.unit}
                              </span>
                            </div>

                            <span className="text-[11px] font-semibold text-[#64748B]">
                              {product.category}
                            </span>
                            <h2 className="text-[13.5px] font-bold text-[#0F172A] line-clamp-1 leading-snug">
                              {product.name}
                            </h2>
                          </div>

                          <div className="pt-2 flex items-center justify-between mt-auto">
                            <div>
                              <span className="text-[10px] font-semibold text-[#94A3B8]">PKR</span>
                              <p className="text-[17px] font-extrabold text-[#0F172A] leading-tight tabular-nums">
                                {product.sale_price.toLocaleString()}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (currentTemplate.billingFeatures.hasWeightCalculator) {
                                  addWeighedMeatToCart(product, weighGrams);
                                } else if (currentTemplate.billingFeatures.hasPortionSelector) {
                                  addBiryaniPortionToCart(product, biryaniPortion, isTakeawayParcel);
                                } else if (currentTemplate.billingFeatures.hasProductVariants) {
                                  const variantItem: ProductRecord = {
                                    ...product,
                                    id: `${product.id}-${boutiqueVariantSize}-${Date.now()}`,
                                    name: `${product.name} [Size ${boutiqueVariantSize}]`,
                                  };
                                  addToCart(variantItem);
                                } else {
                                  addToCart(product);
                                }
                              }}
                              aria-label={`Add ${product.name}`}
                              className="w-9 h-9 rounded-lg bg-[#1447E6] hover:bg-[#0F3BC4] text-white flex items-center justify-center shadow-xs active:scale-90 transition-transform cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[19px]">add</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sticky Bottom POS Cart Drawer: Shows "TOTAL PKR [amount]" */}
                  {cart.length > 0 && (
                    <div className="sticky bottom-16 z-40 w-full bg-white/95 backdrop-blur-md shadow-[0_-4px_20px_rgba(15,23,42,0.08)] border-t border-[#E2E8F0] rounded-t-2xl pt-2 px-4 pb-3">
                      
                      {/* Pull Handle & Active Cart Collapse Toggle */}
                      <div
                        onClick={() => setIsCartExpanded(!isCartExpanded)}
                        className="flex items-center justify-between pb-2 cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-2">
                          <span className="flex h-2.5 w-2.5 rounded-full bg-[#1447E6] animate-pulse"></span>
                          <span className="text-[15px] font-extrabold text-[#0F172A]">
                            Cart ({cart.reduce((s, c) => s + c.quantity, 0)} Items)
                          </span>
                          <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                            Bill #QP-9421
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[#1447E6]">
                          <span className="text-[12px] font-bold">
                            {isCartExpanded ? "Hide Details" : "Show Details"}
                          </span>
                          <span className="material-symbols-outlined text-[20px]">
                            {isCartExpanded ? "expand_more" : "expand_less"}
                          </span>
                        </div>
                      </div>

                      {/* Collapsible Mini Line-Items Preview Tray */}
                      {isCartExpanded && (
                        <div className="space-y-1.5 max-h-36 overflow-y-auto no-scrollbar mb-2.5">
                          {cart.map((item) => (
                            <div
                              key={item.product.id}
                              className="flex items-center justify-between py-1.5 px-2.5 bg-slate-50 border border-[#E2E8F0] rounded-xl"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-[13px] font-bold text-[#0F172A] truncate">
                                  {item.product.name}
                                </p>
                                <p className="text-[11px] text-[#64748B] font-medium tabular-nums">
                                  PKR {item.product.sale_price} × {item.quantity}
                                </p>
                              </div>
                              <div className="flex items-center gap-2.5 shrink-0">
                                <div className="flex items-center bg-white border border-[#E2E8F0] rounded-lg p-0.5">
                                  <button
                                    onClick={() => updateCartQuantity(item.product.id, -1)}
                                    className="w-6 h-6 flex items-center justify-center rounded text-slate-700 hover:bg-slate-100 active:scale-95"
                                  >
                                    <span className="material-symbols-outlined text-[15px]">remove</span>
                                  </button>
                                  <span className="text-[12px] px-2 font-bold text-[#0F172A] tabular-nums">
                                    {item.quantity}
                                  </span>
                                  <button
                                    onClick={() => updateCartQuantity(item.product.id, 1)}
                                    className="w-6 h-6 flex items-center justify-center rounded text-slate-700 hover:bg-slate-100 active:scale-95"
                                  >
                                    <span className="material-symbols-outlined text-[15px]">add</span>
                                  </button>
                                </div>
                                <span className="text-[13.5px] font-extrabold text-[#0F172A] w-20 text-right tabular-nums">
                                  PKR {(item.product.sale_price * item.quantity).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Quick Auxiliary Counter Buttons: Hold Bill & Discount */}
                      <div className="grid grid-cols-2 gap-2 pb-2">
                        <button
                          type="button"
                          onClick={() => showToast("Bill #QP-9421 parked on Hold Slot #1")}
                          className="h-10 px-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-bold text-[12px] flex items-center justify-center gap-1.5 active:scale-95 transition-all border border-slate-200/80"
                        >
                          <span className="material-symbols-outlined text-[18px] text-slate-600">
                            pause_circle
                          </span>
                          <span>Hold Bill</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => showToast("Flat 5% Special Customer Discount applied")}
                          className="h-10 px-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-bold text-[12px] flex items-center justify-center gap-1.5 active:scale-95 transition-all border border-slate-200/80"
                        >
                          <span className="material-symbols-outlined text-[18px] text-slate-600">
                            percent
                          </span>
                          <span>Discount %</span>
                        </button>
                      </div>

                      {/* USER REQUESTED: 'TOTAL PKR [amount]' instead of 'CHARGE PKR [amount]' */}
                      <button
                        type="button"
                        id="charge-btn"
                        onClick={handleOpenCheckout}
                        className={`w-full h-14 rounded-xl flex items-center justify-between px-4 transition-all cursor-pointer ${
                          isStoreRestricted
                            ? "bg-rose-700 hover:bg-rose-800 text-white shadow-[0_4px_16px_rgba(225,29,72,0.28)]"
                            : "bg-[#1447E6] hover:bg-[#0F3BC4] text-white shadow-[0_4px_16px_rgba(20,71,230,0.28)] active:scale-[0.99]"
                        }`}
                      >
                        <div className="flex flex-col items-start leading-tight">
                          <span className={`text-[10px] tracking-wider uppercase font-bold ${isStoreRestricted ? "text-rose-200" : "text-blue-100"}`}>
                            {isStoreRestricted ? "TERMINAL RESTRICTED (READ-ONLY)" : "RECEIVE PAYMENT"}
                          </span>
                          <span className="text-[20px] font-black tracking-tight tabular-nums">
                            TOTAL PKR {totalAmount.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-white/20 hover:bg-white/25 px-3 py-1.5 rounded-lg shrink-0 backdrop-blur-xs">
                          <span className="text-[12px] font-bold">
                            {isStoreRestricted ? "Unlock Terminal" : "Print & Cut"}
                          </span>
                          <span className="material-symbols-outlined text-[19px]">
                            {isStoreRestricted ? "lock_open" : "receipt_long"}
                          </span>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ======================================================= */}
              {/* TAB 2: UDHAAR KHATA (Customer Ledger System)             */}
              {/* ======================================================= */}
              {subTab === "khata" && (
                <div className="flex flex-col w-full px-4 pb-28 gap-3">
                  
                  {/* Overview Metrics Bento Grid */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    
                    {/* Total Udhaar (Hero Metric - Cobalt Blue Card) */}
                    <div className="col-span-2 bg-gradient-to-br from-[#1447e6] via-[#103ed0] to-[#0a2da1] text-white rounded-2xl p-4 shadow-lg shadow-[#1447E6]/20 relative overflow-hidden">
                      <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                      <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-white/15 backdrop-blur-md flex items-center justify-center">
                            <span className="material-symbols-outlined text-white text-lg">
                              account_balance_wallet
                            </span>
                          </div>
                          <span className="text-sm font-semibold tracking-wide text-white/90">
                            Total Outstanding Udhaar
                          </span>
                        </div>
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-md border border-white/20">
                          28 Customers
                        </span>
                      </div>
                      <div className="mt-3 flex items-baseline gap-1 relative z-10">
                        <span className="text-3xl font-extrabold text-white tracking-tight tabular-nums">
                          PKR 184,500
                        </span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-white/15 flex items-center justify-between text-white/85 relative z-10 text-xs">
                        <span>Market Receivable Ledger Balance</span>
                        <span className="flex items-center gap-1 font-bold text-amber-300">
                          <span className="material-symbols-outlined text-[14px]">warning</span>
                          +12% vs last month
                        </span>
                      </div>
                    </div>

                    {/* Monthly Collection Metric */}
                    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-3.5 shadow-xs flex flex-col justify-between">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <div className="w-6 h-6 rounded-md bg-[#EFF4FF] flex items-center justify-center">
                          <span className="material-symbols-outlined text-[#1447E6] text-base">check_circle</span>
                        </div>
                        <span className="text-xs font-semibold text-slate-700 truncate">Monthly Collection</span>
                      </div>
                      <div className="my-1.5">
                        <span className="text-xl font-bold text-slate-900 tracking-tight tabular-nums">
                          PKR 62,300
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 font-medium">Received this month</span>
                    </div>

                    {/* Active Khata Accounts */}
                    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-3.5 shadow-xs flex flex-col justify-between">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center">
                          <span className="material-symbols-outlined text-[#1447E6] text-base">groups</span>
                        </div>
                        <span className="text-xs font-semibold text-slate-700 truncate">Active Accounts</span>
                      </div>
                      <div className="my-1.5 flex items-baseline gap-1">
                        <span className="text-xl font-bold text-[#1447E6] tracking-tight tabular-nums">28</span>
                        <span className="text-xs text-slate-500 font-medium">Customers</span>
                      </div>
                      <span className="text-xs text-slate-500 font-medium">100% SQLite Offline Safe</span>
                    </div>
                  </div>

                  {/* Operational Quick Action Cards */}
                  <div className="flex items-stretch gap-2 overflow-x-auto no-scrollbar py-1">
                    <button
                      type="button"
                      onClick={() => showToast("Add Customer Ledger Dialog opened")}
                      className="flex-shrink-0 flex items-center gap-2 bg-[#1447E6] hover:bg-[#0F3BC4] text-white px-3.5 py-2.5 rounded-xl shadow-md shadow-[#1447E6]/20 active:scale-95 transition-all"
                    >
                      <span className="material-symbols-outlined text-lg">person_add</span>
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-bold leading-tight">+ New Khata</span>
                        <span className="text-[10px] text-white/80 leading-tight">Add Customer</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => showToast("WhatsApp reminders generated for 14 overdue accounts")}
                      className="flex-shrink-0 flex items-center gap-2 bg-white text-[#1447E6] border border-[#1447E6]/30 hover:bg-[#EFF4FF] px-3.5 py-2.5 rounded-xl shadow-xs active:scale-95 transition-all"
                    >
                      <span className="material-symbols-outlined text-[#1447E6] text-lg">send_to_mobile</span>
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-bold leading-tight text-slate-800">Send WhatsApp Blast</span>
                        <span className="text-[10px] text-[#1447E6] font-medium leading-tight">Payment Reminder</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => showToast("Ledger PDF Statement exported")}
                      className="flex-shrink-0 flex items-center gap-2 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 px-3.5 py-2.5 rounded-xl shadow-xs active:scale-95 transition-all"
                    >
                      <span className="material-symbols-outlined text-slate-500 text-lg">picture_as_pdf</span>
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-bold leading-tight text-slate-800">Ledger PDF</span>
                        <span className="text-[10px] text-slate-500 leading-tight">Print Statement</span>
                      </div>
                    </button>
                  </div>

                  {/* Customer Ledger List */}
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-900">Customer Ledgers</span>
                      <span className="text-xs font-semibold text-[#1447E6]">Sort: Highest Balance</span>
                    </div>

                    {customersList.map((cust) => (
                      <div
                        key={cust.id}
                        className="p-3 bg-white rounded-xl border border-[#E2E8F0] shadow-xs flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-[#EFF4FF] text-[#1447E6] flex items-center justify-center font-bold text-sm shrink-0 border border-blue-100">
                            {cust.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{cust.name}</p>
                            <p className="text-xs text-slate-500 truncate">{cust.phone} • {cust.area}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">Last activity: {cust.lastDate}</p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[10px] font-semibold text-slate-400 block uppercase">Udhaar Due</span>
                          <p className={`text-base font-extrabold tabular-nums ${cust.balance > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                            PKR {cust.balance.toLocaleString()}
                          </p>
                          <button
                            onClick={() => showToast(`Payment dialog for ${cust.name} opened`)}
                            className="text-[11px] font-bold text-[#1447E6] hover:underline mt-0.5 block"
                          >
                            Receive Payment
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ======================================================= */}
              {/* TAB 3: BLUETOOTH THERMAL PRINTER SETTINGS               */}
              {/* ======================================================= */}
              {subTab === "printer" && (
                <div className="flex flex-col w-full px-4 pb-28 gap-3 mt-1">
                  
                  {/* Top Hardware Context Banner (Cobalt Blue #1447E6) */}
                  <div className="w-full bg-[#1447E6] text-white rounded-2xl p-4 shadow-lg shadow-[#1447E6]/20 relative overflow-hidden">
                    <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-white/5 pointer-events-none"></div>
                    <div className="flex items-start justify-between gap-2 relative z-10">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0 border border-white/20">
                          <span className="material-symbols-outlined text-white text-2xl">print</span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] text-[#C9D0FF] uppercase tracking-wider font-bold">
                              {printerStatus === "CONNECTED" ? "Hardware Online" : printerStatus === "CONNECTING" ? "Connecting..." : "Hardware Standby"}
                            </span>
                            <span className={`w-2 h-2 rounded-full ${printerStatus === "CONNECTED" ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`}></span>
                          </div>
                          <h2 className="text-lg text-white font-bold truncate">
                            {escposPrinter.isConnected() ? escposPrinter.getConnectedDeviceName() : activePrinterName}
                          </h2>
                          <p className="text-[12px] text-[#C9D0FF] truncate font-mono">
                            {escposPrinter.isConnected() ? "GATT BLE Connected • 203 DPI" : "Bluetooth 4.0 / RawBT Ready"}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="bg-white/20 text-white backdrop-blur-sm px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider border border-white/25">
                          {selectedPaperWidth} Roll
                        </span>
                        {escposPrinter.isConnected() ? (
                          <button
                            type="button"
                            onClick={handleDisconnectBluetooth}
                            className="text-[10px] bg-rose-500/80 hover:bg-rose-600 text-white font-bold px-2.5 py-0.5 rounded-full transition-colors"
                          >
                            Disconnect
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleConnectBluetooth}
                            className="text-[10px] bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-2.5 py-0.5 rounded-full transition-colors"
                          >
                            Connect
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Peripheral Vital Metrics */}
                    <div className="grid grid-cols-3 gap-2 mt-4 pt-2 bg-white/10 backdrop-blur-sm rounded-xl p-2 border border-white/15 relative z-10">
                      <div className="flex flex-col items-center justify-center text-center p-1">
                        <div className="flex items-center gap-1 text-white">
                          <span className="material-symbols-outlined text-base text-emerald-300">battery_charging_80</span>
                          <span className="text-xs font-bold">85%</span>
                        </div>
                        <span className="text-[10px] text-[#C9D0FF] mt-0.5">Battery</span>
                      </div>
                      <div className="flex flex-col items-center justify-center text-center p-1 border-x border-white/10">
                        <div className="flex items-center gap-1 text-white">
                          <span className="material-symbols-outlined text-base text-[#DDE1FF]">receipt_long</span>
                          <span className="text-xs font-bold">Ready</span>
                        </div>
                        <span className="text-[10px] text-[#C9D0FF] mt-0.5">Paper Sensor</span>
                      </div>
                      <div className="flex flex-col items-center justify-center text-center p-1">
                        <div className="flex items-center gap-1 text-white">
                          <span className="material-symbols-outlined text-base text-[#DDE1FF]">bluetooth</span>
                          <span className="text-xs font-bold">{selectedConnectionMode === "rawbt_intent" ? "RawBT" : "BLE 4.2"}</span>
                        </div>
                        <span className="text-[10px] text-[#C9D0FF] mt-0.5">Protocol</span>
                      </div>
                    </div>
                  </div>

                  {/* Hardware Quick Diagnostics & Tactile Action Bento */}
                  <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#EFF4FF] flex items-center justify-center">
                          <span className="material-symbols-outlined text-[#1447E6] text-base">speed</span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-900">Tactile Diagnostics & Controls</h3>
                      </div>
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
                        Instant ESC/POS
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={handleTestPrint}
                        className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 hover:border-[#1447E6]/40 rounded-xl active:scale-95 transition-all text-center"
                      >
                        <div className="w-9 h-9 rounded-full bg-[#EFF4FF] flex items-center justify-center mb-1 text-[#1447E6]">
                          <span className="material-symbols-outlined text-lg">receipt</span>
                        </div>
                        <span className="text-xs text-slate-800 font-bold leading-tight">Test Print</span>
                        <span className="text-[10px] text-slate-500 mt-0.5">{selectedPaperWidth} Slip</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleFeedPaper}
                        className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 hover:border-[#1447E6]/40 rounded-xl active:scale-95 transition-all text-center"
                      >
                        <div className="w-9 h-9 rounded-full bg-[#EFF4FF] flex items-center justify-center mb-1 text-[#1447E6]">
                          <span className="material-symbols-outlined text-lg">arrow_downward</span>
                        </div>
                        <span className="text-xs text-slate-800 font-bold leading-tight">Paper Feed</span>
                        <span className="text-[10px] text-slate-500 mt-0.5">+{printerConfig.feed_lines || 3} Lines</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCutPaper}
                        className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 hover:border-[#1447E6]/40 rounded-xl active:scale-95 transition-all text-center"
                      >
                        <div className="w-9 h-9 rounded-full bg-[#EFF4FF] flex items-center justify-center mb-1 text-[#1447E6]">
                          <span className="material-symbols-outlined text-lg">content_cut</span>
                        </div>
                        <span className="text-xs text-slate-800 font-bold leading-tight">Cut Paper</span>
                        <span className="text-[10px] text-slate-500 mt-0.5">Auto Cutter</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleKickDrawer}
                        className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 hover:border-[#1447E6]/40 rounded-xl active:scale-95 transition-all text-center"
                      >
                        <div className="w-9 h-9 rounded-full bg-[#EFF4FF] flex items-center justify-center mb-1 text-[#1447E6]">
                          <span className="material-symbols-outlined text-lg">point_of_sale</span>
                        </div>
                        <span className="text-xs text-slate-800 font-bold leading-tight">Open Drawer</span>
                        <span className="text-[10px] text-slate-500 mt-0.5">Solenoid Kick</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleBeepBuzzer}
                        className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 hover:border-[#1447E6]/40 rounded-xl active:scale-95 transition-all text-center"
                      >
                        <div className="w-9 h-9 rounded-full bg-[#EFF4FF] flex items-center justify-center mb-1 text-[#1447E6]">
                          <span className="material-symbols-outlined text-lg">notifications</span>
                        </div>
                        <span className="text-xs text-slate-800 font-bold leading-tight">Sound Buzzer</span>
                        <span className="text-[10px] text-slate-500 mt-0.5">Audio Alert</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsTroubleshootOpen(true)}
                        className="flex flex-col items-center justify-center p-3 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 hover:border-[#1447E6] rounded-xl active:scale-95 transition-all text-center"
                      >
                        <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center mb-1 text-white">
                          <span className="material-symbols-outlined text-lg">help_outline</span>
                        </div>
                        <span className="text-xs text-blue-900 font-bold leading-tight">حل و رہنمائی</span>
                        <span className="text-[10px] text-blue-700 mt-0.5">Urdu Guide</span>
                      </button>
                    </div>
                  </div>

                  {/* Printer Hardware Configuration Card */}
                  <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#EFF4FF] flex items-center justify-center">
                          <span className="material-symbols-outlined text-[#1447E6] text-base">tune</span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-900">Printer Configuration</h3>
                      </div>
                      <button
                        type="button"
                        onClick={handleSavePrinterSettings}
                        className="px-3 py-1 bg-[#1447E6] text-white rounded-lg text-xs font-bold active:scale-95 transition-transform"
                      >
                        Save Settings
                      </button>
                    </div>

                    {/* Paper Format Selector */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1.5">
                        Thermal Paper Roll Width
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedPaperWidth("58mm")}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            selectedPaperWidth === "58mm"
                              ? "border-[#1447E6] bg-[#EFF4FF] text-[#1447E6]"
                              : "border-slate-200 hover:border-slate-300 text-slate-700"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold">58mm (32 Chars)</span>
                            {selectedPaperWidth === "58mm" && (
                              <span className="material-symbols-outlined text-sm">check_circle</span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 block mt-0.5">
                            Pocket Portable (MPT-II, POS-5802)
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedPaperWidth("80mm")}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            selectedPaperWidth === "80mm"
                              ? "border-[#1447E6] bg-[#EFF4FF] text-[#1447E6]"
                              : "border-slate-200 hover:border-slate-300 text-slate-700"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold">80mm (48 Chars)</span>
                            {selectedPaperWidth === "80mm" && (
                              <span className="material-symbols-outlined text-sm">check_circle</span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 block mt-0.5">
                            Counter Desktop (POS-80C, Epson)
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Transmission Mode */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1.5">
                        Driver & Transmission Mode
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedConnectionMode("bluetooth_ble")}
                          className={`p-2 rounded-xl border text-center transition-all ${
                            selectedConnectionMode === "bluetooth_ble"
                              ? "border-[#1447E6] bg-[#EFF4FF] text-[#1447E6] font-bold"
                              : "border-slate-200 text-slate-600 text-xs"
                          }`}
                        >
                          <span className="text-xs block">Web BLE</span>
                          <span className="text-[9px] text-slate-400">Direct GATT</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedConnectionMode("rawbt_intent")}
                          className={`p-2 rounded-xl border text-center transition-all ${
                            selectedConnectionMode === "rawbt_intent"
                              ? "border-[#1447E6] bg-[#EFF4FF] text-[#1447E6] font-bold"
                              : "border-slate-200 text-slate-600 text-xs"
                          }`}
                        >
                          <span className="text-xs block">RawBT App</span>
                          <span className="text-[9px] text-slate-400">Classic SPP</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedConnectionMode("browser_print")}
                          className={`p-2 rounded-xl border text-center transition-all ${
                            selectedConnectionMode === "browser_print"
                              ? "border-[#1447E6] bg-[#EFF4FF] text-[#1447E6] font-bold"
                              : "border-slate-200 text-slate-600 text-xs"
                          }`}
                        >
                          <span className="text-xs block">Browser / PDF</span>
                          <span className="text-[9px] text-slate-400">System Fallback</span>
                        </button>
                      </div>
                    </div>

                    {/* Auto Print Toggle & Density */}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">Auto Print</span>
                          <span className="text-[10px] text-slate-500">On sale checkout</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={isPrintingThermal}
                          onChange={(e) => setIsPrintingThermal(e.target.checked)}
                          className="h-4 w-4 rounded accent-[#1447E6] cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">Print Density</span>
                          <span className="text-[10px] text-slate-500">{printerDensity}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const next = printerDensity === "Normal" ? "Dark Ink" : "Normal";
                            setPrinterDensity(next);
                          }}
                          className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-white border border-slate-200 hover:border-slate-400"
                        >
                          Toggle
                        </button>
                      </div>
                    </div>

                    {/* Receipt Custom Header & Footer */}
                    <div className="space-y-2 pt-1">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">
                          Custom Receipt Header Greeting
                        </label>
                        <input
                          type="text"
                          value={customHeaderNote}
                          onChange={(e) => setCustomHeaderNote(e.target.value)}
                          placeholder="e.g. Khush-Amdeed / Welcome to our store"
                          className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:border-[#1447E6] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">
                          Custom Receipt Footer Notice
                        </label>
                        <input
                          type="text"
                          value={customFooterNote}
                          onChange={(e) => setCustomFooterNote(e.target.value)}
                          placeholder="e.g. Aapki Aamad Ka Shukriya! No Exchange without Receipt."
                          className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:border-[#1447E6] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bluetooth Pairing Station */}
                  <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#EFF4FF] flex items-center justify-center">
                          <span className="material-symbols-outlined text-[#1447E6] text-base">bluetooth_searching</span>
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">Bluetooth Device Station</h3>
                          <p className="text-[11px] text-slate-500">Wireless POS terminal hardware</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleConnectBluetooth}
                        disabled={isScanningPrinters}
                        className="h-8 px-3 bg-[#1447E6] hover:bg-[#0F3BC4] text-white rounded-lg text-xs font-bold flex items-center gap-1 active:scale-95 transition-transform disabled:opacity-50"
                      >
                        <span className={`material-symbols-outlined text-sm ${isScanningPrinters ? "animate-spin" : ""}`}>
                          sync
                        </span>
                        <span>{isScanningPrinters ? "Scanning..." : "Pair New"}</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {/* Active/Connected Device */}
                      <div className="p-3 rounded-xl bg-[#EFF4FF] border border-[#1447E6]/25 flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-[#1447E6] text-white flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-lg">bluetooth_connected</span>
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-900 truncate">
                                {escposPrinter.isConnected() ? escposPrinter.getConnectedDeviceName() : activePrinterName}
                              </span>
                              <span className={`w-2 h-2 rounded-full ${escposPrinter.isConnected() ? "bg-emerald-500 animate-pulse" : "bg-slate-400"} shrink-0`}></span>
                            </div>
                            <p className="text-[11px] text-slate-500 truncate font-mono">
                              {escposPrinter.isConnected() ? "Direct BLE GATT Active" : "Paired • Ready to Connect"}
                            </p>
                          </div>
                        </div>
                        {escposPrinter.isConnected() ? (
                          <span className="text-[11px] font-bold bg-[#1447E6]/15 text-[#1447E6] px-2.5 py-1 rounded-full">
                            Active
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={handleConnectBluetooth}
                            className="h-7 px-2.5 bg-[#1447E6] text-white rounded-lg text-xs font-bold"
                          >
                            Connect
                          </button>
                        )}
                      </div>

                      {/* RawBT Companion Link Card */}
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-lg">send_to_mobile</span>
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-800 truncate">RawBT Print Service (Companion)</span>
                            <p className="text-[11px] text-slate-500 truncate">For classic Bluetooth 2.0/3.0 SPP printers</p>
                          </div>
                        </div>
                        <a
                          href="https://play.google.com/store/apps/details?id=ru.a402d.rawbtprinter"
                          target="_blank"
                          rel="noreferrer"
                          className="h-7 px-2.5 bg-white border border-slate-300 hover:border-[#1447E6] text-slate-700 hover:text-[#1447E6] rounded-lg text-xs font-bold flex items-center transition-colors"
                        >
                          Play Store
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Thermal Paper Roll Receipt Live Specimen */}
                  <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-7 h-7 rounded-lg bg-[#EFF4FF] flex items-center justify-center">
                          <span className="material-symbols-outlined text-[#1447E6] text-base">visibility</span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-900">{selectedPaperWidth} Receipt Preview</h3>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            escposPrinter.printViaBrowser(
                              {
                                id: "sample-preview",
                                client_transaction_id: "preview-1",
                                invoice_number: "QP-9421",
                                total_amount: 1180,
                                amount_paid: 1500,
                                change_returned: 320,
                                payment_method: "cash",
                                sync_status: "synced",
                                created_at: new Date().toISOString(),
                                subtotal: 1180,
                                discount_amount: 0,
                                tax_amount: 0,
                                customer_name: "Muhammad Tariq",
                                items: [
                                  { id: "1", sale_id: "s", product_id: "p1", product_name: "Tapal Danedar 450g", unit: "packet", quantity: 1, unit_price: 650, cost_price: 590, discount: 0, total_price: 650 },
                                  { id: "2", sale_id: "s", product_id: "p2", product_name: "Shan Biryani Masala", unit: "pcs", quantity: 2, unit_price: 120, cost_price: 100, discount: 0, total_price: 240 },
                                  { id: "3", sale_id: "s", product_id: "p3", product_name: "Olper's Milk 1L", unit: "pcs", quantity: 1, unit_price: 290, cost_price: 260, discount: 0, total_price: 290 },
                                ],
                              },
                              selectedPaperWidth,
                              {
                                name: activeStore?.name,
                                area: activeStore?.area,
                                phone: activeStore?.phone,
                                ntn: activeStore?.ntn || "Exempt",
                                tagline: currentTemplate.name,
                                customHeader: customHeaderNote,
                                customFooter: customFooterNote,
                              },
                              false
                            );
                            showToast("Launched browser thermal print preview");
                          }}
                          className="text-[10px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-xs">print</span>
                          <span>Browser Print</span>
                        </button>
                        <span className="text-[10px] font-bold text-[#1447E6] bg-[#EFF4FF] border border-[#1447E6]/20 px-2 py-0.5 rounded-full">
                          ESC/POS Stream
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mb-3">
                      Real-time monospace preview matching physical {selectedPaperWidth} thermal roll
                    </p>

                    {/* Thermal Slip Simulation */}
                    <div className="bg-[#FCFCFC] text-slate-900 border border-slate-300 rounded-lg p-4 shadow-sm font-mono text-center text-xs select-all">
                      <h4 className="font-extrabold tracking-tight text-slate-900 text-sm">
                        {activeStore ? activeStore.name.toUpperCase() : "MADINA KIRYANA STORE"}
                      </h4>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        {activeStore ? activeStore.area : "Shah Faisal Colony # 3, Karachi"}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Phone: {activeStore ? activeStore.phone : "0300-1234567"} | NTN: {activeStore?.ntn || "Exempt"}
                      </p>
                      {customHeaderNote && (
                        <p className="text-[10px] text-slate-600 italic mt-0.5">{customHeaderNote}</p>
                      )}
                      <p className="text-[10px] text-slate-400 mt-1">
                        {new Date().toLocaleDateString("en-PK")} {new Date().toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })} | Bill # QP-9421
                      </p>
                      <div className="text-slate-400 my-1 overflow-hidden select-none whitespace-nowrap">
                        {selectedPaperWidth === "58mm" ? "--------------------------------" : "------------------------------------------------"}
                      </div>
                      <div className="w-full text-left space-y-1">
                        <div className="flex justify-between font-bold text-[11px] text-slate-500">
                          <span>ITEM</span>
                          <span>QTY x RATE</span>
                          <span className="text-right">AMOUNT</span>
                        </div>
                        <div className="text-slate-400 -my-1 select-none">
                          - - - - - - - - - - - - - - - -
                        </div>
                        <div className="flex justify-between font-semibold">
                          <span>Tapal Danedar 450g</span>
                          <span className="text-slate-500">1 x 650</span>
                          <span className="font-bold">Rs. 650</span>
                        </div>
                        <div className="flex justify-between font-semibold">
                          <span>Shan Biryani Masala</span>
                          <span className="text-slate-500">2 x 120</span>
                          <span className="font-bold">Rs. 240</span>
                        </div>
                        <div className="flex justify-between font-semibold">
                          <span>Olper&apos;s Milk 1L</span>
                          <span className="text-slate-500">1 x 290</span>
                          <span className="font-bold">Rs. 290</span>
                        </div>
                      </div>
                      <div className="text-slate-400 my-1 overflow-hidden select-none whitespace-nowrap">
                        {selectedPaperWidth === "58mm" ? "--------------------------------" : "------------------------------------------------"}
                      </div>
                      <div className="flex justify-between font-bold text-sm">
                        <span>TOTAL PAYABLE</span>
                        <span className="text-[#1447E6]">PKR 1,180</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-500 mt-0.5">
                        <span>Paid (CASH): PKR 1,500</span>
                        <span>Change Back: PKR 320</span>
                      </div>
                      <div className="mt-3 pt-2 border-t border-dashed border-slate-300 text-[10px] text-slate-500">
                        <p>{customFooterNote || "Aapki Aamad Ka Shukriya!"}</p>
                        <p className="font-sans font-bold text-[#1447E6] mt-0.5">Powered by RojrzTech</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ======================================================= */}
              {/* TAB 4: INVENTORY STOCK MANAGEMENT                       */}
              {/* ======================================================= */}
              {subTab === "inventory" && (
                <div className="flex flex-col w-full px-4 pb-28 gap-3">
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900">Inventory Catalog</h2>
                      <p className="text-xs text-slate-500">Local SQLite Relational Stock</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => showToast("Add Product Form opened")}
                      className="px-3 py-1.5 bg-[#1447E6] text-white rounded-lg text-xs font-bold shadow-xs active:scale-95"
                    >
                      + Add Product
                    </button>
                  </div>

                  <div className="space-y-2">
                    {products.map((p) => (
                      <div
                        key={p.id}
                        className="p-3 bg-white rounded-xl border border-[#E2E8F0] shadow-xs flex items-center justify-between"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-bold text-slate-900 truncate">{p.name}</p>
                            {p.stock_quantity <= p.min_stock_alert && (
                              <span className="text-[10px] bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded font-bold border border-rose-200">
                                Low Stock
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Category: {p.category} • Cost: PKR {p.cost_price}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-sm font-extrabold text-[#1447E6] tabular-nums">
                            PKR {p.sale_price}
                          </p>
                          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full mt-0.5 inline-block">
                            {p.stock_quantity} {p.unit} in stock
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ======================================================= */}
              {/* CONFIGURATION-DRIVEN DAY REPORTS & METRICS              */}
              {/* ======================================================= */}
              {subTab === "reports" && (
                <div className="flex flex-col w-full px-4 pb-28 gap-3">
                  <div className="pt-1">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[#1447E6]">analytics</span>
                      <h2 className="text-base font-extrabold text-slate-900">
                        {currentTemplate.name} — Performance
                      </h2>
                    </div>
                    <p className="text-xs text-slate-500">
                      Template KPI Metrics &bull; {activeStore ? activeStore.name : "Quick-POS"}
                    </p>
                  </div>

                  {/* 4 Template-Driven Metric Cards */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 bg-white rounded-xl border border-[#E2E8F0] shadow-xs">
                      <span className="text-[11px] text-slate-500 font-bold uppercase truncate block">
                        {currentTemplate.reportMetrics[0] || "Gross Sales Today"}
                      </span>
                      <p className="text-lg font-black text-slate-900 mt-1 tabular-nums">
                        {activeStore?.template_type === "meat" ? "51.5 KG Sold" : "PKR 34,800"}
                      </p>
                      <span className="text-[10px] text-emerald-600 font-bold">Matched with Cash Register</span>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-[#E2E8F0] shadow-xs">
                      <span className="text-[11px] text-slate-500 font-bold uppercase truncate block">
                        {currentTemplate.reportMetrics[1] || "Cash in Drawer"}
                      </span>
                      <p className="text-lg font-black text-[#1447E6] mt-1 tabular-nums">
                        {activeStore?.template_type === "meat"
                          ? "8.5 KG Wastage"
                          : activeStore?.template_type === "biryani"
                          ? "42 Full / 28 Half"
                          : activeStore?.template_type === "tailor"
                          ? "PKR 18,200 Deposit"
                          : "PKR 28,450"}
                      </p>
                      <span className="text-[10px] text-slate-500 font-bold">Shift Verified</span>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-[#E2E8F0] shadow-xs">
                      <span className="text-[11px] text-slate-500 font-bold uppercase truncate block">
                        {currentTemplate.reportMetrics[2] || "Digital Payments"}
                      </span>
                      <p className="text-lg font-black text-slate-900 mt-1 tabular-nums">
                        {activeStore?.template_type === "meat"
                          ? "PKR 980 / KG Avg"
                          : activeStore?.template_type === "biryani"
                          ? "PKR 14,700 Expenses"
                          : activeStore?.template_type === "tailor"
                          ? "PKR 12,450 Pending"
                          : "PKR 4,200 Raast"}
                      </p>
                      <span className="text-[10px] text-slate-500 font-bold">Verified Transactions</span>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-[#E2E8F0] shadow-xs">
                      <span className="text-[11px] text-slate-500 font-bold uppercase truncate block">
                        {currentTemplate.reportMetrics[3] || "Balance Due"}
                      </span>
                      <p className="text-lg font-black text-rose-600 mt-1 tabular-nums">
                        {activeStore?.template_type === "meat"
                          ? "18.4% Margin"
                          : activeStore?.template_type === "biryani"
                          ? "PKR 20,100 Net"
                          : activeStore?.template_type === "tailor"
                          ? "PKR 6,800 Karigar"
                          : "PKR 2,150 Udhaar"}
                      </p>
                      <span className="text-[10px] text-rose-600 font-bold">Template KPI Alert</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => showToast("Daily 'Z-Report' sent to Bluetooth thermal printer")}
                    className="w-full h-12 bg-[#1447E6] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs active:scale-95"
                  >
                    <span className="material-symbols-outlined text-base">receipt_long</span>
                    <span>Print Daily Summary (Z-Report Slip)</span>
                  </button>
                </div>
              )}

              {/* ======================================================= */}
              {/* TAB: MEAT TRIMMING & WASTAGE RECORDS (Template B)        */}
              {/* ======================================================= */}
              {subTab === "wastage" && (
                <div className="flex flex-col w-full px-4 pb-28 gap-3">
                  <div className="pt-1">
                    <h2 className="text-base font-extrabold text-slate-900">Trimming &amp; Wastage Log</h2>
                    <p className="text-xs text-slate-500">Track Bone, Fat Discard &amp; Net Carcass Yield</p>
                  </div>

                  {/* Yield Bento Box */}
                  <div className="bg-gradient-to-br from-rose-600 via-rose-700 to-rose-900 text-white rounded-2xl p-4 shadow-md shadow-rose-600/20">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white/90">Daily Carcass Yield Status</span>
                      <span className="text-[11px] font-bold bg-white/20 px-2 py-0.5 rounded-full border border-white/20">
                        85.8% Net Yield
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/15 text-center">
                      <div>
                        <span className="text-[10px] text-white/80 uppercase font-semibold">Inflow Carcass</span>
                        <p className="text-base font-black mt-0.5">60.0 KG</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-rose-200 uppercase font-semibold">Trimming Loss</span>
                        <p className="text-base font-black text-rose-200 mt-0.5">8.5 KG</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-200 uppercase font-semibold">Sellable Meat</span>
                        <p className="text-base font-black text-emerald-300 mt-0.5">51.5 KG</p>
                      </div>
                    </div>
                  </div>

                  {/* Add Wastage Form */}
                  <form onSubmit={handleAddWastage} className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">Record New Trimming / Discard</span>
                      <span className="text-[10px] font-bold text-slate-400">Deducts from KG stock</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Meat Cut</label>
                        <select
                          value={newWastageCut}
                          onChange={(e) => setNewWastageCut(e.target.value)}
                          className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg px-2 text-xs font-bold text-slate-900"
                        >
                          <option value="Fresh Beef Boti">Fresh Beef Boti</option>
                          <option value="Broiler Chicken">Broiler Chicken</option>
                          <option value="Mutton Leg">Mutton Leg</option>
                          <option value="Beef Qeema">Beef Qeema</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Weight (KG)</label>
                        <input
                          type="number"
                          step="0.1"
                          required
                          value={newWastageKg}
                          onChange={(e) => setNewWastageKg(e.target.value)}
                          className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg px-2 text-xs font-bold text-slate-900"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Reason</label>
                        <select
                          value={newWastageReason}
                          onChange={(e) => setNewWastageReason(e.target.value as any)}
                          className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg px-2 text-xs font-bold text-slate-900"
                        >
                          <option value="Fat Trimming">Fat Trimming</option>
                          <option value="Bone Discard">Bone Discard</option>
                          <option value="Cutting Loss">Cutting Loss</option>
                          <option value="Spoilage">Spoilage</option>
                        </select>
                      </div>
                      <button
                        type="submit"
                        className="mt-4 h-8 px-3 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold rounded-lg shadow-xs transition-all cursor-pointer"
                      >
                        + Log Loss
                      </button>
                    </div>
                  </form>

                  {/* Wastage Ledger List */}
                  <div className="space-y-1.5">
                    {wastageRecords.map((w) => (
                      <div key={w.id} className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-900">{w.cutName}</p>
                          <p className="text-[10px] text-slate-500">{w.date} &bull; Reason: <span className="font-semibold text-rose-600">{w.reason}</span></p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-rose-700">-{w.weightKg} KG</p>
                          <p className="text-[10px] text-slate-400">Loss: PKR {w.costImpact.toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ======================================================= */}
              {/* TAB: DAILY KITCHEN EXPENSES (Template C & Custom)       */}
              {/* ======================================================= */}
              {subTab === "expenses" && (
                <div className="flex flex-col w-full px-4 pb-28 gap-3">
                  <div className="pt-1">
                    <h2 className="text-base font-extrabold text-slate-900">Kitchen &amp; Shop Operating Expenses</h2>
                    <p className="text-xs text-slate-500">Deducts fuel, ingredients &amp; daily wages from register</p>
                  </div>

                  {/* Summary Bento */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
                      <span className="text-[11px] text-slate-500 font-bold uppercase">Total Expenses Today</span>
                      <p className="text-lg font-black text-rose-600 mt-1 tabular-nums">
                        PKR {kitchenExpenses.reduce((s, e) => s + e.amount, 0).toLocaleString()}
                      </p>
                      <span className="text-[10px] text-slate-400 font-semibold">{kitchenExpenses.length} Expense Entries</span>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
                      <span className="text-[11px] text-slate-500 font-bold uppercase">Net Cash in Drawer</span>
                      <p className="text-lg font-black text-emerald-600 mt-1 tabular-nums">
                        PKR {(34800 - kitchenExpenses.reduce((s, e) => s + e.amount, 0)).toLocaleString()}
                      </p>
                      <span className="text-[10px] text-emerald-600 font-semibold">After Expenses Subtracted</span>
                    </div>
                  </div>

                  {/* Add Expense Form */}
                  <form onSubmit={handleAddKitchenExpense} className="p-3 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2">
                    <span className="text-xs font-bold text-slate-900 block">Record Kitchen / Store Expense</span>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        required
                        placeholder="e.g. Coal / Wood Fuel"
                        value={newExpenseTitle}
                        onChange={(e) => setNewExpenseTitle(e.target.value)}
                        className="h-8 bg-slate-50 border border-slate-200 rounded-lg px-2 text-xs font-semibold text-slate-900"
                      />
                      <input
                        type="number"
                        required
                        placeholder="Amount PKR"
                        value={newExpenseAmount}
                        onChange={(e) => setNewExpenseAmount(e.target.value)}
                        className="h-8 bg-slate-50 border border-slate-200 rounded-lg px-2 text-xs font-semibold text-slate-900"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={newExpenseCat}
                        onChange={(e) => setNewExpenseCat(e.target.value as any)}
                        className="flex-1 h-8 bg-slate-50 border border-slate-200 rounded-lg px-2 text-xs font-bold text-slate-900"
                      >
                        <option value="Fuel/Gas">Fuel/Gas</option>
                        <option value="Cooking Oil">Cooking Oil</option>
                        <option value="Spices/Ingredients">Spices/Ingredients</option>
                        <option value="Helper Wage">Helper Wage</option>
                        <option value="Packaging">Packaging</option>
                      </select>
                      <button
                        type="submit"
                        className="h-8 px-3 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold rounded-lg shadow-xs transition-all cursor-pointer"
                      >
                        + Add Expense
                      </button>
                    </div>
                  </form>

                  {/* Expenses List */}
                  <div className="space-y-1.5">
                    {kitchenExpenses.map((exp) => (
                      <div key={exp.id} className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-900">{exp.title}</p>
                          <p className="text-[10px] text-slate-500">{exp.time} &bull; <span className="font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">{exp.category}</span></p>
                        </div>
                        <p className="text-xs font-black text-rose-700 tabular-nums">-PKR {exp.amount.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ======================================================= */}
              {/* TAB: STITCHING ORDERS & DELIVERY (Template D)           */}
              {/* ======================================================= */}
              {subTab === "stitching_orders" && (
                <div className="flex flex-col w-full px-4 pb-28 gap-3">
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900">Stitching Orders Queue</h2>
                      <p className="text-xs text-slate-500">Measurements, Delivery Dates &amp; Balances</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsBookingModalOpen(true)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs active:scale-95 cursor-pointer"
                    >
                      + New Booking
                    </button>
                  </div>

                  {/* Orders List */}
                  <div className="space-y-2.5">
                    {stitchingOrders.map((o) => (
                      <div key={o.id} className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-mono font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                              #{o.id}
                            </span>
                            <span className="text-xs font-bold text-slate-900">{o.customerName}</span>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize border ${
                            o.status === "Delivered" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            o.status === "Ready for Pickup" ? "bg-blue-50 text-blue-700 border-blue-200" :
                            o.status === "In Stitching" ? "bg-amber-50 text-amber-700 border-amber-200" :
                            "bg-slate-100 text-slate-700 border-slate-200"
                          }`}>
                            {o.status}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 font-medium">{o.suitType}</p>
                        <p className="text-[11px] text-slate-500 font-mono">
                          Dimensions: L: {o.length}&quot; &bull; Ch: {o.chest}&quot; &bull; W: {o.waist}&quot; &bull; Col: {o.collar}&quot; &bull; Sh: {o.shalwar}&quot;
                        </p>

                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                          <div>
                            <span className="text-slate-400 text-[10px] block">DELIVERY:</span>
                            <span className="font-bold text-slate-800">{o.deliveryDate}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] block">ADVANCE / DUE:</span>
                            <span className="font-semibold text-emerald-600">PKR {o.advancePaid}</span> /{" "}
                            <span className="font-black text-rose-600">PKR {o.balanceDue}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] block">KARIGAR:</span>
                            <span className="font-semibold text-indigo-700">{o.workerAssigned}</span>
                          </div>
                        </div>

                        {/* Status Advancement Button */}
                        <div className="pt-1 flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => showToast(`WhatsApp delivery token sent to ${o.phone}`)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-sm">chat</span>
                            <span>WhatsApp</span>
                          </button>
                          {o.status !== "Delivered" && (
                            <button
                              type="button"
                              onClick={() => handleAdvanceOrderStatus(o.id)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-sm">done</span>
                              <span>Advance Stage</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ======================================================= */}
              {/* TAB: WHOLESALE PURCHASES & SUPPLIERS                    */}
              {/* ======================================================= */}
              {subTab === "purchases" && (
                <div className="flex flex-col w-full px-4 pb-28 gap-3">
                  <div className="pt-1">
                    <h2 className="text-base font-extrabold text-slate-900">Wholesale Stock Purchases</h2>
                    <p className="text-xs text-slate-500">Inward consignments &amp; supplier ledger</p>
                  </div>

                  {/* Add Purchase Form */}
                  <form onSubmit={handleAddWholesalePurchase} className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2">
                    <span className="text-xs font-bold text-slate-900 block">Record Inward Stock Consignment</span>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        required
                        placeholder="Supplier (e.g. Metro Wholesale)"
                        value={newSupplierName}
                        onChange={(e) => setNewSupplierName(e.target.value)}
                        className="h-8 bg-slate-50 border border-slate-200 rounded-lg px-2 text-xs font-semibold text-slate-900"
                      />
                      <input
                        type="text"
                        placeholder="Invoice # (Optional)"
                        value={newInvoiceNo}
                        onChange={(e) => setNewInvoiceNo(e.target.value)}
                        className="h-8 bg-slate-50 border border-slate-200 rounded-lg px-2 text-xs font-semibold text-slate-900"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Items (e.g. 100kg rice)"
                        value={newPurchaseItems}
                        onChange={(e) => setNewPurchaseItems(e.target.value)}
                        className="col-span-2 h-8 bg-slate-50 border border-slate-200 rounded-lg px-2 text-xs font-semibold text-slate-900"
                      />
                      <input
                        type="number"
                        required
                        placeholder="Amount PKR"
                        value={newPurchaseAmount}
                        onChange={(e) => setNewPurchaseAmount(e.target.value)}
                        className="h-8 bg-slate-50 border border-slate-200 rounded-lg px-2 text-xs font-semibold text-slate-900"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full h-8 bg-[#1447E6] hover:bg-[#0F3BC4] text-white text-xs font-bold rounded-lg shadow-xs active:scale-95 transition-all cursor-pointer"
                    >
                      + Save Stock In Invoice
                    </button>
                  </form>

                  {/* Purchases List */}
                  <div className="space-y-1.5">
                    {wholesalePurchases.map((pur) => (
                      <div key={pur.id} className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900">{pur.supplierName}</span>
                            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {pur.invoiceNo}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">{pur.itemsSummary}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-slate-900 tabular-nums">PKR {pur.totalAmount.toLocaleString()}</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            pur.status === "Paid" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                          }`}>
                            {pur.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ======================================================= */}
              {/* TAB: WORKER COMMISSIONS & SETTLEMENTS                   */}
              {/* ======================================================= */}
              {subTab === "workers" && (
                <div className="flex flex-col w-full px-4 pb-28 gap-3.5">
                  {/* Top Header & Actions */}
                  <div className="pt-1 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[#1447E6] text-xl">badge</span>
                          <span>Staff &amp; Commission Management</span>
                        </h2>
                        <p className="text-[11px] text-slate-500">
                          Configuration-driven commission rules, settlements &amp; performance tracking
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveWorkerModal("add_worker")}
                        className="h-8 px-2.5 bg-[#1447E6] hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-xs active:scale-95 transition-all cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">person_add</span>
                        <span>+ Worker</span>
                      </button>
                    </div>

                    {/* Filter Pills & Secondary Actions */}
                    <div className="flex items-center justify-between gap-1.5 flex-wrap">
                      <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                        {(["daily", "weekly", "monthly"] as const).map((tf) => (
                          <button
                            key={tf}
                            type="button"
                            onClick={() => setCommissionTimeframe(tf)}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all capitalize ${
                              commissionTimeframe === tf
                                ? "bg-white text-[#1447E6] shadow-xs"
                                : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            {tf === "daily" ? "Today" : tf === "weekly" ? "This Week" : "This Month"}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setActiveWorkerModal("rules")}
                          className="h-7 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[13px] text-[#1447E6]">policy</span>
                          <span>Rules Policy</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveWorkerModal("history")}
                          className="h-7 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[13px] text-emerald-600">receipt_long</span>
                          <span>Settlements</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Store-wide Commission KPIs Bento Bar */}
                  {(() => {
                    const kpis = commissionEngine.getStoreCommissionKPIs(activeStore?.id || "shop-05");
                    return (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-3 bg-white rounded-2xl border border-blue-100 shadow-xs flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1447E6] flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-lg">trending_up</span>
                          </div>
                          <div className="min-w-0">
                            <span className="text-[10px] text-slate-400 block font-semibold truncate">ATTRIBUTED SALES</span>
                            <span className="font-extrabold text-slate-900 text-sm">
                              PKR {kpis.totalSalesAttributed.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <div className="p-3 bg-white rounded-2xl border border-emerald-100 shadow-xs flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-lg">payments</span>
                          </div>
                          <div className="min-w-0">
                            <span className="text-[10px] text-slate-400 block font-semibold truncate">TOTAL EARNED</span>
                            <span className="font-extrabold text-emerald-600 text-sm">
                              PKR {kpis.totalEarned.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <div className="p-3 bg-white rounded-2xl border border-amber-100 shadow-xs flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-lg">pending_actions</span>
                          </div>
                          <div className="min-w-0">
                            <span className="text-[10px] text-slate-400 block font-semibold truncate">PENDING PAYOUTS</span>
                            <span className="font-extrabold text-amber-600 text-sm">
                              PKR {kpis.totalPending.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <div className="p-3 bg-white rounded-2xl border border-purple-100 shadow-xs flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-lg">verified</span>
                          </div>
                          <div className="min-w-0">
                            <span className="text-[10px] text-slate-400 block font-semibold truncate">TOTAL PAID OUT</span>
                            <span className="font-extrabold text-purple-600 text-sm">
                              PKR {kpis.totalPaidOut.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Worker Performance & Commission Cards */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
                      <span>Active Staff &amp; Karigars ({commissionWorkers.length})</span>
                      <span className="text-[10px] text-slate-400 uppercase">Filtered by: {commissionTimeframe}</span>
                    </div>

                    {commissionWorkers.map((w) => {
                      const report = commissionEngine.getWorkerPerformanceReport(
                        activeStore?.id || "shop-05",
                        w.id,
                        commissionTimeframe
                      );
                      const targetPct = report?.targetProgressPercent || 0;
                      const netDue = report?.netPendingDue || 0;

                      return (
                        <div
                          key={w.id}
                          className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2.5"
                        >
                          {/* Worker Top Profile */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 text-[#1447E6] font-extrabold flex items-center justify-center text-xs shrink-0">
                                {w.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h4 className="text-xs font-black text-slate-900 truncate">{w.name}</h4>
                                  <span
                                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${
                                      w.status === "active"
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        : "bg-slate-100 text-slate-500 border-slate-200"
                                    }`}
                                  >
                                    {w.status.toUpperCase()}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-500 truncate">
                                  {w.role} &bull; {w.phone}
                                </p>
                              </div>
                            </div>

                            {/* Payment Type Badge */}
                            <div className="text-right shrink-0">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#1447E6] border border-blue-200 block">
                                {w.paymentType === "salary_plus_commission"
                                  ? "Salary + Comm"
                                  : w.paymentType === "commission_only"
                                  ? "Comm Only"
                                  : "Fixed Salary"}
                              </span>
                              {w.baseSalary > 0 && (
                                <span className="text-[9px] text-slate-400 block mt-0.5 font-mono">
                                  Base: PKR {w.baseSalary.toLocaleString()}/mo
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Applicable Rules Chips */}
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Rules:</span>
                            {w.applicableRuleIds.map((rId) => {
                              const r = commissionRules.find((rule) => rule.id === rId);
                              return (
                                <span
                                  key={rId}
                                  className="text-[9px] font-medium px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-md text-slate-600 truncate max-w-[170px]"
                                >
                                  {r ? `${r.name} (${r.rate}${r.method.includes("percentage") ? "%" : " PKR"})` : rId}
                                </span>
                              );
                            })}
                          </div>

                          {/* Target Progress Bar */}
                          {w.salesTarget.targetAmount > 0 && (
                            <div className="p-2 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="font-semibold text-slate-600">
                                  Sales Target: PKR {w.salesTarget.currentSales.toLocaleString()} / PKR {w.salesTarget.targetAmount.toLocaleString()}
                                </span>
                                <span className={`font-bold ${targetPct >= 100 ? "text-emerald-600" : "text-[#1447E6]"}`}>
                                  {targetPct}%
                                </span>
                              </div>
                              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    targetPct >= 100 ? "bg-emerald-500" : "bg-[#1447E6]"
                                  }`}
                                  style={{ width: `${Math.min(100, targetPct)}%` }}
                                ></div>
                              </div>
                              <div className="flex items-center justify-between text-[9px] text-slate-400">
                                <span>Period: {w.salesTarget.period}</span>
                                {targetPct >= 100 ? (
                                  <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                                    <span className="material-symbols-outlined text-[11px]">verified</span>
                                    +PKR {w.salesTarget.bonusAmount.toLocaleString()} Bonus Unlocked!
                                  </span>
                                ) : (
                                  <span>+PKR {w.salesTarget.bonusAmount.toLocaleString()} Target Incentive</span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* 4-column Financial Metric Bento */}
                          <div className="grid grid-cols-4 gap-1.5 text-center py-2 bg-slate-50/80 rounded-xl border border-slate-100 text-xs">
                            <div>
                              <span className="text-[9px] text-slate-400 block font-semibold">ATTRIBUTED</span>
                              <span className="font-bold text-slate-800 text-[11px]">
                                PKR {(report?.salesAttributed || 0).toLocaleString()}
                              </span>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-400 block font-semibold">EARNED</span>
                              <span className="font-bold text-emerald-600 text-[11px]">
                                PKR {(report?.commissionEarned || 0).toLocaleString()}
                              </span>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-400 block font-semibold">CLAWBACK</span>
                              <span className="font-bold text-rose-500 text-[11px]">
                                -PKR {(report?.commissionClawbacked || 0).toLocaleString()}
                              </span>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-400 block font-semibold">PENDING</span>
                              <span className="font-black text-[#1447E6] text-[11px]">
                                PKR {netDue.toLocaleString()}
                              </span>
                            </div>
                          </div>

                          {/* Actions: Settle, Entries Audit, Clawback */}
                          <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEntriesModal(w)}
                                className="h-7 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <span className="material-symbols-outlined text-[12px]">list_alt</span>
                                <span>Entries ({commissionEntries.filter((e) => e.workerId === w.id).length})</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenClawbackModal(w)}
                                className="h-7 px-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[10px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <span className="material-symbols-outlined text-[12px]">remove_circle_outline</span>
                                <span>Clawback</span>
                              </button>
                            </div>

                            <button
                              type="button"
                              disabled={netDue <= 0 && w.paymentType === "commission_only"}
                              onClick={() => handleOpenSettleModal(w)}
                              className="h-8 px-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-sm">payments</span>
                              <span>{netDue > 0 ? `Settle PKR ${netDue.toLocaleString()}` : "Settle Payout"}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </main>

            {/* ========================================================= */}
            {/* CONFIGURATION-DRIVEN BOTTOM NAVIGATION BAR                */}
            {/* ONLY DISPLAYS TABS PERMITTED FOR ACTIVE TEMPLATE          */}
            {/* ========================================================= */}
            <nav className="fixed bottom-0 w-full z-50 pb-safe bg-white/95 backdrop-blur-md border-t border-[#E2E8F0] shadow-[0_-2px_10px_rgba(15,23,42,0.03)]">
              <div className="flex items-center justify-around h-16 px-1 max-w-4xl mx-auto overflow-x-auto no-scrollbar">
                {currentTemplate.allowedTabs.map((tab) => {
                  const isActive = subTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSubTab(tab.id)}
                      className={`flex flex-col items-center justify-center min-w-[52px] sm:min-w-[72px] min-h-[48px] py-1 px-1 sm:px-2 transition-colors shrink-0 cursor-pointer ${
                        isActive ? "text-[#1447E6] font-bold" : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px] sm:text-[22px]">{tab.icon}</span>
                      <span className="text-[9px] sm:text-[11px] mt-0.5 tracking-tight truncate max-w-[62px] sm:max-w-none text-center">
                        {tab.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </nav>

            {/* ========================================================= */}
            {/* PAYMENT & RECEIPT CONFIRMATION MODAL (Matching Stitch)    */}
            {/* ========================================================= */}
            {isCheckoutOpen && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end sm:justify-center sm:items-center sm:p-4">
                <div className="w-full sm:max-w-xl max-h-[92vh] overflow-y-auto no-scrollbar bg-[#F8FAFC] rounded-t-3xl sm:rounded-3xl border-t sm:border border-slate-200 p-4 pb-safe animate-in slide-in-from-bottom duration-200">
                  
                  {/* Modal Top Bar */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#1447E6] flex items-center justify-center text-white">
                        <span className="material-symbols-outlined text-base">point_of_sale</span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900">Checkout Payment Flow</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCheckoutOpen(false)}
                      className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200"
                    >
                      <span className="material-symbols-outlined text-base">close</span>
                    </button>
                  </div>

                  {/* Order Info Bar */}
                  <div className="pt-3 pb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#1447E6] animate-pulse"></span>
                      <span className="text-xs font-semibold text-slate-700">Order #QP-9421</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold border border-slate-200">
                        {cart.reduce((s, c) => s + c.quantity, 0)} Items
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-[#1447E6] border border-blue-100">
                      <span className="material-symbols-outlined text-[15px]">print</span>
                      <span className="text-xs font-semibold">58mm Ready</span>
                    </div>
                  </div>

                  {/* Customer Info Card */}
                  <div className="mb-3">
                    <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-[#1447E6]">
                          <span className="material-symbols-outlined text-xl">person</span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-sm font-bold text-slate-900 truncate">{selectedCustomer.name}</h4>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-[#1447E6] font-semibold border border-blue-100">
                              {selectedCustomer.tag}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 truncate">{selectedCustomer.phone}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedCustomer({
                            name: "Walk-in Cash Customer",
                            phone: "No phone recorded",
                            tag: "Regular",
                            balance: 0,
                            credit_limit: 0,
                          });
                          showToast("Switched to Walk-in Customer");
                        }}
                        className="shrink-0 py-1 px-2 text-[#1447E6] hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1 font-semibold text-xs"
                      >
                        <span className="material-symbols-outlined text-base">swap_horiz</span>
                        <span>Change</span>
                      </button>
                    </div>
                  </div>

                  {/* Total Payable Hero Card */}
                  <div className="mb-4">
                    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col items-center justify-center text-center relative overflow-hidden">
                      <span className="text-xs text-slate-500 tracking-wider uppercase font-semibold">
                        Total Payable
                      </span>
                      <div className="flex items-baseline justify-center gap-1.5 mt-1">
                        <span className="text-lg text-[#1447E6] font-extrabold">PKR</span>
                        <span className="text-3xl text-slate-900 font-extrabold tracking-tight tabular-nums">
                          {totalAmount.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#1447E6] bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full font-bold">
                          <span className="material-symbols-outlined text-[13px]">check_circle</span>
                          GST Included
                        </span>
                        <span className="text-[11px] text-slate-500">Round-off applied</span>
                      </div>
                    </div>
                  </div>

                  {/* 4-Way Payment Method Selector */}
                  <div className="mb-4">
                    <label className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block mb-2">
                      SELECT PAYMENT METHOD
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("cash")}
                        className={`p-3 rounded-xl shadow-xs flex items-center gap-2.5 transition-all text-left border ${
                          paymentMethod === "cash"
                            ? "bg-[#1447E6] text-white border-[#1447E6]"
                            : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${paymentMethod === "cash" ? "bg-white/20 text-white" : "bg-slate-100 text-[#1447E6]"}`}>
                          <span className="material-symbols-outlined text-lg">payments</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold leading-tight">Cash</p>
                          <p className={`text-[10px] truncate ${paymentMethod === "cash" ? "text-white/80" : "text-slate-500"}`}>
                            Tender &amp; Change
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod("qr")}
                        className={`p-3 rounded-xl shadow-xs flex items-center gap-2.5 transition-all text-left border ${
                          paymentMethod === "qr"
                            ? "bg-[#1447E6] text-white border-[#1447E6]"
                            : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${paymentMethod === "qr" ? "bg-white/20 text-white" : "bg-slate-100 text-[#1447E6]"}`}>
                          <span className="material-symbols-outlined text-lg">qr_code_2</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold leading-tight">Raast / Wallets</p>
                          <p className={`text-[10px] truncate ${paymentMethod === "qr" ? "text-white/80" : "text-slate-500"}`}>
                            Easypaisa/JazzCash
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod("udhaar")}
                        className={`p-3 rounded-xl shadow-xs flex items-center gap-2.5 transition-all text-left border ${
                          paymentMethod === "udhaar"
                            ? "bg-[#1447E6] text-white border-[#1447E6]"
                            : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${paymentMethod === "udhaar" ? "bg-white/20 text-white" : "bg-slate-100 text-[#1447E6]"}`}>
                          <span className="material-symbols-outlined text-lg">menu_book</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold leading-tight">Udhaar Khata</p>
                          <p className={`text-[10px] truncate ${paymentMethod === "udhaar" ? "text-white/80" : "text-slate-500"}`}>
                            Customer Ledger
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod("card")}
                        className={`p-3 rounded-xl shadow-xs flex items-center gap-2.5 transition-all text-left border ${
                          paymentMethod === "card"
                            ? "bg-[#1447E6] text-white border-[#1447E6]"
                            : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${paymentMethod === "card" ? "bg-white/20 text-white" : "bg-slate-100 text-[#1447E6]"}`}>
                          <span className="material-symbols-outlined text-lg">credit_card</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold leading-tight">Card POS</p>
                          <p className={`text-[10px] truncate ${paymentMethod === "card" ? "text-white/80" : "text-slate-500"}`}>
                            Debit / Credit POS
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Conditional Panel 1: Cash Calculator Panel */}
                  {paymentMethod === "cash" && (
                    <div className="mb-4">
                      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                            QUICK CASH TENDERED
                          </label>
                          <span className="text-xs text-[#1447E6] font-bold">Tap to Calculate</span>
                        </div>
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 no-scrollbar">
                          {[totalAmount, totalAmount + 50, 1000, 2000, 5000].map((amt) => (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => setCashTendered(amt)}
                              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold border active:scale-95 transition-all ${
                                cashTendered === amt
                                  ? "bg-[#1447E6] text-white border-[#1447E6] shadow-xs"
                                  : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                              }`}
                            >
                              {amt === totalAmount ? `Exact (${amt.toLocaleString()})` : amt.toLocaleString()}
                            </button>
                          ))}
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-100">
                          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                            <label className="text-xs text-slate-500 block uppercase font-medium">
                              Cash Received
                            </label>
                            <div className="flex items-center mt-1">
                              <span className="text-xs text-slate-400 font-bold mr-1">PKR</span>
                              <input
                                type="number"
                                value={cashTendered || ""}
                                onChange={(e) => setCashTendered(Number(e.target.value))}
                                className="w-full bg-transparent text-lg text-slate-900 font-extrabold focus:outline-none tabular-nums"
                              />
                            </div>
                          </div>

                          <div className="bg-blue-50/70 border border-blue-100 rounded-lg p-2.5 flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-[#1447E6] font-bold uppercase">Change Due</span>
                              <span className="material-symbols-outlined text-[#1447E6] text-sm">price_check</span>
                            </div>
                            <div className="flex items-baseline mt-1">
                              <span className="text-xs text-[#1447E6] font-bold mr-1">PKR</span>
                              <span className="text-lg text-[#1447E6] font-extrabold tabular-nums">
                                {Math.max(0, cashTendered - totalAmount).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Conditional Panel 2: Raast Instant P2G QR */}
                  {paymentMethod === "qr" && (
                    <div className="mb-4">
                      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col items-center text-center">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs bg-[#1447E6] text-white px-2 py-0.5 rounded-full font-bold">
                            Raast Instant P2G
                          </span>
                          <span className="text-xs bg-blue-50 text-[#1447E6] border border-blue-100 px-2 py-0.5 rounded-full font-bold">
                            JazzCash / Easypaisa
                          </span>
                        </div>
                        <div className="w-40 h-40 p-2 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center mb-2">
                          <svg className="w-full h-full text-slate-900" viewBox="0 0 100 100" fill="none" stroke="currentColor">
                            <rect x="5" y="5" width="26" height="26" rx="4" strokeWidth="4"></rect>
                            <rect x="11" y="11" width="14" height="14" fill="currentColor"></rect>
                            <rect x="69" y="5" width="26" height="26" rx="4" strokeWidth="4"></rect>
                            <rect x="75" y="11" width="14" height="14" fill="currentColor"></rect>
                            <rect x="5" y="69" width="26" height="26" rx="4" strokeWidth="4"></rect>
                            <rect x="11" y="75" width="14" height="14" fill="currentColor"></rect>
                            <circle cx="50" cy="50" r="10" fill="#1447E6"></circle>
                            <path d="M42 20h16M50 12v16M20 42h8M20 58h8M36 36h10v10H36zM54 54h14v10H54zM72 40h12M40 74h8M40 86h16M72 72h12v14H72z" strokeWidth="4" strokeLinecap="round"></path>
                          </svg>
                        </div>
                        <p className="text-xs font-semibold text-slate-900">Scan with any Pakistani Banking App</p>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">IBAN: PK92MEZN00010012345678</p>
                      </div>
                    </div>
                  )}

                  {/* Conditional Panel 3: Udhaar Info */}
                  {paymentMethod === "udhaar" && (
                    <div className="mb-4">
                      <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-slate-900">{selectedCustomer.name}&apos;s Khata</span>
                          <span className="text-xs text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full font-bold">
                            Outstanding: PKR {selectedCustomer.balance.toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mb-2">
                          Adding PKR {totalAmount.toLocaleString()} brings total balance to{" "}
                          <span className="font-semibold text-rose-600">
                            PKR {(selectedCustomer.balance + totalAmount).toLocaleString()}
                          </span>. Credit limit: PKR {selectedCustomer.credit_limit.toLocaleString()}.
                        </p>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-[#1447E6] h-full rounded-full"
                            style={{ width: `${Math.min(100, ((selectedCustomer.balance + totalAmount) / selectedCustomer.credit_limit) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Conditional Panel 4: Card POS */}
                  {paymentMethod === "card" && (
                    <div className="mb-4">
                      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 text-[#1447E6] flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-xl">credit_card</span>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">External POS Terminal Ready</p>
                          <p className="text-[11px] text-slate-500">Insert or tap customer debit/credit card on machine.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Print Receipt & WhatsApp Toggles */}
                  <div className="mb-4 space-y-2">
                    <div
                      onClick={() => setIsPrintingThermal(!isPrintingThermal)}
                      className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-50 text-[#1447E6] border border-blue-100 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-lg">receipt_long</span>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-900">Print 58mm Thermal Receipt</p>
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#1447E6]"></span>
                            <p className="text-[11px] text-slate-500">Connected via Bluetooth MPT-II</p>
                          </div>
                        </div>
                      </div>
                      <div className={`w-11 h-6 rounded-full relative transition-colors duration-200 shrink-0 ${isPrintingThermal ? "bg-[#1447E6]" : "bg-slate-300"}`}>
                        <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform duration-200 ${isPrintingThermal ? "right-0.5" : "left-0.5"}`} />
                      </div>
                    </div>

                    <div
                      onClick={() => setIsSendingWhatsApp(!isSendingWhatsApp)}
                      className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-50 text-[#1447E6] border border-blue-100 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-lg">chat</span>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-900">Send WhatsApp E-Receipt</p>
                          <p className="text-[11px] text-slate-500">To {selectedCustomer.phone}</p>
                        </div>
                      </div>
                      <div className={`w-11 h-6 rounded-full relative transition-colors duration-200 shrink-0 ${isSendingWhatsApp ? "bg-[#1447E6]" : "bg-slate-300"}`}>
                        <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform duration-200 ${isSendingWhatsApp ? "right-0.5" : "left-0.5"}`} />
                      </div>
                    </div>
                  </div>

                  {/* Pre-Print Slip Preview & Finalize Controls */}
                  <div className="space-y-2.5">
                    {/* Dedicated Preview Slip Button */}
                    <button
                      type="button"
                      onClick={handleOpenSlipPreview}
                      className="w-full h-11 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#1447E6] border border-blue-200 text-xs font-bold active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                    >
                      <span className="material-symbols-outlined text-base">visibility</span>
                      <span>Preview Receipt Slip (58mm / 80mm Roll)</span>
                    </button>

                    {/* Auto-Preview Toggle Option */}
                    <div
                      onClick={() => setAlwaysPreviewSlip(!alwaysPreviewSlip)}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 text-xs cursor-pointer select-none transition-colors hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-base text-[#1447E6]">receipt</span>
                        <span className="text-slate-700 font-medium">Auto-open slip preview before printing</span>
                      </div>
                      <div className={`w-9 h-5 rounded-full relative transition-colors duration-200 shrink-0 ${alwaysPreviewSlip ? "bg-[#1447E6]" : "bg-slate-300"}`}>
                        <div className={`w-4 h-4 bg-white rounded-full shadow absolute top-0.5 transition-transform duration-200 ${alwaysPreviewSlip ? "right-0.5" : "left-0.5"}`} />
                      </div>
                    </div>

                    {/* Complete Sale Action Button */}
                    <button
                      type="button"
                      id="submit-sale-btn"
                      disabled={isSubmittingSale}
                      onClick={() => {
                        if (alwaysPreviewSlip) {
                          handleOpenSlipPreview();
                        } else {
                          executeSaleTransaction();
                        }
                      }}
                      className="w-full h-14 rounded-xl bg-[#1447E6] text-white text-sm font-bold shadow-[0_4px_16px_rgba(20,71,230,0.35)] hover:bg-[#0F3BC4] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isSubmittingSale ? (
                        <>
                          <span className="material-symbols-outlined animate-spin text-xl">sync</span>
                          <span>Printing 58mm Slip &amp; Finalizing...</span>
                        </>
                      ) : saleSuccessMessage ? (
                        <>
                          <span className="material-symbols-outlined text-xl">check</span>
                          <span>{saleSuccessMessage}</span>
                        </>
                      ) : alwaysPreviewSlip ? (
                        <>
                          <span className="material-symbols-outlined text-xl">preview</span>
                          <span>REVIEW SLIP &amp; PAY (PKR {totalAmount.toLocaleString()})</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-xl">check_circle</span>
                          <span>COMPLETE SALE &amp; PRINT (PKR {totalAmount.toLocaleString()})</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center justify-center gap-2 mt-2">
                      <span className="material-symbols-outlined text-slate-400 text-[14px]">bolt</span>
                      <span className="text-[11px] text-slate-400">
                        {alwaysPreviewSlip ? "Review slip popup will display before printer fires" : "Tap 'Preview Receipt Slip' to inspect receipt layout first"}
                      </span>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* TAILOR STITCHING MEASUREMENTS & BOOKING MODAL (Template D) */}
            {/* ========================================================= */}
            {isBookingModalOpen && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end sm:justify-center sm:items-center sm:p-4">
                <div className="w-full sm:max-w-xl max-h-[92vh] overflow-y-auto no-scrollbar bg-[#F8FAFC] rounded-t-3xl sm:rounded-3xl border-t sm:border border-indigo-200 p-4 pb-safe animate-in slide-in-from-bottom duration-200">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                        <span className="material-symbols-outlined text-lg">straighten</span>
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">Stitching Booking &amp; Measurements</h3>
                        <p className="text-[11px] text-slate-500">Master Tailor &bull; Customer Job Record</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsBookingModalOpen(false)}
                      className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">close</span>
                    </button>
                  </div>

                  <form onSubmit={handleRecordStitchingBooking} className="space-y-3.5 pt-3 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Customer Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Tariq Mehmood"
                          value={newBooking.customerName}
                          onChange={(e) => setNewBooking({ ...newBooking, customerName: e.target.value })}
                          className="w-full h-9 bg-white border border-slate-200 rounded-xl px-2.5 text-xs font-semibold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Phone / WhatsApp *</label>
                        <input
                          type="text"
                          required
                          placeholder="0300-1234567"
                          value={newBooking.phone}
                          onChange={(e) => setNewBooking({ ...newBooking, phone: e.target.value })}
                          className="w-full h-9 bg-white border border-slate-200 rounded-xl px-2.5 text-xs font-mono font-semibold text-slate-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Suit Style &amp; Cut</label>
                      <select
                        value={newBooking.suitType}
                        onChange={(e) => setNewBooking({ ...newBooking, suitType: e.target.value })}
                        className="w-full h-9 bg-white border border-slate-200 rounded-xl px-2.5 text-xs font-bold text-slate-900"
                      >
                        <option value="Shalwar Kameez (Standard Stitching)">Shalwar Kameez (Standard Stitching)</option>
                        <option value="Kurta Pajama (Collar & Cuff)">Kurta Pajama (Collar &amp; Cuff)</option>
                        <option value="Safari Suit / Waistcoat">Safari Suit / Waistcoat</option>
                        <option value="Sherwani / Fancy Designer Cut">Sherwani / Fancy Designer Cut</option>
                      </select>
                    </div>

                    {/* Measurements Bento Grid */}
                    <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-2xl space-y-2">
                      <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider block">
                        MEASUREMENTS (INCHES):
                      </span>
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <label className="text-[9px] text-slate-500 font-bold block">Length (Lambai)</label>
                          <input
                            type="number"
                            step="0.5"
                            value={newBooking.length}
                            onChange={(e) => setNewBooking({ ...newBooking, length: Number(e.target.value) })}
                            className="w-full h-8 bg-white border border-indigo-200 rounded-lg px-2 text-xs font-bold text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-500 font-bold block">Chest (Chhati)</label>
                          <input
                            type="number"
                            step="0.5"
                            value={newBooking.chest}
                            onChange={(e) => setNewBooking({ ...newBooking, chest: Number(e.target.value) })}
                            className="w-full h-8 bg-white border border-indigo-200 rounded-lg px-2 text-xs font-bold text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-500 font-bold block">Waist (Kamar)</label>
                          <input
                            type="number"
                            step="0.5"
                            value={newBooking.waist}
                            onChange={(e) => setNewBooking({ ...newBooking, waist: Number(e.target.value) })}
                            className="w-full h-8 bg-white border border-indigo-200 rounded-lg px-2 text-xs font-bold text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-500 font-bold block">Collar (Gala)</label>
                          <input
                            type="number"
                            step="0.5"
                            value={newBooking.collar}
                            onChange={(e) => setNewBooking({ ...newBooking, collar: Number(e.target.value) })}
                            className="w-full h-8 bg-white border border-indigo-200 rounded-lg px-2 text-xs font-bold text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-500 font-bold block">Tera (Shoulder)</label>
                          <input
                            type="number"
                            step="0.5"
                            value={newBooking.tera}
                            onChange={(e) => setNewBooking({ ...newBooking, tera: Number(e.target.value) })}
                            className="w-full h-8 bg-white border border-indigo-200 rounded-lg px-2 text-xs font-bold text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-500 font-bold block">Sleeves (Aastin)</label>
                          <input
                            type="number"
                            step="0.5"
                            value={newBooking.sleeves}
                            onChange={(e) => setNewBooking({ ...newBooking, sleeves: Number(e.target.value) })}
                            className="w-full h-8 bg-white border border-indigo-200 rounded-lg px-2 text-xs font-bold text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-500 font-bold block">Shalwar Length</label>
                          <input
                            type="number"
                            step="0.5"
                            value={newBooking.shalwar}
                            onChange={(e) => setNewBooking({ ...newBooking, shalwar: Number(e.target.value) })}
                            className="w-full h-8 bg-white border border-indigo-200 rounded-lg px-2 text-xs font-bold text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-500 font-bold block">Ghera / Paincha</label>
                          <input
                            type="number"
                            step="0.5"
                            value={newBooking.ghera}
                            onChange={(e) => setNewBooking({ ...newBooking, ghera: Number(e.target.value) })}
                            className="w-full h-8 bg-white border border-indigo-200 rounded-lg px-2 text-xs font-bold text-slate-900"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Promised Delivery Date</label>
                        <input
                          type="date"
                          value={newBooking.deliveryDate}
                          onChange={(e) => setNewBooking({ ...newBooking, deliveryDate: e.target.value })}
                          className="w-full h-9 bg-white border border-slate-200 rounded-xl px-2 text-xs font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Assigned Karigar</label>
                        <select
                          value={newBooking.workerAssigned}
                          onChange={(e) => setNewBooking({ ...newBooking, workerAssigned: e.target.value })}
                          className="w-full h-9 bg-white border border-slate-200 rounded-xl px-2 text-xs font-bold text-slate-900"
                        >
                          <option value="Master Asif (Cutter)">Master Asif (Cutter)</option>
                          <option value="Sajid Karigar">Sajid Karigar</option>
                          <option value="Akram Tailor">Akram Tailor</option>
                        </select>
                      </div>
                    </div>

                    {/* Financial Advance vs Balance Due */}
                    <div className="p-3 bg-white border border-slate-200 rounded-2xl space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Total Stitching Rate (PKR)</label>
                          <input
                            type="number"
                            required
                            value={newBooking.totalAmount}
                            onChange={(e) => setNewBooking({ ...newBooking, totalAmount: Number(e.target.value) })}
                            className="w-full h-9 bg-slate-50 border border-slate-200 rounded-xl px-2.5 text-xs font-black text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Advance Deposit (PKR)</label>
                          <input
                            type="number"
                            required
                            value={newBooking.advancePaid}
                            onChange={(e) => setNewBooking({ ...newBooking, advancePaid: Number(e.target.value) })}
                            className="w-full h-9 bg-slate-50 border border-slate-200 rounded-xl px-2.5 text-xs font-black text-emerald-600"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                        <span className="text-slate-500">Remaining Balance on Delivery:</span>
                        <span className="font-black text-rose-600">
                          PKR {Math.max(0, newBooking.totalAmount - newBooking.advancePaid).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">check</span>
                      <span>Save Booking &amp; Add Advance (PKR {newBooking.advancePaid}) to Bill</span>
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* INSTANT BUSINESS TEMPLATE SWITCHER MODAL                  */}
            {/* ========================================================= */}
            {isStoreSwitcherOpen && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end sm:justify-center sm:items-center sm:p-4">
                <div className="w-full sm:max-w-xl max-h-[92vh] overflow-y-auto no-scrollbar bg-[#F8FAFC] rounded-t-3xl sm:rounded-3xl border-t sm:border border-slate-200 p-4 pb-safe animate-in slide-in-from-bottom duration-200">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-[#1447E6] flex items-center justify-center text-white">
                        <span className="material-symbols-outlined text-lg">swap_horiz</span>
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">Switch Business Template</h3>
                        <p className="text-[11px] text-slate-500">
                          One Reusable Core &bull; Configuration-Driven Templates
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsStoreSwitcherOpen(false)}
                      className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">close</span>
                    </button>
                  </div>

                  <p className="text-xs text-slate-500 py-2.5">
                    Select any template to see the register dynamically adapt its features, scale widgets, portion controls, and bottom tabs:
                  </p>

                  <div className="space-y-2">
                    {availableStores.map((shop) => {
                      const cfg = getTemplateConfig(shop.template_type);
                      const isCurrent = activeStore?.id === shop.id;
                      return (
                        <div
                          key={shop.id}
                          onClick={() => {
                            handleQuickDemoStoreSelect(shop);
                            setIsStoreSwitcherOpen(false);
                          }}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                            isCurrent
                              ? "bg-blue-50/80 border-[#1447E6] shadow-sm"
                              : "bg-white border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="text-xs font-black text-slate-900">{shop.name}</h4>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.badgeColor}`}>
                                {cfg.badgeLabel}
                              </span>
                              {isCurrent && (
                                <span className="text-[10px] font-bold text-white bg-[#1447E6] px-1.5 py-0.2 rounded">
                                  ACTIVE
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{cfg.tagline}</p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                              Store Code: {shop.store_code} &bull; PIN: {shop.login_pin}
                            </p>
                          </div>
                          <span className="material-symbols-outlined text-slate-400 text-lg shrink-0 ml-2">
                            chevron_right
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* STANDARD 7: STAFF & COMMISSION MODALS                     */}
            {/* ========================================================= */}

            {/* MODAL 1: SETTLEMENT PAYOUT MODAL */}
            {activeWorkerModal === "settle" && selectedCommissionWorker && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end">
                <div className="w-full max-h-[92vh] overflow-y-auto no-scrollbar bg-[#F8FAFC] rounded-t-3xl border-t border-slate-200 p-4 pb-safe animate-in slide-in-from-bottom duration-200">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                        <span className="material-symbols-outlined text-base">payments</span>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Settle Commission Payout</h3>
                        <p className="text-[10px] text-slate-500">
                          {selectedCommissionWorker.name} ({selectedCommissionWorker.role})
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveWorkerModal(null)}
                      className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">close</span>
                    </button>
                  </div>

                  <form onSubmit={handleExecuteSettlement} className="py-3 space-y-3 text-xs">
                    {/* Settlement Type */}
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-1 uppercase">Settlement Category</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { id: "commission", label: "Commission Only" },
                          { id: "salary_plus_commission", label: "Salary + Commission" },
                          { id: "salary", label: "Salary Only" },
                          { id: "adjustment", label: "Advance Adjustment" },
                        ].map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setSettleType(t.id as any)}
                            className={`p-2 rounded-xl border text-[11px] font-bold text-center transition-all ${
                              settleType === t.id
                                ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                                : "bg-white border-slate-200 text-slate-600"
                            }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Amount & Advance Deduction */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold block mb-1">
                          Amount to Pay (PKR)
                        </label>
                        <input
                          type="number"
                          required
                          value={settleAmount}
                          onChange={(e) => setSettleAmount(Number(e.target.value))}
                          className="w-full h-9 bg-white border border-slate-200 rounded-xl px-2.5 font-mono font-bold text-slate-900 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold block mb-1">
                          Advance Deducted (PKR)
                        </label>
                        <input
                          type="number"
                          value={settleAdvanceDeduction}
                          onChange={(e) => setSettleAdvanceDeduction(Number(e.target.value))}
                          className="w-full h-9 bg-white border border-slate-200 rounded-xl px-2.5 font-mono font-bold text-amber-600 text-xs"
                        />
                      </div>
                    </div>

                    {/* Payment Method Selector */}
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-1 uppercase">
                        Disbursement Method
                      </label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { id: "easypaisa", label: "EasyPaisa", icon: "phone_android" },
                          { id: "jazzcash", label: "JazzCash", icon: "contactless" },
                          { id: "cash", label: "Cash Voucher", icon: "local_atm" },
                          { id: "bank_transfer", label: "Bank 1LINK", icon: "account_balance" },
                        ].map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setSettleMethod(m.id as any)}
                            className={`p-2 rounded-xl border flex flex-col items-center justify-center text-[10px] font-bold transition-all ${
                              settleMethod === m.id
                                ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs"
                                : "bg-white border-slate-200 text-slate-600"
                            }`}
                          >
                            <span className="material-symbols-outlined text-base mb-0.5">{m.icon}</span>
                            <span className="truncate max-w-[65px]">{m.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Reference / TRX ID */}
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-1">
                        TRX Reference / Mobile Receipt ID
                      </label>
                      <input
                        placeholder="e.g. EP-982173491 or Cash Voucher #12"
                        value={settleReference}
                        onChange={(e) => setSettleReference(e.target.value)}
                        className="w-full h-9 bg-white border border-slate-200 rounded-xl px-2.5 text-xs text-slate-900"
                      />
                    </div>

                    {/* Financial Summary Bento */}
                    <div className="p-3 bg-slate-100 rounded-2xl border border-slate-200 space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Gross Payout:</span>
                        <span className="font-mono font-bold">PKR {settleAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-amber-700">
                        <span>Advance Deducted:</span>
                        <span className="font-mono font-bold">-PKR {settleAdvanceDeduction.toLocaleString()}</span>
                      </div>
                      <div className="pt-1.5 border-t border-slate-200 flex justify-between text-slate-900 font-black text-sm">
                        <span>Net Paid to Worker:</span>
                        <span className="text-emerald-600 font-mono">
                          PKR {Math.max(0, settleAmount - settleAdvanceDeduction).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setActiveWorkerModal(null)}
                        className="flex-1 h-10 bg-slate-100 hover:bg-slate-200 font-bold rounded-xl text-slate-700 text-xs transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 font-bold rounded-xl text-white text-xs shadow-xs active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-sm">verified</span>
                        <span>Confirm Payout</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* MODAL 2: OFFICIAL SETTLEMENT RECEIPT VOUCHER */}
            {activeWorkerModal === "receipt" && lastCompletedSettlement && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end">
                <div className="w-full max-h-[92vh] overflow-y-auto no-scrollbar bg-white rounded-t-3xl border-t border-slate-200 p-4 pb-safe animate-in slide-in-from-bottom duration-200">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <span className="text-xs font-bold text-slate-400 font-mono">
                      OFFICIAL DISBURSEMENT RECEIPT
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveWorkerModal(null)}
                      className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">close</span>
                    </button>
                  </div>

                  {/* Thermal Slip Style Content */}
                  <div className="py-4 px-2 space-y-3 font-mono text-xs">
                    <div className="text-center space-y-0.5 border-b border-dashed border-slate-300 pb-3">
                      <h3 className="font-extrabold text-sm text-slate-900 tracking-tight">
                        {activeStore?.name || "QUICK-POS STORE"}
                      </h3>
                      <p className="text-[10px] text-slate-500">Worker Commission Settlement Voucher</p>
                      <span className="inline-block mt-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold">
                        Voucher #{lastCompletedSettlement.receiptNumber}
                      </span>
                    </div>

                    <div className="space-y-1 text-[11px] text-slate-700 border-b border-dashed border-slate-300 pb-3">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Worker Name:</span>
                        <span className="font-bold">{lastCompletedSettlement.workerName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Date &amp; Time:</span>
                        <span>{new Date(lastCompletedSettlement.settledAt).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Payment Mode:</span>
                        <span className="uppercase font-bold text-emerald-600">{lastCompletedSettlement.paymentMethod}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Reference TRX:</span>
                        <span className="truncate max-w-[170px]">{lastCompletedSettlement.paymentReference}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Settled By:</span>
                        <span>{lastCompletedSettlement.settledBy}</span>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs border-b border-dashed border-slate-300 pb-3">
                      <div className="flex justify-between text-slate-600">
                        <span>Commission Paid:</span>
                        <span className="font-bold">PKR {lastCompletedSettlement.commissionPaid.toLocaleString()}</span>
                      </div>
                      {lastCompletedSettlement.advanceDeducted > 0 && (
                        <div className="flex justify-between text-amber-600">
                          <span>Advance Deducted:</span>
                          <span className="font-bold">-PKR {lastCompletedSettlement.advanceDeducted.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-slate-900 font-extrabold text-sm pt-1">
                        <span>NET AMOUNT PAID:</span>
                        <span className="text-emerald-600 font-black">
                          PKR {lastCompletedSettlement.totalPaid.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-400 space-y-0.5 pb-2">
                      <p>Covered Commission Entries: {lastCompletedSettlement.coveredEntryIds.length} orders settled</p>
                      <p>Remaining Pending Balance: PKR {lastCompletedSettlement.remainingPendingBalance.toLocaleString()}</p>
                    </div>

                    {/* Dual Signatures */}
                    <div className="grid grid-cols-2 gap-4 pt-4 text-center text-[10px] text-slate-500">
                      <div className="border-t border-slate-400 pt-1">
                        <span>Owner / Cashier</span>
                      </div>
                      <div className="border-t border-slate-400 pt-1">
                        <span>Worker Acceptance</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        showToast(`Printed voucher ${lastCompletedSettlement.receiptNumber}`);
                        setActiveWorkerModal(null);
                      }}
                      className="flex-1 h-10 bg-[#1447E6] hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">print</span>
                      <span>Print Thermal Slip</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveWorkerModal(null)}
                      className="h-10 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* MODAL 3: ORIGINATING SALES ENTRIES AUDIT MODAL */}
            {activeWorkerModal === "entries" && selectedCommissionWorker && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end">
                <div className="w-full max-h-[92vh] overflow-y-auto no-scrollbar bg-[#F8FAFC] rounded-t-3xl border-t border-slate-200 p-4 pb-safe animate-in slide-in-from-bottom duration-200">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[#1447E6] text-base">receipt</span>
                        <span>Commission Entries Ledger</span>
                      </h3>
                      <p className="text-[10px] text-slate-500">
                        {selectedCommissionWorker.name} &bull; Originating sale references &amp; policies
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveWorkerModal(null)}
                      className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">close</span>
                    </button>
                  </div>

                  <div className="py-3 space-y-2">
                    {commissionEntries.filter((e) => e.workerId === selectedCommissionWorker.id).length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-xs">
                        No commission entries recorded yet for this worker.
                      </div>
                    ) : (
                      commissionEntries
                        .filter((e) => e.workerId === selectedCommissionWorker.id)
                        .map((entry) => (
                          <div
                            key={entry.id}
                            className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs space-y-1.5 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-extrabold text-[#1447E6] bg-blue-50 px-2 py-0.5 rounded text-[10px] border border-blue-100">
                                Ref: {entry.originatingSaleId}
                              </span>
                              <div className="flex items-center gap-1">
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${
                                    entry.entryType === "refund_clawback"
                                      ? "bg-rose-50 text-rose-700 border-rose-200"
                                      : entry.entryType === "target_bonus"
                                      ? "bg-purple-50 text-purple-700 border-purple-200"
                                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  }`}
                                >
                                  {entry.entryType.toUpperCase().replace("_", " ")}
                                </span>
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${
                                    entry.status === "settled"
                                      ? "bg-slate-100 text-slate-600 border-slate-300"
                                      : "bg-amber-50 text-amber-700 border-amber-200"
                                  }`}
                                >
                                  {entry.status.toUpperCase()}
                                </span>
                              </div>
                            </div>

                            <p className="text-[11px] font-bold text-slate-800">{entry.ruleName}</p>

                            <div className="grid grid-cols-3 gap-1.5 py-1 text-center bg-slate-50 rounded-lg text-[10px] font-mono">
                              <div>
                                <span className="text-slate-400 block text-[9px]">ORDER BILL</span>
                                <span className="font-bold text-slate-800">PKR {entry.grossAmount.toLocaleString()}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[9px]">ELIGIBLE</span>
                                <span className="font-bold text-slate-800">PKR {entry.eligibleAmount.toLocaleString()}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[9px]">COMMISSION</span>
                                <span
                                  className={`font-black ${
                                    entry.commissionAmount < 0 ? "text-rose-600" : "text-emerald-600"
                                  }`}
                                >
                                  {entry.commissionAmount < 0 ? "-" : "+"}PKR {Math.abs(entry.commissionAmount).toLocaleString()}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                              <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
                              {entry.settlementId && (
                                <span className="text-slate-500 font-mono">Settlement: {entry.settlementId}</span>
                              )}
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* MODAL 4: REFUND CLAWBACK ADJUSTMENT MODAL */}
            {activeWorkerModal === "clawback" && selectedCommissionWorker && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end">
                <div className="w-full max-h-[92vh] overflow-y-auto no-scrollbar bg-[#F8FAFC] rounded-t-3xl border-t border-slate-200 p-4 pb-safe animate-in slide-in-from-bottom duration-200">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-rose-600 flex items-center justify-center text-white">
                        <span className="material-symbols-outlined text-base">remove_circle</span>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Record Return / Refund Clawback</h3>
                        <p className="text-[10px] text-slate-500">
                          Reverses commission referencing original sale ID without altering history
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveWorkerModal(null)}
                      className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">close</span>
                    </button>
                  </div>

                  <form onSubmit={handleExecuteClawback} className="py-3 space-y-3 text-xs">
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-1">
                        Originating Sale / Receipt Number
                      </label>
                      <input
                        required
                        placeholder="e.g. REC-1082 or ST-101"
                        value={clawbackSaleId}
                        onChange={(e) => setClawbackSaleId(e.target.value)}
                        className="w-full h-9 bg-white border border-slate-200 rounded-xl px-2.5 font-mono text-xs text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-1">
                        Refund / Returned Item Amount (PKR)
                      </label>
                      <input
                        type="number"
                        required
                        value={clawbackAmount}
                        onChange={(e) => setClawbackAmount(Number(e.target.value))}
                        className="w-full h-9 bg-white border border-slate-200 rounded-xl px-2.5 font-mono font-bold text-slate-900 text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-1">
                        Reason for Return / Adjustment
                      </label>
                      <input
                        required
                        placeholder="e.g. Customer returned damaged fabric / stitching fit issue"
                        value={clawbackReason}
                        onChange={(e) => setClawbackReason(e.target.value)}
                        className="w-full h-9 bg-white border border-slate-200 rounded-xl px-2.5 text-xs text-slate-900"
                      />
                    </div>

                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800 space-y-1">
                      <span className="font-bold block">Audit Trail Policy Compliance:</span>
                      <p>
                        A negative adjustment entry will be appended to {selectedCommissionWorker.name}&apos;s ledger. Past financial entries are preserved immutably.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setActiveWorkerModal(null)}
                        className="flex-1 h-10 bg-slate-100 hover:bg-slate-200 font-bold rounded-xl text-slate-700 text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 h-10 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-xs active:scale-95 cursor-pointer"
                      >
                        Record Clawback
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* MODAL 5: COMMISSION RULES POLICY INSPECTOR MODAL */}
            {activeWorkerModal === "rules" && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end">
                <div className="w-full max-h-[92vh] overflow-y-auto no-scrollbar bg-[#F8FAFC] rounded-t-3xl border-t border-slate-200 p-4 pb-safe animate-in slide-in-from-bottom duration-200">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#1447E6] flex items-center justify-center text-white">
                        <span className="material-symbols-outlined text-base">policy</span>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Commission Rules &amp; Policies</h3>
                        <p className="text-[10px] text-slate-500">
                          7 Configuration-driven methods and financial rules
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveWorkerModal(null)}
                      className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">close</span>
                    </button>
                  </div>

                  <div className="py-3 space-y-2.5 text-xs">
                    {commissionRules.map((rule) => (
                      <div
                        key={rule.id}
                        className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-extrabold text-slate-900 text-xs">{rule.name}</h4>
                          <span className="font-bold text-[#1447E6] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full text-[10px]">
                            {rule.method.replace(/_/g, " ").toUpperCase()}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">{rule.description}</p>

                        {/* Explicit Financial Policies */}
                        <div className="pt-1.5 border-t border-slate-100 grid grid-cols-2 gap-1.5 text-[10px]">
                          <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px] text-emerald-600">
                              {rule.policies.deduct_discounts ? "check_circle" : "cancel"}
                            </span>
                            <span className="text-slate-600">Deduct Discounts: {rule.policies.deduct_discounts ? "YES" : "NO"}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px] text-emerald-600">
                              {rule.policies.allow_credit_sales ? "check_circle" : "cancel"}
                            </span>
                            <span className="text-slate-600">Credit Sales Allowed: {rule.policies.allow_credit_sales ? "YES" : "NO"}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px] text-emerald-600">
                              {rule.policies.refund_clawback ? "check_circle" : "cancel"}
                            </span>
                            <span className="text-slate-600">Refund Clawback: {rule.policies.refund_clawback ? "YES" : "NO"}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px] text-emerald-600">
                              {rule.policies.split_enabled ? "check_circle" : "cancel"}
                            </span>
                            <span className="text-slate-600">Split Commission: {rule.policies.split_enabled ? "YES" : "NO"}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* MODAL 6: SETTLEMENTS HISTORY MODAL */}
            {activeWorkerModal === "history" && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end">
                <div className="w-full max-h-[92vh] overflow-y-auto no-scrollbar bg-[#F8FAFC] rounded-t-3xl border-t border-slate-200 p-4 pb-safe animate-in slide-in-from-bottom duration-200">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                        <span className="material-symbols-outlined text-base">receipt_long</span>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Settlements History &amp; Audit</h3>
                        <p className="text-[10px] text-slate-500">
                          Immutable payout receipts ({commissionSettlements.length} completed)
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveWorkerModal(null)}
                      className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">close</span>
                    </button>
                  </div>

                  <div className="py-3 space-y-2 text-xs">
                    {commissionSettlements.map((set) => (
                      <div
                        key={set.id}
                        className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px]">
                            {set.receiptNumber}
                          </span>
                          <span className="text-slate-400 text-[10px]">
                            {new Date(set.settledAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <h4 className="font-extrabold text-slate-900">{set.workerName}</h4>
                          <span className="font-black text-sm text-slate-900 font-mono">
                            PKR {set.totalPaid.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                          <span className="uppercase font-bold text-emerald-600">{set.paymentMethod}</span>
                          <span className="truncate max-w-[180px]">{set.paymentReference}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* MODAL 7: ADD NEW WORKER MODAL */}
            {activeWorkerModal === "add_worker" && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end">
                <div className="w-full max-h-[92vh] overflow-y-auto no-scrollbar bg-[#F8FAFC] rounded-t-3xl border-t border-slate-200 p-4 pb-safe animate-in slide-in-from-bottom duration-200">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#1447E6] flex items-center justify-center text-white">
                        <span className="material-symbols-outlined text-base">person_add</span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900">Register New Staff / Karigar</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveWorkerModal(null)}
                      className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">close</span>
                    </button>
                  </div>

                  <form onSubmit={handleCreateNewWorker} className="py-3 space-y-3 text-xs">
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-1">Worker Name</label>
                      <input
                        required
                        placeholder="e.g. Master Asif or Ayesha Malik"
                        value={newWorkerName}
                        onChange={(e) => setNewWorkerName(e.target.value)}
                        className="w-full h-9 bg-white border border-slate-200 rounded-xl px-2.5 text-xs text-slate-900"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold block mb-1">Phone Number</label>
                        <input
                          required
                          placeholder="0300-1234567"
                          value={newWorkerPhone}
                          onChange={(e) => setNewWorkerPhone(e.target.value)}
                          className="w-full h-9 bg-white border border-slate-200 rounded-xl px-2.5 text-xs text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold block mb-1">Role / Designation</label>
                        <input
                          required
                          placeholder="e.g. Master Cutter / Sales Rep"
                          value={newWorkerRole}
                          onChange={(e) => setNewWorkerRole(e.target.value)}
                          className="w-full h-9 bg-white border border-slate-200 rounded-xl px-2.5 text-xs text-slate-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-1">Payment Structure</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: "salary_plus_commission", label: "Salary + Comm" },
                          { id: "commission_only", label: "Comm Only" },
                          { id: "fixed_salary", label: "Fixed Salary" },
                        ].map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setNewWorkerPaymentType(p.id as any)}
                            className={`p-2 rounded-xl border text-[10px] font-bold text-center transition-all ${
                              newWorkerPaymentType === p.id
                                ? "bg-blue-50 border-[#1447E6] text-[#1447E6]"
                                : "bg-white border-slate-200 text-slate-600"
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold block mb-1">Base Salary (PKR)</label>
                        <input
                          type="number"
                          value={newWorkerBaseSalary}
                          onChange={(e) => setNewWorkerBaseSalary(Number(e.target.value))}
                          className="w-full h-9 bg-white border border-slate-200 rounded-xl px-2.5 font-mono text-xs text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold block mb-1">Target Sales (PKR)</label>
                        <input
                          type="number"
                          value={newWorkerTarget}
                          onChange={(e) => setNewWorkerTarget(Number(e.target.value))}
                          className="w-full h-9 bg-white border border-slate-200 rounded-xl px-2.5 font-mono text-xs text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold block mb-1">Target Bonus (PKR)</label>
                        <input
                          type="number"
                          value={newWorkerBonus}
                          onChange={(e) => setNewWorkerBonus(Number(e.target.value))}
                          className="w-full h-9 bg-white border border-slate-200 rounded-xl px-2.5 font-mono text-xs text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setActiveWorkerModal(null)}
                        className="flex-1 h-10 bg-slate-100 hover:bg-slate-200 font-bold rounded-xl text-slate-700 text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 h-10 bg-[#1447E6] hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-xs active:scale-95 cursor-pointer"
                      >
                        Save &amp; Onboard Worker
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* STANDARD 9: OFFLINE-FIRST SYNC & QUEUE CONTROL MODAL       */}
            {/* ========================================================= */}
            {isOfflineModalOpen && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
                <div className="bg-white rounded-3xl w-full max-w-lg border border-slate-200 shadow-2xl p-5 max-h-[90vh] flex flex-col overflow-hidden">
                  
                  {/* Modal Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#1447E6] flex items-center justify-center border border-blue-200">
                        <span className="material-symbols-outlined text-xl">cloud_sync</span>
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-slate-900 leading-tight">
                          Offline Billing &amp; Queue Control
                        </h3>
                        <p className="text-[10px] text-slate-500 font-mono">
                          Primary POS: <span className="font-bold text-slate-700">{offlineSyncEngine.getDeviceId()}</span>
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsOfflineModalOpen(false)}
                      className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">close</span>
                    </button>
                  </div>

                  {/* Modal Content Scroll Area */}
                  <div className="flex-1 overflow-y-auto no-scrollbar py-3 space-y-3.5">
                    
                    {/* Bento Grid: 4 Health & Queue Metric Cards */}
                    <div className="grid grid-cols-2 xs:grid-cols-4 gap-2">
                      <div className={`p-2.5 rounded-2xl border ${
                        !isOnlineState ? "bg-amber-50/60 border-amber-200" : "bg-emerald-50/60 border-emerald-200"
                      }`}>
                        <span className="text-[9px] font-bold uppercase text-slate-500 tracking-wider block">Network</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`w-2 h-2 rounded-full ${!isOnlineState ? "bg-amber-500" : "bg-emerald-500"}`}></span>
                          <span className="text-xs font-extrabold text-slate-900">
                            {!isOnlineState ? "Offline" : "Online"}
                          </span>
                        </div>
                        <p className="text-[9px] text-slate-400 mt-0.5 truncate">
                          {isSimulatedOffline ? "Simulated test" : "Live interface"}
                        </p>
                      </div>

                      <div className="p-2.5 rounded-2xl border border-blue-200 bg-blue-50/50">
                        <span className="text-[9px] font-bold uppercase text-blue-600 tracking-wider block">Pending Queue</span>
                        <p className="text-lg font-black text-slate-900 mt-0.5 leading-none">
                          {offlineSyncEngine.getPendingCount()}
                        </p>
                        <p className="text-[9px] text-slate-500 mt-0.5">Local invoices</p>
                      </div>

                      <div className="p-2.5 rounded-2xl border border-slate-200 bg-slate-50">
                        <span className="text-[9px] font-bold uppercase text-emerald-600 tracking-wider block">Cloud Synced</span>
                        <p className="text-lg font-black text-slate-900 mt-0.5 leading-none">
                          {offlineSyncEngine.getSyncedCount()}
                        </p>
                        <p className="text-[9px] text-slate-500 mt-0.5">Firestore confirmed</p>
                      </div>

                      <div className="p-2.5 rounded-2xl border border-rose-200 bg-rose-50/50">
                        <span className="text-[9px] font-bold uppercase text-rose-600 tracking-wider block">Retrying / Fail</span>
                        <p className="text-lg font-black text-slate-900 mt-0.5 leading-none">
                          {offlineSyncEngine.getFailedCount()}
                        </p>
                        <p className="text-[9px] text-slate-500 mt-0.5">Auto-retry 15s</p>
                      </div>
                    </div>

                    {/* Action Controls & Simulator Toolbar */}
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          disabled={isSyncingState || !isOnlineState}
                          onClick={handleManualSyncNow}
                          className={`flex-1 h-9 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            isSyncingState
                              ? "bg-blue-300 text-white cursor-wait"
                              : !isOnlineState
                              ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                              : "bg-[#1447E6] hover:bg-blue-700 text-white shadow-xs"
                          }`}
                        >
                          <span className={`material-symbols-outlined text-base ${isSyncingState ? "animate-spin" : ""}`}>
                            sync
                          </span>
                          <span>{isSyncingState ? "Syncing with Cloud..." : "Sync Pending Queue Now"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleToggleSimulatedOffline}
                          className={`h-9 px-3 rounded-xl font-bold text-[11px] border flex items-center gap-1 transition-all cursor-pointer ${
                            isSimulatedOffline
                              ? "bg-amber-100 border-amber-300 text-amber-900 hover:bg-amber-200"
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <span className="material-symbols-outlined text-sm">
                            {isSimulatedOffline ? "wifi_off" : "wifi"}
                          </span>
                          <span>{isSimulatedOffline ? "Restore Real Online" : "Simulate Offline"}</span>
                        </button>
                      </div>

                      {syncFeedback && (
                        <p className="text-[11px] font-bold text-blue-700 bg-blue-100/70 border border-blue-200 px-3 py-1.5 rounded-xl text-center">
                          {syncFeedback}
                        </p>
                      )}
                    </div>

                    {/* Tab Switcher */}
                    <div className="flex items-center gap-1 border-b border-slate-200 pb-1">
                      {[
                        { id: "pending", label: `Pending (${offlineSyncEngine.getPendingCount()})`, icon: "pending_actions" },
                        { id: "synced", label: `Synced (${offlineSyncEngine.getSyncedCount()})`, icon: "check_circle" },
                        { id: "failed", label: `Failed (${offlineSyncEngine.getFailedCount()})`, icon: "error" },
                        { id: "logs", label: "Sync Logs", icon: "history" },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setOfflineQueueTab(tab.id as any)}
                          className={`flex-1 py-1.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                            offlineQueueTab === tab.id
                              ? "bg-blue-50 text-[#1447E6] border border-blue-200 shadow-xs"
                              : "text-slate-500 hover:text-slate-900"
                          }`}
                        >
                          <span className="material-symbols-outlined text-sm">{tab.icon}</span>
                          <span className="truncate">{tab.label}</span>
                        </button>
                      ))}
                    </div>

                    {/* Tab 1: Pending Queue */}
                    {offlineQueueTab === "pending" && (
                      <div className="space-y-2">
                        {offlineQueue.filter((q) => q.syncStatus === "pending" || q.syncStatus === "syncing").length === 0 ? (
                          <div className="py-8 text-center text-slate-400">
                            <span className="material-symbols-outlined text-3xl mb-1 text-slate-300">task_alt</span>
                            <p className="text-xs font-bold text-slate-600">No Pending Offline Sales</p>
                            <p className="text-[10px] text-slate-400">All local transactions have been pushed to Cloud Firestore.</p>
                          </div>
                        ) : (
                          offlineQueue
                            .filter((q) => q.syncStatus === "pending" || q.syncStatus === "syncing")
                            .map((item) => (
                              <div
                                key={item.clientTransactionId}
                                className="p-3 rounded-2xl border border-blue-200 bg-blue-50/40 space-y-1.5"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="font-extrabold text-xs text-slate-900">
                                      #{item.invoiceNumber}
                                    </span>
                                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-blue-100 text-[#1447E6] font-bold">
                                      {item.syncStatus.toUpperCase()}
                                    </span>
                                  </div>
                                  <span className="text-xs font-black text-slate-900">
                                    PKR {item.totalAmount.toLocaleString()}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-500 flex items-center justify-between">
                                  <span>{item.items.length} item(s) &bull; {item.paymentMethod.toUpperCase()}</span>
                                  <span className="font-mono text-slate-400">
                                    {new Date(item.createdLocallyAt).toLocaleTimeString()}
                                  </span>
                                </div>
                                <div className="text-[9px] font-mono text-slate-400 bg-white/80 p-1.5 rounded-lg border border-slate-100 truncate">
                                  ID: {item.clientTransactionId}
                                </div>
                              </div>
                            ))
                        )}
                      </div>
                    )}

                    {/* Tab 2: Synced History */}
                    {offlineQueueTab === "synced" && (
                      <div className="space-y-2">
                        {offlineQueue.filter((q) => q.syncStatus === "synced").length === 0 ? (
                          <div className="py-8 text-center text-slate-400">
                            <span className="material-symbols-outlined text-3xl mb-1 text-slate-300">cloud_done</span>
                            <p className="text-xs font-bold text-slate-600">No Synced Sales Recorded Yet</p>
                          </div>
                        ) : (
                          offlineQueue
                            .filter((q) => q.syncStatus === "synced")
                            .slice(0, 15)
                            .map((item) => (
                              <div
                                key={item.clientTransactionId}
                                className="p-3 rounded-2xl border border-emerald-200 bg-emerald-50/30 space-y-1.5"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="font-extrabold text-xs text-slate-900">
                                      #{item.invoiceNumber}
                                    </span>
                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                      CONFIRMED
                                    </span>
                                  </div>
                                  <span className="text-xs font-black text-emerald-700">
                                    PKR {item.totalAmount.toLocaleString()}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-500 flex items-center justify-between">
                                  <span className="font-mono text-[9px] text-slate-400 truncate max-w-[200px]">
                                    Cloud Ref: {item.serverSaleId || item.clientTransactionId.slice(-10)}
                                  </span>
                                  <span className="text-[9px] text-slate-400">
                                    {item.syncedAt ? new Date(item.syncedAt).toLocaleTimeString() : "Just now"}
                                  </span>
                                </div>
                                <div className="flex items-center justify-end gap-1.5 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const saleRecord: SaleRecord = {
                                        id: item.serverSaleId || item.clientTransactionId,
                                        client_transaction_id: item.clientTransactionId,
                                        invoice_number: item.invoiceNumber,
                                        total_amount: item.totalAmount,
                                        amount_paid: item.amountPaid,
                                        change_returned: item.changeReturned,
                                        payment_method: item.paymentMethod as any,
                                        sync_status: "synced",
                                        created_at: item.createdLocallyAt,
                                        subtotal: item.subtotal,
                                        discount_amount: item.discountAmount,
                                        tax_amount: item.taxAmount,
                                        customer_name: item.customerName,
                                        items: item.items.map(it => ({
                                          id: "item-" + it.productId,
                                          sale_id: item.serverSaleId || item.clientTransactionId,
                                          product_id: it.productId,
                                          product_name: it.productName,
                                          unit: it.unit,
                                          quantity: it.quantity,
                                          unit_price: it.unitPrice,
                                          cost_price: it.costPrice,
                                          discount: it.discount,
                                          total_price: it.totalPrice,
                                        })),
                                      };
                                      setActiveReceiptModalSale({ sale: saleRecord, isReprint: true });
                                    }}
                                    className="h-7 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                  >
                                    <span className="material-symbols-outlined text-xs">visibility</span>
                                    <span>Slip Preview</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const storeProfile: StoreProfile = {
                                        name: activeStore?.name,
                                        area: activeStore?.area,
                                        phone: activeStore?.phone,
                                        ntn: activeStore?.ntn || "Exempt",
                                        tagline: currentTemplate.name,
                                        customHeader: customHeaderNote,
                                        customFooter: customFooterNote,
                                      };
                                      showToast(`Audited Reprint: Invoice #${item.invoiceNumber}...`);
                                      await escposPrinter.printSale({
                                        id: item.serverSaleId || item.clientTransactionId,
                                        client_transaction_id: item.clientTransactionId,
                                        invoice_number: item.invoiceNumber,
                                        total_amount: item.totalAmount,
                                        amount_paid: item.amountPaid,
                                        change_returned: item.changeReturned,
                                        payment_method: item.paymentMethod as any,
                                        sync_status: "synced",
                                        created_at: item.createdLocallyAt,
                                        subtotal: item.subtotal,
                                        discount_amount: item.discountAmount,
                                        tax_amount: item.taxAmount,
                                        customer_name: item.customerName,
                                        items: item.items.map(it => ({
                                          id: "item-" + it.productId,
                                          sale_id: item.serverSaleId || item.clientTransactionId,
                                          product_id: it.productId,
                                          product_name: it.productName,
                                          unit: it.unit,
                                          quantity: it.quantity,
                                          unit_price: it.unitPrice,
                                          cost_price: it.costPrice,
                                          discount: it.discount,
                                          total_price: it.totalPrice,
                                        })),
                                      }, selectedPaperWidth, storeProfile, true);
                                      showToast(`Reprinted #${item.invoiceNumber} (Zero Stock Change)`);
                                    }}
                                    className="h-7 px-2.5 rounded-lg bg-[#EFF4FF] border border-[#1447E6]/30 hover:bg-[#1447E6] hover:text-white text-[#1447E6] text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                  >
                                    <span className="material-symbols-outlined text-xs">print</span>
                                    <span>Audited Re-Print</span>
                                  </button>
                                </div>
                              </div>
                            ))
                        )}
                      </div>
                    )}

                    {/* Tab 3: Failed Retries */}
                    {offlineQueueTab === "failed" && (
                      <div className="space-y-2">
                        {offlineQueue.filter((q) => q.syncStatus === "failed").length === 0 ? (
                          <div className="py-8 text-center text-slate-400">
                            <span className="material-symbols-outlined text-3xl mb-1 text-emerald-400">verified</span>
                            <p className="text-xs font-bold text-slate-600">Zero Failed Transactions</p>
                            <p className="text-[10px] text-slate-400">All local sync attempts have completed without unhandled errors.</p>
                          </div>
                        ) : (
                          offlineQueue
                            .filter((q) => q.syncStatus === "failed")
                            .map((item) => (
                              <div
                                key={item.clientTransactionId}
                                className="p-3 rounded-2xl border border-rose-200 bg-rose-50/50 space-y-2"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-extrabold text-xs text-rose-900">
                                    Invoice #{item.invoiceNumber}
                                  </span>
                                  <span className="text-xs font-black text-rose-800">
                                    PKR {item.totalAmount.toLocaleString()}
                                  </span>
                                </div>
                                <div className="p-2 rounded-xl bg-white border border-rose-200 text-[10px] text-rose-700 font-mono">
                                  Error: {item.lastError || "Network connection failure during payload dispatch"}
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-slate-500">
                                  <span>Attempts: {item.attemptsCount}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRetryFailedTransaction(item.clientTransactionId)}
                                    className="h-7 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                                  >
                                    <span className="material-symbols-outlined text-xs">refresh</span>
                                    <span>Retry Now</span>
                                  </button>
                                </div>
                              </div>
                            ))
                        )}
                      </div>
                    )}

                    {/* Tab 4: Sync Audit Logs */}
                    {offlineQueueTab === "logs" && (
                      <div className="p-3 rounded-2xl bg-slate-900 text-slate-200 font-mono text-[10px] space-y-2 max-h-60 overflow-y-auto no-scrollbar">
                        <div className="text-slate-400 font-bold border-b border-slate-800 pb-1 flex items-center justify-between">
                          <span>DURABLE SYNC AUDIT LOGS</span>
                          <span className="text-[9px] text-emerald-400">LOG-LEVEL: VERBOSE</span>
                        </div>
                        {offlineQueue.flatMap((q) => q.syncLogs.map((log, idx) => ({ ...log, invoice: q.invoiceNumber, id: `${q.clientTransactionId}-${idx}` }))).length === 0 ? (
                          <p className="text-slate-500 py-4 text-center">No audit events generated yet.</p>
                        ) : (
                          offlineQueue
                            .flatMap((q) =>
                              q.syncLogs.map((log, idx) => ({
                                ...log,
                                invoice: q.invoiceNumber,
                                id: `${q.clientTransactionId}-${idx}`,
                              }))
                            )
                            .slice(0, 30)
                            .map((l) => (
                              <div key={l.id} className="border-b border-slate-800/80 pb-1.5 space-y-0.5">
                                <div className="flex items-center justify-between text-[9px] text-slate-400">
                                  <span className="text-blue-400 font-bold">#{l.invoice} &bull; Attempt #{l.attemptNumber}</span>
                                  <span>{new Date(l.timestamp).toLocaleTimeString()}</span>
                                </div>
                                <p className={l.status === "success" ? "text-emerald-400" : l.status === "failure" ? "text-rose-400" : "text-amber-300"}>
                                  [{l.status.toUpperCase()}] {l.message}
                                </p>
                              </div>
                            ))
                        )}
                      </div>
                    )}

                  </div>

                  {/* Modal Footer */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span>Zero-Data Loss Guarantee</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsOfflineModalOpen(false)}
                      className="h-8 px-4 bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 rounded-xl text-xs cursor-pointer transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>

                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* INTERACTIVE FLOATING FEEDBACK TOAST                       */}
            {/* ========================================================= */}
            {toastMessage && (
              <div className="fixed top-32 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-[12px] font-semibold flex items-center gap-2 border border-slate-800 animate-in fade-in slide-in-from-top-2">
                <span className="material-symbols-outlined text-blue-400 text-[18px]">check_circle</span>
                <span>{toastMessage}</span>
              </div>
            )}
            {/* ========================================================= */}
            {/* THERMAL RECEIPT SLIP & AUDITED REPRINT MODAL              */}
            {/* ========================================================= */}
            <ThermalReceiptModal
              isOpen={!!activeReceiptModalSale}
              onClose={() => setActiveReceiptModalSale(null)}
              sale={activeReceiptModalSale?.sale || null}
              store={{
                name: activeStore?.name,
                area: activeStore?.area,
                phone: activeStore?.phone,
                ntn: activeStore?.ntn || "Exempt",
                tagline: currentTemplate.name,
                customHeader: customHeaderNote,
                customFooter: customFooterNote,
              }}
              isReprint={activeReceiptModalSale?.isReprint ?? false}
              isDraftPreview={activeReceiptModalSale?.isDraftPreview ?? false}
              onConfirmAndPrint={async () => {
                await executeSaleTransaction(true);
              }}
              onConfirmWithoutPrint={async () => {
                await executeSaleTransaction(false);
              }}
              defaultPaperWidth={selectedPaperWidth}
              onToast={showToast}
            />

            {/* ========================================================= */}
            {/* PAKISTANI RETAIL PRINTER TROUBLESHOOTING GUIDE MODAL      */}
            {/* ========================================================= */}
            <PrinterTroubleshootingModal
              isOpen={isTroubleshootOpen}
              onClose={() => setIsTroubleshootOpen(false)}
            />

            {/* ========================================================= */}
            {/* STANDARD 11: ACCOUNT RECOVERY & PAYMENT MODAL             */}
            {/* ========================================================= */}
            <AccountRecoveryModal
              isOpen={isRecoveryModalOpen}
              onClose={() => setIsRecoveryModalOpen(false)}
              subscription={storeSubscription}
              onRefreshStatus={() => refreshSubscriptionStatus()}
              onToast={showToast}
            />
          </>
        )}

        {/* ========================================================= */}
        {/* STANDARD 13: SECURE DEVICE REPLACEMENT MODAL (ZERO LOCKOUT) */}
        {/* ========================================================= */}
        {pendingStoreToAuthorize && (
          <DeviceReplacementModal
            isOpen={isDeviceReplacementModalOpen}
            onClose={() => setIsDeviceReplacementModalOpen(false)}
            storeId={pendingStoreToAuthorize.id}
            storeName={pendingStoreToAuthorize.name}
            onDeviceAuthorized={(dev) => {
              setCurrentTerminalDevice(dev);
              setIsDeviceReplacementModalOpen(false);
              if (pendingStoreToAuthorize) {
                setActiveStore(pendingStoreToAuthorize);
                setIsCashierUnlocked(true);
                const storeProducts =
                  pendingStoreToAuthorize.products && pendingStoreToAuthorize.products.length > 0
                    ? pendingStoreToAuthorize.products
                    : sqliteDb.getProducts();
                setProducts(storeProducts);
                if (storeProducts.length > 0) {
                  setSelectedMeatItem(storeProducts[0]);
                }
                setSubTab("billing");
                setCart([]);
                setStoreLoginError("");
                showToast(`Terminal Authorized! Logged into ${pendingStoreToAuthorize.name}`);
                setPendingStoreToAuthorize(null);
              }
            }}
          />
        )}

      </div>
    </DeviceGuard>
  );
}
