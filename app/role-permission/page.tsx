"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getRoles, getRolePermissions, saveRolePermissions } from "@/lib/api/admin";
import { useAdminMutation, useAdminQuery } from "@/hooks/use-admin-api";

export default function RolePermissionsPage() {
  const [roleId, setRoleId] = useState("");
  const [menus, setMenus] = useState<any[]>([]);
  const { data: rolesData } = useAdminQuery(() => getRoles({ page: 1, limit: 100 }), ["admin", "roles", { page: 1, limit: 100 }]);
  const rolesPayload: any = rolesData ?? {};
  const roles: any[] = Array.isArray(rolesPayload) ? rolesPayload : rolesPayload.data ?? [];

  const { data, isLoading, error, refetch } = useAdminQuery(
    () => getRolePermissions(roleId),
    ["admin", "role-permissions", roleId],
    Boolean(roleId),
  );
  const save = useAdminMutation<{roleId:string; permissions:any[]}, unknown>(({roleId,permissions}) => saveRolePermissions(roleId, permissions));

  useEffect(() => {
    const p: any = data ?? {};
    setMenus(p.menus ?? []);
  }, [data]);

  function toggle(menuIndex: number, key: string) {
    setMenus((current) => current.map((menu, index) => index !== menuIndex ? menu : ({
      ...menu,
      permissions: { ...menu.permissions, [key]: !menu.permissions?.[key] },
    })));
  }

  async function submit() {
    if (!roleId) return;
    const permissions = menus.map((m) => ({
      menu_id: m.menu_id ?? m.id,
      can_view: Boolean(m.permissions?.view),
      can_add: Boolean(m.permissions?.add),
      can_edit: Boolean(m.permissions?.edit),
      can_delete: Boolean(m.permissions?.delete),
      can_export: Boolean(m.permissions?.export),
    }));
    await save.mutateAsync({ roleId, permissions });
    void refetch();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-bold tracking-tight">Role Permissions</h1><p className="mt-1 text-sm text-muted-foreground">The API normalizes permission hierarchy and enforces it on every request.</p></div><Button onClick={()=>void submit()} disabled={!roleId||save.isPending}>Save Permissions</Button></div>
      <Card className="p-5"><label className="text-sm font-medium">Role</label><select value={roleId} onChange={e=>setRoleId(e.target.value)} className="mt-2 h-10 w-full max-w-md rounded-md border border-input bg-background px-3 text-sm"><option value="">Select role</option>{roles.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></Card>
      {error && <div className="rounded-lg border border-destructive/25 bg-destructive-soft p-4 text-sm text-destructive">{error.message}</div>}
      <Card className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/40"><th className="p-3 text-left">Menu</th>{["view","add","edit","delete","export"].map(k=><th key={k} className="p-3 uppercase">{k}</th>)}</tr></thead><tbody>{isLoading ? <tr><td className="p-5" colSpan={6}>Loading…</td></tr> : menus.map((m,i)=><tr key={m.menu_id ?? m.id ?? i} className="border-b last:border-0"><td className="p-3 font-medium">{m.name ?? m.key}</td>{["view","add","edit","delete","export"].map(k=><td key={k} className="p-3 text-center"><input type="checkbox" checked={Boolean(m.permissions?.[k])} disabled={Boolean((data as any)?.role?.is_super_admin)} onChange={()=>toggle(i,k)}/></td>)}</tr>)}</tbody></table></Card>
    </div>
  );
}
