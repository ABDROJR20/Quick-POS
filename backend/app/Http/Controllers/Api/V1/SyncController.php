<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SyncController extends Controller
{
    /**
     * Synchronize offline sales from client SQLite to centralized server DB.
     * Enforces strict idempotency via client_transaction_id.
     */
    public function syncSales(Request $request)
    {
        $validated = $request->validate([
            'tenant_id' => 'required|string',
            'sales' => 'required|array',
            'sales.*.client_transaction_id' => 'required|string',
            'sales.*.invoice_number' => 'required|string',
            'sales.*.subtotal' => 'required|numeric',
            'sales.*.total_amount' => 'required|numeric',
            'sales.*.payment_method' => 'required|string',
            'sales.*.items' => 'required|array',
        ]);

        $syncedSaleIds = [];
        $duplicateCount = 0;

        DB::beginTransaction();

        try {
            foreach ($validated['sales'] as $saleData) {
                // Check if already processed (Idempotent protection against network duplicate syncs)
                $existing = DB::table('sales')
                    ->where('client_transaction_id', $saleData['client_transaction_id'])
                    ->first();

                if ($existing) {
                    $syncedSaleIds[] = $saleData['client_transaction_id'];
                    $duplicateCount++;
                    continue;
                }

                // Insert Sale
                $saleId = DB::table('sales')->insertGetId([
                    'tenant_id' => $validated['tenant_id'],
                    'client_transaction_id' => $saleData['client_transaction_id'],
                    'invoice_number' => $saleData['invoice_number'],
                    'customer_id' => $saleData['customer_id'] ?? null,
                    'subtotal' => $saleData['subtotal'],
                    'discount_amount' => $saleData['discount_amount'] ?? 0,
                    'tax_amount' => $saleData['tax_amount'] ?? 0,
                    'total_amount' => $saleData['total_amount'],
                    'payment_method' => $saleData['payment_method'],
                    'amount_paid' => $saleData['amount_paid'] ?? $saleData['total_amount'],
                    'change_returned' => $saleData['change_returned'] ?? 0,
                    'sync_status' => 'synced',
                    'created_at' => $saleData['created_at'] ?? now(),
                    'updated_at' => now(),
                ]);

                // Insert Items and deduct stock
                foreach ($saleData['items'] as $item) {
                    DB::table('sale_items')->insert([
                        'sale_id' => $saleId,
                        'product_id' => $item['product_id'],
                        'quantity' => $item['quantity'],
                        'unit_price' => $item['unit_price'],
                        'total_price' => $item['total_price'],
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);

                    // Deduct inventory
                    DB::table('products')
                        ->where('id', $item['product_id'])
                        ->where('tenant_id', $validated['tenant_id'])
                        ->decrement('stock_quantity', $item['quantity']);
                }

                $syncedSaleIds[] = $saleData['client_transaction_id'];
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Sales successfully synchronized with server.',
                'synced_transaction_ids' => $syncedSaleIds,
                'duplicate_skipped' => $duplicateCount,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Quick-POS offline sync failed', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to synchronize offline sales.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
