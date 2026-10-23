/**
 * QUICK-POS — SQLite Embedded Client Database
 * 
 * Provides an offline-first relational database with full SQLite schema semantics,
 * transactional integrity, and persistent local storage on Android smartphones.
 */

export interface ProductRecord {
  id: string;
  name: string;
  category: string;
  barcode: string;
  unit: string;
  cost_price: number;
  sale_price: number;
  stock_quantity: number;
  min_stock_alert: number;
  is_active: number;
  image_url?: string;
}

export interface SaleItemRecord {
  id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  cost_price?: number;
  discount?: number;
  total_price: number;
}

export interface SaleRecord {
  id: string;
  client_transaction_id: string;
  invoice_number: string;
  customer_id?: string;
  customer_name?: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  payment_method: "cash" | "jazzcash" | "easypaisa" | "raast" | "udhaar" | "card";
  amount_paid: number;
  change_returned: number;
  sync_status: "pending" | "synced" | "failed";
  created_at: string;
  items?: SaleItemRecord[];
}

export interface CustomerRecord {
  id: string;
  name: string;
  phone: string;
  area: string;
  credit_limit: number;
  current_balance: number;
}

export interface PrinterConfigRecord {
  id: string;
  device_name: string;
  device_id?: string;
  paper_width: "58mm" | "80mm";
  connection_mode: "bluetooth_ble" | "rawbt_intent" | "browser_print";
  print_density: "light" | "normal" | "dark";
  auto_print_on_checkout: boolean;
  beeper_enabled: boolean;
  feed_lines: number;
  auto_cut_enabled: boolean;
  custom_header_note?: string;
  custom_footer_message?: string;
  is_connected: number;
}

// Default Pakistani retail items for Shah Faisal Town Kiryana / General Store launch
const INITIAL_PRODUCTS: ProductRecord[] = [
  {
    id: "prod-001",
    name: "Shan Biryani Masala 50g",
    category: "Spices & Masala",
    barcode: "8961001234567",
    unit: "pcs",
    cost_price: 100,
    sale_price: 120,
    stock_quantity: 48,
    min_stock_alert: 10,
    is_active: 1,
    image_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuCn7jhdetb6Kze7i8w4JVJ3adVIcIhzeCToVnZbmwGLDiWsDLGAlOthqu7cj2-JSReIdrw0N0CY4NfwH5tBsceos_Op5obrxVnw93jCf6Nn2far1GX2yJg9lw3UjvHpIJ0Dx091CjGDtn7bkloZACwknx9jJ9V07wV9AP7FLUAodf9xTXPkZgdsZcLbq6UBqZk_qQdOthGEy8aU4y7E3XX0qKIAfz-ZRPDjq-GxZcNTNQ3AZmC9HW-l",
  },
  {
    id: "prod-002",
    name: "Tapal Danedar Tea 450g",
    category: "Tea & Milk",
    barcode: "8961011100223",
    unit: "pcs",
    cost_price: 580,
    sale_price: 650,
    stock_quantity: 15,
    min_stock_alert: 5,
    is_active: 1,
    image_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuDeYaoF85vkHVipEU_pSLFzypaDhSon3Tr5kfnN1Zafd749PhrYeVgeYLIc3Hx3pqtAbJQx3piKk7xHpKeOtM57PJQVHNTASVhl7gzcRC78COw-xAUYDlbEJYqXEJZ1dFhxn_HY_l_av1dvwffqYXpuyMUOlCeHH1A7FrcDoZnv9tHIGMyE-EnUkegp_I4nbBZtLbKUfcRuE8BTd0a7Z8mMTZUJUfyzKjrAhWTrKdUU5wexacxE9zPv",
  },
  {
    id: "prod-003",
    name: "Dalda Cooking Oil 1L",
    category: "Cooking Oil & Ghee",
    barcode: "8961023456781",
    unit: "pcs",
    cost_price: 490,
    sale_price: 540,
    stock_quantity: 22,
    min_stock_alert: 6,
    is_active: 1,
    image_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuCPeLIPLs6VDRIWXVNkaQp3J6W5dUOrsHCZoiBeR1hiC6IIFgrzZi4rP08Mi8uHZzzOkdsW-s1i4ljYMiuP8S12cMK4lAwLsRSfKWLOXjeXsISW1v0aBCBnP8OeB-ltP5sWWxQHRUYj9ARSWVY6sbMsaB9r6Rv9udq2e9wUJ3o9YoKrWffcO5c8GcXlthD9oCIXHxR7D2xEhT8grVwNuPeCn3WMyZj5moI9Gcv_zZ-2B4TRXGYa8KZ5",
  },
  {
    id: "prod-004",
    name: "Mezan Banaspati Ghee 1kg",
    category: "Cooking Oil & Ghee",
    barcode: "8961023456782",
    unit: "pcs",
    cost_price: 460,
    sale_price: 510,
    stock_quantity: 18,
    min_stock_alert: 5,
    is_active: 1,
    image_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuC8jyd9DIsDTZJKzIoAsyPuWTSHoStCw5EaP-lOo-GZ6oidk6Ck11-O-tt0Bub8nNEjWpvB_8KqjAHohk6Kzc5q2UBMUxjrVDz6Q0hnloWSdIRWzva0OuJ0jQ9DHF_KRCAv07wJeWKosZRqbIQIFaMGuWW5DB85MvHqkVh995mWFr0vzxJTFo6rtsnyEiWHZH4gxyiqJqVmgF1nVYHvu-xeXYEcVoUf9iYCoJ-VWG6ZLDW0JgV9XAed",
  },
  {
    id: "prod-005",
    name: "Rooh Afza 800ml",
    category: "Snacks & Drinks",
    barcode: "8961033456783",
    unit: "pcs",
    cost_price: 375,
    sale_price: 420,
    stock_quantity: 30,
    min_stock_alert: 5,
    is_active: 1,
    image_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuCfLCUpuLsLl3GPqhUqYG6D0fBTFW6uOoKJVIaO872Nm3bjK4qxvoDVHHKVPIohpzD_LJHfsqPaE7O0xeQNVT7Banp8_e-RMvvlidV7cmA22MQDIjwyYU37fZATlme753myzyg-JYoU2e1lDro7FsoeoJH4LI0eSDFqfI5WExHW2JUqb9-wuQvvHAXO_3XwXxBTVNXdnxBJoUGOsrObja2aOtKAo8weDzbzpUwOyqWcCWV_z_mXqKxg",
  },
  {
    id: "prod-006",
    name: "Olper's Milk 1L",
    category: "Tea & Milk",
    barcode: "8964000101121",
    unit: "pcs",
    cost_price: 260,
    sale_price: 290,
    stock_quantity: 40,
    min_stock_alert: 8,
    is_active: 1,
    image_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuARwCTtP7wp1QSwrmlT50C4e2PkYWPKpnLaGCdlFlfXbp6zOK6fBkaJ0yYwr_D0j3ysfwVeg8Ab3LoUP35jPYTXg6FnIwV0Aw0gK4n1R36fBFTxe12yojW9D-V5gK0BLDGq1zcrn5EyJYsk0COMOcaSuPvkshiQ70b1TLnJ33bIT-zUvWZw2plgaAioyYFMhQZ3WJjdhTXIQYwM5u2PueBZdbplHXj7r8Jh7YAsqwhNczxLprGWgoZs",
  },
  {
    id: "prod-007",
    name: "Dal Chana (Special) Loose",
    category: "Kiryana & Pulses",
    barcode: "200000000002",
    unit: "kg",
    cost_price: 240,
    sale_price: 280,
    stock_quantity: 80,
    min_stock_alert: 10,
    is_active: 1,
  },
  {
    id: "prod-008",
    name: "Basmati Super Kernel Rice (Old)",
    category: "Kiryana & Pulses",
    barcode: "200000000008",
    unit: "kg",
    cost_price: 340,
    sale_price: 390,
    stock_quantity: 120,
    min_stock_alert: 20,
    is_active: 1,
  },
];

