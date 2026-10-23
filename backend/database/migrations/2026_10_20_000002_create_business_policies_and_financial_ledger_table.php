<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations for Quick-POS Configurable Business Policies & Actual Financial Records.
     * Separates actual payments, hardware costs, taxes, and expenses from financial projections.
     */
    public function up(): void
    {
        // 1. Configurable Business Policies (No hardcoded pricing or schedules)
        Schema::create('business_policies', function (Blueprint $table) {
            $table->id();
            $table->string('policy_name')->default('Standard Karachi SME Package');
            $table->decimal('seed_capital_budget', 12, 2)->default(150000.00); // PKR 150,000
            $table->decimal('onboarding_total_package', 10, 2)->default(11000.00); // PKR 11,000
            $table->decimal('installment_1_amount', 10, 2)->default(5000.00); // PKR 5,000
            $table->decimal('installment_2_amount', 10, 2)->default(6000.00); // PKR 6,000
            $table->decimal('monthly_subscription_fee', 10, 2)->default(1000.00); // PKR 1,000
            $table->decimal('printer_procurement_estimate', 10, 2)->default(7000.00); // PKR 7,000
            $table->enum('printer_ownership_policy', [
                'merchant_owned_after_installment_2',
                'company_owned_lease',
                'upfront_purchase'
            ])->default('merchant_owned_after_installment_2');
            $table->unsignedInteger('monthly_onboarding_target')->default(12); // 12 stores / month
            $table->string('primary_launch_territory')->default('Shah Faisal Town, Karachi');
            $table->json('future_expansion_territories')->nullable(); // Gulshan-e-Iqbal, Gulistan-e-Johar, etc.
            $table->json('included_services')->nullable(); // Onsite training, thermal roll bundle, WhatsApp reminders
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // 2. Hardware Procurement Costs (Actual printer acquisition costs recorded separately)
        Schema::create('hardware_procurements', function (Blueprint $table) {
            $table->id();
            $table->string('serial_number')->unique();
            $table->string('model')->default('POS-58 Bluetooth Thermal');
            $table->decimal('actual_procurement_cost', 10, 2); // e.g. PKR 6,850 or PKR 7,200 actual invoice
            $table->string('supplier_name');
            $table->string('supplier_invoice_ref')->nullable();
            $table->enum('hardware_status', ['procured', 'tested', 'dispatched', 'in_repair', 'written_off'])->default('procured');
            $table->uuid('assigned_tenant_id')->nullable();
            $table->date('procured_at');
            $table->timestamps();

            $table->foreign('assigned_tenant_id')->references('id')->on('tenants')->onDelete('set null');
        });

        // 3. Actual Tenant Payments (Actual funds verified, distinguishing stages)
        Schema::create('tenant_payments', function (Blueprint $table) {
            $table->id();
            $table->uuid('tenant_id');
            $table->enum('payment_stage', [
                'installment_1_onboarding',
                'installment_2_printer_handover',
                'monthly_saas_subscription',
                'hardware_repair_accessory',
                'security_deposit'
            ]);
            $table->decimal('amount', 10, 2);
            $table->enum('payment_method', ['jazzcash', 'easypaisa', 'raast', 'bank_transfer', 'cheque']);
            $table->string('payment_reference')->unique(); // Gateway transaction ID / Bank slip ref
            $table->enum('status', ['pending_verification', 'verified', 'rejected', 'refunded'])->default('pending_verification');
            $table->text('verification_notes')->nullable();
            $table->unsignedBigInteger('verified_by_user_id')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
        });

        // 4. Operating Expenses (Actual expenses in Shah Faisal Town recorded separately)
        Schema::create('operating_expenses', function (Blueprint $table) {
            $table->id();
            $table->string('category'); // 'sales_rep_fuel', 'sim_data_charges', 'marketing_leaflets', 'printer_paper_stock'
            $table->decimal('amount', 10, 2);
            $table->string('territory')->default('Shah Faisal Town, Karachi');
            $table->text('description');
            $table->string('receipt_ref')->nullable();
            $table->date('expense_date');
            $table->timestamps();
        });

        // 5. Capital & Investor Ledger (Tracking PKR 150,000 Seed Capital & Cash Runway)
        Schema::create('capital_ledgers', function (Blueprint $table) {
            $table->id();
            $table->string('investor_name')->default('Founding Angel / Seed Fund');
            $table->enum('entry_type', [
                'seed_capital_injection',
                'hardware_procurement_outflow',
                'operating_expense_outflow',
                'subscription_revenue_inflow',
                'onboarding_revenue_inflow',
                'investor_distribution'
            ]);
            $table->decimal('amount', 12, 2);
            $table->decimal('running_capital_balance', 12, 2);
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('capital_ledgers');
        Schema::dropIfExists('operating_expenses');
        Schema::dropIfExists('tenant_payments');
        Schema::dropIfExists('hardware_procurements');
        Schema::dropIfExists('business_policies');
    }
};
