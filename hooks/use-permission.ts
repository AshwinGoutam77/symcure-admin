"use client";

import { getAdminMe, type AdminPermission } from "@/lib/api/admin";
import { useAdminQuery } from "@/hooks/use-admin-api";

export interface MenuPermission {
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
  export: boolean;
}

const NONE: MenuPermission = { view: false, add: false, edit: false, delete: false, export: false };
const ALL: MenuPermission = { view: true, add: true, edit: true, delete: true, export: true };

/**
 * Effective permission for one menu key, from GET /admin/me.
 * UI only — the server re-checks every call and answers 403 PERMISSION_DENIED.
 * While the session is loading everything is false so buttons never flash in.
 */
export function usePermission(...menuKeys: string[]) {
  const { data, isLoading } = useAdminQuery(getAdminMe, ["admin", "me"]);
  const isSuperAdmin = Boolean(data?.role?.is_super_admin);

  let permission: MenuPermission = NONE;
  if (isSuperAdmin) permission = ALL;
  else if (data?.permissions) {
    const matches = (data.permissions as AdminPermission[]).filter(
      (item) => menuKeys.includes(item.key) || menuKeys.includes(item.slug),
    );
    permission = matches.reduce<MenuPermission>(
      (acc, item) => ({
        view: acc.view || Boolean(item.permissions?.view),
        add: acc.add || Boolean(item.permissions?.add),
        edit: acc.edit || Boolean(item.permissions?.edit),
        delete: acc.delete || Boolean(item.permissions?.delete),
        export: acc.export || Boolean(item.permissions?.export),
      }),
      NONE,
    );
  }

  return { ...permission, isSuperAdmin, loading: isLoading, user: data?.user };
}
