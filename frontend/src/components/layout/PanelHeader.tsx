"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Printer,
  Wifi,
  WifiOff,
  Store,
  Shield,
  Briefcase,
  Layers,
  ArrowRight,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Link001,
  Link002,
  Link003,
  Link004,
  Link005,
} from "@/components/ui/skiper-ui/skiper40";
import { escposPrinter } from "@/lib/printer/escpos";
import { sqliteDb } from "@/lib/offline/sqlite-db";

interface PanelHeaderProps {
  currentPanel: "admin" | "pos" | "sales";
}

export function PanelHeader({ currentPanel }: PanelHeaderProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [printerConnected, setPrinterConnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    setPendingSyncCount(sqliteDb.getPendingSyncCount());
    setPrinterConnected(escposPrinter.isConnected());

    const prevOnStatusChange = escposPrinter.onStatusChange;
    escposPrinter.onStatusChange = (status) => {
      setPrinterConnected(status === "CONNECTED");
      if (prevOnStatusChange) prevOnStatusChange(status);
    };

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleConnectPrinter = async () => {
    try {
      if (escposPrinter.isConnected()) {
        escposPrinter.disconnect();
        setPrinterConnected(false);
        sqliteDb.updatePrinterConfig({ is_connected: 0 });
        return;
      }
      const connected = await escposPrinter.connect();
      setPrinterConnected(connected);
      sqliteDb.updatePrinterConfig({ is_connected: connected ? 1 : 0 });
    } catch (err: any) {
      alert("Bluetooth printer error: " + (err.message || err));
    }
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/95 px-4 backdrop-blur-md z-40">
      {/* Brand & Active Panel Info */}
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 font-black text-white shadow-lg shadow-emerald-950/60">
            QP
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white">Quick-POS</span>
              {currentPanel === "admin" && (
                <Badge variant="outline" className="border-purple-500/40 text-purple-400 text-[10px] py-0 px-1.5 font-mono">
                  Super Admin [Panel A]
                </Badge>
              )}
              {currentPanel === "pos" && (
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-[10px] py-0 px-1.5 font-mono">
                  Customer POS [Panel B]
                </Badge>
              )}
              {currentPanel === "sales" && (
                <Badge variant="outline" className="border-amber-500/40 text-amber-400 text-[10px] py-0 px-1.5 font-mono">
                  Field Rep [Panel C]
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <span>Shah Faisal Town, Karachi</span> • <span className="text-slate-500 font-mono">Pilot v1.0</span>
            </p>
          </div>
        </Link>
      </div>

      {/* Skiper-UI Animated Links for Panel Switching */}
      <nav className="hidden md:flex items-center gap-6 text-xs font-semibold">
        <Link
          href="/pos"
          className={currentPanel === "pos" ? "text-emerald-400 font-bold" : "text-slate-400 hover:text-slate-200"}
        >
          <Link001 href="/pos">Customer POS</Link001>
        </Link>

        <Link
          href="/sales"
          className={currentPanel === "sales" ? "text-amber-400 font-bold" : "text-slate-400 hover:text-slate-200"}
        >
          <Link005 href="/sales">Sales Rep Field Portal</Link005>
        </Link>

        {currentPanel === "admin" && (
          <span className="text-purple-400 font-bold text-xs bg-purple-500/10 px-2.5 py-1 rounded-md border border-purple-500/20">
            Super Admin Console
          </span>
        )}
      </nav>

      {/* Action Controls & Hardware Sync */}
      <div className="flex items-center gap-2">
        {/* Bluetooth Thermal Printer */}
        <Button
          size="sm"
          variant={printerConnected ? "default" : "outline"}
          onClick={handleConnectPrinter}
          className={`h-9 gap-1.5 text-xs font-semibold ${
            printerConnected
              ? "bg-emerald-600 hover:bg-emerald-500 text-white"
              : "border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
          }`}
        >
          <Printer className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">
            {printerConnected ? "Printer Paired" : "Connect BT Printer"}
          </span>
          <span className="sm:hidden">{printerConnected ? "BT" : "Pair"}</span>
        </Button>

        {/* Offline SQLite Status */}
        <div className="flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs">
          {isOnline ? (
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden sm:inline">Online</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-amber-400 font-medium">
              <WifiOff className="h-3.5 w-3.5" />
              <span>Offline</span>
            </span>
          )}
          {pendingSyncCount > 0 && (
            <Badge variant="warning" className="ml-1 text-[10px] py-0 px-1 font-mono">
              {pendingSyncCount} queued
            </Badge>
          )}
        </div>
      </div>
    </header>
  );
}
