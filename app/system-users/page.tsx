"use client";

import { useState } from "react";
import {
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";

import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import {
  getSystemUsers,
  createSystemUser,
} from "@/lib/api/admin";
import {
  useAdminMutation,
  useAdminQuery,
} from "@/hooks/use-admin-api";

export default function SystemUsersPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const [showCreateModal, setShowCreateModal] =
    useState(false);

  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState("");

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useAdminQuery(
    () =>
      getSystemUsers({
        search,
        status,
        page,
        limit: 20,
      }),
    [
      "admin",
      "system-users",
      {
        search,
        status,
        page,
        limit: 20,
      },
    ],
  );

  const create =
    useAdminMutation<
      Record<string, unknown>,
      unknown
    >(createSystemUser);

  const payload: any = data ?? {};

  const rows: any[] = Array.isArray(payload)
    ? payload
    : payload.data ?? [];

  const meta = payload.meta ?? {};

  const currentPage =
    Number(meta.current_page ?? page);

  const lastPage =
    Number(meta.last_page ?? 1);

  const total =
    Number(meta.total ?? rows.length);

  const perPage =
    Number(meta.per_page ?? 20);

  const startRecord =
    total === 0
      ? 0
      : (currentPage - 1) * perPage + 1;

  const endRecord =
    total === 0
      ? 0
      : Math.min(
          startRecord + rows.length - 1,
          total,
        );

  /* ---------------------------------------------------------------------- */
  /* Create user                                                            */
  /* ---------------------------------------------------------------------- */

  function openCreateModal() {
    setFullName("");
    setMobile("");
    setPassword("");
    setRoleId("");
    create.reset();
    setShowCreateModal(true);
  }

  function closeCreateModal() {
    if (create.isPending) return;

    setShowCreateModal(false);
  }

  async function addUser(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const trimmedName = fullName.trim();
    const trimmedMobile = mobile.trim();
    const trimmedPassword = password.trim();
    const trimmedRoleId = roleId.trim();

    if (
      !trimmedName ||
      !trimmedMobile ||
      !trimmedPassword ||
      !trimmedRoleId
    ) {
      return;
    }

    try {
      await create.mutateAsync({
        full_name: trimmedName,
        mobile: trimmedMobile,
        password: trimmedPassword,
        role_id: trimmedRoleId,
      });

      setShowCreateModal(false);

      setFullName("");
      setMobile("");
      setPassword("");
      setRoleId("");

      void refetch();
    } catch {
      // Error is displayed through create.error.
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
            { label: "System Users" },
          ]}
          title="System Users"
          description="Manage administrative users who have access to the admin panel."
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
              {(error || create.error)?.message ??
                "Something went wrong. Please try again."}
            </p>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Filters                                                          */}
        {/* ---------------------------------------------------------------- */}

        <section className="overflow-hidden rounded-lg bg-card shadow-sm mt-5">
          <div className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:w-[320px]">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/80" />

              <Input
                value={search}
                onChange={(event) => {
                  setPage(1);
                  setSearch(event.target.value);
                }}
                placeholder="Search admin user..."
                className="h-9 rounded-lg border-border bg-muted/50 pl-9 text-xs shadow-none focus:bg-card"
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                value={status}
                onChange={(event) => {
                  setPage(1);
                  setStatus(event.target.value);
                }}
                className="h-9 min-w-[145px] rounded-lg border border-border bg-muted/50 px-3 text-xs text-foreground/80 outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
              >
                <option value="">
                  All statuses
                </option>

                <option value="active">
                  Active
                </option>

                <option value="inactive">
                  Inactive
                </option>
              </select>

              <Button
                type="button"
                onClick={openCreateModal}
                className="h-9 rounded-lg px-3 text-xs font-semibold"
              >
                <Plus className="mr-2 size-4" />
                Add Admin User
              </Button>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Users table                                                      */}
        {/* ---------------------------------------------------------------- */}

        <section className="overflow-hidden rounded-lg bg-card shadow-sm">

          {/* Header */}
          <div className="flex flex-col gap-3 border-b border-border/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-foreground">
                  Admin Users
                </h2>

                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                  {total}
                </span>
              </div>

              <p className="mt-0.5 text-xs text-muted-foreground/80">
                Users with administrative access to the system.
              </p>
            </div>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="px-5 py-16 text-center">
              <RefreshCw className="mx-auto size-5 animate-spin text-primary" />

              <p className="mt-3 text-xs font-medium text-muted-foreground">
                Loading system users...
              </p>
            </div>
          )}

          {/* Empty */}
          {!isLoading && rows.length === 0 && (
            <div className="px-5 py-16 text-center">
              <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted">
                <ShieldCheck className="size-4 text-muted-foreground/80" />
              </div>

              <p className="mt-3 text-sm font-semibold text-foreground/80">
                No system users found
              </p>

              <p className="mt-1 text-xs text-muted-foreground/80">
                Try changing your filters or add a new admin user.
              </p>
            </div>
          )}

          {/* Table */}
          {!isLoading && rows.length > 0 && (
            <div className="mt-5 overflow-x-auto px-5">
              <DataTable
                columns={[
                  {
                    header: "User ID",
                    key: "id",
                    className:
                      "whitespace-nowrap",
                    render: (value) => (
                      <span className="font-mono text-xs text-muted-foreground">
                        {value ?? "—"}
                      </span>
                    ),
                  },

                  {
                    header: "Name",
                    key: "full_name",
                    render: (value, row) => (
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-foreground">
                          {value ??
                            row.name ??
                            "—"}
                        </p>
                      </div>
                    ),
                  },

                  {
                    header: "Mobile",
                    key: "mobile",
                    render: (value) => (
                      <span className="text-xs text-foreground/80">
                        {value ?? "—"}
                      </span>
                    ),
                  },

                  {
                    header: "Email",
                    key: "email",
                    render: (value) => (
                      <span className="text-xs text-foreground/80">
                        {value ?? "—"}
                      </span>
                    ),
                  },

                  {
                    header: "Role",
                    key: "role",
                    render: (value, row) => (
                      <span className="text-xs font-medium text-foreground/80">
                        {value?.name ??
                          row.role_name ??
                          "—"}
                      </span>
                    ),
                  },

                  {
                    header: "Status",
                    key: "status",
                    render: (value) => {
                      const normalized =
                        String(
                          value ?? "",
                        ).toLowerCase();

                      return (
                        <StatusBadge
                          status={
                            normalized ===
                            "active"
                              ? "active"
                              : "pending"
                          }
                        >
                          {normalized ||
                            "—"}
                        </StatusBadge>
                      );
                    },
                  },

                  {
                    header: "Last Login",
                    key: "last_login_at",
                    render: (value) => (
                      <span className="text-xs text-muted-foreground">
                        {value ?? "—"}
                      </span>
                    ),
                  },
                ]}
                data={rows}
              />
            </div>
          )}

          {/* Pagination */}
          {!isLoading && rows.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-border/60 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground/80">
                Showing{" "}
                <span className="font-medium text-muted-foreground">
                  {startRecord}
                </span>
                {" – "}
                <span className="font-medium text-muted-foreground">
                  {endRecord}
                </span>
                {" of "}
                <span className="font-medium text-muted-foreground">
                  {total}
                </span>
              </p>

              <Pagination
                currentPage={currentPage}
                totalPages={lastPage}
                disabled={isFetching}
                onPageChange={(nextPage) => {
                  setPage(nextPage);
                }}
              />
            </div>
          )}
        </section>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Create User Modal                                                  */}
      {/* ------------------------------------------------------------------ */}

      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeCreateModal();
            }
          }}
        >
          <div className="w-full max-w-md overflow-hidden rounded-xl bg-card shadow-xl">

            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-border/60 px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-md bg-primary/10">
                    <ShieldCheck className="size-4 text-primary" />
                  </div>

                  <div>
                    <h2 className="text-sm font-semibold text-foreground">
                      Add Admin User
                    </h2>

                    <p className="mt-0.5 text-xs text-muted-foreground/80">
                      Create a new user with admin panel access.
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={closeCreateModal}
                disabled={create.isPending}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={addUser}
              className="space-y-4 px-5 py-5"
            >
              <div>
                <label
                  htmlFor="full-name"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.04em] text-muted-foreground"
                >
                  Full Name
                </label>

                <Input
                  id="full-name"
                  value={fullName}
                  onChange={(event) =>
                    setFullName(
                      event.target.value,
                    )
                  }
                  placeholder="Enter full name"
                  disabled={create.isPending}
                  className="h-9 rounded-lg border-border text-xs shadow-none"
                  autoFocus
                />
              </div>

              <div>
                <label
                  htmlFor="mobile"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.04em] text-muted-foreground"
                >
                  Mobile
                </label>

                <Input
                  id="mobile"
                  value={mobile}
                  onChange={(event) =>
                    setMobile(
                      event.target.value,
                    )
                  }
                  placeholder="Enter mobile number"
                  disabled={create.isPending}
                  className="h-9 rounded-lg border-border text-xs shadow-none"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.04em] text-muted-foreground"
                >
                  Temporary Password
                </label>

                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value,
                    )
                  }
                  placeholder="Enter temporary password"
                  disabled={create.isPending}
                  className="h-9 rounded-lg border-border text-xs shadow-none"
                />
              </div>

              <div>
                <label
                  htmlFor="role-id"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.04em] text-muted-foreground"
                >
                  Role ID
                </label>

                <Input
                  id="role-id"
                  value={roleId}
                  onChange={(event) =>
                    setRoleId(
                      event.target.value,
                    )
                  }
                  placeholder="Enter role ID"
                  disabled={create.isPending}
                  className="h-9 rounded-lg border-border text-xs shadow-none"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-border/60 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeCreateModal}
                  disabled={create.isPending}
                  className="h-9 rounded-lg px-4 text-xs font-semibold shadow-none"
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={
                    create.isPending ||
                    !fullName.trim() ||
                    !mobile.trim() ||
                    !password.trim() ||
                    !roleId.trim()
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
                      Create User
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}