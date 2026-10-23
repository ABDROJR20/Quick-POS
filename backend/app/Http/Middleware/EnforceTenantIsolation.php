<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * QUICK-POS — ENFORCE TENANT ISOLATION MIDDLEWARE
 * 
 * Verifies that every incoming HTTP request belongs strictly to the
 * authorized shop tenant. Rejects URL manipulation, cross-tenant ID
 * parameter spoofing, and unauthorized data access attempts.
 */
class EnforceTenantIsolation
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        // 1. Root Super Admin has platform-wide clearance for maintenance
        if ($request->user() && $request->user()->is_super_admin) {
            return $next($request);
        }

        // 2. Resolve requested Tenant ID from header or route parameters
        $requestedTenantId = $request->header('X-Tenant-ID') 
            ?? $request->route('tenant') 
            ?? $request->route('tenant_id')
            ?? $request->input('tenant_id')
            ?? $request->input('tenantId');

        if (!$requestedTenantId) {
            return response()->json([
                'success' => false,
                'error' => 'Tenant Identifier Required',
                'message' => 'Every API call must specify a valid X-Tenant-ID header or tenant_id parameter.',
                'code' => 'TENANT_HEADER_MISSING',
            ], Response::HTTP_BAD_REQUEST);
        }

        $user = $request->user();

        // 3. Verify user authentication
        if (!$user) {
            return response()->json([
                'success' => false,
                'error' => 'Unauthenticated',
                'message' => 'Valid bearer token required for tenant operations.',
                'code' => 'AUTH_REQUIRED',
            ], Response::HTTP_UNAUTHORIZED);
        }

        // 4. Verify user has an active membership in this specific tenant
        $membership = $user->memberships()
            ->where('tenant_id', $requestedTenantId)
            ->where('status', 'active')
            ->first();

        if (!$membership) {
            // Log security audit for cross-tenant tampering attempt
            \Log::warning("SECURITY ALERT: User {$user->id} attempted unauthorized access to tenant {$requestedTenantId} from IP {$request->ip()}");

            return response()->json([
                'success' => false,
                'error' => 'Tenant Access Denied',
                'message' => "You do not have active authorization to access records for shop '{$requestedTenantId}'.",
                'code' => 'CROSS_TENANT_ACCESS_DENIED',
            ], Response::HTTP_FORBIDDEN);
        }

        // 5. Detect and block Payload Parameter Tampering
        // If request body contains a tenant_id that does not match the header/session tenant, block immediately
        $payloadTenant = $request->input('tenant_id') ?? $request->input('tenantId');
        if ($payloadTenant && strtoupper(trim($payloadTenant)) !== strtoupper(trim($requestedTenantId))) {
            \Log::critical("CRITICAL TAMPERING: Payload tenant ({$payloadTenant}) contradicts authorized tenant ({$requestedTenantId}) by user {$user->id}");

            return response()->json([
                'success' => false,
                'error' => 'Cross-Tenant Payload Tampering Detected',
                'message' => 'Request body tenantId does not match authenticated tenant context. Action terminated.',
                'code' => 'PAYLOAD_TENANT_MISMATCH',
            ], Response::HTTP_FORBIDDEN);
        }

        // 6. Role-Based Permissions Check (if roles are passed to middleware)
        if (!empty($roles) && !in_array($membership->role, $roles)) {
            return response()->json([
                'success' => false,
                'error' => 'Insufficient Role Permissions',
                'message' => "This operation requires one of [" . implode(', ', $roles) . "]. Your role is '{$membership->role}'.",
                'code' => 'ROLE_UNAUTHORIZED',
            ], Response::HTTP_FORBIDDEN);
        }

        // 7. Bind verified tenant to request attributes and session
        $request->attributes->set('tenant_id', $requestedTenantId);
        $request->attributes->set('tenant_membership', $membership);
        session(['active_tenant_id' => $requestedTenantId]);

        return $next($request);
    }
}
