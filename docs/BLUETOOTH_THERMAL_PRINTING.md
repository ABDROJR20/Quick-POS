# QUICK-POS — STANDARD 10: BLUETOOTH THERMAL PRINTING SPECIFICATION

**Version:** 1.0  
**Status:** Implemented & Verified  
**Target Hardware:** 58mm (MPT-II, POS-5802, GOOJPRT) & 80mm (POS-80C, Epson) Thermal Receipt Printers  
**Target Operating Environment:** Android Smartphones (Google Chrome & PWA), Windows/Mac Desktops  
**Market:** Shah Faisal Town, Karachi, Pakistan  

---

## 1. Architectural Overview

Quick-POS implements a **Tri-Mode Bluetooth Thermal Printing Engine** specifically engineered for Pakistani retail merchants. Small retail shops in Karachi utilize portable battery-powered thermal printers (typically procured at PKR 6,500 – 7,500) paired with Android smartphones.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Quick-POS Printing Engine                       │
└────────────────────────────────────────────────────────────────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         ▼                          ▼                          ▼
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│ Mode 1: Web BLE  │      │ Mode 2: RawBT    │      │ Mode 3: Browser  │
│ (BLE GATT 4.0+)  │      │ (Classic SPP)    │      │ Print / PDF      │
├──────────────────┤      ├──────────────────┤      ├──────────────────┤
│ Direct in Chrome │      │ Android Intent:  │      │ @media print     │
│ 000018f0 GATT    │      │ rawbt:base64,... │      │ 58mm / 80mm CSS  │
│ Chunked 100B     │      │ 100% SPP 2.0/3.0 │      │ Any OS Printer   │
└──────────────────┘      └──────────────────┘      └──────────────────┘
```

---

## 2. Supported Hardware Specifications

| Specification | 58mm Portable Roll | 80mm Desktop Counter |
|---|---|---|
| **Print Width** | 48mm printable area | 72mm printable area |
| **Monospace Columns** | **32 characters** / line | **48 characters** / line |
| **Print Head Resolution** | 203 DPI (8 dots / mm) | 203 DPI (8 dots / mm) |
| **Default Baud Rate** | 9600 bps | 19200 / 38400 bps |
| **Bluetooth Protocol** | BLE 4.0 GATT & Classic SPP | Bluetooth 4.0 / USB / LAN |
| **Default Pairing PIN** | `0000` or `1234` | `0000` or `1234` |
| **Paper Roll Diameter** | 57mm x 30mm or 57mm x 40mm | 80mm x 80mm |
| **Current Surge** | 1.5A to 2.5A peak burn | AC adapter powered |

---

## 3. ESC/POS Byte Command Architecture

The driver generates standard ESC/POS hexadecimal command sequences:

1. **Printer Initialization**: `0x1B, 0x40` (`ESC @`)
2. **Text Alignment**:
   - Left: `0x1B, 0x61, 0x00`
   - Center: `0x1B, 0x61, 0x01`
   - Right: `0x1B, 0x61, 0x02`
3. **Character Sizing**:
   - Normal: `0x1D, 0x21, 0x00`
   - Double Height: `0x1D, 0x21, 0x01`
   - Double Width: `0x1D, 0x21, 0x10`
   - Double Height & Width: `0x1D, 0x21, 0x11`
4. **Bold Emphasis**:
   - Bold ON: `0x1B, 0x45, 0x01`
   - Bold OFF: `0x1B, 0x45, 0x00`
5. **Paper Feed**: `0x1B, 0x64, <lines>`
6. **Auto Cutter**:
   - Full Cut: `0x1D, 0x56, 0x41, 0x00`
   - Partial Cut: `0x1D, 0x56, 0x42, 0x00`
7. **Cash Drawer Solenoid Kick Pulse**: `0x1B, 0x70, 0x00, 0x19, 0xFA` (Pin 2 kick)
8. **Audio Beeper Alert**: `0x1B, 0x42, <count>, 0x02`

---

## 4. Column Layout & Monospace Alignment

### 58mm Paper (32 Characters Max)
```
12345678901234567890123456789012
Item            Qty     Total
--------------------------------
Shan Biryani Ma 3 pcs   Rs.  360
Tapal Danedar   1 pkt   Rs.  650
--------------------------------
Subtotal:                Rs.1010
Discount:                 Rs. 50
NET TOTAL:               Rs. 960
Paid (CASH):             Rs.1000
Change Return:           Rs.  40
--------------------------------
```

### 80mm Paper (48 Characters Max)
```
123456789012345678901234567890123456789012345678
Item Name                   Qty     Price    Total
------------------------------------------------
Shan Biryani Masala 50g     3 pcs   120     Rs.360
Tapal Danedar Tea 450g      1 pkt   650     Rs.650
------------------------------------------------
Subtotal:                               Rs. 1010
Discount:                                Rs.  50
NET TOTAL:                              Rs.  960
```

---

## 5. Audited Duplicate / Reprint Guarantee

In compliance with Master Instructions Section 10:
> *"Reprinting of authorized existing receipts... Printing must not create a second sale or duplicate inventory deductions."*

1. When a receipt is reprinted from the POS Register, Transaction Ledger, or Offline Queue Drawer:
   - `isReprint: true` is permanently flagged.
   - The receipt renders a prominent watermark banner:
     ```
     ================================
     *** DUPLICATE / REPRINT ***
     Original Bill: QP-8801
     Reprinted At: 24-Oct-2026 11:30 PM
     Original Sale Unaltered - No Stock Change
     ================================
     ```
   - **Zero Database Changes**: No mutation to `/sales`, no new lines added to `/saleItems`, and zero deductions to `sqliteDb` product inventory.

---

## 6. Pakistani Retail Troubleshooting Guide

Included interactively in the POS terminal with Urdu and Roman Urdu guidance:

1. **Android Location (GPS) Requirement**: Android 6-11 requires GPS enabled to discover Bluetooth devices via Chrome Web Bluetooth API.
2. **Pairing Codes**: Default pairing PIN for Pakistani Chinese thermal printers is `0000` or `1234`.
3. **Paper Roll Orientation (Nail Scratch Test)**: Thermal paper is heat-sensitive on only ONE side. If printer feeds blank paper, flip the roll. Scratch with a fingernail—the side that turns black must face the thermal head.
4. **Current Drop & Battery Shutdown**: Thermal heads draw 1.5A to 2.5A. If the printer powers off mid-receipt, recharge battery for 45 minutes using the original 5V 2A / 9V charger.
5. **RawBT Print Companion**: For non-BLE Classic Bluetooth 2.0/3.0 printers, the free RawBT Print Service app dispatches receipts instantly via intent URL.
