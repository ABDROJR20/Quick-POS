# QUICK-POS — DATABASE SCHEMA SPECIFICATION

## Relational Design (Laravel MySQL / PostgreSQL) & Local Storage (IndexedDB)

### 1. `tenants` (Shops)
- `id` (UUID / BigInt, PK)
- `name` (string) — e.g. "Madina Kiryana Store"
- `slug` (string, unique)
- `owner_name` (string)
- `phone` (string) — Pakistani format (+92 3XX XXXXXXX)
- `area` (string) — e.g. "Shah Faisal Town, Karachi"
- `address` (text)
- `template_type` (enum: `kiryana`, `meat`, `biryani`, `tailor`, `boutique`, `custom`)
- `status` (enum: `active`, `suspended`, `grace_period`, `trial`)
- `printer_mac_address` (string, nullable)
- `printer_paper_width` (enum: `58mm`, `80mm`, default: `58mm`)
- `created_at`, `updated_at`

### 2. `users` & `memberships`
- `id`, `tenant_id` (nullable for Super Admin)
- `name`, `email` / `phone`, `password`
- `role` (enum: `super_admin`, `shop_owner`, `cashier`, `sales_rep`)
- `is_active` (boolean)

### 3. `products` & `categories`
- `id`, `tenant_id`
- `category_id` (FK)
- `name` (string) — e.g. "Dal Chana", "Tapal Danedar 450g"
- `sku` / `barcode` (string, indexed)
- `unit` (string: `kg`, `gram`, `pao`, `tola`, `piece`, `packet`, `dozen`)
- `cost_price` (decimal 10,2)
- `sale_price` (decimal 10,2)
- `stock_quantity` (decimal 10,3)
- `min_stock_alert` (decimal 10,3)
- `is_active` (boolean)

### 4. `sales` & `sale_items`
- `id`, `tenant_id`
- `client_transaction_id` (string, unique, e.g. `QP-TXN-172944...`) — prevents duplicate billing
- `invoice_number` (string)
- `customer_id` (FK, nullable)
- `cashier_id` (FK)
- `worker_id` (FK, nullable)
- `subtotal`, `discount_amount`, `tax_amount`, `total_amount` (decimal 10,2)
- `payment_method` (enum: `cash`, `jazzcash`, `easypaisa`, `raast`, `udhaar`, `split`)
- `amount_paid`, `change_returned`, `udhaar_amount` (decimal 10,2)
- `sync_status` (enum: `synced`, `pending_sync`, `failed`)
- `created_at` (timestamp of sale generation)

### 5. `customers` & `udhaar_ledger` (Khata)
- `id`, `tenant_id`
- `name`, `phone`, `area`, `credit_limit`, `current_balance`
- `udhaar_entries`: `id`, `customer_id`, `sale_id`, `amount`, `type` (`debit`/`credit`), `notes`, `created_at`

### 6. `workers` & `commissions`
- `id`, `tenant_id`, `name`, `phone`, `designation`, `commission_type`, `rate`
- `commission_entries`: `id`, `worker_id`, `sale_id`, `earned_amount`, `status` (`pending`, `settled`)

### 7. `subscriptions` & `printer_inventory`
- `id`, `tenant_id`, `plan_name`, `amount`, `due_date`, `grace_ends_at`, `status` (`paid`, `due`, `overdue`)
- `printers`: `serial_number`, `model`, `assigned_tenant_id`, `status` (`in_stock`, `assigned`, `faulty`)