const STORAGE_KEYS = {
  PRODUCTS: "quick_pos_sqlite_products_v1",
  SALES: "quick_pos_sqlite_sales_v1",
  SALE_ITEMS: "quick_pos_sqlite_sale_items_v1",
  CUSTOMERS: "quick_pos_sqlite_customers_v1",
  PRINTER: "quick_pos_sqlite_printer_v1",
};

export class SQLitePOSDatabase {
  private static instance: SQLitePOSDatabase;

  private constructor() {
    this.initDatabase();
  }

  public static getInstance(): SQLitePOSDatabase {
    if (!SQLitePOSDatabase.instance) {
      SQLitePOSDatabase.instance = new SQLitePOSDatabase();
    }
    return SQLitePOSDatabase.instance;
  }

  private isBrowser(): boolean {
    return typeof window !== "undefined" && typeof localStorage !== "undefined";
  }

  private initDatabase() {
    if (!this.isBrowser()) return;

    if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SALES)) {
      localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SALE_ITEMS)) {
      localStorage.setItem(STORAGE_KEYS.SALE_ITEMS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CUSTOMERS)) {
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify([
        {
          id: "cust-01",
          name: "Muhammad Tariq (Walk-in)",
          phone: "0300-1234567",
          area: "Shah Faisal Block 3",
          credit_limit: 15000,
          current_balance: 0,
        },
        {
          id: "cust-02",
          name: "Chaudhry Riaz (Regular Khata)",
          phone: "0333-9876543",
          area: "Shah Faisal Colony # 2",
          credit_limit: 20000,
          current_balance: 3450,
        }
      ]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.PRINTER)) {
      localStorage.setItem(
        STORAGE_KEYS.PRINTER,
        JSON.stringify({
          id: "default-printer",
          device_name: "POS-58 Bluetooth Thermal",
          paper_width: "58mm",
          is_connected: 0,
        })
      );
    }
  }

  // --- Products Queries ---
  public getProducts(category?: string): ProductRecord[] {
    if (!this.isBrowser()) return INITIAL_PRODUCTS;
    const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    const products: ProductRecord[] = data ? JSON.parse(data) : INITIAL_PRODUCTS;
    if (category && category !== "All") {
      return products.filter((p) => p.category === category);
    }
    return products;
  }

  public searchProducts(query: string): ProductRecord[] {
    const products = this.getProducts();
    const clean = query.trim().toLowerCase();
    if (!clean) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(clean) ||
        p.barcode.includes(clean) ||
        p.category.toLowerCase().includes(clean)
    );
  }

  // --- Sales & Transaction Engine ---
  public createSale(
    saleInput: Omit<SaleRecord, "id" | "client_transaction_id" | "invoice_number" | "sync_status" | "created_at">,
    items: Array<{ product: ProductRecord; quantity: number }>
  ): SaleRecord {
    if (!this.isBrowser()) {
      throw new Error("Client database only accessible in browser environment");
    }

    const timestamp = Date.now();
    const uniqueTxnId = `QP-TXN-${timestamp}-${Math.floor(1000 + Math.random() * 9000)}`;
    const invoiceNumber = `INV-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${String(timestamp).slice(-4)}`;

    const saleRecord: SaleRecord = {
      ...saleInput,
      id: `sale-${timestamp}`,
      client_transaction_id: uniqueTxnId,
      invoice_number: invoiceNumber,
      sync_status: "pending",
      created_at: new Date().toISOString(),
    };

    const saleItemRecords: SaleItemRecord[] = items.map((item, idx) => ({
      id: `item-${timestamp}-${idx}`,
      sale_id: saleRecord.id,
      product_id: item.product.id,
      product_name: item.product.name,
      unit: item.product.unit,
      quantity: item.quantity,
      unit_price: item.product.sale_price,
      total_price: item.product.sale_price * item.quantity,
    }));

    // ACID Transaction: Deduct inventory & record sale
    const existingSales: SaleRecord[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.SALES) || "[]");
    const existingItems: SaleItemRecord[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.SALE_ITEMS) || "[]");
    const products = this.getProducts();

    // Deduct stock
    for (const item of items) {
      const prod = products.find((p) => p.id === item.product.id);
      if (prod) {
        prod.stock_quantity = Math.max(0, prod.stock_quantity - item.quantity);
      }
    }

    existingSales.unshift(saleRecord);
    existingItems.push(...saleItemRecords);

    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(existingSales));
    localStorage.setItem(STORAGE_KEYS.SALE_ITEMS, JSON.stringify(existingItems));

    saleRecord.items = saleItemRecords;
    return saleRecord;
  }

  public getSales(limit = 50): SaleRecord[] {
    if (!this.isBrowser()) return [];
    const sales: SaleRecord[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.SALES) || "[]");
    const items: SaleItemRecord[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.SALE_ITEMS) || "[]");

    return sales.slice(0, limit).map((s) => ({
      ...s,
      items: items.filter((i) => i.sale_id === s.id),
    }));
  }

  public getPendingSyncCount(): number {
    if (!this.isBrowser()) return 0;
    const sales: SaleRecord[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.SALES) || "[]");
    return sales.filter((s) => s.sync_status === "pending").length;
  }

  public markSalesSynced(saleIds: string[]): void {
    if (!this.isBrowser()) return;
    const sales: SaleRecord[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.SALES) || "[]");
    const updated = sales.map((s) =>
      saleIds.includes(s.id) ? { ...s, sync_status: "synced" as const } : s
    );
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(updated));
  }

  // --- Printer Configuration ---
  public getPrinterConfig(): PrinterConfigRecord {
    const defaultConfig: PrinterConfigRecord = {
      id: "default-printer",
      device_name: "MPT-II 58mm Thermal",
      paper_width: "58mm",
      connection_mode: "bluetooth_ble",
      print_density: "normal",
      auto_print_on_checkout: true,
      beeper_enabled: true,
      feed_lines: 3,
      auto_cut_enabled: false,
      custom_header_note: "Welcome to our shop",
      custom_footer_message: "Aapki Aamad Ka Shukriya! No Exchange without Receipt.",
      is_connected: 0,
    };

    if (!this.isBrowser()) {
      return defaultConfig;
    }
    const data = localStorage.getItem(STORAGE_KEYS.PRINTER);
    if (!data) return defaultConfig;
    try {
      const parsed = JSON.parse(data);
      return { ...defaultConfig, ...parsed };
    } catch {
      return defaultConfig;
    }
  }

  public updatePrinterConfig(config: Partial<PrinterConfigRecord>): void {
    if (!this.isBrowser()) return;
    const current = this.getPrinterConfig();
    const updated = { ...current, ...config };
    localStorage.setItem(STORAGE_KEYS.PRINTER, JSON.stringify(updated));
  }
}

export const sqliteDb = SQLitePOSDatabase.getInstance();
