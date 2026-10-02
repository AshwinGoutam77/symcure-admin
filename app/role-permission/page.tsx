"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  RefreshCw,
  Save,
  ShieldCheck,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import {
  getRoles,
  getRolePermissions,
  saveRolePermissions,
} from "@/lib/api/admin";
import {
  useAdminMutation,
  useAdminQuery,
} from "@/hooks/use-admin-api";

const PERMISSIONS = [
  "view",
  "add",
  "edit",
  "delete",
  "export",
] as const;

type PermissionKey = (typeof PERMISSIONS)[number];

export default function RolePermissionsPage() {
  const [roleId, setRoleId] = useState("");
  const [menus, setMenus] = useState<any[]>([]);

  /* ---------------------------------------------------------------------- */
  /* Roles                                                                  */
  /* ---------------------------------------------------------------------- */

  const {
    data: rolesData,
    isLoading: rolesLoading,
  } = useAdminQuery(
    () =>
      getRoles({
        page: 1,
        limit: 100,
      }),
    [
      "admin",
      "roles",
      {
        page: 1,
        limit: 100,
      },
    ],
  );

  const rolesPayload: any = rolesData ?? {};

  const roles: any[] = Array.isArray(rolesPayload)
    ? rolesPayload
    : rolesPayload.data ?? [];

  const selectedRole = useMemo(
    () =>
      roles.find(
        (role) =>
          String(role.id) === String(roleId),
      ),
    [roles, roleId],
  );

  /* ---------------------------------------------------------------------- */
  /* Permissions                                                            */
  /* ---------------------------------------------------------------------- */

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useAdminQuery(
    () => getRolePermissions(roleId),
    [
      "admin",
      "role-permissions",
      roleId,
    ],
    Boolean(roleId),
  );

  const save =
    useAdminMutation<
      {
        roleId: string;
        permissions: any[];
      },
      unknown
    >(({ roleId, permissions }) =>
      saveRolePermissions(
        roleId,
        permissions,
      ),
    );

  useEffect(() => {
    const payload: any = data ?? {};

    setMenus(payload.menus ?? []);
  }, [data]);

  /* ---------------------------------------------------------------------- */
  /* Permission helpers                                                     */
  /* ---------------------------------------------------------------------- */

  function toggle(
    menuIndex: number,
    key: PermissionKey,
  ) {
    setMenus((current) =>
      current.map((menu, index) =>
        index !== menuIndex
          ? menu
          : {
              ...menu,
              permissions: {
                ...menu.permissions,
                [key]:
                  !menu.permissions?.[key],
              },
            },
      ),
    );
  }

  function isChecked(
    menu: any,
    key: PermissionKey,
  ) {
    return Boolean(
      menu.permissions?.[key],
    );
  }

  async function submit() {
    if (!roleId || selectedRole?.is_super_admin) {
      return;
    }

    const permissions = menus.map(
      (menu) => ({
        menu_id:
          menu.menu_id ?? menu.id,

        can_view: Boolean(
          menu.permissions?.view,
        ),

        can_add: Boolean(
          menu.permissions?.add,
        ),

        can_edit: Boolean(
          menu.permissions?.edit,
        ),

        can_delete: Boolean(
          menu.permissions?.delete,
        ),

        can_export: Boolean(
          menu.permissions?.export,
        ),
      }),
    );

    await save.mutateAsync({
      roleId,
      permissions,
    });

    void refetch();
  }

  /* ---------------------------------------------------------------------- */
  /* Render                                                                 */
  /* ---------------------------------------------------------------------- */

  return (
    <div className="w-full">
      <div className="space-y-5">

        {/* ---------------------------------------------------------------- */}
        {/* Header                                                           */}
        {/* ---------------------------------------------------------------- */}

        <PageHeader
          breadcrumbs={[
            { label: "Administration" },
            { label: "Role Permissions" },
          ]}
          title="Role Permissions"
          description="Manage menu-level permissions for each administrative role."
          className="mb-0"
        />

        {/* ---------------------------------------------------------------- */}
        {/* Error                                                             */}
        {/* ---------------------------------------------------------------- */}

        {(error || save.error) && (
          <div className="rounded-lg border border-destructive/25 bg-destructive-soft px-4 py-3 mt-4">
            <p className="text-xs font-semibold text-destructive">
              Unable to update permissions
            </p>

            <p className="mt-1 text-xs text-destructive">
              {(error || save.error)
                ?.message ??
                "Something went wrong. Please try again."}
            </p>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Role Selection                                                   */}
        {/* ---------------------------------------------------------------- */}

        <section className="overflow-hidden rounded-lg bg-card shadow-sm mt-5">
          <div className="border-b border-border/60 px-5 py-4">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-md bg-primary/10">
                <ShieldCheck className="size-4 text-primary" />
              </div>

              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  Select Role
                </h2>

                <p className="mt-0.5 text-xs text-muted-foreground/80">
                  Choose a role to manage its menu permissions.
                </p>
              </div>
            </div>
          </div>

          <div className="px-5 py-4">
            <label
              htmlFor="role"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.04em] text-muted-foreground"
            >
              Role
            </label>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <select
                id="role"
                value={roleId}
                onChange={(event) => {
                  setRoleId(
                    event.target.value,
                  );
                  setMenus([]);
                }}
                disabled={rolesLoading}
                className="h-9 w-full rounded-lg border border-border bg-card px-3 text-xs text-foreground/80 outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 sm:max-w-md"
              >
                <option value="">
                  {rolesLoading
                    ? "Loading roles..."
                    : "Select role"}
                </option>

                {roles.map((role) => (
                  <option
                    key={role.id}
                    value={role.id}
                  >
                    {role.name}
                    {role.is_super_admin
                      ? " — Super Admin"
                      : ""}
                  </option>
                ))}
              </select>

              {selectedRole && (
                <div className="inline-flex h-9 items-center rounded-lg bg-muted px-3 text-xs font-medium text-muted-foreground">
                  {selectedRole.is_super_admin
                    ? "All permissions enabled"
                    : "Custom permissions"}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Permissions                                                      */}
        {/* ---------------------------------------------------------------- */}

        {roleId && (
          <section className="overflow-hidden rounded-lg bg-card shadow-sm">

            {/* Header */}
            <div className="flex flex-col gap-3 border-b border-border/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-foreground">
                    Menu Permissions
                  </h2>

                  {menus.length > 0 && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                      {menus.length}
                    </span>
                  )}
                </div>

                <p className="mt-0.5 text-xs text-muted-foreground/80">
                  Configure what this role can view, add, edit, delete, or export.
                </p>
              </div>

              <Button
                type="button"
                onClick={() =>
                  void submit()
                }
                disabled={
                  isLoading ||
                  save.isPending ||
                  Boolean(
                    selectedRole?.is_super_admin,
                  )
                }
                className="h-9 rounded-lg px-4 text-xs font-semibold"
              >
                {save.isPending ? (
                  <>
                    <RefreshCw className="mr-2 size-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 size-4" />
                    Save Permissions
                  </>
                )}
              </Button>
            </div>

            {/* Super Admin notice */}
            {selectedRole?.is_super_admin && (
              <div className="border-b border-border/60 bg-muted/40 px-5 py-3">
                <p className="text-xs text-muted-foreground">
                  This is a Super Admin role. Its permissions are controlled by the server and cannot be modified here.
                </p>
              </div>
            )}

            {/* Loading */}
            {isLoading && (
              <div className="px-5 py-16 text-center">
                <RefreshCw className="mx-auto size-5 animate-spin text-primary" />

                <p className="mt-3 text-xs font-medium text-muted-foreground">
                  Loading permissions...
                </p>
              </div>
            )}

            {/* Empty */}
            {!isLoading &&
              menus.length === 0 && (
                <div className="px-5 py-16 text-center">
                  <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted">
                    <ShieldCheck className="size-4 text-muted-foreground/80" />
                  </div>

                  <p className="mt-3 text-sm font-semibold text-foreground/80">
                    No permissions found
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground/80">
                    No menu permissions were returned for this role.
                  </p>
                </div>
              )}

            {/* Permission table */}
            {!isLoading &&
              menus.length > 0 && (
                <div className="overflow-x-auto px-5 py-5">
                  <div className="overflow-hidden rounded-lg border border-border">
                    <table className="w-full min-w-[760px]">
                      <thead>
                        <tr className="border-b border-border bg-muted/60">
                          <th className="h-11 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Menu
                          </th>

                          {PERMISSIONS.map(
                            (permission) => (
                              <th
                                key={permission}
                                className="h-11 px-4 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                              >
                                {permission}
                              </th>
                            ),
                          )}
                        </tr>
                      </thead>

                      <tbody>
                        {menus.map(
                          (menu, index) => {
                            const menuDisabled =
                              Boolean(
                                selectedRole?.is_super_admin,
                              );

                            return (
                              <tr
                                key={
                                  menu.menu_id ??
                                  menu.id ??
                                  index
                                }
                                className="border-b border-border last:border-b-0 hover:bg-muted/30"
                              >
                                <td className="px-4 py-3">
                                  <div>
                                    <p className="text-xs font-semibold text-foreground">
                                      {menu.name ??
                                        menu.key ??
                                        "—"}
                                    </p>

                                    {menu.key &&
                                      menu.name &&
                                      menu.key !==
                                        menu.name && (
                                        <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                                          {
                                            menu.key
                                          }
                                        </p>
                                      )}
                                  </div>
                                </td>

                                {PERMISSIONS.map(
                                  (permission) => {
                                    const checked =
                                      isChecked(
                                        menu,
                                        permission,
                                      );

                                    return (
                                      <td
                                        key={
                                          permission
                                        }
                                        className="px-4 py-3 text-center"
                                      >
                                        <button
                                          type="button"
                                          disabled={
                                            menuDisabled
                                          }
                                          aria-label={`${permission} ${menu.name ?? menu.key}`}
                                          aria-pressed={
                                            checked
                                          }
                                          onClick={() =>
                                            toggle(
                                              index,
                                              permission,
                                            )
                                          }
                                          className={[
                                            "mx-auto flex size-7 items-center justify-center rounded-md border transition-colors",
                                            checked
                                              ? "border-primary bg-primary text-primary-foreground"
                                              : "border-border bg-card text-transparent hover:border-primary/50 hover:bg-muted",
                                            menuDisabled &&
                                              "cursor-not-allowed opacity-50",
                                          ]
                                            .filter(
                                              Boolean,
                                            )
                                            .join(
                                              " ",
                                            )}
                                        >
                                          {checked ? (
                                            <Check className="size-4" />
                                          ) : (
                                            <X className="size-3.5 opacity-0" />
                                          )}
                                        </button>
                                      </td>
                                    );
                                  },
                                )}
                              </tr>
                            );
                          },
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            {/* Footer */}
            {!isLoading &&
              menus.length > 0 && (
                <div className="flex flex-col gap-2 border-t border-border/60 px-5 py-3 text-xs text-muted-foreground/80 sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    {menus.length}{" "}
                    {menus.length === 1
                      ? "menu"
                      : "menus"}{" "}
                    configured
                  </span>

                  <span>
                    Permission changes are applied server-side
                  </span>
                </div>
              )}
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* No Role Selected                                                 */}
        {/* ---------------------------------------------------------------- */}

        {!roleId && (
          <Card className="overflow-hidden">
            <div className="px-5 py-16 text-center">
              <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted">
                <ShieldCheck className="size-4 text-muted-foreground/80" />
              </div>

              <p className="mt-3 text-sm font-semibold text-foreground/80">
                Select a role to continue
              </p>

              <p className="mt-1 text-xs text-muted-foreground/80">
                Choose a role above to view and manage its permissions.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}