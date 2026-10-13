"use client";

import { useEffect, useMemo, useState } from "react";
import { ListTree, Pencil, Plus, Power, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AdminModal,
  FormField,
  InlineError,
  LoadingBlock,
  NoAccess,
  RowAction,
  SearchInput,
  SwitchRow,
  filterSelectClass,
  textareaClass,
} from "@/components/admin/kit";
import {
  createLookupOption,
  getLookupGroups,
  getLookupOptions,
  setLookupOptionStatus,
  updateLookupOption,
} from "@/lib/api/admin";
import { useAdminMutation, useAdminQuery } from "@/hooks/use-admin-api";
import { usePermission } from "@/hooks/use-permission";
import { normalizeList } from "@/lib/list";
import { apiErrorMessage, fieldErrors } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

type Group = { key: string; label: string; count?: number };

function humanizeGroup(key: string) {
  return key.replaceAll("_", " ").replace(/^\w/, (c) => c.toUpperCase());
}

function parseGroups(payload: any): Group[] {
  const raw = payload?.groups ?? payload?.data ?? payload;
  if (Array.isArray(raw)) {
    return raw
      .map((item: any) =>
        typeof item === "string"
          ? { key: item, label: humanizeGroup(item) }
          : {
              key: String(item?.group_key ?? item?.key ?? item?.value ?? ""),
              label: String(item?.label ?? item?.name ?? humanizeGroup(String(item?.group_key ?? item?.key ?? ""))),
              count: item?.count ?? item?.items_count ?? item?.total,
            },
      )
      .filter((group) => group.key);
  }
  if (raw && typeof raw === "object") {
    return Object.entries(raw).map(([key, value]: [string, any]) => ({
      key,
      label: typeof value === "string" ? value : String(value?.label ?? humanizeGroup(key)),
      count: Array.isArray(value) ? value.length : value?.count,
    }));
  }
  return [];
}

