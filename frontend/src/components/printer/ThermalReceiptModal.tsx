"use client";

import React, { useState } from "react";
import { escposPrinter, StoreProfile } from "@/lib/printer/escpos";
import { SaleRecord } from "@/lib/offline/sqlite-db";

interface ThermalReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: SaleRecord | null;
  store?: StoreProfile;
  isReprint?: boolean;
  isDraftPreview?: boolean;
  onConfirmAndPrint?: () => Promise<void> | void;
  onConfirmWithoutPrint?: () => Promise<void> | void;
  defaultPaperWidth?: "58mm" | "80mm";
  onToast?: (msg: string) => void;
}

export function ThermalReceiptModal({
  isOpen,
  onClose,
  sale,
  store,
  isReprint = false,
  isDraftPreview = false,
  onConfirmAndPrint,
  onConfirmWithoutPrint,
  defaultPaperWidth = "58mm",
  onToast = () => {},
}: ThermalReceiptModalProps) {
  const [paperWidth, setPaperWidth] = useState<"58mm" | "80mm">(defaultPaperWidth);
  const [isPrinting, setIsPrinting] = useState(false);

  if (!isOpen || !sale) return null;

  const previewText = escposPrinter.generatePreviewText(sale, paperWidth, store, isReprint);

  const handlePrintBluetooth = async () => {
    try {
      setIsPrinting(true);
      onToast("Sending receipt to Bluetooth thermal printer...");
      const success = await escposPrinter.printSale(sale, paperWidth, store, isReprint);
      if (success) {
        onToast(isReprint ? "Reprint slip dispatched successfully!" : "Receipt printed successfully!");
      } else {
        onToast("Printer transmission error: Check Bluetooth connection.");
      }
    } catch (err: any) {
      onToast("Bluetooth error: " + (err?.message || "Failed to print"));
    } finally {
      setIsPrinting(false);
    }
  };

  const handlePrintBrowser = () => {
    escposPrinter.printViaBrowser(sale, paperWidth, store, isReprint);
    onToast("Opened system print preview dialog");
  };

  const handlePrintRawBT = async () => {
    try {
      const bytes = escposPrinter.generateESCBytes(sale, paperWidth, store, isReprint);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      window.location.href = "rawbt:base64," + base64;
      onToast("Dispatched receipt to RawBT Print Bridge app");
    } catch {
      onToast("Failed to launch RawBT intent");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              isDraftPreview
                ? "bg-blue-500/20 border border-blue-500/30 text-blue-400"
                : "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400"
            }`}>
              <span className="material-symbols-outlined text-lg">
                {isDraftPreview ? "visibility" : "receipt_long"}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">
                  {isDraftPreview
                    ? "Receipt Slip Preview"
                    : isReprint
                    ? "Audited Reprint Slip"
                    : "Thermal Receipt Preview"}
                </h3>
                {isDraftPreview && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/25 text-blue-300 border border-blue-500/40 font-mono">
                    PRE-PRINT REVIEW
                  </span>
                )}
                {isReprint && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                    DUPLICATE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                {isDraftPreview ? "Review all details before finalizing sale" : `Bill #${sale.invoice_number}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-sm transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Informational Banner for Pre-Print Preview */}
        {isDraftPreview && (
          <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center justify-between shrink-0">
            <span className="text-xs font-semibold text-blue-900 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base text-[#1447E6]">info</span>
              <span>Slip generated preview. Ready for 58mm/80mm roll.</span>
            </span>
            <span className="text-xs font-bold text-[#1447E6] font-mono">
              PKR {sale.total_amount.toLocaleString()}
            </span>
          </div>
        )}

        {/* Paper Width Toggle Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-100 border-b border-slate-200 shrink-0">
          <span className="text-xs font-semibold text-slate-600">Paper Format:</span>
          <div className="inline-flex rounded-lg bg-slate-200 p-0.5">
            <button
              type="button"
              onClick={() => setPaperWidth("58mm")}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                paperWidth === "58mm"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              58mm (32 cols)
            </button>
            <button
              type="button"
              onClick={() => setPaperWidth("80mm")}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                paperWidth === "80mm"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              80mm (48 cols)
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Slip (Thermal Paper Look) */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-200 flex justify-center">
          <div
            className={`bg-[#FFFEF8] text-slate-900 border border-slate-300 rounded-md p-4 shadow-md font-mono text-xs select-all transition-all ${
              paperWidth === "58mm" ? "w-[290px]" : "w-[360px]"
            }`}
            style={{
              fontFamily: "'Courier New', Courier, monospace",
              lineHeight: 1.25,
            }}
          >
            {isDraftPreview && (
              <div className="mb-2 p-1 bg-blue-100 border border-blue-200 rounded text-center text-[10px] font-bold text-blue-800 font-mono">
                [ PRE-PRINT RECEIPT PREVIEW ]
              </div>
            )}
            {isReprint && (
              <div className="mb-2 p-1.5 bg-amber-100 border border-amber-300 rounded text-center text-[10px] font-bold text-amber-900 font-mono">
                AUDITED REPRINT: Zero stock change guaranteed
              </div>
            )}
            <pre className="whitespace-pre-wrap font-inherit text-slate-900">{previewText}</pre>
          </div>
        </div>

        {/* Action Buttons Footer */}
        {isDraftPreview ? (
          <div className="p-4 bg-white border-t border-slate-200 shrink-0 space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={async () => {
                  setIsPrinting(true);
                  try {
                    if (onConfirmAndPrint) {
                      await onConfirmAndPrint();
                    } else {
                      await handlePrintBluetooth();
                    }
                  } finally {
                    setIsPrinting(false);
                  }
                }}
                disabled={isPrinting}
                className="h-12 px-3 bg-[#1447E6] hover:bg-[#0F3BC4] active:scale-98 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-[#1447E6]/25 transition-all disabled:opacity-50"
              >
                <span className={`material-symbols-outlined text-base ${isPrinting ? "animate-spin" : ""}`}>
                  {isPrinting ? "sync" : "print"}
                </span>
                <span>{isPrinting ? "Finalizing & Printing..." : "Confirm & Print Slip"}</span>
              </button>

              {onConfirmWithoutPrint ? (
                <button
                  type="button"
                  onClick={async () => {
                    await onConfirmWithoutPrint();
                  }}
                  className="h-12 px-3 bg-emerald-700 hover:bg-emerald-600 active:scale-98 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-700/20 transition-all"
                >
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  <span>Finalize (No Print)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePrintBrowser}
                  className="h-12 px-3 bg-slate-800 hover:bg-slate-700 active:scale-98 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                >
                  <span className="material-symbols-outlined text-base">print</span>
                  <span>Browser / PDF Print</span>
                </button>
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handlePrintBrowser}
                className="text-[11px] text-slate-600 hover:text-[#1447E6] font-medium flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                <span>System Print Preview</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">edit</span>
                <span>Back to Cart / Edit</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-white border-t border-slate-200 shrink-0 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handlePrintBluetooth}
                disabled={isPrinting}
                className="h-11 px-3 bg-[#1447E6] hover:bg-[#0F3BC4] active:scale-98 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-[#1447E6]/25 transition-all disabled:opacity-50"
              >
                <span className={`material-symbols-outlined text-base ${isPrinting ? "animate-spin" : ""}`}>
                  bluetooth
                </span>
                <span>{isPrinting ? "Sending..." : "Bluetooth Print"}</span>
              </button>

              <button
                type="button"
                onClick={handlePrintBrowser}
                className="h-11 px-3 bg-slate-800 hover:bg-slate-700 active:scale-98 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                <span className="material-symbols-outlined text-base">print</span>
                <span>Browser / PDF</span>
              </button>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handlePrintRawBT}
                className="text-[11px] text-slate-600 hover:text-[#1447E6] font-medium flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">send_to_mobile</span>
                <span>Dispatch via Android RawBT App</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(previewText);
                  onToast("Receipt text copied to clipboard!");
                }}
                className="text-[11px] text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">content_copy</span>
                <span>Copy Slip</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
