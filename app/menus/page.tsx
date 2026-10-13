"use client";

import { useMemo, useState } from "react";
import { CornerDownRight, Lock, PanelsTopLeft, Pencil, Plus, Power, RefreshCw, Trash2 } from "lucide-react";
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
  NoAccess,
  RowAction,
  SearchInput,
  SwitchRow,
  filterSelectClass,
  selectClass,
} from "@/components/admin/kit";
import { createMenu, deleteMenu, getMenus, setMenuStatus, updateMenu } from "@/lib/api/admin";
import { useAdminMutation, useAdminQuery } from "@/hooks/use-admin-api";
import { usePermission } from "@/hooks/use-permission";
import { normalizeList } from "@/lib/list";
import { apiErrorMessage, errorCode, fieldErrors } from "@/lib/api/errors";

type MenuForm = {
  key: string;
  name: string;
  slug: string;
  parent_id: string;
  icon: string;
  sort_order: string;
  is_active: boolean;
  allow_add: boolean;
  allow_edit: boolean;
  allow_delete: boolean;
  allow_export: boolean;
};

const EMPTY: MenuForm = {
  key: "",
  name: "",
  slug: "",
  parent_id: "",
  icon: "",
  sort_order: "",
  is_active: true,
  allow_add: true,
  allow_edit: true,
  allow_delete: true,
  allow_export: false,
};

const ACTIONS: Array<{ key: keyof MenuForm; label: string }> = [
  { key: "allow_add", label: "Add" },
  { key: "allow_edit", label: "Edit" },
  { key: "allow_delete", label: "Delete" },
  { key: "allow_export", label: "Export" },
];

/** Parent → children order, each row tagged with its depth. */
function toTree(rows: any[]) {
  const byParent = new Map<string, any[]>();
  rows.forEach((row) => {
    const parent = row.parent_id ? String(row.parent_id) : "root";
    byParent.set(parent, [...(byParent.get(parent) ?? []), row]);
  });
  byParent.forEach((list) => list.sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0)));
  const out: any[] = [];
  const seen = new Set<string>();
  const walk = (parent: string, depth: number) => {
    (byParent.get(parent) ?? []).forEach((row) => {
      if (seen.has(String(row.id))) return;
      seen.add(String(row.id));
      out.push({ ...row, _depth: depth });
      walk(String(row.id), depth + 1);
    });
  };
  walk("root", 0);
  rows.forEach((row) => !seen.has(String(row.id)) && out.push({ ...row, _depth: 0 })); // orphans
  return out;
}

