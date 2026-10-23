"use client";

import React, { useState } from "react";
import { escposPrinter } from "@/lib/printer/escpos";

interface PrinterTroubleshootingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrinterTroubleshootingModal({
  isOpen,
  onClose,
}: PrinterTroubleshootingModalProps) {
  const [lang, setLang] = useState<"urdu" | "en">("urdu");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  if (!isOpen) return null;

  const guides = escposPrinter.getTroubleshootingGuidance();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-700 to-indigo-800 text-white shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-2xl">build_circle</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {lang === "urdu" ? "تھرمل پرنٹر حل و رہنمائی" : "Thermal Printer Diagnostics Guide"}
              </h3>
              <p className="text-xs text-blue-100">
                {lang === "urdu"
                  ? "پاکستانی دکانداروں کے لیے عام مسائل اور آسان حل"
                  : "Common Android Bluetooth POS printer issues & instant fixes"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center text-sm transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Language Selector */}
        <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs font-semibold text-slate-600">Language / زبان:</span>
          <div className="inline-flex rounded-lg bg-slate-200 p-0.5">
            <button
              type="button"
              onClick={() => setLang("urdu")}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                lang === "urdu"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              اردو / Roman Urdu
            </button>
            <button
              type="button"
              onClick={() => setLang("en")}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                lang === "en"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              English
            </button>
          </div>
        </div>

        {/* Accordion Guide List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-slate-50">
          {guides.map((item, idx) => {
            const isExpanded = expandedIndex === idx;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                  className="w-full px-4 py-3 text-left flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-lg">{item.icon}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {lang === "urdu" ? item.titleUrdu : item.titleEn}
                    </span>
                  </div>
                  <span
                    className={`material-symbols-outlined text-slate-400 text-lg transition-transform ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  >
                    expand_more
                  </span>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-3.5 pt-1 text-xs text-slate-600 border-t border-slate-100 bg-slate-50/60">
                    <ul className="space-y-1.5 list-disc list-inside">
                      {(lang === "urdu" ? item.stepsUrdu : item.stepsEn).map((step, sIdx) => (
                        <li key={sIdx} className="leading-relaxed">
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}

          {/* Quick Hardware Spec Box */}
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-900 space-y-1 mt-3">
            <div className="flex items-center gap-1.5 font-bold text-amber-950">
              <span className="material-symbols-outlined text-base text-amber-700">info</span>
              <span>Important Hardware Pilot Note:</span>
            </div>
            <p>
              Standard Quick-POS bundle uses <strong>MPT-II / POS-5802 58mm Bluetooth 4.0/BLE</strong> thermal printers.
              Ensure the thermal paper roll width is 57mm x 30mm or 57mm x 40mm.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-white border-t border-slate-200 shrink-0 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}