type FormState = { value: string; label: string; description: string; sort_order: string; is_active: boolean };
const EMPTY: FormState = { value: "", label: "", description: "", sort_order: "", is_active: true };

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export default function LookupOptionsPage() {
  const perm = usePermission("lookup_options");

  const [groupSearch, setGroupSearch] = useState("");
  const [activeGroup, setActiveGroup] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [status, setStatus] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [valueTouched, setValueTouched] = useState(false);
  const [formError, setFormError] = useState("");
  const [formFieldErrors, setFormFieldErrors] = useState<Record<string, string>>({});
  const [rowError, setRowError] = useState("");

  const groupsQuery = useAdminQuery(getLookupGroups, ["admin", "lookup-options", "groups"], perm.view);
  const groups = useMemo(() => parseGroups(groupsQuery.data), [groupsQuery.data]);

  useEffect(() => {
    if (!activeGroup && groups.length) setActiveGroup(groups[0].key);
  }, [groups, activeGroup]);

  const itemsQuery = useAdminQuery(
    () => getLookupOptions({ group_key: activeGroup, limit: 500 }),
    ["admin", "lookup-options", "items", activeGroup],
    perm.view && Boolean(activeGroup),
  );
  const allItems = useMemo(() => {
    const payload: any = itemsQuery.data;
    const grouped = payload?.lookup_options?.[activeGroup] ?? payload?.[activeGroup];
    const rows = Array.isArray(grouped) ? grouped : normalizeList(payload, 1, 500).rows;
    return [...rows].sort((a: any, b: any) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));
  }, [itemsQuery.data, activeGroup]);

  const items = allItems.filter((item: any) => {
    if (status === "1" && !item.is_active) return false;
    if (status === "0" && item.is_active) return false;
    const term = itemSearch.trim().toLowerCase();
    if (!term) return true;
    return `${item.label} ${item.value} ${item.description ?? ""}`.toLowerCase().includes(term);
  });

  const filteredGroups = groups.filter((group) =>
    `${group.label} ${group.key}`.toLowerCase().includes(groupSearch.trim().toLowerCase()),
  );

  const saveMutation = useAdminMutation<{ id?: string | number; body: Record<string, unknown> }, unknown>(({ id, body }) =>
    id ? updateLookupOption(id, body) : createLookupOption(body),
  );
  const statusMutation = useAdminMutation<{ id: string | number; active: boolean }, unknown>(({ id, active }) =>
    setLookupOptionStatus(id, active),
  );

  function openAdd() {
    setEditing(null);
    const nextOrder = allItems.reduce((max: number, item: any) => Math.max(max, Number(item.sort_order ?? 0)), 0) + 1;
    setForm({ ...EMPTY, sort_order: String(nextOrder) });
    setValueTouched(false);
    setFormError("");
    setFormFieldErrors({});
    setModalOpen(true);
  }

  function openEdit(row: any) {
    setEditing(row);
    setForm({
      value: row.value ?? "",
      label: row.label ?? "",
      description: row.description ?? "",
      sort_order: row.sort_order === null || row.sort_order === undefined ? "" : String(row.sort_order),
      is_active: Boolean(row.is_active),
    });
    setValueTouched(true);
    setFormError("");
    setFormFieldErrors({});
    setModalOpen(true);
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      // Suggest a value from the label while adding, until the admin types one.
      if (!editing && key === "label" && !valueTouched) next.value = slugify(String(value));
      return next;
    });
    setFormFieldErrors((current) => ({ ...current, [key]: "" }));
    setFormError("");
  }

  async function handleSave() {
    const errors: Record<string, string> = {};
    if (!form.label.trim()) errors.label = "Label is required.";
    if (!editing && !form.value.trim()) errors.value = "Value is required.";
    if (Object.keys(errors).length) {
      setFormFieldErrors(errors);
      return;
    }
    const body: Record<string, unknown> = {
      label: form.label.trim(),
      description: form.description.trim() || null,
      sort_order: form.sort_order === "" ? null : Number(form.sort_order),
    };
    if (!editing) {
      body.group_key = activeGroup;
      body.value = form.value.trim();
      body.is_active = form.is_active;
    } else if (form.value.trim() !== editing.value) {
      body.value = form.value.trim();
    }
    try {
      await saveMutation.mutateAsync({ id: editing?.id, body });
      setModalOpen(false);
    } catch (error) {
      setFormFieldErrors(fieldErrors(error));
      setFormError(apiErrorMessage(error));
    }
  }

  async function toggleStatus(row: any) {
    setRowError("");
    try {
      await statusMutation.mutateAsync({ id: row.id, active: !row.is_active });
    } catch (error) {
      setRowError(apiErrorMessage(error));
    }
  }

  const columns: DataTableColumn[] = [
    { header: "Order", key: "sort_order", className: "w-16", render: (v) => <span className="tabular text-xs text-muted-foreground">{v ?? "—"}</span> },
    { header: "Label", key: "label", render: (v) => <span className="font-medium text-foreground">{v}</span> },
    { header: "Value", key: "value", render: (v) => <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{v}</code> },
    { header: "Description", key: "description", render: (v) => <span className="text-xs text-muted-foreground">{v || "—"}</span> },
    { header: "Status", key: "is_active", render: (v) => <StatusBadge status={v ? "active" : "inactive"} /> },
  ];
  if (perm.edit) {
    columns.push({
      header: "Actions",
      key: "actions",
      align: "right",
      render: (_, row) => (
        <div className="flex justify-end gap-1.5">
          <RowAction onClick={() => openEdit(row)}>
            <Pencil className="size-3.5" /> Edit
          </RowAction>
          <RowAction onClick={() => void toggleStatus(row)} disabled={statusMutation.isPending}>
            <Power className="size-3.5" /> {row.is_active ? "Deactivate" : "Activate"}
          </RowAction>
        </div>
      ),
    });
  }

  if (!perm.loading && !perm.view) return <NoAccess />;

  const activeGroupLabel = groups.find((g) => g.key === activeGroup)?.label ?? humanizeGroup(activeGroup);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Administration" }, { label: "Master Data" }, { label: "Lookup Options" }]}
        title="Lookup Options"
        description="Small dropdown lists used in prescriptions and patient history (frequency, food timing, staging…). Groups are fixed; add or edit the items inside them."
      />

      <InlineError className="mb-4">{rowError}</InlineError>

      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* Groups */}
        <section className="overflow-hidden rounded-lg bg-card shadow-card">
          <div className="border-b border-border/60 p-4">
            <h2 className="text-sm font-semibold text-foreground">Groups</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{groups.length} groups</p>
            <SearchInput value={groupSearch} onChange={setGroupSearch} placeholder="Find a group…" className="mt-3 sm:w-full" />
          </div>
          {groupsQuery.isLoading ? (
            <LoadingBlock label="Loading groups…" />
          ) : groupsQuery.error ? (
            <InlineError className="m-4">{apiErrorMessage(groupsQuery.error)}</InlineError>
          ) : (
            <ul className="max-h-[65vh] overflow-y-auto p-2">
              {filteredGroups.map((group) => (
                <li key={group.key}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveGroup(group.key);
                      setItemSearch("");
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition",
                      group.key === activeGroup ? "bg-primary/10 font-medium text-primary" : "text-foreground hover:bg-muted/60",
                    )}
                  >
                    <span className="truncate">{group.label}</span>
                    {group.count !== undefined && <span className="tabular text-xs text-muted-foreground">{group.count}</span>}
                  </button>
                </li>
              ))}
              {!filteredGroups.length && <li className="px-3 py-6 text-center text-xs text-muted-foreground">No groups match.</li>}
            </ul>
          )}
        </section>

        {/* Items */}
        <section className="overflow-hidden rounded-lg bg-card shadow-card">
          <div className="flex flex-col gap-3 border-b border-border/60 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-foreground">{activeGroup ? activeGroupLabel : "Pick a group"}</h2>
              {activeGroup && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  <code>{activeGroup}</code> · {allItems.length} item{allItems.length === 1 ? "" : "s"}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <SearchInput value={itemSearch} onChange={setItemSearch} placeholder="Search items…" className="sm:w-[220px]" />
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={filterSelectClass}>
                <option value="">All statuses</option>
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>
              {perm.add && activeGroup && (
                <Button type="button" className="h-9 gap-1.5 text-xs font-semibold" onClick={openAdd}>
                  <Plus className="size-4" /> Add item
                </Button>
              )}
            </div>
          </div>
          {itemsQuery.error && (
            <div className="border-b border-destructive/25 bg-destructive-soft px-5 py-3 text-xs text-destructive">
              {apiErrorMessage(itemsQuery.error)}
            </div>
          )}
          <div className="overflow-x-auto px-5 py-4">
            <DataTable
              columns={columns}
              data={items}
              loading={itemsQuery.isLoading && Boolean(activeGroup)}
              empty={{
                icon: <ListTree className="size-5" />,
                title: activeGroup ? "No items found" : "Pick a group on the left",
                description: activeGroup ? "Try a different search, or add the first item." : undefined,
              }}
            />
          </div>
        </section>
      </div>

      <AdminModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        busy={saveMutation.isPending}
        title={editing ? "Edit item" : `Add item to ${activeGroupLabel}`}
        description="Doctors see the label. The value is what gets stored."
        footer={
          <>
            <Button type="button" variant="outline" className="h-9 text-xs" onClick={() => setModalOpen(false)} disabled={saveMutation.isPending}>
              Cancel
            </Button>
            <Button type="button" className="h-9 text-xs" onClick={() => void handleSave()} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <RefreshCw className="mr-1.5 size-4 animate-spin" />}
              {editing ? "Save changes" : "Add item"}
            </Button>
          </>
        }
      >
        <FormField label="Label" required error={formFieldErrors.label}>
          <Input value={form.label} autoFocus onChange={(e) => update("label", e.target.value)} className="h-9 text-sm" />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_120px]">
          <FormField
            label="Value"
            required={!editing}
            error={formFieldErrors.value}
            hint={editing ? "Saved prescriptions store this value — change it only if it isn't in use yet." : "Unique within the group."}
          >
            <Input
              value={form.value}
              onChange={(e) => {
                setValueTouched(true);
                update("value", e.target.value);
              }}
              className="h-9 font-mono text-sm"
            />
          </FormField>
          <FormField label="Sort order" error={formFieldErrors.sort_order}>
            <Input type="number" min={0} value={form.sort_order} onChange={(e) => update("sort_order", e.target.value)} className="h-9 text-sm" />
          </FormField>
        </div>
        <FormField label="Description" error={formFieldErrors.description}>
          <textarea value={form.description} onChange={(e) => update("description", e.target.value)} className={textareaClass} />
        </FormField>
        {!editing && (
          <SwitchRow
            label="Active"
            description="Inactive items disappear from doctor dropdowns."
            checked={form.is_active}
            onChange={(value) => update("is_active", value)}
          />
        )}
        <InlineError>{formError}</InlineError>
      </AdminModal>
    </>
  );
}
