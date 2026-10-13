"use client";

import { useState } from "react";
import { Leaf, Pencil, Plus, Power, RefreshCw, Trash2 } from "lucide-react";
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
  ListCard,
  ListFooter,
  NoAccess,
  RowAction,
  SearchInput,
  SwitchRow,
  filterSelectClass,
  textareaClass,
  useDebounced,
} from "@/components/admin/kit";
import { createSeasonalHealth, deleteSeasonalHealth, getSeasonalHealth, updateSeasonalHealth } from "@/lib/api/admin";
import { useAdminMutation, useAdminQuery } from "@/hooks/use-admin-api";
import { usePermission } from "@/hooks/use-permission";
import { normalizeList } from "@/lib/list";
import { apiErrorMessage, fieldErrors } from "@/lib/api/errors";
import { formatDate } from "@/lib/formatters";

const LIMIT = 20;
type Form = { title: string; description: string; is_published: boolean; sort_order: string };
const EMPTY: Form = { title: "", description: "", is_published: true, sort_order: "" };

export default function SeasonalHealthPage() {
  const perm = usePermission("seasonal_health");

  const [search, setSearch] = useState("");
  const [published, setPublished] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounced(search);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [formError, setFormError] = useState("");
  const [formFieldErrors, setFormFieldErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [rowError, setRowError] = useState("");

  const params = { search: debouncedSearch.trim(), is_published: published, page, limit: LIMIT };
  const query = useAdminQuery(() => getSeasonalHealth(params), ["admin", "seasonal-health", params], perm.view);
  const list = normalizeList(query.data, page, LIMIT);
  const rows = [...list.rows].sort((a: any, b: any) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));

  const saveMutation = useAdminMutation<{ id?: string; body: Record<string, unknown> }, unknown>(({ id, body }) =>
    id ? updateSeasonalHealth(id, body) : createSeasonalHealth(body),
  );
  const deleteMutation = useAdminMutation<string, unknown>((id) => deleteSeasonalHealth(id));

  function openCreate() {
    setEditing(null);
    const nextOrder = list.rows.reduce((max: number, r: any) => Math.max(max, Number(r.sort_order ?? 0)), 0) + 1;
    setForm({ ...EMPTY, sort_order: String(nextOrder) });
    setFormError("");
    setFormFieldErrors({});
    setModalOpen(true);
  }

  function openEdit(row: any) {
    setEditing(row);
    setForm({
      title: row.title ?? "",
      description: row.description ?? "",
      is_published: Boolean(row.is_published),
      sort_order: row.sort_order === null || row.sort_order === undefined ? "" : String(row.sort_order),
    });
    setFormError("");
    setFormFieldErrors({});
    setModalOpen(true);
  }

  function update<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((c) => ({ ...c, [key]: value }));
    setFormFieldErrors((c) => ({ ...c, [key]: "" }));
    setFormError("");
  }

  async function handleSave() {
    const errors: Record<string, string> = {};
    if (!form.title.trim()) errors.title = "Title is required.";
    if (!form.description.trim()) errors.description = "Description is required.";
    if (Object.keys(errors).length) {
      setFormFieldErrors(errors);
      return;
    }
    try {
      await saveMutation.mutateAsync({
        id: editing ? String(editing.id) : undefined,
        body: {
          title: form.title.trim(),
          description: form.description.trim(),
          is_published: form.is_published,
          sort_order: form.sort_order === "" ? undefined : Number(form.sort_order),
        },
      });
      setModalOpen(false);
    } catch (error) {
      setFormFieldErrors(fieldErrors(error));
      setFormError(apiErrorMessage(error));
    }
  }

  async function togglePublished(row: any) {
    setRowError("");
    try {
      await saveMutation.mutateAsync({ id: String(row.id), body: { is_published: !row.is_published } });
    } catch (error) {
      setRowError(apiErrorMessage(error));
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteError("");
    try {
      await deleteMutation.mutateAsync(String(deleteTarget.id));
      setDeleteTarget(null);
    } catch (error) {
      setDeleteError(apiErrorMessage(error));
    }
  }

  const columns: DataTableColumn[] = [
    { header: "Order", key: "sort_order", className: "w-16", render: (v) => <span className="tabular text-xs text-muted-foreground">{v ?? "—"}</span> },
    {
      header: "Tip",
      key: "title",
      render: (v, row) => (
        <div className="min-w-[240px] max-w-[520px]">
          <p className="font-medium text-foreground">{v}</p>
          <p className="line-clamp-2 text-xs text-muted-foreground">{row.description}</p>
        </div>
      ),
    },
    { header: "Status", key: "is_published", render: (v) => <StatusBadge tone={v ? "success" : "neutral"}>{v ? "Published" : "Hidden"}</StatusBadge> },
    { header: "Updated", key: "updated_at", render: (v) => <span className="text-xs text-muted-foreground">{v ? formatDate(v) : "—"}</span> },
  ];
  if (perm.edit || perm.delete) {
    columns.push({
      header: "Actions",
      key: "actions",
      align: "right",
      render: (_, row) => (
        <div className="flex justify-end gap-1.5">
          {perm.edit && (
            <>
              <RowAction onClick={() => openEdit(row)}>
                <Pencil className="size-3.5" /> Edit
              </RowAction>
              <RowAction onClick={() => void togglePublished(row)} disabled={saveMutation.isPending}>
                <Power className="size-3.5" /> {row.is_published ? "Hide" : "Publish"}
              </RowAction>
            </>
          )}
          {perm.delete && (
            <RowAction
              tone="danger"
              onClick={() => {
                setDeleteError("");
                setDeleteTarget(row);
              }}
            >
              <Trash2 className="size-3.5" /> Delete
            </RowAction>
          )}
        </div>
      ),
    });
  }

  if (!perm.loading && !perm.view) return <NoAccess />;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "App Content" }, { label: "Seasonal Health" }]}
        title="Seasonal Health"
        description="Short health tips shown on the patient app home screen, in this order."
        actions={
          perm.add && (
            <Button type="button" className="h-9 gap-1.5 text-xs font-semibold" onClick={openCreate}>
              <Plus className="size-4" /> Add tip
            </Button>
          )
        }
      />
      <InlineError className="mb-4">{rowError}</InlineError>

      <ListCard
        title="Tips"
        subtitle={query.isLoading ? "Loading…" : `${list.total} tip${list.total === 1 ? "" : "s"}`}
        error={query.error ? apiErrorMessage(query.error) : undefined}
        filters={
          <>
            <SearchInput
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder="Search tips…"
            />
            <select
              value={published}
              onChange={(e) => {
                setPublished(e.target.value);
                setPage(1);
              }}
              className={filterSelectClass}
            >
              <option value="">All</option>
              <option value="1">Published</option>
              <option value="0">Hidden</option>
            </select>
          </>
        }
        footer={<ListFooter list={list} onPageChange={setPage} disabled={query.isFetching} />}
      >
        <DataTable columns={columns} data={rows} loading={query.isLoading} empty={{ icon: <Leaf className="size-5" />, title: "No tips yet" }} />
      </ListCard>

      <AdminModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        busy={saveMutation.isPending}
        title={editing ? "Edit tip" : "Add tip"}
        footer={
          <>
            <Button type="button" variant="outline" className="h-9 text-xs" onClick={() => setModalOpen(false)} disabled={saveMutation.isPending}>
              Cancel
            </Button>
            <Button type="button" className="h-9 text-xs" onClick={() => void handleSave()} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <RefreshCw className="mr-1.5 size-4 animate-spin" />}
              {editing ? "Save tip" : "Add tip"}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_120px]">
          <FormField label="Title" required error={formFieldErrors.title}>
            <Input value={form.title} onChange={(e) => update("title", e.target.value)} className="h-9 text-sm" autoFocus />
          </FormField>
          <FormField label="Order" error={formFieldErrors.sort_order}>
            <Input type="number" min={0} value={form.sort_order} onChange={(e) => update("sort_order", e.target.value)} className="h-9 text-sm" />
          </FormField>
        </div>
        <FormField label="Description" required error={formFieldErrors.description}>
          <textarea value={form.description} onChange={(e) => update("description", e.target.value)} className={textareaClass} />
        </FormField>
        <SwitchRow label="Published" description="Hidden tips aren't shown in the app." checked={form.is_published} onChange={(v) => update("is_published", v)} />
        <InlineError>{formError}</InlineError>
      </AdminModal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        busy={deleteMutation.isPending}
        title="Delete tip"
        confirmLabel="Delete tip"
        description={`“${deleteTarget?.title ?? ""}” will be removed from the app permanently.`}
        error={deleteError}
      />
    </>
  );
}
