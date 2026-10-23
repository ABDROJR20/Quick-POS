# QUICK-POS — SECURITY & TENANT ISOLATION SPECIFICATION

## 1. Multi-Tenant Isolation
- Strict separation by `tenant_id`.
- Laravel backend uses Global Scopes (`TenantScope`) ensuring queries automatically filter by authenticated tenant.
- Sanctum bearer tokens carry the user's `tenant_id` and `role`.
- Sales Reps and Cashiers are strictly barred from tenant administrative tables or cross-tenant data.

## 2. Server-Side Validation & Idempotency
- All financial calculations (subtotals, discounts, taxes, worker commissions) are validated on the backend.
- Sales synchronization enforces unique `client_transaction_id` constraint: if a phone retries syncing after network reconnection, it never creates duplicate sales or duplicate inventory deductions.

## 3. Audit Logs
- Sensitive actions (shop suspension, manual payment verification, cash drawer reconciliation, price overrides) are written to `audit_logs` table.
