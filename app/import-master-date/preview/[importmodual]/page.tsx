"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { DataTable } from "@/components/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getMaster, createMaster, setMasterStatus } from "@/lib/api/admin";
import { useAdminMutation, useAdminQuery } from "@/hooks/use-admin-api";
import { Plus, RefreshCw } from "lucide-react";

const resources: Record<string,string> = {
  medicines: "master_medicines",
  tests: "master_lab_tests",
  symptoms: "master_symptoms",
  diagnosis: "master_diagnoses",
  "medical-council": "medical_councils",
  colleges: "colleges",
  specializations: "specializations",
  qualifications: "qualification_specializations",
};

export default function MasterPreviewPage() {
  const params = useParams();
  const moduleKey = String(params.importmodual ?? "");
  const resource = resources[moduleKey];
  const [search,setSearch]=useState("");
  const [isActive,setIsActive]=useState("");
  const {data,isLoading,error,refetch}=useAdminQuery(()=>getMaster(resource,{search,is_active:isActive,page:1,limit:50}),["admin","master",resource,{search,isActive,page:1,limit:50}],Boolean(resource));
  const create=useAdminMutation<Record<string,unknown>,unknown>((body)=>createMaster(resource,body));
  const payload:any=data??{};
  const rows:any[]=Array.isArray(payload)?payload:payload.data??[];

  const columns=useMemo(()=>{
    if(!rows.length) return [{header:"ID",key:"id"},{header:"NAME",key:"name"},{header:"STATUS",key:"is_active"}];
    const keys=Object.keys(rows[0]).filter(k=>!["created_at","updated_at"].includes(k)).slice(0,7);
    return keys.map(k=>({header:k.replaceAll("_"," ").toUpperCase(),key:k,render:(v:any)=>typeof v==="boolean"?(v?"Yes":"No"):String(v??"—")}));
  },[rows]);

  async function add(){
    const name=window.prompt("Name:");
    if(!name?.trim()) return;
    await create.mutateAsync({name:name.trim(),is_active:true});
    void refetch();
  }
  async function toggle(row:any){
    await setMasterStatus(resource,String(row.id),!Boolean(row.is_active));
    void refetch();
  }

  if(!resource) return <div className="p-8">Invalid master module.</div>;
  return <div className="p-6 space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-bold capitalize">{moduleKey.replaceAll("-"," ")} Master Data</h1><p className="mt-1 text-sm text-muted-foreground">Live records from {resource}</p></div><div className="flex gap-2"><Button variant="outline" onClick={()=>void refetch()}><RefreshCw className="mr-2 size-4"/>Refresh</Button><Button onClick={()=>void add()} disabled={create.isPending}><Plus className="mr-2 size-4"/>Add</Button></div></div>
    <Card><CardContent className="flex flex-wrap gap-3 pt-6"><Input className="max-w-md" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search master data"/><select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={isActive} onChange={e=>setIsActive(e.target.value)}><option value="">All</option><option value="1">Active</option><option value="0">Inactive</option></select></CardContent></Card>
    {error&&<div className="rounded-lg border border-destructive/25 bg-destructive-soft p-4 text-sm text-destructive">{error.message}</div>}
    <Card><CardHeader className="border-b"><CardTitle>{rows.length} records</CardTitle></CardHeader><CardContent className="pt-6"><DataTable columns={[...columns,{header:"ACTION",key:"action",render:(_,row)=><Button size="sm" variant="outline" onClick={()=>void toggle(row)}>{row.is_active?"Deactivate":"Activate"}</Button>}]} data={isLoading?[]:rows}/></CardContent></Card>
  </div>;
}