export default function MenusPage() {
  const perm = usePermission("menus");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<MenuForm>(EMPTY);
  const [formError, setFormError] = useState("");
  const [formFieldErrors, setFormFieldErrors] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<{ type: "status" | "delete"; row: any } | null>(null);
  const [confirmError, setConfirmError] = useState("");

  const query = useAdminQuery(() => getMenus({ is_active: status }), ["admin", "menus", status], perm.isSuperAdmin);
  const allRows = normalizeList(query.data, 1, 1000).rows;
  const tree = useMemo(() => toTree(allRows), [allRows]);
  const rows = tree.filter((row) =>
    `${row.name} ${row.key} ${row.slug}`.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const saveMutation = useAdminMutation<{ id?: string; body: Record<string, unknown> }, unknown>(({ id, body }) =>
    id ? updateMenu(id, body) : createMenu(body),
  );
  const statusMutation = useAdminMutation<{ id: string; active: boolean }, unknown>(({ id, active }) => setMenuStatus(id, active));
  const deleteMutation = useAdminMutation<string, unknown>((id) => deleteMenu(id));

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setFormError("");
    setFormFieldErrors({});
    setFormOpen(true);
  }

  function openEdit(row: any) {
    setEditing(row);
    setForm({
      key: row.key ?? "",
      name: row.name ?? "",
      slug: row.slug ?? "",
      parent_id: row.parent_id ? String(row.parent_id) : "",
      icon: row.icon ?? "",
      sort_order: row.sort_order === null || row.sort_order === undefined ? "" : String(row.sort_order),
      is_active: Boolean(row.is_active),
      allow_add: Boolean(row.allow_add),
      allow_edit: Boolean(row.allow_edit),
      allow_delete: Boolean(row.allow_delete),
      allow_export: Boolean(row.allow_export),
    });
    setFormError("");
    setFormFieldErrors({});
    setFormOpen(true);
  }

  function update<K extends keyof MenuForm>(key: K, value: MenuForm[K]) {
    setForm((c) => ({ ...c, [key]: value }));
    setFormFieldErrors((c) => ({ ...c, [key]: "" }));
    setFormError("");
  }

  async function handleSave() {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = "Name is required.";
    if (!editing && form.key && !/^[a-z0-9_]+$/.test(form.key)) errors.key = "Use lower-case letters, numbers and underscores.";
    if (Object.keys(errors).length) {
      setFormFieldErrors(errors);
      return;
    }
    const body: Record<string, unknown> = {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      parent_id: form.parent_id ? Number(form.parent_id) : null,
      icon: form.icon.trim() || null,
      sort_order: form.sort_order === "" ? undefined : Number(form.sort_order),
      allow_add: form.allow_add,
      allow_edit: form.allow_edit,
      allow_delete: form.allow_delete,
      allow_export: form.allow_export,
    };
    if (!editing) {
      if (form.key.trim()) body.key = form.key.trim();
      body.is_active = form.is_active;
    }
    try {
      await saveMutation.mutateAsync({ id: editing ? String(editing.id) : undefined, body });
      setFormOpen(false);
    } catch (error) {
      setFormFieldErrors(fieldErrors(error));
      setFormError(apiErrorMessage(error));
    }
  }

  async function handleConfirm() {
    if (!confirm) return;
    setConfirmError("");
    try {
      if (confirm.type === "delete") await deleteMutation.mutateAsync(String(confirm.row.id));
      else await statusMutation.mutateAsync({ id: String(confirm.row.id), active: !confirm.row.is_active });
      setConfirm(null);
    } catch (error) {
      const code = errorCode(error);
      setConfirmError(
        code === "MENU_PROTECTED"
          ? "System menus can't be deactivated or deleted."
          : code === "MENU_HAS_CHILDREN"
            ? "This menu has sub-menus. Move or delete them first."
            : apiErrorMessage(error),
      );
    }
  }

  const columns: DataTableColumn[] = [
    {
      header: "Menu",
      key: "name",
      render: (value, row) => (
        <div className="flex min-w-[220px] items-center gap-2" style={{ paddingLeft: `${row._depth * 20}px` }}>
          {row._depth > 0 && <CornerDownRight className="size-3.5 shrink-0 text-muted-foreground" />}
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              {value}
              {row.is_system && <Lock className="size-3.5 text-muted-foreground" aria-label="System menu" />}
            </p>
            <p className="text-xs text-muted-foreground">
              <code>{row.key}</code>
              {row.slug && row.slug !== row.key ? ` · /${row.slug}` : ""}
            </p>
          </div>
        </div>
      ),
    },
    { header: "Order", key: "sort_order", align: "right", render: (v) => <span className="tabular text-xs">{v ?? "—"}</span> },
    {
      header: "Grid can grant",
      key: "allow_add",
      render: (_, row) => (
        <div className="flex flex-wrap gap-1">
          <StatusBadge tone="neutral" dot={false}>View</StatusBadge>
          {ACTIONS.filter((a) => row[a.key]).map((a) => (
            <StatusBadge key={a.key} tone="info" dot={false}>
              {a.label}
            </StatusBadge>
          ))}
        </div>
      ),
    },
    {
      header: "Status",
      key: "is_active",
      render: (v, row) => (
        <div className="flex items-center gap-1.5">
          <StatusBadge status={v ? "active" : "inactive"} />
          {row.is_system && <StatusBadge tone="violet" dot={false}>System</StatusBadge>}
        </div>
      ),
    },
    {
      header: "Actions",
      key: "actions",
      align: "right",
      render: (_, row) => (
        <div className="flex justify-end gap-1.5">
          <RowAction onClick={() => openEdit(row)}>
            <Pencil className="size-3.5" /> Edit
          </RowAction>
          <RowAction
            disabled={row.is_system}
            title={row.is_system ? "System menus stay active" : undefined}
            onClick={() => {
              setConfirmError("");
              setConfirm({ type: "status", row });
            }}
          >
            <Power className="size-3.5" /> {row.is_active ? "Deactivate" : "Activate"}
          </RowAction>
          <RowAction
            tone="danger"
            disabled={row.is_system}
            onClick={() => {
              setConfirmError("");
              setConfirm({ type: "delete", row });
            }}
          >
            <Trash2 className="size-3.5" /> Delete
          </RowAction>
        </div>
      ),
    },
  ];

  if (!perm.loading && !perm.isSuperAdmin) return <NoAccess title="Only super admins can manage menus" />;

  const parentOptions = tree.filter((row) => !editing || String(row.id) !== String(editing.id));

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Administration" }, { label: "Menus" }]}
        title="Menus"
        description="The pages permissions are granted on. The key is the contract with the backend and never changes; name, order and icon can."
        actions={
          <Button type="button" className="h-9 gap-1.5 text-xs font-semibold" onClick={openCreate}>
            <Plus className="size-4" /> Add menu
          </Button>
        }
      />

      <ListCard
        title="All menus"
        subtitle={query.isLoading ? "Loading…" : `${allRows.length} menus`}
        error={query.error ? apiErrorMessage(query.error) : undefined}
        filters={
          <>
            <SearchInput value={search} onChange={setSearch} placeholder="Search name or key…" />
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={filterSelectClass}>
              <option value="">All statuses</option>
              <option value="1">Active</option>
              <option value="0">Inactive</option>
            </select>
          </>
        }
      >
        <DataTable columns={columns} data={rows} loading={query.isLoading} empty={{ icon: <PanelsTopLeft className="size-5" />, title: "No menus found" }} />
      </ListCard>

      <AdminModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        busy={saveMutation.isPending}
        title={editing ? "Edit menu" : "Add menu"}
        footer={
          <>
            <Button type="button" variant="outline" className="h-9 text-xs" onClick={() => setFormOpen(false)} disabled={saveMutation.isPending}>
              Cancel
            </Button>
            <Button type="button" className="h-9 text-xs" onClick={() => void handleSave()} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <RefreshCw className="mr-1.5 size-4 animate-spin" />}
              {editing ? "Save changes" : "Create menu"}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Name" required error={formFieldErrors.name}>
            <Input value={form.name} onChange={(e) => update("name", e.target.value)} className="h-9 text-sm" autoFocus />
          </FormField>
          <FormField
            label="Key"
            error={formFieldErrors.key}
            hint={editing ? "Keys can't be changed after creation." : "Optional — generated from the name. Must match the backend."}
          >
            <Input value={form.key} onChange={(e) => update("key", e.target.value)} disabled={Boolean(editing)} className="h-9 font-mono text-sm" />
          </FormField>
          <FormField label="Slug" error={formFieldErrors.slug}>
            <Input value={form.slug} onChange={(e) => update("slug", e.target.value)} className="h-9 text-sm" />
          </FormField>
          <FormField label="Icon" hint="Icon name, e.g. users" error={formFieldErrors.icon}>
            <Input value={form.icon} onChange={(e) => update("icon", e.target.value)} className="h-9 text-sm" />
          </FormField>
          <FormField label="Parent menu" error={formFieldErrors.parent_id}>
            <select value={form.parent_id} onChange={(e) => update("parent_id", e.target.value)} className={selectClass}>
              <option value="">None (top level)</option>
              {parentOptions.map((row) => (
                <option key={row.id} value={row.id}>
                  {"— ".repeat(row._depth)}
                  {row.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Sort order" error={formFieldErrors.sort_order}>
            <Input type="number" value={form.sort_order} onChange={(e) => update("sort_order", e.target.value)} className="h-9 text-sm" />
          </FormField>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-foreground">Actions the permission grid may grant</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {ACTIONS.map((action) => (
              <label key={action.key} className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs">
                <input
                  type="checkbox"
                  checked={Boolean(form[action.key])}
                  onChange={(e) => update(action.key, e.target.checked as any)}
                  className="size-4 accent-primary"
                />
                {action.label}
              </label>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">View is always available.</p>
        </div>

        {!editing && <SwitchRow label="Active" checked={form.is_active} onChange={(v) => update("is_active", v)} />}
        {editing?.is_system && <InlineNotice tone="info">This is a system menu. It stays active and only super admins can reach it.</InlineNotice>}
        <InlineError>{formError}</InlineError>
      </AdminModal>

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={() => void handleConfirm()}
        busy={statusMutation.isPending || deleteMutation.isPending}
        tone={confirm?.type === "status" && !confirm.row.is_active ? "default" : "destructive"}
        title={confirm?.type === "delete" ? "Delete menu" : confirm?.row.is_active ? "Deactivate menu" : "Activate menu"}
        confirmLabel={confirm?.type === "delete" ? "Delete menu" : confirm?.row.is_active ? "Deactivate" : "Activate"}
        description={
          confirm?.type === "delete"
            ? `“${confirm.row.name}” and its permission grants are removed.`
            : confirm?.row.is_active
              ? `“${confirm?.row.name}” disappears from the sidebar for every role.`
              : `“${confirm?.row.name}” shows again for roles that can view it.`
        }
        error={confirmError}
      />
    </>
  );
}
