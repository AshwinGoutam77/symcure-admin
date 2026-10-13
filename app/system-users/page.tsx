"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, KeyRound, Lock, Pencil, Plus, Power, RefreshCw, Trash2, UserCog } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AdminModal,
  ConfirmDialog,
  FormField,
  InlineError,
  InlineNotice,
  ListCard,
  ListFooter,
  LoadingBlock,
  NoAccess,
  RowAction,
  SearchInput,
  filterSelectClass,
  selectClass,
  useDebounced,
} from "@/components/admin/kit";
import {
  createSystemUser,
  deleteSystemUser,
  getSystemUser,
  getSystemUserRoles,
  getSystemUsers,
  resetSystemUserPassword,
  setSystemUserStatus,
  updateSystemUser,
} from "@/lib/api/admin";
import { useAdminMutation, useAdminQuery } from "@/hooks/use-admin-api";
import { usePermission } from "@/hooks/use-permission";
import { normalizeList } from "@/lib/list";
import { apiErrorMessage, errorCode, fieldErrors } from "@/lib/api/errors";
import { formatDateTime, getInitials } from "@/lib/formatters";

const LIMIT = 20;

type UserForm = { full_name: string; mobile: string; email: string; password: string; role_id: string };
const EMPTY: UserForm = { full_name: "", mobile: "", email: "", password: "", role_id: "" };

function roleOf(row: any) {
  return row?.role?.name ?? row?.role_name ?? row?.admin_role?.name ?? "—";
}
function roleIdOf(row: any) {
  return String(row?.role?.id ?? row?.admin_role_id ?? row?.role_id ?? "");
}
function isSuperRole(row: any) {
  return Boolean(row?.role?.is_super_admin) || row?.role?.slug === "super_admin";
}

function PasswordInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="new-password"
        className="h-9 pr-9 text-sm"
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export default function SystemUsersPage() {
  const perm = usePermission("system_users");
  const selfId = String(perm.user?.id ?? "");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounced(search);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UserForm>(EMPTY);
  const [formError, setFormError] = useState("");
  const [formFieldErrors, setFormFieldErrors] = useState<Record<string, string>>({});

  const [resetTarget, setResetTarget] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetError, setResetError] = useState("");

  const [confirm, setConfirm] = useState<{ type: "status" | "delete"; row: any } | null>(null);
  const [confirmError, setConfirmError] = useState("");
  const [notice, setNotice] = useState("");

  const params = { search: debouncedSearch.trim(), status, page, limit: LIMIT };
  const listQuery = useAdminQuery(() => getSystemUsers(params), ["admin", "system-users", params], perm.view);
  const list = normalizeList(listQuery.data, page, LIMIT);

  const rolesQuery = useAdminQuery(getSystemUserRoles, ["admin", "system-users", "roles"], perm.view);
  const roles: any[] = (() => {
    const raw: any = rolesQuery.data;
    return Array.isArray(raw) ? raw : Array.isArray(raw?.roles) ? raw.roles : Array.isArray(raw?.data) ? raw.data : [];
  })();

  const detailQuery = useAdminQuery(
    () => getSystemUser(String(editingId)),
    ["admin", "system-user", String(editingId)],
    Boolean(editingId) && formOpen,
  );
  const detail: any = (detailQuery.data as any)?.user ?? detailQuery.data ?? null;

  const saveMutation = useAdminMutation<{ id?: string; body: Record<string, unknown> }, unknown>(({ id, body }) =>
    id ? updateSystemUser(id, body) : createSystemUser(body),
  );
  const resetMutation = useAdminMutation<{ id: string; password: string }, unknown>(({ id, password }) =>
    resetSystemUserPassword(id, password),
  );
  const statusMutation = useAdminMutation<{ id: string; next: "active" | "inactive" }, unknown>(({ id, next }) =>
    setSystemUserStatus(id, next),
  );
  const deleteMutation = useAdminMutation<string, unknown>((id) => deleteSystemUser(id));

  // Fill the edit form once the unmasked detail arrives
  const [filledFor, setFilledFor] = useState<string | null>(null);
  useEffect(() => {
    if (!editingId || !detail || filledFor === editingId || detailQuery.isLoading) return;
    setFilledFor(editingId);
    setForm({
      full_name: detail.full_name ?? "",
      mobile: detail.mobile ?? "",
      email: detail.email ?? "",
      password: "",
      role_id: roleIdOf(detail),
    });
  }, [editingId, detail, filledFor, detailQuery.isLoading]);

  function openCreate() {
    setEditingId(null);
    setFilledFor(null);
    setForm(EMPTY);
    setFormError("");
    setFormFieldErrors({});
    setFormOpen(true);
  }

  function openEdit(row: any) {
    setEditingId(String(row.id));
    setFilledFor(null);
    setForm({ ...EMPTY, full_name: row.full_name ?? "", role_id: roleIdOf(row) });
    setFormError("");
    setFormFieldErrors({});
    setFormOpen(true);
  }

  function update<K extends keyof UserForm>(key: K, value: UserForm[K]) {
    setForm((c) => ({ ...c, [key]: value }));
    setFormFieldErrors((c) => ({ ...c, [key]: "" }));
    setFormError("");
  }

  async function handleSave() {
    const errors: Record<string, string> = {};
    if (!form.full_name.trim()) errors.full_name = "Name is required.";
    if (!/^\d{10}$/.test(form.mobile.trim())) errors.mobile = "Enter a 10-digit mobile number.";
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = "Enter a valid email.";
    if (!editingId && form.password.length < 8) errors.password = "Use at least 8 characters.";
    if (!form.role_id) errors.role_id = "Choose a role.";
    if (Object.keys(errors).length) {
      setFormFieldErrors(errors);
      return;
    }

    const body: Record<string, unknown> = {
      full_name: form.full_name.trim(),
      mobile: form.mobile.trim(),
      email: form.email.trim() || null,
    };
    if (!editingId) {
      body.password = form.password;
      body.role_id = Number(form.role_id);
    } else if (editingId !== selfId && form.role_id !== roleIdOf(detail)) {
      body.role_id = Number(form.role_id);
    }

    try {
      await saveMutation.mutateAsync({ id: editingId ?? undefined, body });
      setFormOpen(false);
      setNotice(
        editingId
          ? body.role_id
            ? "User updated. Their role changed, so they've been logged out and must sign in again."
            : "User updated."
          : "Admin user created.",
      );
    } catch (error) {
      const code = errorCode(error);
      setFormFieldErrors(fieldErrors(error));
      setFormError(
        code === "ROLE_FORBIDDEN"
          ? "Only a super admin can assign the super admin role."
          : code === "USER_PROTECTED"
            ? "This is the protected owner account and can't be modified."
            : apiErrorMessage(error),
      );
    }
  }

  async function handleReset() {
    if (!resetTarget) return;
    if (newPassword.length < 8) {
      setResetError("Use at least 8 characters.");
      return;
    }
    try {
      await resetMutation.mutateAsync({ id: String(resetTarget.id), password: newPassword });
      setNotice(`Password reset for ${resetTarget.full_name}. They've been logged out everywhere.`);
      setResetTarget(null);
    } catch (error) {
      setResetError(apiErrorMessage(error));
    }
  }

  async function handleConfirm() {
    if (!confirm) return;
    setConfirmError("");
    const id = String(confirm.row.id);
    try {
      if (confirm.type === "delete") {
        await deleteMutation.mutateAsync(id);
        setNotice(`${confirm.row.full_name} was deleted and logged out.`);
      } else {
        const next = confirm.row.status === "active" ? "inactive" : "active";
        await statusMutation.mutateAsync({ id, next });
        setNotice(next === "inactive" ? `${confirm.row.full_name} was deactivated and logged out.` : `${confirm.row.full_name} is active again.`);
      }
      setConfirm(null);
    } catch (error) {
      setConfirmError(errorCode(error) === "USER_PROTECTED" ? "This is the protected owner account." : apiErrorMessage(error));
    }
  }

  const columns: DataTableColumn[] = [
    {
      header: "User",
      key: "full_name",
      render: (value, row) => (
        <div className="flex min-w-[200px] items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {getInitials(value, "AD")}
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
              {value}
              {row.is_protected && <Lock className="size-3.5 text-muted-foreground" aria-label="Protected account" />}
              {String(row.id) === selfId && <span className="text-xs font-normal text-muted-foreground">(you)</span>}
            </p>
            <p className="truncate text-xs text-muted-foreground">{[row.mobile, row.email].filter(Boolean).join(" · ")}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Role",
      key: "role",
      render: (_, row) => (
        <StatusBadge tone={isSuperRole(row) ? "violet" : "info"} dot={false}>
          {roleOf(row)}
        </StatusBadge>
      ),
    },
    { header: "Status", key: "status", render: (v) => <StatusBadge status={v} /> },
    { header: "Last login", key: "last_login_at", render: (v) => <span className="text-xs text-muted-foreground">{v ? formatDateTime(v) : "—"}</span> },
  ];
  if (perm.edit || perm.delete) {
    columns.push({
      header: "Actions",
      key: "actions",
      align: "right",
      render: (_, row) => {
        const locked = Boolean(row.is_protected);
        const self = String(row.id) === selfId;
        return (
          <div className="flex justify-end gap-1.5">
            {perm.edit && (
              <>
                <RowAction onClick={() => openEdit(row)} disabled={locked} title={locked ? "Protected owner account" : undefined}>
                  <Pencil className="size-3.5" /> Edit
                </RowAction>
                <RowAction
                  onClick={() => {
                    setResetTarget(row);
                    setNewPassword("");
                    setResetError("");
                  }}
                  disabled={locked}
                >
                  <KeyRound className="size-3.5" /> Reset password
                </RowAction>
                <RowAction
                  onClick={() => {
                    setConfirmError("");
                    setConfirm({ type: "status", row });
                  }}
                  disabled={locked || self}
                  title={self ? "You can't change your own status" : undefined}
                >
                  <Power className="size-3.5" /> {row.status === "active" ? "Deactivate" : "Activate"}
                </RowAction>
              </>
            )}
            {perm.delete && (
              <RowAction
                tone="danger"
                onClick={() => {
                  setConfirmError("");
                  setConfirm({ type: "delete", row });
                }}
                disabled={locked || self}
                title={self ? "You can't delete yourself" : undefined}
              >
                <Trash2 className="size-3.5" /> Delete
              </RowAction>
            )}
          </div>
        );
      },
    });
  }

  if (!perm.loading && !perm.view) return <NoAccess />;

  const editingSelf = editingId !== null && editingId === selfId;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Administration" }, { label: "System Users" }]}
        title="System Users"
        description="Admin panel staff. What each person can do comes from their role."
        actions={
          perm.add && (
            <Button type="button" className="h-9 gap-1.5 text-xs font-semibold" onClick={openCreate}>
              <Plus className="size-4" /> Add admin user
            </Button>
          )
        }
      />

      {notice && (
        <InlineNotice tone="success" className="mb-4">
          {notice}
        </InlineNotice>
      )}

      <ListCard
        title="Admin users"
        subtitle={listQuery.isLoading ? "Loading…" : `${list.total} user${list.total === 1 ? "" : "s"}`}
        error={listQuery.error ? apiErrorMessage(listQuery.error) : undefined}
        filters={
          <>
            <SearchInput
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder="Search name, mobile or email…"
            />
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className={filterSelectClass}
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </>
        }
        footer={<ListFooter list={list} onPageChange={setPage} disabled={listQuery.isFetching} />}
      >
        <DataTable
          columns={columns}
          data={list.rows}
          loading={listQuery.isLoading}
          empty={{ icon: <UserCog className="size-5" />, title: "No admin users found", description: "Try a different search or status." }}
        />
      </ListCard>

      {/* Create / edit */}
      <AdminModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        busy={saveMutation.isPending}
        title={editingId ? "Edit admin user" : "Add admin user"}
        description={editingId ? "Changing someone's role logs them out so the new permissions apply." : "They sign in with this mobile number and password."}
        footer={
          <>
            <Button type="button" variant="outline" className="h-9 text-xs" onClick={() => setFormOpen(false)} disabled={saveMutation.isPending}>
              Cancel
            </Button>
            <Button
              type="button"
              className="h-9 text-xs"
              onClick={() => void handleSave()}
              disabled={saveMutation.isPending || (Boolean(editingId) && detailQuery.isLoading)}
            >
              {saveMutation.isPending && <RefreshCw className="mr-1.5 size-4 animate-spin" />}
              {editingId ? "Save changes" : "Create user"}
            </Button>
          </>
        }
      >
        {editingId && detailQuery.isLoading ? (
          <LoadingBlock label="Loading user…" />
        ) : (
          <>
            <FormField label="Full name" required error={formFieldErrors.full_name}>
              <Input value={form.full_name} onChange={(e) => update("full_name", e.target.value)} className="h-9 text-sm" autoFocus />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Mobile" required error={formFieldErrors.mobile} hint="Must be unique among admins.">
                <Input
                  value={form.mobile}
                  inputMode="numeric"
                  maxLength={10}
                  onChange={(e) => update("mobile", e.target.value.replace(/\D/g, ""))}
                  className="h-9 text-sm"
                />
              </FormField>
              <FormField label="Email" error={formFieldErrors.email}>
                <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className="h-9 text-sm" />
              </FormField>
            </div>
            <FormField
              label="Role"
              required
              error={formFieldErrors.role_id}
              hint={editingSelf ? "You can't change your own role." : undefined}
            >
              <select value={form.role_id} onChange={(e) => update("role_id", e.target.value)} className={selectClass} disabled={editingSelf}>
                <option value="">Select role</option>
                {roles.map((role: any) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
                {/* Keep the current role visible even if it isn't in the active list */}
                {form.role_id && !roles.some((r: any) => String(r.id) === form.role_id) && (
                  <option value={form.role_id}>{roleOf(detail)}</option>
                )}
              </select>
            </FormField>
            {!editingId && (
              <FormField label="Password" required error={formFieldErrors.password} hint="At least 8 characters.">
                <PasswordInput value={form.password} onChange={(v) => update("password", v)} />
              </FormField>
            )}
            <InlineError>{formError}</InlineError>
          </>
        )}
      </AdminModal>

      {/* Reset password */}
      <AdminModal
        open={Boolean(resetTarget)}
        onClose={() => setResetTarget(null)}
        busy={resetMutation.isPending}
        size="sm"
        title="Reset password"
        description={`Set a new password for ${resetTarget?.full_name ?? ""}. They'll be logged out of every device.`}
        footer={
          <>
            <Button type="button" variant="outline" className="h-9 text-xs" onClick={() => setResetTarget(null)} disabled={resetMutation.isPending}>
              Cancel
            </Button>
            <Button type="button" className="h-9 text-xs" onClick={() => void handleReset()} disabled={resetMutation.isPending}>
              {resetMutation.isPending && <RefreshCw className="mr-1.5 size-4 animate-spin" />}
              Reset password
            </Button>
          </>
        }
      >
        <FormField label="New password" required hint="At least 8 characters." error={resetError}>
          <PasswordInput
            value={newPassword}
            onChange={(v) => {
              setNewPassword(v);
              setResetError("");
            }}
          />
        </FormField>
      </AdminModal>

      {/* Status / delete */}
      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={() => void handleConfirm()}
        busy={statusMutation.isPending || deleteMutation.isPending}
        tone={confirm?.type === "status" && confirm.row.status !== "active" ? "default" : "destructive"}
        title={
          confirm?.type === "delete"
            ? "Delete admin user"
            : confirm?.row.status === "active"
              ? "Deactivate admin user"
              : "Activate admin user"
        }
        confirmLabel={confirm?.type === "delete" ? "Delete user" : confirm?.row.status === "active" ? "Deactivate" : "Activate"}
        description={
          confirm?.type === "delete"
            ? `${confirm.row.full_name} loses access immediately and is logged out. The account is kept as deleted for the audit trail.`
            : confirm?.row.status === "active"
              ? `${confirm?.row.full_name} is logged out immediately and can't sign in until reactivated.`
              : `${confirm?.row.full_name} will be able to sign in again.`
        }
        error={confirmError}
      />
    </>
  );
}
