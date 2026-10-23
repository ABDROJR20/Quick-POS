<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FinancialPolicyController extends Controller
{
    /**
     * Get real-time financial overview:
     * - Seed Capital balance (PKR 150,000 baseline)
     * - Actual payments collected (separate from financial projections)
     * - Actual hardware procurement costs (PKR 7,000 estimate vs actual invoice)
     * - Actual operating expenses incurred in Shah Faisal Town
     * - Monthly onboarding progress against the 12 stores/month target
     */
    public function getFinancialOverview()
    {
        $policy = DB::table('business_policies')->where('is_active', true)->first();

        $seedCapital = $policy ? (float) $policy->seed_capital_budget : 150000.00;
        $monthlyTarget = $policy ? (int) $policy->monthly_onboarding_target : 12;

        // Actual Hardware Procurement
        $totalHardwareCost = (float) DB::table('hardware_procurements')->sum('actual_procurement_cost');
        $totalHardwareUnits = DB::table('hardware_procurements')->count();

        // Actual Verified Revenues
        $actualOnboardingRev = (float) DB::table('tenant_payments')
            ->whereIn('payment_stage', ['installment_1_onboarding', 'installment_2_printer_handover'])
            ->where('status', 'verified')
            ->sum('amount');

        $actualSubscriptionRev = (float) DB::table('tenant_payments')
            ->where('payment_stage', 'monthly_saas_subscription')
            ->where('status', 'verified')
            ->sum('amount');

        // Actual Operating Expenses
        $totalOperatingExpenses = (float) DB::table('operating_expenses')->sum('amount');

        // Net Cash Balance = Seed Capital + Revenue - Hardware - Expenses
        $currentCashBalance = $seedCapital + $actualOnboardingRev + $actualSubscriptionRev - $totalHardwareCost - $totalOperatingExpenses;

        // Active shops in territory
        $activeShopsCount = DB::table('tenants')->where('status', 'active')->count();

        return response()->json([
            'success' => true,
            'policy' => $policy,
            'metrics' => [
                'seed_capital_budget' => $seedCapital,
                'current_cash_balance' => $currentCashBalance,
                'monthly_onboarding_target' => $monthlyTarget,
                'current_onboarded_stores' => $activeShopsCount,
                'target_completion_percentage' => round(($activeShopsCount / max(1, $monthlyTarget)) * 100, 1),
                'actual_hardware_costs_paid' => $totalHardwareCost,
                'hardware_units_procured' => $totalHardwareUnits,
                'actual_onboarding_revenue_verified' => $actualOnboardingRev,
                'actual_subscription_revenue_verified' => $actualSubscriptionRev,
                'actual_operating_expenses' => $totalOperatingExpenses,
                'launch_territory' => $policy ? $policy->primary_launch_territory : 'Shah Faisal Town, Karachi',
            ]
        ]);
    }

    /**
     * Update business policy configurations (no hardcoded pricing).
     */
    public function updatePolicy(Request $request, $id)
    {
        $validated = $request->validate([
            'seed_capital_budget' => 'nullable|numeric',
            'onboarding_total_package' => 'nullable|numeric',
            'installment_1_amount' => 'nullable|numeric',
            'installment_2_amount' => 'nullable|numeric',
            'monthly_subscription_fee' => 'nullable|numeric',
            'printer_procurement_estimate' => 'nullable|numeric',
            'printer_ownership_policy' => 'nullable|string',
            'monthly_onboarding_target' => 'nullable|integer',
            'primary_launch_territory' => 'nullable|string',
        ]);

        DB::table('business_policies')->where('id', $id)->update(array_merge($validated, [
            'updated_at' => now(),
        ]));

        return response()->json([
            'success' => true,
            'message' => 'Business policy updated successfully.',
        ]);
    }
}
