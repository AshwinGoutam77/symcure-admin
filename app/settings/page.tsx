"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, HardDrive, Save, RefreshCw } from "lucide-react";
import { getSystemSettings, getPaymentSettings, getAppSettings, updateSystemSettings, updatePaymentSettings, updateAppSettings } from "@/lib/api/admin";
import { useAdminMutation, useAdminQuery } from "@/hooks/use-admin-api";

export default function SettingsPage() {
  const system = useAdminQuery(getSystemSettings, ["admin", "system-settings"]);
  const payment = useAdminQuery(getPaymentSettings, ["admin", "payment-settings"]);
  const app = useAdminQuery(getAppSettings, ["admin", "app-settings"]);
  const saveSystem = useAdminMutation<Record<string, unknown>, unknown>(updateSystemSettings);
  const savePayment = useAdminMutation<Record<string, unknown>, unknown>(updatePaymentSettings);
  const saveApp = useAdminMutation<string, unknown>(updateAppSettings);

  const [systemForm, setSystemForm] = useState<Record<string,string>>({});
  const [paymentForm, setPaymentForm] = useState<Record<string,string>>({});
  const [appVersion, setAppVersion] = useState("");

  useEffect(()=>{setSystemForm(((system.data as any)?.settings ?? {}) as Record<string,string>)},[system.data]);
  useEffect(()=>{setPaymentForm(((payment.data as any)?.settings ?? {}) as Record<string,string>)},[payment.data]);
  useEffect(()=>{setAppVersion(String((app.data as any)?.settings?.patient_app_version ?? ""))},[app.data]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between"><div><h1 className="text-3xl font-bold tracking-tight">Platform Settings</h1><p className="mt-1 text-sm text-muted-foreground">Live configuration from the Admin API</p></div><Button variant="outline" onClick={()=>{void system.refetch();void payment.refetch();void app.refetch()}}><RefreshCw className="mr-2 size-4"/>Refresh</Button></div>

      <Card><CardHeader className="border-b border-border"><div className="flex items-center gap-2"><Lock className="size-5"/><CardTitle>System Settings</CardTitle></div></CardHeader><CardContent className="space-y-5 pt-6">
        <SettingInput label="Support Email" value={systemForm.support_email ?? ""} onChange={v=>setSystemForm(f=>({...f,support_email:v}))}/>
        <SettingInput label="Support Mobile" value={systemForm.support_mobile ?? ""} onChange={v=>setSystemForm(f=>({...f,support_mobile:v}))}/>
        <SettingInput label="WhatsApp Number" value={systemForm.whatsapp_number ?? ""} onChange={v=>setSystemForm(f=>({...f,whatsapp_number:v}))}/>
        <SettingInput label="Patient App Version" value={appVersion} onChange={setAppVersion}/>
        <Button onClick={()=>void saveSystem.mutateAsync(systemForm).then(()=>system.refetch())} disabled={saveSystem.isPending}><Save className="mr-2 size-4"/>Save System Settings</Button>
        <Button variant="outline" className="ml-2" onClick={()=>void saveApp.mutateAsync(appVersion).then(()=>app.refetch())} disabled={saveApp.isPending}>Save App Version</Button>
      </CardContent></Card>

      <Card><CardHeader className="border-b border-border"><CardTitle>Payment & Commission Defaults</CardTitle></CardHeader><CardContent className="space-y-5 pt-6">
        <SettingInput label="Default Commission Rate %" value={paymentForm.default_commission_rate ?? ""} onChange={v=>setPaymentForm(f=>({...f,default_commission_rate:v}))}/>
        <SettingInput label="Clinic Commission Amount ₹" value={paymentForm.clinic_consultation_commission_amt ?? ""} onChange={v=>setPaymentForm(f=>({...f,clinic_consultation_commission_amt:v}))}/>
        <SettingInput label="Online Commission Amount ₹" value={paymentForm.online_consultation_commission_amt ?? ""} onChange={v=>setPaymentForm(f=>({...f,online_consultation_commission_amt:v}))}/>
        <Button onClick={()=>void savePayment.mutateAsync(paymentForm).then(()=>payment.refetch())} disabled={savePayment.isPending}><Save className="mr-2 size-4"/>Save Payment Settings</Button>
      </CardContent></Card>

      <Card><CardHeader className="border-b border-border"><div className="flex items-center gap-2"><HardDrive className="size-5"/><CardTitle>Platform Information</CardTitle></div></CardHeader><CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-3"><Info label="API" value="/api/v1"/><Info label="Authentication" value="HttpOnly admin session"/><Info label="Authorization" value="Server-side RBAC"/></CardContent></Card>
    </div>
  );
}

function SettingInput({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}){return <div><label className="text-sm font-medium">{label}</label><Input className="mt-2 max-w-xl" value={value} onChange={e=>onChange(e.target.value)}/></div>}
function Info({label,value}:{label:string;value:string}){return <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>}
