"use client";

import { useState } from "react";
import Link from "next/link";
import { ListChecks, Pencil, Plus, Power, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
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
  NoAccess,
  RowAction,
  SearchInput,
  SwitchRow,
  textareaClass,
  useDebounced,
} from "@/components/admin/kit";
import { createRole, deleteRole, getRoles, updateRole } from "@/lib/api/admin";
import { useAdminMutation, useAdminQuery } from "@/hooks/use-admin-api";
import { usePermission } from "@/hooks/use-permission";
import { normalizeList } from "@/lib/list";
import { apiErrorMessage, errorCode, errorDetails, fieldErrors } from "@/lib/api/errors";
import { formatDate } from "@/lib/formatters";

const LIMIT = 20;

type RoleForm = { name: string; slug: string; description: string; is_active: boolean };
const EMPTY: RoleForm = { name: "", slug: "", description: "", is_active: true };

function isSuper(row: any) {
  return row?.slug === "super_admin" || Boolean(row?.is_super_admin);
}

export default function RolesPage() {
  const perm = usePermission("roles");

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounced(search);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<RoleForm>(EMPTY);
  const [formError, setFormError] = useState("");
  const [formFieldErrors, setFormFieldErrors] = useState<Record<string, string>>({});

  const [confirm, setConfirm] = useState<{ type: "status" | "delete"; row: any } | null>(null);
  const [confirmError, setConfirmError] = useState("");
  const [inUse, setInUse] = useState<number | null>(null);
  const [notice, setNotice] = useState("");

  const params = { search: debouncedSearch.trim(), page, limit: LIMIT };
  const listQuery = useAdminQuery(() => getRoles(params), ["admin", "roles", params], perm.isSuperAdmin);
  const list = normalizeList(listQuery.data, page, LIMIT);

  const saveMutation = useAdminMutation<{ id?: string; body: Record<string, unknown> }, unknown>(({ id, body }) =>
    id ? updateRole(id, body) : createRole(body),
  );
  const deleteMutation = useAdminMutation<string, unknown>((id) => deleteRole(id));

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setFormError("");
    setFormFieldErrors({});
    setFormOpen(true);
  }

  function openEdit(row: any) {
    setEditing(row);
    setForm({ name: row.name ?? "", slug: row.slug ?? "", description: row.description ?? "", is_active: Boolean(row.is_active) });
    setFormError("");
    setFormFieldErrors({});
    setFormOpen(true);
  }

  function update<K extends keyof RoleForm>(key: K, value: RoleForm[K]) {
    setForm((c) => ({ ...c, [key]: value }));
    setFormFieldErrors((c) => ({ ...c, [key]: "" }));
    setFormError("");
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setFormFieldErrors({ name: "Name is required." });
      return;
    }
    const body: Record<string, unknown> = { name: form.name.trim(), description: form.description.trim() || null };
    if (!editing) {
      if (form.slug.trim()) body.slug = form.slug.trim();
      body.is_active = form.is_active;
    }
    try {
      await saveMutation.mutateAsync({ id: editing ? String(editing.id) : undefined, body });
      setFormOpen(false);
      setNotice(editing ? "Role updated." : "Role created. Set what it can do in Role Permissions.");
    } catch (error) {
      setFormFieldErrors(fieldErrors(error));
      setFormError(errorCode(error) === "ROLE_PROTECTED" ? "The super admin role can't be changed." : apiErrorMessage(error));
    }
  }

  async function handleConfirm() {
    if (!confirm) return;
    setConfirmError("");
    setInUse(null);
    const id = String(confirm.row.id);
    try {
      if (confirm.type === "delete") {
        await deleteMutation.mutateAsync(id);
        setNotice(`Role “${confirm.row.name}” deleted.`);
      } else {
        await saveMutation.mutateAsync({ id, body: { is_active: !confirm.row.is_active } });
        setNotice(
          confirm.row.is_active
            ? `Role “${confirm.row.name}” deactivated. Its users were logged out.`
            : `Role “${confirm.row.name}” is active again.`,
        );
      }
      setConfirm(null);
    } catch (error) {
      const code = errorCode(error);
      if (code === "ROLE_IN_USE") {
        setInUse(Number(errorDetails<any>(error)?.assigned_users ?? 0) || 1);
        return;
      }
      setConfirmError(code === "ROLE_PROTECTED" ? "The super admin role is protected." : apiErrorMessage(error));
    }
  }

  const columns: DataTableColumn[] = [
    {
      header: "Role",
      key: "name",
      render: (value, row) => (
        <div className="min-w-[180px]">
          <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            {value}
            {isSuper(row) && (
              <StatusBadge tone="violet" dot={false}>
                Full access
              </StatusBadge>
            )}
          </p>
          <p className="text-xs text-muted-foreground">{row.description || row.slug}</p>
        </div>
      ),
    },
    {
      header: "Users",
      key: "assigned_users",
      align: "right",
      render: (v, row) => <span className="tabular">{v ?? row.users_count ?? "—"}</span>,
    },
    { header: "Status", key: "is_active", render: (v) => <StatusBadge status={v ? "active" : "inactive"} /> },
    { header: "Created", key: "created_at", render: (v) => <span className="text-xs text-muted-foreground">{v ? formatDate(v) : "—"}</span> },
    {
      header: "Actions",
      key: "actions",
      align: "right",
      render: (_, row) =>
        isSuper(row) ? (
          <span className="text-xs text-muted-foreground">Protected</span>
        ) : (
          <div className="flex justify-end gap-1.5">
            <Link
              href={`/role-permission?role_id=${row.id}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-xs font-medium text-foreground transition hover:bg-muted/60"
            >
              <ListChecks className="size-3.5" /> Permissions
            </Link>
            <RowAction onClick={() => openEdit(row)}>
              <Pencil className="size-3.5" /> Edit
            </RowAction>
            <RowAction
              onClick={() => {
                setConfirmError("");
                setInUse(null);
                setConfirm({ type: "status", row });
              }}
            >
              <Power className="size-3.5" /> {row.is_active ? "Deactivate" : "Activate"}
            </RowAction>
            <RowAction
              tone="danger"
              onClick={() => {
                setConfirmError("");
                setInUse(null);
                setConfirm({ type: "delete", row });
              }}
            >
              <Trash2 className="size-3.5" /> Delete
            </RowAction>
          </div>
        ),
    },
  ];

  if (!perm.loading && !perm.isSuperAdmin) return <NoAccess title="Only super admins can manage roles" />;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Administration" }, { label: "Roles" }]}
        title="Roles"
        description="Roles group admin users. What a role can do is set in Role Permissions."
        actions={
          <Button type="button" className="h-9 gap-1.5 text-xs font-semibold" onClick={openCreate}>
            <Plus className="size-4" /> Add role
          </Button>
        }
      />

      {notice && (
        <InlineNotice tone="success" className="mb-4">
          {notice}
        </InlineNotice>
      )}

      <ListCard
        title="All roles"
        subtitle={listQuery.isLoading ? "Loading…" : `${list.total} role${list.total === 1 ? "" : "s"}`}
        error={listQuery.error ? apiErrorMessage(listQuery.error) : undefined}
        filters={
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search roles…"
          />
        }
        footer={<ListFooter list={list} onPageChange={setPage} disabled={listQuery.isFetching} />}
      >
        <DataTable
          columns={columns}
          data={list.rows}
          loading={listQuery.isLoading}
          empty={{ icon: <ShieldCheck className="size-5" />, title: "No roles found" }}
        />
      </ListCard>

      <AdminModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        busy={saveMutation.isPending}
        title={editing ? "Edit role" : "Add role"}
        footer={
          <>
            <Button type="button" variant="outline" className="h-9 text-xs" onClick={() => setFormOpen(false)} disabled={saveMutation.isPending}>
              Cancel
            </Button>
            <Button type="button" className="h-9 text-xs" onClick={() => void handleSave()} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <RefreshCw className="mr-1.5 size-4 animate-spin" />}
              {editing ? "Save changes" : "Create role"}
            </Button>
          </>
        }
      >
        <FormField label="Name" required error={formFieldErrors.name}>
          <Input value={form.name} onChange={(e) => update("name", e.target.value)} className="h-9 text-sm" autoFocus />
        </FormField>
        {!editing && (
          <FormField label="Slug" hint="Leave empty to generate it from the name." error={formFieldErrors.slug}>
            <Input value={form.slug} onChange={(e) => update("slug", e.target.value)} className="h-9 font-mono text-sm" />
          </FormField>
        )}
        <FormField label="Description" error={formFieldErrors.description}>
          <textarea value={form.description} onChange={(e) => update("description", e.target.value)} className={textareaClass} />
        </FormField>
        {!editing && <SwitchRow label="Active" checked={form.is_active} onChange={(v) => update("is_active", v)} />}
        <InlineError>{formError}</InlineError>
      </AdminModal>

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={() => void handleConfirm()}
        busy={saveMutation.isPending || deleteMutation.isPending}
        tone={confirm?.type === "status" && !confirm.row.is_active ? "default" : "destructive"}
        confirmDisabled={inUse !== null}
        title={confirm?.type === "delete" ? "Delete role" : confirm?.row.is_active ? "Deactivate role" : "Activate role"}
        confirmLabel={confirm?.type === "delete" ? "Delete role" : confirm?.row.is_active ? "Deactivate" : "Activate"}
        description={
          inUse !== null
            ? undefined
            : confirm?.type === "delete"
              ? `“${confirm.row.name}” will be removed permanently.`
              : confirm?.row.is_active
                ? `Everyone with “${confirm?.row.name}” is logged out immediately.`
                : `“${confirm?.row.name}” can be assigned and used again.`
        }
        error={confirmError}
      >
        {inUse !== null && (
          <InlineNotice tone="warning">
            {inUse} user{inUse === 1 ? " is" : "s are"} still assigned to “{confirm?.row.name}”. Move them to another role in System Users,
            or deactivate the role instead.
          </InlineNotice>
        )}
      </ConfirmDialog>
    </>
  );
}
