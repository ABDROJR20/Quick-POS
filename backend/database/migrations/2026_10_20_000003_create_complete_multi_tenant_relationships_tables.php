<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * QUICK-POS — COMPLETE MULTI-TENANT RELATIONSHIPS MIGRATION
 * 
 * Standard 5: Implements relational foreign keys, strict tenant_id scoping,
 * and composite indexes across all 20 core SaaS entities.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Templates (Industry Blueprint Templates)
        if (!Schema::hasTable('templates')) {
            Schema::create('templates', function (Blueprint $table) {
                $table->string('id', 30)->primary(); // e.g. 'kiryana', 'meat', 'biryani', 'tailor', 'boutique', 'custom'
                $table->string('display_name');
                $table->text('description')->nullable();
                $table->json('default_units')->nullable();
                $table->json('default_categories')->nullable();
                $table->json('recommended_modules')->nullable();
                $table->timestamps();
            });
        }

        // 2. Global Users Table
        if (!Schema::hasTable('users')) {
            Schema::create('users', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('name');
                $table->string('email')->nullable()->unique();
                $table->string('phone', 25)->unique();
                $table->string('password');
                $table->boolean('is_super_admin')->default(false);
                $table->string('avatar_url')->nullable();
                $table->rememberToken();
                $table->timestamps();
            });
        }

        // 3. Memberships & Tenant Roles
        if (!Schema::hasTable('memberships')) {
            Schema::create('memberships', function (Blueprint $table) {
                $table->id();
                $table->uuid('tenant_id');
                $table->uuid('user_id');
                $table->enum('role', ['owner', 'manager', 'cashier', 'worker', 'sales_rep'])->default('cashier');
                $table->string('pin_code', 6); // 4-digit terminal cash PIN
                $table->enum('status', ['active', 'suspended', 'revoked'])->default('active');
                $table->json('permissions')->nullable();
                $table->timestamps();

                $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
                $table->unique(['tenant_id', 'user_id']);
                $table->index(['tenant_id', 'role', 'status']);
            });
        }

        // 4. Purchases (Wholesale Stock-In)
        if (!Schema::hasTable('suppliers')) {
            Schema::create('suppliers', function (Blueprint $table) {
                $table->id();
                $table->uuid('tenant_id');
                $table->string('company_name');
                $table->string('contact_person')->nullable();
                $table->string('phone', 25);
                $table->string('area')->default('Jodia Bazar, Karachi');
                $table->decimal('current_balance', 12, 2)->default(0);
                $table->timestamps();

                $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
                $table->index(['tenant_id', 'company_name']);
            });
        }

        if (!Schema::hasTable('purchases')) {
            Schema::create('purchases', function (Blueprint $table) {
                $table->id();
                $table->uuid('tenant_id');
                $table->unsignedBigInteger('supplier_id');
                $table->string('invoice_number');
                $table->decimal('total_amount', 12, 2);
                $table->decimal('paid_amount', 12, 2)->default(0);
                $table->decimal('balance_due', 12, 2)->default(0);
                $table->enum('status', ['received', 'partial', 'pending'])->default('received');
                $table->date('purchased_at');
                $table->timestamps();

                $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
                $table->foreign('supplier_id')->references('id')->on('suppliers')->onDelete('cascade');
                $table->index(['tenant_id', 'invoice_number']);
            });
        }

        // 5. Operating Expenses
        if (!Schema::hasTable('expenses')) {
            Schema::create('expenses', function (Blueprint $table) {
                $table->id();
                $table->uuid('tenant_id');
                $table->string('category', 50); // rent, electricity, generator_fuel, tea, transport
                $table->string('title');
                $table->decimal('amount', 10, 2);
                $table->enum('payment_method', ['cash', 'jazzcash', 'easypaisa', 'bank'])->default('cash');
                $table->uuid('recorded_by_user_id')->nullable();
                $table->text('notes')->nullable();
                $table->date('expense_date');
                $table->timestamps();

                $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
                $table->index(['tenant_id', 'category', 'expense_date']);
            });
        }

        // 6. Payments (Khata & Vendor Settlements)
        if (!Schema::hasTable('payments')) {
            Schema::create('payments', function (Blueprint $table) {
                $table->id();
                $table->uuid('tenant_id');
                $table->string('payment_type', 50); // customer_khata_settlement, supplier_invoice_payment
                $table->string('reference_id')->nullable();
                $table->decimal('amount', 12, 2);
                $table->string('payment_method', 30)->default('cash');
                $table->string('transaction_reference')->nullable();
                $table->uuid('recorded_by_user_id')->nullable();
                $table->text('notes')->nullable();
                $table->timestamp('paid_at')->useCurrent();
                $table->timestamps();

                $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
                $table->index(['tenant_id', 'payment_type', 'paid_at']);
            });
        }

        // 7. Commission Rules, Entries, and Settlements
        if (!Schema::hasTable('commission_rules')) {
            Schema::create('commission_rules', function (Blueprint $table) {
                $table->id();
                $table->uuid('tenant_id');
                $table->string('name');
                $table->enum('rule_type', ['percentage_of_sale', 'fixed_per_order', 'fixed_per_item', 'tiered_monthly_target', 'stitching_per_suit']);
                $table->decimal('rate', 8, 2);
                $table->string('applicable_category')->nullable();
                $table->decimal('min_order_amount', 10, 2)->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();

                $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
                $table->index(['tenant_id', 'is_active']);
            });
        }

        if (!Schema::hasTable('commission_entries')) {
            Schema::create('commission_entries', function (Blueprint $table) {
                $table->id();
                $table->uuid('tenant_id');
                $table->unsignedBigInteger('worker_id');
                $table->unsignedBigInteger('sale_id');
                $table->unsignedBigInteger('rule_id');
                $table->decimal('earned_amount', 10, 2);
                $table->enum('status', ['accrued', 'settled', 'cancelled_refund'])->default('accrued');
                $table->unsignedBigInteger('settlement_id')->nullable();
                $table->timestamp('accrued_at')->useCurrent();
                $table->timestamps();

                $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
                $table->foreign('worker_id')->references('id')->on('workers')->onDelete('cascade');
                $table->foreign('sale_id')->references('id')->on('sales')->onDelete('cascade');
                $table->foreign('rule_id')->references('id')->on('commission_rules')->onDelete('cascade');
                $table->index(['tenant_id', 'worker_id', 'status']);
            });
        }

        if (!Schema::hasTable('commission_settlements')) {
            Schema::create('commission_settlements', function (Blueprint $table) {
                $table->id();
                $table->uuid('tenant_id');
                $table->unsignedBigInteger('worker_id');
                $table->date('period_start');
                $table->date('period_end');
                $table->decimal('total_amount', 10, 2);
                $table->string('payment_method', 30)->default('cash');
                $table->string('payment_reference')->nullable();
                $table->uuid('settled_by_user_id')->nullable();
                $table->timestamp('settled_at')->useCurrent();
                $table->timestamps();

                $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
                $table->foreign('worker_id')->references('id')->on('workers')->onDelete('cascade');
                $table->index(['tenant_id', 'worker_id', 'settled_at']);
            });
        }

        // 8. Devices (Bluetooth Thermal Printers & POS Terminals)
        if (!Schema::hasTable('devices')) {
            Schema::create('devices', function (Blueprint $table) {
                $table->id();
                $table->uuid('tenant_id');
                $table->enum('device_type', ['pos_smartphone', 'bluetooth_printer'])->default('bluetooth_printer');
                $table->string('model')->default('POS-58 Bluetooth Thermal');
                $table->string('serial_number')->nullable();
                $table->string('mac_address', 30)->nullable();
                $table->string('paper_width', 10)->default('58mm');
                $table->boolean('is_authorized')->default(true);
                $table->timestamp('last_paired_at')->nullable();
                $table->timestamps();

                $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
                $table->index(['tenant_id', 'mac_address']);
            });
        }

        // 9. Enabled Modules (Feature Toggles per Store)
        if (!Schema::hasTable('enabled_modules')) {
            Schema::create('enabled_modules', function (Blueprint $table) {
                $table->id();
                $table->uuid('tenant_id');
                $table->string('module_code', 40); // billing, inventory, khata_udhaar, thermal_printing, etc.
                $table->boolean('is_enabled')->default(true);
                $table->timestamps();

                $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
                $table->unique(['tenant_id', 'module_code']);
            });
        }

        // 10. Immutable Audit Logs (Append-Only Trail)
        if (!Schema::hasTable('audit_logs')) {
            Schema::create('audit_logs', function (Blueprint $table) {
                $table->id();
                $table->uuid('tenant_id');
                $table->uuid('user_id')->nullable();
                $table->string('action', 60); // shop.login, price.overridden, sale.voided, etc.
                $table->string('resource_type', 50);
                $table->string('resource_id', 50);
                $table->json('metadata')->nullable();
                $table->string('ip_address', 45)->nullable();
                $table->text('user_agent')->nullable();
                $table->timestamp('created_at')->useCurrent();

                $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
                $table->index(['tenant_id', 'action', 'created_at']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('enabled_modules');
        Schema::dropIfExists('devices');
        Schema::dropIfExists('commission_settlements');
        Schema::dropIfExists('commission_entries');
        Schema::dropIfExists('commission_rules');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('expenses');
        Schema::dropIfExists('purchases');
        Schema::dropIfExists('suppliers');
        Schema::dropIfExists('memberships');
        Schema::dropIfExists('users');
        Schema::dropIfExists('templates');
    }
};
