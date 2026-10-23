<?php

namespace App\Models\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

/**
 * QUICK-POS — TENANT ISOLATION GLOBAL SCOPE
 * 
 * Enforces strict multi-tenant boundary on all database queries.
 * Prevents cross-tenant data leakage by automatically applying
 * WHERE tenant_id = ? to all SELECT, UPDATE, and DELETE operations.
 */
class TenantScope implements Scope
{
    /**
     * Apply the tenant isolation scope to a given Eloquent query builder.
     */
    public function apply(Builder $builder, Model $model): void
    {
        // 1. Check for tenant ID in Request Header (e.g. X-Tenant-ID) or Session or Auth Token
        $tenantId = request()->header('X-Tenant-ID') 
            ?? session('active_tenant_id') 
            ?? (auth()->check() ? auth()->user()->current_tenant_id : null);

        // 2. If Super Admin is making a system-wide platform call with root bypass flag
        if (auth()->check() && auth()->user()->is_super_admin && request()->header('X-Bypass-Tenant-Scope') === 'true') {
            return;
        }

        // 3. Bind strict tenant isolation if tenant context is determined
        if ($tenantId) {
            $builder->where($model->getTable() . '.tenant_id', '=', $tenantId);
        } else {
            // If an unauthenticated or tenantless request attempts to access tenant data, force zero records
            // Never allow an unbound query to return all tenants' data
            $builder->whereRaw('1 = 0');
        }
    }

    /**
     * Extend the query builder with convenience macros.
     */
    public function extend(Builder $builder): void
    {
        // Macro to allow Super Admins to explicitly query across all shops for audits
        $builder->macro('withoutTenancy', function (Builder $builder) {
            return $builder->withoutGlobalScope($this);
        });
    }
}
