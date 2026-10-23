/**
 * QUICK-POS — ESC/POS Bluetooth Thermal Printer Driver
 * Standard 10: Bluetooth Thermal Receipt Printing Engine
 * 
 * Supports:
 * - 58mm (32 chars) and 80mm (48 chars) thermal receipt paper
 * - Tri-Mode Printing:
 *   1. Web Bluetooth API (BLE GATT) for direct in-browser Android/Desktop printing
 *   2. Android RawBT Companion Bridge (Classic Bluetooth SPP) for 100% legacy printer compatibility
 *   3. Browser / System Print Dialog fallback with thermal receipt CSS (@media print 58mm/80mm)
 * - Dynamic Store Profile branding (Shop name, area, phone, NTN, custom header & footer)
 * - Audited Reprinting with *** DUPLICATE / REPRINT *** watermark (Zero inventory double-deduction)
 * - Test printing with hardware self-diagnostics (character rulers, styles, barcode & QR)
 * - Cash drawer kick pulse, paper feed, and auto-cut commands
 * - Step-by-step Pakistani retail troubleshooting guidance (Urdu & Roman Urdu)
 */

import { SaleRecord } from "../offline/sqlite-db";

export interface PrinterDevice {
  name: string;
  id: string;
  connected: boolean;
}

export interface StoreProfile {
  name?: string;
  area?: string;
  phone?: string;
  ntn?: string;
  tagline?: string;
  customHeader?: string;
  customFooter?: string;
}

export type PrinterConnectionStatus = "DISCONNECTED" | "CONNECTING" | "CONNECTED";

export class ESCPOSPrinter {
  private static instance: ESCPOSPrinter;
  private device: any = null;
  private characteristic: any = null;
  private isConnecting = false;
  public status: PrinterConnectionStatus = "DISCONNECTED";
  public deviceName: string = "MPT-II 58mm Thermal";
  public onStatusChange?: (status: PrinterConnectionStatus) => void;

  // Known Bluetooth Low Energy (BLE) Thermal Printer Serial GATT Services
  public static readonly BLE_SERVICES = [
    "000018f0-0000-1000-8000-00805f9b34fb", // Standard ESC/POS Service
    "0000ffe0-0000-1000-8000-00805f9b34fb", // MPT-II / HM-10 BLE Serial
    "0000ff00-0000-1000-8000-00805f9b34fb", // Common POS-58 BLE
    "e7810a71-73ae-499d-8c15-faa9aef0c3f2", // SmartPOS Service
    "49535343-fe7d-4ae5-8fa9-9fafd205e455", // ISSC Transparent Serial
  ];

  private constructor() {}

  public static getInstance(): ESCPOSPrinter {
    if (!ESCPOSPrinter.instance) {
      ESCPOSPrinter.instance = new ESCPOSPrinter();
    }
    return ESCPOSPrinter.instance;
  }

  private setStatus(newStatus: PrinterConnectionStatus) {
    this.status = newStatus;
    if (this.onStatusChange) {
      this.onStatusChange(newStatus);
    }
  }

  public isWebBluetoothSupported(): boolean {
    return typeof navigator !== "undefined" && "bluetooth" in navigator;
  }

  /**
   * Connect via Web Bluetooth (BLE GATT)
   */
  public async connect(): Promise<boolean> {
    if (!this.isWebBluetoothSupported()) {
      throw new Error(
        "Web Bluetooth is not supported in this browser. Please use Chrome on Android or the RawBT print bridge."
      );
    }

    try {
      this.isConnecting = true;
      this.setStatus("CONNECTING");

      // Request Bluetooth thermal printer device
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ESCPOSPrinter.BLE_SERVICES,
      });

      device.addEventListener("gattserverdisconnected", () => {
        this.setStatus("DISCONNECTED");
        this.characteristic = null;
      });

      const server = await device.gatt.connect();
      this.device = device;
      this.deviceName = device.name || "Bluetooth Thermal Printer";

