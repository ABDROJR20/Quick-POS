/**
 * QUICK-POS — BUSINESS TEMPLATE ENGINE
 * Standard 6: Configuration-driven business templates on a single reusable POS core.
 * Only displays features and workflows relevant to the active store's template.
 */

export type BusinessTemplateId =
  | "kiryana"
  | "meat"
  | "biryani"
  | "tailor"
  | "boutique"
  | "custom";

export type POSTabId =
  | "billing"
  | "khata"
  | "inventory"
  | "purchases"
  | "expenses"
  | "stitching_orders"
  | "wastage"
  | "workers"
  | "printer"
  | "reports";

export interface TemplateConfig {
  id: BusinessTemplateId;
  name: string;
  tagline: string;
  badgeLabel: string;
  badgeColor: string; // Tailwind styling
  allowedTabs: { id: POSTabId; label: string; icon: string }[];
  billingFeatures: {
    hasBarcodeScanner: boolean;
    hasWeightCalculator: boolean; // Meat shop KG / Gram calculation
    hasPortionSelector: boolean; // Biryani plate / half-plate / add-ons
    hasTakeawayToggle: boolean; // Food counter takeaway vs dine-in
    hasStitchingOrderForm: boolean; // Tailor measurements & delivery date
    hasProductVariants: boolean; // Boutique size & color variants
    hasWorkerAssignment: boolean; // Worker commission attribution
    hasStockAlerts: boolean;
    hasCustomerKhata: boolean;
  };
  supportedUnits: string[];
  reportMetrics: string[];
  sampleWorkflowTip: string;
}

