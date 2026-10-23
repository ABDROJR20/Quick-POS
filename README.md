# Quick-POS — Pakistan Mobile POS & Small Business SaaS

[![Next.js](https://img.shields.io/badge/Next.js-14.2.35-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase_Firestore-14.5-orange?style=flat&logo=firebase)](https://firebase.google.com/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-Proprietary-red)](#)

Quick-POS is a commercial-grade, multi-tenant Point of Sale (POS) and Small Business Management SaaS platform engineered specifically for micro, small, and medium retail merchants in Pakistan.

The pilot launch bundle targets retail clusters in **Shah Faisal Town, Karachi**, combining low-cost 58mm/80mm Bluetooth thermal printers with any Android smartphone to provide an instant, frictionless billing register.

---

## 📑 Table of Contents

1. [Architectural Overview & Monorepo Structure](#1-architectural-overview--monorepo-structure)
2. [Standards Implemented So Far](#2-standards-implemented-so-far)
   - [Standard 1 & 2: Responsive Device Guard & Touch-First POS UX](#standard-1--2-responsive-device-guard--touch-first-pos-ux)
   - [Standard 3 & 4: Super Admin Portal & Store Credential Management](#standard-3--4-super-admin-portal--store-credential-management)
   - [Standard 5: Strict Multi-Tenant SaaS Architecture](#standard-5-strict-multi-tenant-saas-architecture)
   - [Standard 6: Configuration-Driven Business Templates (5 Verticals)](#standard-6-configuration-driven-business-templates-5-verticals)
   - [Standard 7: Staff & Worker Commission Management](#standard-7-staff--worker-commission-management)
   - [Standard 8: Cloud Firestore Central Database Design](#standard-8-cloud-firestore-central-database-design)
   - [Standard 9: Offline-First Billing & Synchronization Engine](#standard-9-offline-first-billing--synchronization-engine)
   - [Standard 10: Bluetooth Thermal Printing Engine](#standard-10-bluetooth-thermal-printing-engine)
3. [Key Modules & Features](#3-key-modules--features)
4. [Live Demo Accounts & Merchant Credentials](#4-live-demo-accounts--merchant-credentials)
5. [Local Development & Verification Guide](#5-local-development--verification-guide)
6. [Documentation Index](#6-documentation-index)

---

## 1. Architectural Overview & Monorepo Structure

```
Quick Pos/
├── frontend/                                   # Next.js 14 App Router (Client & Server APIs)
│   ├── src/
│   │   ├── app/
│   │   │   ├── admin/page.tsx                  # Super Admin Dashboard & Store Provisioning
│   │   │   ├── pos/page.tsx                    # Touch POS Register (Mobile/PWA & Template Engine)
│   │   │   ├── sales/page.tsx                  # Transaction History & Sales Audit
│   │   │   └── api/
│   │   │       ├── firebase/test-connection/   # Live Firestore Healthcheck API
│   │   │       └── pos/sync-transaction/       # Idempotent Transaction Ingestion API
│   │   ├── components/layout/
│   │   │   └── DeviceGuard.tsx                 # Web Desktop QR / Mobile Viewport Guard
│   │   └── lib/
│   │       ├── commission/                     # Standard 7: Commission Engine & Policies
│   │       ├── firebase/                       # Standard 8: Admin (v14) & Client SDKs
│   │       ├── offline/                        # Standard 9: Durable Queue & Sync Engine
│   │       ├── printer/                        # ESC/POS Web Bluetooth 58mm/80mm Thermal Driver
│   │       ├── stores/                         # Multi-Tenant Store Registry & PIN Auth
│   │       ├── templates/                      # Configuration-Driven Business Template Engine
│   │       └── types/                          # Domain & Firestore TypeScript Schemas
│   ├── .env.local                              # Firebase & Cloud Environment Secrets
│   └── firebase-service-account.json           # Secure Server IAM Credentials
├── backend/                                    # Laravel 11 Microservices (Relational Storage)
├── docs/                                       # Authoritative Architecture Specifications
│   ├── FIREBASE_DATA_DESIGN.md                 # Complete 21 Collections Schema & Immutability Spec
│   ├── OFFLINE_FIRST_SPECIFICATION.md          # 4-Tier Offline Queue & Resilience Spec
│   ├── MULTI_TENANT_ARCHITECTURE.md            # Multi-Tenant Isolation & RBAC Matrix
│   └── DATABASE_SCHEMA.md                      # Relational & IndexedDB Schemas
├── firestore.rules                             # Production Firestore Security Rules (Zero-Trust)
├── firestore.indexes.json                      # Composite & Collection-Group Indexes
└── firebase-service-account.json               # Root Service Account Key
```

---

## 2. Standards Implemented So Far

### Standard 1 & 2: Responsive Device Guard & Touch-First POS UX
- **Web Desktop Fallback**: When opened on desktop browsers, renders an informative device guard with live scannable QR code linking to the terminal and step-by-step **Add to Home Screen (PWA)** instructions.
- **Mobile Viewport Auto-Bypass**: When opened on mobile devices (`viewport < 768px` or `device=mobile`), the desktop screen is completely bypassed, navigating merchants directly to store authentication.
- **Pakistani Retail UI Aesthetics**: Built with high-contrast Slate, Cobalt Blue, and Emerald Green palettes, bold Urdu and Roman Urdu product names, and haptic-ready buttons.

### Standard 3 & 4: Super Admin Portal & Store Credential Management
- **Central Administration (`/admin`)**: Super Admins can monitor onboarded merchants, track monthly subscription health, and inspect hardware assignments.
- **Merchant Credential Provisioning**: Admins generate unique **Store Codes** (`MADINA-KIR`, `ALMAKKAH-MEAT`, etc.) and secure **4-digit PINs**.
- **No Self-Signup on Terminal**: Merchants log in using admin-issued credentials only.
- **Product Catalog Management with Photos**:
  - Add and edit products with local file upload (`FileReader` Data URL) or image URLs.
  - Live photo preview box and dedicated catalog photo column.
  - Pakistani quick presets: *Shan Biryani Masala, Tapal Danedar Tea, Dalda Cooking Oil, Mezan Ghee, Gul Ahmed Kurti*.
  - Live synchronization: changes saved in Admin reflect immediately in the customer POS register.

### Standard 5: Strict Multi-Tenant SaaS Architecture
- **20+ Core Domain Entities**: Built with uniform, tamper-proof `tenantId` scoping (`products`, `sales`, `saleItems`, `customers`, `workers`, `expenses`, `auditLogs`, etc.).
- **Zero-Trust Access Control**: Frontend route hiding is never treated as a security layer.
- **Hardened Security Rules (`firestore.rules`)**:
  - Enforces `payloadTenantMatches(tenantId)` across all writes.
  - Prevents cross-tenant document hijacking by matching path variables against resource claims.
  - Locks privileged fields: merchants cannot update `subscriptionStatus = "paid"`.
  - Immutable collections (`auditLogs`, `saleItems`, `reversals`) permanently reject `update` and `delete`.

### Standard 6: Configuration-Driven Business Templates (5 Verticals)
A single reusable POS core dynamically reconfigures its UI, units, portioning, and tabs based on the active store's category:
1. **Template A: Kiryana / General Store** (`MADINA-KIR`):
   - Loose items in kg, gram, pao, tola, packet, pcs.
   - Barcode scanning, low stock alerts, customer Udhaar Khata, and wholesale consignment tracking.
2. **Template B: Meat Shop** (`ALMAKKAH-MEAT`):
   - Live weighing scale simulator (Grams / KG weight-to-rate calculations).
   - Bone discard, fat trimming, cutting loss, and wastage cost logs.
3. **Template C: Biryani / Food Stall** (`STUDENT-BIRYANI`):
   - Portion management: *Full Plate, Half Plate, Double Boti Special*.
   - Parcel takeaway packaging fee toggle.
   - Daily kitchen expense logs (Gas cylinder refills, cooking oil, spices, helper wages).
4. **Template D: Tailor & Karigar** (`MASTER-TAILORS`):
   - Full body measurement specs (Length, Chest, Waist, Collar, Tera, Sleeves, Shalwar, Ghera).
   - Stitching order pipeline (*Cutting → In Stitching → Quality Check → Ready → Delivered*).
   - Advance payments, balance due, and per-suit tailor karigar commission.
5. **Template E: Women's Boutique** (`NOOR-BOUTIQUE`):
   - Variant size selectors (S, M, L, XL), lawn suiting, and sales staff commissions.

### Standard 7: Staff & Worker Commission Management
- **Worker Roster**: Supports staff profiles, roles, joining dates, base salaries, monthly sales targets, and payment modes (*Fixed Salary, Commission Only, Salary + Commission*).
- **7 Calculation Methods Supported**:
  1. Percentage of eligible sales (e.g. 5% on PKR 100,000 = PKR 5,000)
  2. Fixed amount per sale
  3. Product-based commission
  4. Category-based commission
  5. Fixed commission per completed order
  6. Target-based bonus
  7. Multi-worker split
- **Explicit Financial Policies**: `deduct_discounts`, `allow_credit_sales`, `refund_clawback`, `split_enabled`.
- **Interactive POS Worker Tab**:
  - Store-wide KPI Bento Grid (*Total Generated, Earned, Paid Out, Pending Due*).
  - Worker cards with sales target progress bars and status badges.
  - 7 Interactive Modals: *Settlement Disbursement, Digital Receipt Voucher, Commission Ledger Entries, Refund Clawbacks, Rules Inspector, Payout History, and Onboard Worker*.

### Standard 8: Cloud Firestore Central Database Design
- **Cloud Database**: Powered by Google Cloud Firestore on project `abdapp-782f1`.
- **21 Collections & Subcollections**: Full schema definitions, constraints, and validation in [`docs/FIREBASE_DATA_DESIGN.md`](file:///d:/Quick%20Pos/docs/FIREBASE_DATA_DESIGN.md) and [`frontend/src/lib/types/firestore-schema.ts`](file:///d:/Quick%20Pos/frontend/src/lib/types/firestore-schema.ts).
- **Unbounded Document Elimination**: Line items (`saleItems`), customer Khata entries (`khataLedger`), and supplier records use subcollections to protect against the 1 MB Firestore document ceiling.
- **1-Read Bounded Rollups**: Maintains `/tenants/{tenantId}/dailySummaries/{YYYYMMDD}` using `FieldValue.increment()`, reducing daily dashboard reads from thousands to exactly **1 document**.
- **Immutable Financial Ledgers & Reversals**: Completed financial documents are never edited or deleted. Returns and voids generate an immutable `SaleReversal` document with automatic stock restoration and commission clawback.
- **Composite Indexes**: Defined in [`firestore.indexes.json`](file:///d:/Quick%20Pos/firestore.indexes.json).
- **Live Credentials & IAM Verification**: Configured with active service account key, validated via `/api/firebase/test-connection`.

### Standard 9: Offline-First Billing & Synchronization Engine
- **Core Principle**: Uninterrupted offline billing under unstable 2G/3G/4G Pakistani cellular connections.
- **Durable Local Queue (`offlineSyncEngine`)**: Persists pending transactions across browser refreshes, app termination, and phone reboots.
- **Stable Unique Transaction IDs**: Generates client-assigned tokens (e.g. `QP-TXN-MADINAKIR-1792530515766-4821`).
- **Multi-State Machine**: Invoices transition through `pending` → `syncing` → `synced` / `failed`.
- **Duplicate Prevention**: Server-side idempotency guard (`/syncOperations/{clientTransactionId}`) safely acknowledges retries without double-charging or duplicate stock deductions.
- **Conflict Resolution**: Never drops completed customer transactions; records negative stock warnings and Khata credit limit breaches in audit logs.
- **Primary POS Device Scoping**: Single authorized primary handset per shop (`QP-DEV-PRIMARY-...`).
- **POS Queue Control Drawer**:
  - Live status pill in header (`Cloud Synced`, `Offline (X Q)`, `Sync Alert`).
  - Modal with 4 bento metric cards, manual "Sync Now" button, offline simulator, and receipt re-printing.
- **Server API**: Ingests transactions via `/api/pos/sync-transaction`.

### Standard 10: Bluetooth Thermal Printing Engine
- **Tri-Mode Architecture**:
  - Direct in-browser **Web Bluetooth (BLE GATT)** for Android Chrome and desktops.
  - Android **RawBT Print Bridge** (`rawbt:base64,...`) intent fallback for 100% of classic Bluetooth 2.0/3.0 SPP portable printers.
  - Native **System / Browser Print dialog** fallback with `@media print` 58mm / 80mm thermal receipt CSS.
- **58mm (32 cols) & 80mm (48 cols) Precision Formatting**:
  - Strict monospace column alignment rulers.
  - Neat right-aligned currency totals, item quantities, discounts, and payment tenders.
  - Full support for Pakistani retail loose units (*kg, pao, tola, packet, pcs, plate, meters*).
- **Dynamic Store Branding & Tax Credentials**:
  - Active store name, area, phone number, and NTN/tax exemption status.
  - Configurable custom receipt greetings (*Khush-Amdeed*) and return policies (*Aapki Aamad Ka Shukriya! No Exchange without Receipt.*).
- **Audited Duplicate / Reprint Guarantee**:
  - Reprinting past sales prints an unmistakable `*** DUPLICATE / REPRINT RECEIPT ***` watermark with live timestamp.
  - **Zero Stock Change Guarantee**: reprint triggers purely render paper bytes and never modify inventory counts or duplicate sales transactions.
- **Tactile Hardware Diagnostic Bento**:
  - Instant diagnostic slip test (character column ruler check, font styles, barcode and QR test, pass verdict).
  - Tactile hardware actions: paper feed (`+20mm`), auto-cutter, cash drawer solenoid kick pulse, and sound buzzer.
- **Pakistani Retail Troubleshooting Guide**:
  - Integrated Urdu / Roman Urdu and English troubleshooting modal covering Android GPS/location permissions, default Bluetooth pairing codes (`0000`/`1234`), thermal paper roll orientation (nail scratch test), battery load surge drops, and RawBT setup.

---

## 3. Key Modules & Features

| Module | Purpose | Status |
|---|---|:---:|
| **Counter Billing** | Express barcode scan, cart editing, price override, split payments | ✅ Ready |
| **ESC/POS Thermal Printing** | Web Bluetooth 58mm & 80mm printer driver with density control | ✅ Ready |
| **Customer Khata (Udhaar)** | Ledger statement, credit limits, debit on credit sale, repayment vouchers | ✅ Ready |
| **Offline Sync Engine** | Durable transaction queue, auto-retry on reconnect, duplicate prevention | ✅ Ready |
| **Staff & Commissions** | Multi-rule commission calculations, clawbacks, and payout vouchers | ✅ Ready |
| **Weighing Scale Engine** | Gram-to-KG rate calculations with meat wastage & trimming logs | ✅ Ready |
| **Kitchen Expenses** | Petty cash and operating costs tracking for restaurants and stalls | ✅ Ready |
| **Tailor Measurements** | Custom tailoring measurements, advance payments, and job status | ✅ Ready |
| **Super Admin Console** | Merchant provisioning, PIN resets, package tracking, catalog photos | ✅ Ready |
| **Security Audit Logs** | Append-only security ledger for price overrides, refunds, and logins | ✅ Ready |

---

## 4. Live Demo Accounts & Merchant Credentials

Merchants access the POS at `http://localhost:3000/pos` using these pre-configured credentials:

| Business Name | Category | Store Code | PIN | Sample Products |
|---|---|:---:|:---:|---|
| **Madina Kiryana & General Store** | Kiryana / General | `MADINA-KIR` | `1234` | Shan Masala, Tapal Tea, Dalda Oil, Mezan Ghee |
| **Al-Makkah Meat Shop** | Fresh Meat & Poultry | `ALMAKKAH-MEAT` | `5555` | Beef Boti (Bone-in), Boneless Beef, Broiler Chicken |
| **Student Biryani & Food Corner** | Food / Restaurant | `STUDENT-BIRYANI` | `7860` | Chicken Biryani (Full/Half/Double), Raita, Cold Drinks |
| **Master Asif Tailors & Fabrics** | Tailor / Suiting | `MASTER-TAILORS` | `4321` | Shalwar Kameez Stitching, Kurta Pajama, Safari Suit |
| **Noor Designer Boutique** | Women's Fashion | `NOOR-BOUTIQUE` | `9988` | Embroidered Lawn Kurti, 3-Piece Chiffon, Casual Suit |
| **Super Admin Console** | Platform Management | `/admin` | N/A | Full merchant roster, catalog & package control |

---

## 5. Local Development & Verification Guide

### Prerequisites
- **Node.js**: v20+ or v22+
- **npm**: v10+

### Setup & Run
```bash
# 1. Clone repository & navigate to frontend
cd "d:/Quick Pos/frontend"

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# OR build and run optimized production server
npm run build
npm run start
```
The application will be live at **`http://localhost:3000`**.

### Verifying Firebase Cloud Firestore
```bash
# Test Cloud Firestore connection using service account credentials
curl http://localhost:3000/api/firebase/test-connection
```

### Verifying Offline Sync & Idempotency
```bash
# Run the automated sync and duplicate retry test script
node "d:/Quick Pos/scratch/test-sync.mjs"
```

### Verifying Bluetooth Thermal Printer & ESC/POS Generation
```bash
# Run the automated ESC/POS byte, column ruler, and reprint test script
node "d:/Quick Pos/scratch/test-printer.mjs"
```

---

## 6. Documentation Index

Detailed architectural specifications and engineering standards are available in the `docs/` folder:

- [`docs/BLUETOOTH_THERMAL_PRINTING.md`](file:///d:/Quick%20Pos/docs/BLUETOOTH_THERMAL_PRINTING.md): Standard 10 Bluetooth Thermal Printing, ESC/POS byte protocol, 58mm/80mm column math, and RawBT companion bridge specification.
- [`docs/FIREBASE_DATA_DESIGN.md`](file:///d:/Quick%20Pos/docs/FIREBASE_DATA_DESIGN.md): Standard 8 Cloud Firestore schema, unbounded document prevention, and financial immutability specification.
- [`docs/OFFLINE_FIRST_SPECIFICATION.md`](file:///d:/Quick%20Pos/docs/OFFLINE_FIRST_SPECIFICATION.md): Standard 9 offline queue lifecycle, resilience testing, and conflict resolution rules.
- [`docs/MULTI_TENANT_ARCHITECTURE.md`](file:///d:/Quick%20Pos/docs/MULTI_TENANT_ARCHITECTURE.md): Multi-tenant isolation model, RBAC matrix, and security boundaries.
- [`docs/DATABASE_SCHEMA.md`](file:///d:/Quick%20Pos/docs/DATABASE_SCHEMA.md): Relational MySQL / PostgreSQL and IndexedDB entity tables.
- [`firestore.rules`](file:///d:/Quick%20Pos/firestore.rules): Production Firestore Security Rules enforcing tenant isolation and immutability.
- [`firestore.indexes.json`](file:///d:/Quick%20Pos/firestore.indexes.json): Cloud Firestore composite and collection-group indexes.

---

*Quick-POS Pakistan &bull; Developed for Pakistani Retail Resilience & Growth*
