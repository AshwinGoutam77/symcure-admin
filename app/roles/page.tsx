"use client";

import { useState } from "react";
import { Plus, RefreshCw, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { getRoles, createRole } from "@/lib/api/admin";
import {
  useAdminMutation,
  useAdminQuery,
} from "@/hooks/use-admin-api";

export default function AdminRolesPage() {
  const [name, setName] = useState("");

  const {
    data,
    isLoading,
    error,
    refetch,
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

  const create = useAdminMutation<
    Record<string, unknown>,
    unknown
  >(createRole);

  const payload: any = data ?? {};

  const roles: any[] = Array.isArray(payload)
    ? payload
    : payload.data ?? [];

  async function save(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName) {
      return;
    }

    try {
      await create.mutateAsync({
        name: trimmedName,
        is_active: true,
      });

      setName("");
      void refetch();
    } catch {
      // Error is displayed through create.error below.
    }
  }

  return (
    <div className="w-full">
      <div className="space-y-5">

        {/* ---------------------------------------------------------------- */}
        {/* Header                                                           */}
        {/* ---------------------------------------------------------------- */}

        <PageHeader
          breadcrumbs={[
            { label: "Administration" },
            { label: "Roles" },
          ]}
          title="Admin Role Management"
          description="Create and manage administrative roles and their server-side permissions."
          className="mb-0"
        />

        {/* ---------------------------------------------------------------- */}
        {/* Error                                                            */}
        {/* ---------------------------------------------------------------- */}

        {(error || create.error) && (
          <div className="rounded-lg border border-destructive/25 bg-destructive-soft px-4 py-3">
            <p className="text-xs font-semibold text-destructive">
              Unable to complete the request
            </p>

            <p className="mt-1 text-xs text-destructive">
              {(error || create.error)?.message ||
                "Something went wrong. Please try again."}
            </p>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Create Role                                                      */}
        {/* ---------------------------------------------------------------- */}

        <section className="overflow-hidden rounded-lg bg-card shadow-sm mt-5">
          <div className="border-b border-border/60 px-5 py-4">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-md bg-primary/10">
                <ShieldCheck className="size-4 text-primary" />
              </div>

              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  Create New Role
                </h2>

                <p className="mt-0.5 text-xs text-muted-foreground/80">
                  Add a role that can be assigned through the permission grid.
                </p>
              </div>
            </div>
          </div>

          <form
            onSubmit={save}
            className="px-5 py-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="w-full sm:max-w-md">
                <label
                  htmlFor="role-name"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.04em] text-muted-foreground"
                >
                  Role Name
                </label>

                <Input
                  id="role-name"
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  placeholder="e.g. Billing Manager"
                  disabled={create.isPending}
                  className="h-9 rounded-lg border-border text-xs shadow-none"
                />
              </div>

              <Button
                type="submit"
                disabled={
                  create.isPending ||
                  !name.trim()
                }
                className="h-9 rounded-lg px-4 text-xs font-semibold"
              >
                {create.isPending ? (
                  <>
                    <RefreshCw className="mr-2 size-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 size-4" />
                    Create Role
                  </>
                )}
              </Button>
            </div>
          </form>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Existing Roles                                                   */}
        {/* ---------------------------------------------------------------- */}

        <section className="overflow-hidden rounded-lg bg-card shadow-sm">

          {/* Header */}
          <div className="flex flex-col gap-3 border-b border-border/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-foreground">
                  Existing Roles
                </h2>

                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                  {roles.length}
                </span>
              </div>

              <p className="mt-0.5 text-xs text-muted-foreground/80">
                Administrative roles currently available in the system.
              </p>
            </div>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="px-5 py-16 text-center">
              <RefreshCw className="mx-auto size-5 animate-spin text-primary" />

              <p className="mt-3 text-xs font-medium text-muted-foreground">
                Loading roles...
              </p>
            </div>
          )}

          {/* Empty */}
          {!isLoading && roles.length === 0 && (
            <div className="px-5 py-16 text-center">
              <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted">
                <ShieldCheck className="size-4 text-muted-foreground/80" />
              </div>

              <p className="mt-3 text-sm font-semibold text-foreground/80">
                No roles found
              </p>

              <p className="mt-1 text-xs text-muted-foreground/80">
                Create a role to get started.
              </p>
            </div>
          )}

          {/* Table */}
          {!isLoading && roles.length > 0 && (
            <div className="mt-5 overflow-x-auto px-5">
              <DataTable
                columns={[
                  {
                    header: "Role ID",
                    key: "id",
                    className: "whitespace-nowrap",
                    render: (value) => (
                      <span className="font-mono text-xs text-muted-foreground">
                        {value ?? "—"}
                      </span>
                    ),
                  },

                  {
                    header: "Role Name",
                    key: "name",
                    render: (value) => (
                      <span className="text-xs font-semibold text-foreground">
                        {value ?? "—"}
                      </span>
                    ),
                  },

                  {
                    header: "Slug",
                    key: "slug",
                    render: (value) => (
                      <span className="font-mono text-xs text-muted-foreground">
                        {value ?? "—"}
                      </span>
                    ),
                  },

                  {
                    header: "Status",
                    key: "is_active",
                    render: (value) => (
                      <StatusBadge
                        status={
                          value
                            ? "active"
                            : "inactive"
                        }
                      />
                    ),
                  },

                  {
                    header: "Assigned Users",
                    key: "assigned_users",
                    align: "right",
                    render: (value, row) => (
                      <span className="text-xs font-semibold text-foreground/80">
                        {value ??
                          row.assigned_users_count ??
                          0}
                      </span>
                    ),
                  },
                ]}
                data={roles}
              />
            </div>
          )}

          {/* Footer */}
          {!isLoading && roles.length > 0 && (
            <div className="mt-5 flex items-center justify-between border-t border-border/60 px-5 py-3 text-xs text-muted-foreground/80">
              <span>
                {roles.length}{" "}
                {roles.length === 1
                  ? "role"
                  : "roles"}{" "}
                available
              </span>

              <span>
                Permission controlled
              </span>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}