export const BUSINESS_TEMPLATES: Record<BusinessTemplateId, TemplateConfig> = {
  // ===========================================================================
  // TEMPLATE A: KIRYANA / GENERAL STORE
  // ===========================================================================
  kiryana: {
    id: "kiryana",
    name: "Kiryana & General Store",
    tagline: "Loose pulses (KG/Pao), packaged groceries, barcode scanning & Khata ledger",
    badgeLabel: "Kiryana Store",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    allowedTabs: [
      { id: "billing", label: "Counter Billing", icon: "point_of_sale" },
      { id: "khata", label: "Customer Khata", icon: "menu_book" },
      { id: "inventory", label: "Grocery Catalog", icon: "inventory_2" },
      { id: "purchases", label: "Wholesale Purchases", icon: "local_shipping" },
      { id: "printer", label: "58mm Printer", icon: "print" },
      { id: "reports", label: "Daily Sales", icon: "bar_chart" },
    ],
    billingFeatures: {
      hasBarcodeScanner: true,
      hasWeightCalculator: false,
      hasPortionSelector: false,
      hasTakeawayToggle: false,
      hasStitchingOrderForm: false,
      hasProductVariants: false,
      hasWorkerAssignment: false,
      hasStockAlerts: true,
      hasCustomerKhata: true,
    },
    supportedUnits: ["pcs", "kg", "pao", "packet", "dozen"],
    reportMetrics: ["Daily Gross Sales", "Cash vs Udhaar Collected", "Low Stock Alert Items", "Total Khata Outstanding"],
    sampleWorkflowTip: "Scan barcodes or tap grocery chips. Supports loose pulses by KG or 250g Pao with instant customer khata balance tracking.",
  },

  // ===========================================================================
  // TEMPLATE B: MEAT SHOP
  // ===========================================================================
  meat: {
    id: "meat",
    name: "Fresh Meat & Poultry Shop",
    tagline: "Weight-based billing (KG / Grams), live rate calculation & daily trimming wastage",
    badgeLabel: "Meat Shop",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
    allowedTabs: [
      { id: "billing", label: "Weighing Scale Billing", icon: "scale" },
      { id: "wastage", label: "Trimming & Wastage", icon: "delete_sweep" },
      { id: "inventory", label: "Meat Rates & Stock", icon: "inventory_2" },
      { id: "khata", label: "Customer Khata", icon: "menu_book" },
      { id: "printer", label: "Receipt Printer", icon: "print" },
      { id: "reports", label: "Margins & Yield", icon: "analytics" },
    ],
    billingFeatures: {
      hasBarcodeScanner: false,
      hasWeightCalculator: true, // Live weight calculator: Grams / KG x Rate
      hasPortionSelector: false,
      hasTakeawayToggle: false,
      hasStitchingOrderForm: false,
      hasProductVariants: false,
      hasWorkerAssignment: false,
      hasStockAlerts: true,
      hasCustomerKhata: true,
    },
    supportedUnits: ["kg", "gram"],
    reportMetrics: ["Total KG Beef/Chicken Sold", "Daily Trimming Wastage (KG)", "Net Selling Price per KG", "Gross Profit Margin %"],
    sampleWorkflowTip: "Tap meat item (Beef Boti, Broiler, Mutton), enter exact weight in Grams or KG (e.g. 750g), and total amount calculates automatically.",
  },

  // ===========================================================================
  // TEMPLATE C: BIRYANI / FOOD STALL
  // ===========================================================================
  biryani: {
    id: "biryani",
    name: "Biryani & Fast Food Counter",
    tagline: "Portion billing (Full/Half plate), Takeaway/Dine-In, cold drink & raita add-ons",
    badgeLabel: "Biryani Counter",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    allowedTabs: [
      { id: "billing", label: "Express Counter", icon: "fastfood" },
      { id: "expenses", label: "Kitchen Daily Expenses", icon: "receipt_long" },
      { id: "inventory", label: "Deg & Menu Pricing", icon: "restaurant_menu" },
      { id: "printer", label: "KOT & Receipt", icon: "print" },
      { id: "reports", label: "Portion Analytics", icon: "query_stats" },
    ],
    billingFeatures: {
      hasBarcodeScanner: false,
      hasWeightCalculator: false,
      hasPortionSelector: true, // Full Plate vs Half Plate portion selector
      hasTakeawayToggle: true, // Takeaway vs Counter Dine-In
      hasStitchingOrderForm: false,
      hasProductVariants: false,
      hasWorkerAssignment: false,
      hasStockAlerts: false,
      hasCustomerKhata: false, // Food stalls operate on instant cash/raast
    },
    supportedUnits: ["plate", "half-plate", "kg", "pcs"],
    reportMetrics: ["Plates Sold (Full vs Half)", "Takeaway Orders vs Dine-In", "Daily Kitchen Fuel & Ingredient Expenses", "Net Cash Drawer"],
    sampleWorkflowTip: "Select portion (Full Plate / Half Plate / Double Boti) and tap quick add-ons (Zeera Raita, Shami Kabab, Chilled Pepsi) in one click.",
  },

  // ===========================================================================
  // TEMPLATE D: TAILOR & STITCHING STUDIO
  // ===========================================================================
  tailor: {
    id: "tailor",
    name: "Master Tailor & Fabric Studio",
    tagline: "Customer measurement record, stitching order status, delivery dates & advance khata",
    badgeLabel: "Tailor Studio",
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
    allowedTabs: [
      { id: "billing", label: "Stitching Booking", icon: "straighten" },
      { id: "stitching_orders", label: "Orders & Delivery", icon: "assignment" },
      { id: "inventory", label: "Fabrics & Suit Cuts", icon: "content_cut" },
      { id: "khata", label: "Customer Balances", icon: "menu_book" },
      { id: "workers", label: "Karigar Commissions", icon: "badge" },
      { id: "printer", label: "Job Token & Receipt", icon: "print" },
      { id: "reports", label: "Delivery Tracking", icon: "event_note" },
    ],
    billingFeatures: {
      hasBarcodeScanner: false,
      hasWeightCalculator: false,
      hasPortionSelector: false,
      hasTakeawayToggle: false,
      hasStitchingOrderForm: true, // Measurement taker, delivery date & advance deposit
      hasProductVariants: false,
      hasWorkerAssignment: true, // Assign order to Karigar / Master Tailor
      hasStockAlerts: true,
      hasCustomerKhata: true,
    },
    supportedUnits: ["suit", "meter", "job"],
    reportMetrics: ["Suits in Stitching Queue", "Advance Cash Deposited", "Pending Balance on Delivery", "Karigar Commission Payable"],
    sampleWorkflowTip: "Record Shalwar Kameez measurements (Length, Chest, Waist, Collar, Tera), pick delivery date, collect advance deposit, and print token receipt.",
  },

  // ===========================================================================
  // TEMPLATE E: BOUTIQUE & MINI-MART
  // ===========================================================================
  boutique: {
    id: "boutique",
    name: "Boutique & Fashion Mini-Mart",
    tagline: "Ready-to-wear sizes (S/M/L/XL), unstitched lawn, barcode scanning & staff commissions",
    badgeLabel: "Boutique & Pret",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    allowedTabs: [
      { id: "billing", label: "Boutique Register", icon: "point_of_sale" },
      { id: "inventory", label: "Sizes & Variants", icon: "style" },
      { id: "purchases", label: "Designer Stock In", icon: "local_shipping" },
      { id: "workers", label: "Sales Staff Commission", icon: "military_tech" },
      { id: "printer", label: "Thermal Receipt", icon: "print" },
      { id: "reports", label: "Stock Valuation", icon: "pie_chart" },
    ],
    billingFeatures: {
      hasBarcodeScanner: true,
      hasWeightCalculator: false,
      hasPortionSelector: false,
      hasTakeawayToggle: false,
      hasStitchingOrderForm: false,
      hasProductVariants: true, // S, M, L, XL variant selector
      hasWorkerAssignment: true, // Sales floor rep commission attribution
      hasStockAlerts: true,
      hasCustomerKhata: true,
    },
    supportedUnits: ["suit", "pcs", "cut"],
    reportMetrics: ["Total Stock Valuation (PKR)", "Top Selling Sizes & Categories", "Sales Rep Commission Accrued", "Low Stock Size Alerts"],
    sampleWorkflowTip: "Scan barcode or select size (Small, Medium, Large) & color. Attribute sale to counter sales staff for automated incentive calculation.",
  },

  // ===========================================================================
  // TEMPLATE F: CUSTOM SPECIALIZED STORE
  // ===========================================================================
  custom: {
    id: "custom",
    name: "Custom Specialized Store",
    tagline: "Admin-tailored business workflows, custom product fields & configurable modules",
    badgeLabel: "Custom Store",
    badgeColor: "bg-cyan-50 text-cyan-700 border-cyan-200",
    allowedTabs: [
      { id: "billing", label: "POS Terminal", icon: "point_of_sale" },
      { id: "inventory", label: "Custom Catalog", icon: "inventory_2" },
      { id: "khata", label: "Customer Ledger", icon: "menu_book" },
      { id: "workers", label: "Staff & Commission", icon: "badge" },
      { id: "expenses", label: "Shop Expenses", icon: "receipt_long" },
      { id: "printer", label: "Thermal Printer", icon: "print" },
      { id: "reports", label: "Sales Performance", icon: "bar_chart" },
    ],
    billingFeatures: {
      hasBarcodeScanner: true,
      hasWeightCalculator: false,
      hasPortionSelector: false,
      hasTakeawayToggle: false,
      hasStitchingOrderForm: false,
      hasProductVariants: false,
      hasWorkerAssignment: true,
      hasStockAlerts: true,
      hasCustomerKhata: true,
    },
    supportedUnits: ["pcs", "job", "set", "pack", "meter"],
    reportMetrics: ["Daily Net Sales", "Receivables from Khata", "Custom Inventory Turnover", "Cash Drawer Status"],
    sampleWorkflowTip: "Configured by Super Admin for specialized retail (Auto Spare Parts, Pan Shop, Mobile/Electronics, Hardware). Only enabled modules are active.",
  },
};

/**
 * Helper to fetch template configuration with fallback to Kiryana
 */
export function getTemplateConfig(templateType?: string | null): TemplateConfig {
  if (!templateType) return BUSINESS_TEMPLATES.kiryana;
  const key = templateType.toLowerCase() as BusinessTemplateId;
  return BUSINESS_TEMPLATES[key] || BUSINESS_TEMPLATES.custom;
}