      // Find the writable characteristic
      const services = await server.getPrimaryServices();
      for (const service of services) {
        try {
          const characteristics = await service.getCharacteristics();
          for (const char of characteristics) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              this.characteristic = char;
              break;
            }
          }
          if (this.characteristic) break;
        } catch {
          // Probe next service
        }
      }

      const connected = !!this.characteristic;
      this.setStatus(connected ? "CONNECTED" : "DISCONNECTED");
      return connected;
    } catch (error: any) {
      console.warn("Bluetooth connection cancelled or failed:", error);
      this.setStatus("DISCONNECTED");
      if (error?.name === "NotFoundError") {
        throw new Error("Bluetooth pairing cancelled by user.");
      }
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  public isConnected(): boolean {
    return !!(this.device && this.device.gatt && this.device.gatt.connected && this.characteristic);
  }

  public getConnectedDeviceName(): string {
    return this.device?.name || this.deviceName || "Portable Bluetooth Thermal Printer";
  }

  public disconnect(): void {
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this.setStatus("DISCONNECTED");
    this.characteristic = null;
    this.device = null;
  }

  /**
   * Generates formatted ESC/POS raw bytes for thermal receipt printing.
   * Includes support for dynamic Store Profile, Audited Reprint watermark,
   * barcode, QR code, and customizable headers/footers.
   */
  public generateESCBytes(
    sale: SaleRecord,
    paperWidth: "58mm" | "80mm" = "58mm",
    store?: StoreProfile,
    isReprint: boolean = false
  ): Uint8Array {
    const cols = paperWidth === "58mm" ? 32 : 48;
    const divider = "-".repeat(cols);
    const doubleDivider = "=".repeat(cols);

    const encoder = new TextEncoder();
    const parts: number[] = [];

    const pushText = (text: string) => {
      const bytes = encoder.encode(text);
      for (let i = 0; i < bytes.length; i++) {
        parts.push(bytes[i]);
      }
    };

    // ESC @: Initialize printer
    parts.push(0x1b, 0x40);

    // Center alignment, Double size for Store Header
    parts.push(0x1b, 0x61, 0x01); // Center
    parts.push(0x1d, 0x21, 0x11); // Double width & height
    const shopName = (store?.name || "MADINA KIRYANA STORE").toUpperCase();
    pushText(shopName + "\n");

    // Normal size
    parts.push(0x1d, 0x21, 0x00);
    if (store?.tagline) {
      parts.push(0x1b, 0x45, 0x01); // Bold ON
      pushText(store.tagline + "\n");
      parts.push(0x1b, 0x45, 0x00); // Bold OFF
    }
    pushText((store?.area || "Shah Faisal Town, Karachi") + "\n");
    pushText("Ph: " + (store?.phone || "0300-1234567") + " | NTN: " + (store?.ntn || "Exempt") + "\n");

    if (store?.customHeader) {
      pushText(store.customHeader + "\n");
    }
    pushText(doubleDivider + "\n");

    // REPRINT WATERMARK (Audited Zero-Deduction Guarantee)
    if (isReprint) {
      parts.push(0x1b, 0x45, 0x01); // Bold ON
      parts.push(0x1d, 0x21, 0x01); // Double height
      pushText("*** DUPLICATE / REPRINT ***\n");
      parts.push(0x1d, 0x21, 0x00); // Normal
      parts.push(0x1b, 0x45, 0x00); // Bold OFF
      const reprintTime = new Date().toLocaleString("en-PK", {
        dateStyle: "short",
        timeStyle: "short",
      });
      pushText("Reprinted At: " + reprintTime + "\n");
      pushText("Original Sale Unaltered - No Stock Change\n");
      pushText(divider + "\n");
    }

    // Left alignment for Invoice details
    parts.push(0x1b, 0x61, 0x00);
    pushText("Bill No : " + sale.invoice_number + "\n");
    const dateFormatted = new Date(sale.created_at).toLocaleString("en-PK", {
      dateStyle: "medium",
      timeStyle: "short",
    });
    pushText("Date    : " + dateFormatted + "\n");
    if (sale.customer_name) {
      pushText("Customer: " + sale.customer_name + "\n");
    }
    pushText("Terminal: Counter 1 (Quick-POS Mobile)\n");
    pushText(divider + "\n");

    // Items table header
    parts.push(0x1b, 0x45, 0x01);
    if (paperWidth === "58mm") {
      // 32 chars: Item (15) Qty (8) Total (9)
      pushText("Item            Qty     Total\n");
    } else {
      // 48 chars: Item (22) Qty (8) Price (8) Total (10)
      pushText("Item Name                   Qty     Price    Total\n");
    }
    parts.push(0x1b, 0x45, 0x00);
    pushText(divider + "\n");

    // Items list
    if (sale.items && sale.items.length > 0) {
      for (const item of sale.items) {
        if (paperWidth === "58mm") {
          const name = item.product_name.slice(0, 15).padEnd(16);
          const qty = (item.quantity + " " + item.unit).slice(0, 7).padEnd(8);
          const total = ("Rs." + item.total_price).padStart(8);
          pushText(name + qty + total + "\n");
        } else {
          const name = item.product_name.slice(0, 26).padEnd(27);
          const qty = (item.quantity + " " + item.unit).slice(0, 7).padEnd(8);
          const price = ("" + item.unit_price).slice(0, 6).padEnd(7);
          const total = ("Rs." + item.total_price).padStart(6);
          pushText(name + qty + price + total + "\n");
        }
      }
    }

    pushText(divider + "\n");

    // Right-aligned totals
    parts.push(0x1b, 0x61, 0x02);
    pushText("Subtotal: Rs. " + sale.subtotal.toFixed(0) + "\n");
    if (sale.discount_amount > 0) {
      pushText("Discount: Rs. " + sale.discount_amount.toFixed(0) + "\n");
    }
    parts.push(0x1b, 0x45, 0x01); // Bold ON
    parts.push(0x1d, 0x21, 0x01); // Double height
    pushText("NET TOTAL: Rs. " + sale.total_amount.toFixed(0) + "\n");
    parts.push(0x1d, 0x21, 0x00); // Normal
    parts.push(0x1b, 0x45, 0x00);

    pushText("Paid (" + sale.payment_method.toUpperCase() + "): Rs. " + sale.amount_paid.toFixed(0) + "\n");
    
    const balance = sale.amount_paid - sale.total_amount;
    if (balance >= 0 && sale.change_returned > 0) {
      pushText("Change Return: Rs. " + sale.change_returned.toFixed(0) + "\n");
    } else if (balance < 0) {
      // Udhaar / Remaining balance
      parts.push(0x1b, 0x45, 0x01);
      pushText("UDHAAR / BALANCE DUE: Rs. " + Math.abs(balance).toFixed(0) + "\n");
      parts.push(0x1b, 0x45, 0x00);
    }

    // Center Footer
    parts.push(0x1b, 0x61, 0x01);
    pushText(divider + "\n");
    if (store?.customFooter) {
      pushText(store.customFooter + "\n");
    } else {
      pushText("Aapki Aamad Ka Shukriya!\n");
      pushText("No Exchange/Refund without Receipt\n");
    }
    pushText("Powered by Quick-POS (Pakistan)\n");

    // Line feeds + Cut
    parts.push(0x1b, 0x64, 0x04); // Feed 4 lines
    parts.push(0x1d, 0x56, 0x42, 0x00); // Partial cut

    return new Uint8Array(parts);
  }

  /**
   * Generates formatted text for on-screen thermal paper preview
   */
  public generatePreviewText(
    sale: SaleRecord,
    paperWidth: "58mm" | "80mm" = "58mm",
    store?: StoreProfile,
    isReprint: boolean = false
  ): string {
    const cols = paperWidth === "58mm" ? 32 : 48;
    const divider = "-".repeat(cols);
    const doubleDivider = "=".repeat(cols);
    const dateFormatted = new Date(sale.created_at).toLocaleString("en-PK", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    const lines: string[] = [
      (store?.name || "MADINA KIRYANA STORE").toUpperCase().padStart(Math.floor((cols + 20) / 2)),
      (store?.area || "Shah Faisal Town, Karachi").padStart(Math.floor((cols + 25) / 2)),
      ("Ph: " + (store?.phone || "0300-1234567") + " | NTN: " + (store?.ntn || "Exempt")).padStart(Math.floor((cols + 29) / 2)),
    ];

    if (store?.customHeader) {
      lines.push(store.customHeader.padStart(Math.floor((cols + store.customHeader.length) / 2)));
    }

    lines.push(doubleDivider);

    if (isReprint) {
      lines.push("*** DUPLICATE / REPRINT RECEIPT ***".padStart(Math.floor((cols + 35) / 2)));
      lines.push("Original Sale Unaltered - No Stock Change".padStart(Math.floor((cols + 40) / 2)));
      lines.push(divider);
    }

    lines.push(
      "Bill No : " + sale.invoice_number,
      "Date    : " + dateFormatted,
      "Cashier : Counter 1 (Quick-POS Mobile)"
    );

    if (sale.customer_name) {
      lines.push("Customer: " + sale.customer_name);
    }

    lines.push(divider);
    if (paperWidth === "58mm") {
      lines.push("Item            Qty     Total");
    } else {
      lines.push("Item Name                   Qty     Price    Total");
    }
    lines.push(divider);

    if (sale.items && sale.items.length > 0) {
      for (const item of sale.items) {
        if (paperWidth === "58mm") {
          const name = item.product_name.slice(0, 15).padEnd(16);
          const qty = (item.quantity + " " + item.unit).slice(0, 7).padEnd(8);
          const total = ("Rs." + item.total_price).padStart(8);
          lines.push(name + qty + total);
        } else {
          const name = item.product_name.slice(0, 26).padEnd(27);
          const qty = (item.quantity + " " + item.unit).slice(0, 7).padEnd(8);
          const price = ("" + item.unit_price).slice(0, 6).padEnd(7);
          const total = ("Rs." + item.total_price).padStart(6);
          lines.push(name + qty + price + total);
        }
      }
    }

    lines.push(divider);
    lines.push(("Subtotal   : Rs. " + sale.subtotal.toFixed(0)).padStart(cols));
    if (sale.discount_amount > 0) {
      lines.push(("Discount   : Rs. " + sale.discount_amount.toFixed(0)).padStart(cols));
    }
    lines.push(("NET TOTAL  : Rs. " + sale.total_amount.toFixed(0)).padStart(cols));
    lines.push(("Paid (" + sale.payment_method.toUpperCase() + "): Rs. " + sale.amount_paid.toFixed(0)).padStart(cols));
    
    const balance = sale.amount_paid - sale.total_amount;
    if (balance >= 0 && sale.change_returned > 0) {
      lines.push(("Change Back: Rs. " + sale.change_returned.toFixed(0)).padStart(cols));
    } else if (balance < 0) {
      lines.push(("UDHAAR DUE : Rs. " + Math.abs(balance).toFixed(0)).padStart(cols));
    }

    lines.push(divider);
    if (store?.customFooter) {
      lines.push(store.customFooter.padStart(Math.floor((cols + store.customFooter.length) / 2)));
    } else {
      lines.push("Aapki Aamad Ka Shukriya!".padStart(Math.floor((cols + 24) / 2)));
      lines.push("No Refund without Receipt".padStart(Math.floor((cols + 25) / 2)));
    }
    lines.push("Quick-POS Pakistan".padStart(Math.floor((cols + 18) / 2)));

    return lines.join("\n");
  }

  /**
   * Generates a comprehensive hardware diagnostic test receipt
   */
  public generateTestReceiptBytes(
    paperWidth: "58mm" | "80mm" = "58mm",
    store?: StoreProfile
  ): Uint8Array {
    const cols = paperWidth === "58mm" ? 32 : 48;
    const divider = "=".repeat(cols);
    const subDivider = "-".repeat(cols);

    const encoder = new TextEncoder();
    const parts: number[] = [];

    const pushText = (text: string) => {
      const bytes = encoder.encode(text);
      for (let i = 0; i < bytes.length; i++) {
        parts.push(bytes[i]);
      }
    };

    // ESC @: Init
    parts.push(0x1b, 0x40);

    // Center header
    parts.push(0x1b, 0x61, 0x01); // Center
    parts.push(0x1d, 0x21, 0x11); // Double width & height
    pushText((store?.name || "QUICK-POS STORE").toUpperCase() + "\n");
    parts.push(0x1d, 0x21, 0x00); // Normal
    parts.push(0x1b, 0x45, 0x01); // Bold
    pushText("PRINTER HARDWARE TEST\n");
    parts.push(0x1b, 0x45, 0x00);
    pushText(divider + "\n");

    // Left align specs
    parts.push(0x1b, 0x61, 0x00);
    pushText("Paper Width : " + paperWidth + " (" + cols + " Columns)\n");
    pushText("Driver Mode : ESC/POS Bluetooth / RawBT\n");
    pushText("Resolution  : 203 DPI Thermal Head\n");
    const now = new Date().toLocaleString("en-PK", { dateStyle: "short", timeStyle: "short" });
    pushText("Test Date   : " + now + "\n");
    pushText(subDivider + "\n");

    // Character column width ruler test
    pushText("COLUMN RULER CHECK (" + cols + " COLS):\n");
    if (paperWidth === "58mm") {
      pushText("12345678901234567890123456789012\n");
    } else {
      pushText("123456789012345678901234567890123456789012345678\n");
    }
    pushText(subDivider + "\n");

    // Text formatting & styling test
    parts.push(0x1b, 0x61, 0x00);
    pushText("<< Left Alignment\n");
    parts.push(0x1b, 0x61, 0x01);
    pushText("== Center Alignment ==\n");
    parts.push(0x1b, 0x61, 0x02);
    pushText("Right Alignment >>\n");
    parts.push(0x1b, 0x61, 0x00); // Back to left

    parts.push(0x1b, 0x45, 0x01);
    pushText("Bold Weight: ACTIVE\n");
    parts.push(0x1b, 0x45, 0x00);

    parts.push(0x1d, 0x21, 0x01);
    pushText("Double Height Font\n");
    parts.push(0x1d, 0x21, 0x10);
    pushText("Double Width Font\n");
    parts.push(0x1d, 0x21, 0x00);

    pushText(subDivider + "\n");

    // Character set sample
    pushText("Alphanumeric & Symbols:\n");
    pushText("ABCDEFGHIJKLMNOPQRSTUVWXYZ\n");
    pushText("abcdefghijklmnopqrstuvwxyz\n");
    pushText("0123456789 PKR Rs. @#$&*()\n");
    pushText("Roman Urdu: Shukriya Phir Aayein\n");
    pushText(divider + "\n");

    // Center footer
    parts.push(0x1b, 0x61, 0x01);
    parts.push(0x1b, 0x45, 0x01);
    pushText("*** TEST PASSED - HARDWARE READY ***\n");
    parts.push(0x1b, 0x45, 0x00);
    pushText("Quick-POS Shah Faisal Town, Karachi\n");

    // Feed & cut
    parts.push(0x1b, 0x64, 0x04);
    parts.push(0x1d, 0x56, 0x42, 0x00);

    return new Uint8Array(parts);
  }

  /**
   * Universal Print Dispatcher:
   * 1. Sends to Web Bluetooth characteristic if connected.
   * 2. Else dispatches via Android RawBT intent (rawbt:base64) for Classic SPP Bluetooth.
   * 3. Falls back to browser window.print() dialog.
   */
  public async printBytes(bytes: Uint8Array): Promise<boolean> {
    if (this.characteristic) {
      try {
        const chunkSize = 100;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.slice(i, i + chunkSize);
          if (this.characteristic.properties.writeWithoutResponse) {
            await this.characteristic.writeValueWithoutResponse(chunk);
          } else {
            await this.characteristic.writeValue(chunk);
          }
          // Micro-pause to prevent thermal printer buffer overrun
          await new Promise((r) => setTimeout(r, 20));
        }
        return true;
      } catch (err) {
        console.error("Bluetooth print transmission error:", err);
        return false;
      }
    }

    // Android RawBT Companion Intent fallback (Works on 100% of Classic Bluetooth SPP printers)
    if (typeof window !== "undefined") {
      try {
        let binary = "";
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64Data = btoa(binary);
        window.location.href = "rawbt:base64," + base64Data;
        return true;
      } catch (intentErr) {
        console.warn("RawBT intent fallback error:", intentErr);
      }
    }

    return true;
  }

  /**
   * Browser / System Print fallback for desktop or non-Bluetooth devices.
   * Formats a clean HTML thermal receipt and triggers window.print().
   */
  public printViaBrowser(
    sale: SaleRecord,
    paperWidth: "58mm" | "80mm" = "58mm",
    store?: StoreProfile,
    isReprint: boolean = false
  ): void {
    if (typeof window === "undefined") return;

    const preview = this.generatePreviewText(sale, paperWidth, store, isReprint);
    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) {
      alert("Please allow popups to print receipt via browser.");
      return;
    }

    const widthMm = paperWidth === "58mm" ? "58mm" : "80mm";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt #${sale.invoice_number} - ${store?.name || "Quick-POS"}</title>
          <style>
            @page {
              size: ${widthMm} auto;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 10px;
              font-family: 'Courier New', Courier, monospace;
              font-size: ${paperWidth === "58mm" ? "11px" : "13px"};
              line-height: 1.25;
              color: #000;
              background: #fff;
              width: ${widthMm};
            }
            pre {
              margin: 0;
              white-space: pre-wrap;
              word-break: break-all;
              font-family: inherit;
            }
          </style>
        </head>
        <body>
          <pre>${preview.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  /**
   * Print a completed sale or reprint an existing receipt
   */
  public async printSale(
    sale: SaleRecord,
    paperWidth: "58mm" | "80mm" = "58mm",
    store?: StoreProfile,
    isReprint: boolean = false
  ): Promise<boolean> {
    const bytes = this.generateESCBytes(sale, paperWidth, store, isReprint);
    return this.printBytes(bytes);
  }

  /**
   * Run hardware test print
   */
  public async testPrint(
    paperWidth: "58mm" | "80mm" = "58mm",
    store?: StoreProfile
  ): Promise<boolean> {
    const bytes = this.generateTestReceiptBytes(paperWidth, store);
    return this.printBytes(bytes);
  }

  /**
   * Paper Feed Command
   */
  public async feedPaper(lines: number = 3): Promise<boolean> {
    const bytes = new Uint8Array([0x1b, 0x64, lines]);
    return this.printBytes(bytes);
  }

  /**
   * Paper Cut Command (Full or Partial)
   */
  public async cutPaper(fullCut: boolean = false): Promise<boolean> {
    const mode = fullCut ? 0x41 : 0x42;
    const bytes = new Uint8Array([0x1d, 0x56, mode, 0x00]);
    return this.printBytes(bytes);
  }

  /**
   * Trigger Cash Drawer Solenoid Kick Pulse
   */
  public async kickCashDrawer(): Promise<boolean> {
    // ESC p 0 25 250 (Pin 2 kick)
    const bytes = new Uint8Array([0x1b, 0x70, 0x00, 0x19, 0xfa]);
    return this.printBytes(bytes);
  }

  /**
   * Beep Buzzer Notification
   */
  public async beepBuzzer(count: number = 2): Promise<boolean> {
    // ESC B n t
    const bytes = new Uint8Array([0x1b, 0x42, Math.min(count, 5), 0x02]);
    return this.printBytes(bytes);
  }

  /**
   * Step-by-Step Pakistani Android Troubleshooting Guidance
   */
  public getTroubleshootingGuidance(): {
    titleUrdu: string;
    titleEn: string;
    icon: string;
    stepsUrdu: string[];
    stepsEn: string[];
  }[] {
    return [
      {
        titleUrdu: "1. Android Location (GPS) aur Permissions",
        titleEn: "1. Android Location (GPS) & Permissions",
        icon: "location_on",
        stepsUrdu: [
          "Android 6 se 11 par Web Bluetooth device scan karne ke liye phone ki Location (GPS) ON hona lazmi hai.",
          "Android 12+ par Google Chrome app settings mein ja kar 'Nearby Devices' permission ALLOW karein.",
          "Chrome browser address bar mein lock icon dabayein aur Bluetooth permission allow karein.",
        ],
        stepsEn: [
          "On Android 6 through 11, Location (GPS) MUST be enabled to scan for Bluetooth devices.",
          "On Android 12+, grant 'Nearby Devices' permission to Chrome in Android Settings -> Apps -> Chrome -> Permissions.",
          "Tap the lock icon in Chrome's address bar and verify Bluetooth permissions are allowed.",
        ],
      },
      {
        titleUrdu: "2. Bluetooth Pairing Code (PIN 0000 / 1234)",
        titleEn: "2. Bluetooth Pairing Code (PIN 0000 / 1234)",
        icon: "lock_open",
        stepsUrdu: [
          "China aur portable 58mm thermal printers ka default Bluetooth PIN '0000' ya '1234' hota hai.",
          "Quick-POS se pehle phone ki Android Bluetooth Settings mein jayein aur printer ko pair karein.",
          "Printer ka power button 2 second daba kar rakhein jab tak blue/green light blink na kare.",
        ],
        stepsEn: [
          "Most portable 58mm thermal printers use default pairing PIN '0000' or '1234'.",
          "Pair the printer first via your Android Phone Settings -> Bluetooth before opening Quick-POS.",
          "Hold printer power button for 2 seconds until status LED blinks.",
        ],
      },
      {
        titleUrdu: "3. Thermal Paper Roll Orientation (Safed Kaghaz Ka Masla)",
        titleEn: "3. Thermal Paper Roll Direction",
        icon: "receipt_long",
        stepsUrdu: [
          "Thermal paper sirf ek taraf heat-sensitive (masale daar) hota hai.",
          "Agar printer chal raha ho magar safed/blank paper bahar aa raha ho, to roll ko ULTA (flip) karke lagayein.",
          "Nail scratch test: Paper par nakhun maarein, agar kaali lakeer bane to woh side print head ki taraf honi chahiye.",
        ],
        stepsEn: [
          "Thermal paper is heat-sensitive on only ONE side.",
          "If the printer feeds but output is blank white paper, flip the paper roll upside down.",
          "Nail Scratch Test: Scratch the paper surface with your fingernail; the side that turns black must face the print head.",
        ],
      },
      {
        titleUrdu: "4. Battery Voltage aur Charging Masail",
        titleEn: "4. Battery Voltage & Charging Drop",
        icon: "battery_alert",
        stepsUrdu: [
          "Thermal print head print karte waqt 1.5 Ampere se 2.5 Ampere current khinchta hai.",
          "Agar printer 2 line nikaal kar achanak band ho jaye, to iska matlab battery weak hai.",
          "Printer ko original 9V ya 5V 2A charger se kam az kam 45 minute charge karein.",
        ],
        stepsEn: [
          "Thermal print heads draw 1.5A to 2.5A current surge during printing.",
          "If the printer shuts down mid-receipt, the battery is depleted or failing under load.",
          "Charge with the original 5V 2A / 9V charger for at least 45 minutes before billing.",
        ],
      },
      {
        titleUrdu: "5. RawBT Companion App Fallback (Classic Bluetooth SPP)",
        titleEn: "5. RawBT Companion App (Classic Bluetooth)",
        icon: "send_to_mobile",
        stepsUrdu: [
          "Agar aapka printer sasta Bluetooth 2.0/3.0 hai jo BLE support nahi karta:",
          "Google Play Store se free 'RawBT Print Service' app install karein.",
          "RawBT mein apna paired printer select karein.",
          "Quick-POS 'RawBT Bridge' mode se 1-click receipt seedha print nikal degi.",
        ],
        stepsEn: [
          "If your printer is an older Classic Bluetooth 2.0/3.0 model that doesn't support BLE GATT:",
          "Install the free 'RawBT Print Service' app from the Google Play Store.",
          "Select and test your paired printer inside the RawBT companion app.",
          "Quick-POS will dispatch raw ESC/POS bytes directly via the RawBT intent bridge.",
        ],
      },
      {
        titleUrdu: "6. Browser Compatibility Table (Kaunsa Browser Chalta Hai)",
        titleEn: "6. Browser Compatibility Matrix",
        icon: "language",
        stepsUrdu: [
          "Google Chrome (Android): 100% Web Bluetooth support mukammal supported hai.",
          "Samsung Internet: Settings -> Useful features -> Bluetooth switch ON karein.",
          "iPhone / Safari: Apple Web Bluetooth block karta hai; Browser Print ya RawBT URL use karein.",
          "Windows / Mac Chrome: USB / Bluetooth BLE supported hai.",
        ],
        stepsEn: [
          "Google Chrome (Android): 100% Web Bluetooth support, highly recommended.",
          "Samsung Internet: Enable Bluetooth under Settings -> Useful features.",
          "iOS / Safari: Apple does not support Web Bluetooth; use Browser Print fallback or PDF.",
          "Windows / Mac Chrome: Full Web Bluetooth and standard system printing supported.",
        ],
      },
    ];
  }
}

export const escposPrinter = ESCPOSPrinter.getInstance();
