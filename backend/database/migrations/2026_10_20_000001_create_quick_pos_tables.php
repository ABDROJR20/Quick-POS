<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations for Quick-POS Pakistan SaaS.
     */
    public function up(): void
    {
        // 1. Tenants (Shops)
        Schema::create('tenants', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('owner_name');
            $table->string('phone', 20);
            $table->string('area')->default('Shah Faisal Town, Karachi');
            $table->text('address')->nullable();
            $table->enum('template_type', ['kiryana', 'meat', 'biryani', 'tailor', 'boutique', 'custom'])->default('kiryana');
            $table->enum('status', ['active', 'suspended', 'grace_period', 'trial'])->default('active');
            $table->string('printer_mac_address')->nullable();
            $table->string('printer_paper_width', 10)->default('58mm');
            $table->timestamps();
        });

        // 2. Categories & Products
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->uuid('tenant_id');
            $table->string('name');
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
        });

        Schema::create('products', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->uuid('tenant_id');
            $table->unsignedBigInteger('category_id')->nullable();
            $table->string('category_name')->nullable();
            $table->string('name');
            $table->string('barcode')->nullable()->index();
            $table->string('unit', 20)->default('piece'); // kg, gram, pao, packet, piece
            $table->decimal('cost_price', 10, 2)->default(0);
            $table->decimal('sale_price', 10, 2);
            $table->decimal('stock_quantity', 10, 3)->default(0);
            $table->decimal('min_stock_alert', 10, 3)->default(5);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
        });

        // 3. Customers & Udhaar (Khata Ledger)
        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->uuid('tenant_id');
            $table->string('name');
            $table->string('phone', 20)->nullable();
            $table->string('area')->nullable();
            $table->decimal('credit_limit', 10, 2)->default(0);
            $table->decimal('current_balance', 10, 2)->default(0); // Positive = Udhaar owed by customer
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
        });

        // 4. Sales & Sale Items
        Schema::create('sales', function (Blueprint $table) {
            $table->id();
            $table->uuid('tenant_id');
            $table->string('client_transaction_id')->unique(); // Idempotency token from phone
            $table->string('invoice_number');
            $table->unsignedBigInteger('customer_id')->nullable();
            $table->decimal('subtotal', 10, 2);
            $table->decimal('discount_amount', 10, 2)->default(0);
            $table->decimal('tax_amount', 10, 2)->default(0);
            $table->decimal('total_amount', 10, 2);
            $table->enum('payment_method', ['cash', 'jazzcash', 'easypaisa', 'raast', 'udhaar', 'split']);
            $table->decimal('amount_paid', 10, 2);
            $table->decimal('change_returned', 10, 2)->default(0);
            $table->enum('sync_status', ['pending', 'synced', 'failed'])->default('synced');
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
        });

        Schema::create('sale_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('sale_id');
            $table->string('product_id');
            $table->decimal('quantity', 10, 3);
            $table->decimal('unit_price', 10, 2);
            $table->decimal('total_price', 10, 2);
            $table->timestamps();

            $table->foreign('sale_id')->references('id')->on('sales')->onDelete('cascade');
        });

        // 5. Workers & Commissions
        Schema::create('workers', function (Blueprint $table) {
            $table->id();
            $table->uuid('tenant_id');
            $table->string('name');
            $table->string('phone', 20)->nullable();
            $table->string('designation');
            $table->enum('payment_type', ['salary', 'commission', 'both'])->default('commission');
            $table->decimal('commission_rate', 5, 2)->default(0); // e.g. 5.00%
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
        });

        // 6. Subscriptions & Hardware Printer Inventory
        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->uuid('tenant_id');
            $table->string('plan_name')->default('Standard Shop');
            $table->decimal('amount', 10, 2)->default(1000.00); // PKR 1,000 / month
            $table->date('start_date');
            $table->date('due_date');
            $table->date('grace_ends_at');
            $table->enum('status', ['paid', 'due', 'overdue', 'restricted'])->default('paid');
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
        });

        Schema::create('printer_inventories', function (Blueprint $table) {
            $table->id();
            $table->string('serial_number')->unique();
            $table->string('model')->default('POS-58 Bluetooth Thermal');
            $table->uuid('assigned_tenant_id')->nullable();
            $table->enum('status', ['in_stock', 'assigned', 'faulty'])->default('in_stock');
            $table->date('assigned_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('printer_inventories');
        Schema::dropIfExists('subscriptions');
        Schema::dropIfExists('workers');
        Schema::dropIfExists('sale_items');
        Schema::dropIfExists('sales');
        Schema::dropIfExists('customers');
        Schema::dropIfExists('products');
        Schema::dropIfExists('categories');
        Schema::dropIfExists('tenants');
    }
};
