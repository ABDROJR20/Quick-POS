<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\SyncController;
use App\Http\Controllers\Api\V1\FinancialPolicyController;
use App\Http\Controllers\Api\V1\ProductController;
use App\Http\Controllers\Api\V1\SaleController;

/*
|--------------------------------------------------------------------------
| Quick-POS API Routes (v1)
|--------------------------------------------------------------------------
|
| Handles multi-tenant offline synchronization, business policy management,
| and actual financial ledgers for Pakistani retail SaaS.
|
*/

Route::prefix('v1')->group(function () {
    // Health check
    Route::get('/health', function () {
        return response()->json([
            'status' => 'healthy',
            'app' => 'Quick-POS Pakistan API',
            'version' => '1.0.0',
            'territory' => 'Shah Faisal Town, Karachi',
            'timestamp' => now()->toIso8601String(),
        ]);
    });

    // Offline Sync Endpoints
    Route::post('/sync/sales', [SyncController::class, 'syncSales']);
    Route::get('/sync/catalog', [SyncController::class, 'getCatalog']);

    // Configurable Business Policies & Financial Overview (Section 2)
    Route::get('/admin/financial-overview', [FinancialPolicyController::class, 'getFinancialOverview']);
    Route::put('/admin/business-policies/{id}', [FinancialPolicyController::class, 'updatePolicy']);

    // Standard CRUD
    Route::apiResource('products', ProductController::class);
    Route::apiResource('sales', SaleController::class);
});
