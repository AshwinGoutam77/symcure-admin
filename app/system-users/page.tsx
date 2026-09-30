"use client";

import { useState } from "react";
import { DataTable } from "@/components/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { Plus, RefreshCw, Search } from "lucide-react";
import { getSystemUsers, createSystemUser } from "@/lib/api/admin";
import { useAdminMutation, useAdminQuery } from "@/hooks/use-admin-api";

export default function SystemUsersPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useAdminQuery(
    () => getSystemUsers({ search, status, page, limit: 20 }),
    ["admin", "system-users", { search, status, page, limit: 20 }],
  );
  const create = useAdminMutation<Record<string, unknown>, unknown>(createSystemUser);
  const payload: any = data ?? {};
  const rows: any[] = Array.isArray(payload) ? payload : payload.data ?? [];
  const meta = payload.meta ?? {};

  async function addUser() {
    const full_name = window.prompt("Full name:");
    const mobile = window.prompt("Mobile:");
    const password = window.prompt("Temporary password:");
    const role_id = window.prompt("Role ID:");
    if (!full_name || !mobile || !password || !role_id) return;
    await create.mutateAsync({ full_name, mobile, password, role_id });
    void refetch();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="text-3xl font-bold tracking-tight">System Users</h1><p className="mt-1 text-sm text-muted-foreground">Admin panel access management</p></div>
        <div className="flex gap-2"><Button variant="outline" onClick={()=>void refetch()}><RefreshCw className="mr-2 size-4"/>Refresh</Button><Button onClick={()=>void addUser()}><Plus className="mr-2 size-4"/>Add Admin User</Button></div>
      </div>
      <Card><CardContent className="flex flex-wrap gap-3 pt-6">
        <div className="relative min-w-[280px] flex-1"><Search className="absolute left-3 top-3 size-4 text-muted-foreground"/><Input className="pl-9" value={search} onChange={e=>{setPage(1);setSearch(e.target.value)}} placeholder="Search admin user"/></div>
        <select value={status} onChange={e=>{setPage(1);setStatus(e.target.value)}} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
      </CardContent></Card>
      {(error || create.error) && <div className="rounded-lg border border-destructive/25 bg-destructive-soft p-4 text-sm text-destructive">{(error || create.error)?.message}</div>}
      <Card>
        <CardHeader className="border-b border-border"><CardTitle>Admin Users ({meta.total ?? rows.length})</CardTitle></CardHeader>
        <CardContent className="pt-6">
          <DataTable columns={[
            {header:"USER ID",key:"id"},
            {header:"NAME",key:"full_name",render:(v,row)=><span className="font-medium">{v ?? row.name ?? "—"}</span>},
            {header:"MOBILE",key:"mobile"},
            {header:"EMAIL",key:"email"},
            {header:"ROLE",key:"role",render:(v,row)=><span>{v?.name ?? row.role_name ?? "—"}</span>},
            {header:"STATUS",key:"status",render:(v)=>{const s=String(v??"").toLowerCase();return <StatusBadge status={s==="active"?"active":"pending"}>{s||"—"}</StatusBadge>}},
            {header:"LAST LOGIN",key:"last_login_at",render:(v)=>v ?? "—"},
          ]} data={isLoading?[]:rows}/>
          <div className="mt-4 flex justify-end gap-2"><Button variant="outline" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Previous</Button><Button variant="outline" disabled={meta.last_page?page>=meta.last_page:rows.length<20} onClick={()=>setPage(p=>p+1)}>Next</Button></div>
        </CardContent>
      </Card>
    </div>
  );
}
