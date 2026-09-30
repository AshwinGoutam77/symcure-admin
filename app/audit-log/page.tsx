"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/data-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RefreshCw, Search } from "lucide-react";
import { getActivityLogs } from "@/lib/api/admin";
import { useAdminQuery } from "@/hooks/use-admin-api";

export default function AuditLogPage() {
  const [search, setSearch] = useState("");
  const [module, setModule] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useAdminQuery(
    () => getActivityLogs({ search, module, page, limit: 50 }),
    ["admin", "activity-logs", { search, module, page, limit: 50 }],
  );
  const payload: any = data ?? {};
  const rows: any[] = Array.isArray(payload) ? payload : payload.data ?? [];
  const meta = payload.meta ?? {};

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="text-3xl font-bold tracking-tight">Audit Log</h1><p className="mt-1 text-sm text-muted-foreground">Immutable admin activity trail</p></div>
        <Button variant="outline" onClick={()=>void refetch()}><RefreshCw className="mr-2 size-4"/>Refresh</Button>
      </div>
      <Card><CardContent className="flex flex-wrap gap-3 pt-6">
        <div className="relative min-w-[280px] flex-1"><Search className="absolute left-3 top-3 size-4 text-muted-foreground"/><Input className="pl-9" value={search} onChange={e=>{setPage(1);setSearch(e.target.value)}} placeholder="Search actor, entity or description"/></div>
        <Input value={module} onChange={e=>{setPage(1);setModule(e.target.value)}} placeholder="Module" className="w-[180px]"/>
      </CardContent></Card>
      {error && <div className="rounded-lg border border-destructive/25 bg-destructive-soft p-4 text-sm text-destructive">{error.message}</div>}
      <Card>
        <CardHeader className="border-b border-border"><CardTitle>Activity Events ({meta.total ?? rows.length})</CardTitle></CardHeader>
        <CardContent className="pt-6">
          <DataTable columns={[
            {header:"TIMESTAMP",key:"created_at",render:(v,row)=>v ?? row.timestamp ?? "—"},
            {header:"ACTOR",key:"actor_name",render:(v,row)=>v ?? row.actor ?? "—"},
            {header:"ROLE",key:"role_name",render:(v)=>v ?? "—"},
            {header:"MODULE",key:"module"},
            {header:"ACTION",key:"action"},
            {header:"ENTITY",key:"entity_label",render:(v,row)=>v ?? row.entity_id ?? "—"},
            {header:"DESCRIPTION",key:"description"},
            {header:"STATUS",key:"status"},
          ]} data={isLoading?[]:rows}/>
          <div className="mt-4 flex justify-end gap-2"><Button variant="outline" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Previous</Button><Button variant="outline" disabled={meta.last_page?page>=meta.last_page:rows.length<50} onClick={()=>setPage(p=>p+1)}>Next</Button></div>
        </CardContent>
      </Card>
    </div>
  );
}
