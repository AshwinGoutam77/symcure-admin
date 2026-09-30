"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/data-table";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, RefreshCw } from "lucide-react";
import { createRole, getRoles } from "@/lib/api/admin";
import { useAdminMutation, useAdminQuery } from "@/hooks/use-admin-api";

export default function AdminRolesPage() {
  const [name, setName] = useState("");
  const { data, isLoading, error, refetch } = useAdminQuery(() => getRoles({ page: 1, limit: 100 }), ["admin", "roles", { page: 1, limit: 100 }]);
  const create = useAdminMutation<Record<string, unknown>, unknown>(createRole);
  const payload: any = data ?? {};
  const roles: any[] = Array.isArray(payload) ? payload : payload.data ?? [];

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await create.mutateAsync({ name: name.trim(), is_active: true });
    setName("");
    void refetch();
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold tracking-tight">Admin Role Management</h1><p className="mt-1 text-sm text-muted-foreground">Roles are enforced by the server-side permission grid.</p></div>
      <Card><CardContent className="pt-6"><form onSubmit={save} className="flex flex-col gap-3 sm:flex-row sm:items-end"><div className="flex-1"><label className="text-sm font-medium">Role Name</label><Input className="mt-2" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Billing Manager"/></div><Button type="submit" disabled={create.isPending}><Plus className="mr-2 size-4"/>Save Role</Button></form></CardContent></Card>
      {(error || create.error) && <div className="rounded-lg border border-destructive/25 bg-destructive-soft p-4 text-sm text-destructive">{(error || create.error)?.message}</div>}
      <Card><CardContent className="pt-6"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">Existing Roles</h2><Button variant="outline" onClick={()=>void refetch()}><RefreshCw className="mr-2 size-4"/>Refresh</Button></div><DataTable columns={[{header:"ROLE ID",key:"id"},{header:"ROLE NAME",key:"name",render:v=><span className="font-medium">{v}</span>},{header:"SLUG",key:"slug"},{header:"STATUS",key:"is_active",render:v=>v?"Active":"Inactive"},{header:"ASSIGNED USERS",key:"assigned_users",render:(v,row)=>v ?? row.assigned_users_count ?? 0}]} data={isLoading?[]:roles}/></CardContent></Card>
    </div>
  );
}
