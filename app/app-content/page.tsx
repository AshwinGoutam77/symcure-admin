"use client";

import { useState } from "react";
import { Eye, FileText, Pencil, Plus, Power, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AdminModal,
  FormField,
  InlineError,
  InlineNotice,
  ListCard,
  LoadingBlock,
  NoAccess,
  RowAction,
  SearchInput,
  SwitchRow,
  textareaClass,
} from "@/components/admin/kit";
import { createAppContent, getAppContent, getAppContentBySlug, setAppContentStatus, updateAppContent } from "@/lib/api/admin";
import { useAdminMutation, useAdminQuery } from "@/hooks/use-admin-api";
import { usePermission } from "@/hooks/use-permission";
import { normalizeList } from "@/lib/list";
import { apiErrorMessage, fieldErrors } from "@/lib/api/errors";
import { formatDateTime } from "@/lib/formatters";
import { cn } from "@/lib/utils";

type Form = { slug: string; title: string; body: string; is_published: boolean };
const EMPTY: Form = { slug: "", title: "", body: "", is_published: false };

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Tiny formatting toolbar for the HTML body (wraps the selected text in a tag). */
const TOOLS: Array<{ label: string; open: string; close: string }> = [
  { label: "H2", open: "<h2>", close: "</h2>" },
  { label: "H3", open: "<h3>", close: "</h3>" },
  { label: "Bold", open: "<strong>", close: "</strong>" },
  { label: "Italic", open: "<em>", close: "</em>" },
  { label: "Paragraph", open: "<p>", close: "</p>" },
  { label: "List item", open: "<li>", close: "</li>" },
  { label: "Bullet list", open: "<ul>\n", close: "\n</ul>" },
  { label: "Link", open: '<a href="https://">', close: "</a>" },
];

export default function AppContentPage() {
  const perm = usePermission("app_content");

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [slugTouched, setSlugTouched] = useState(false);
  const [preview, setPreview] = useState(false);
  const [formError, setFormError] = useState("");
  const [formFieldErrors, setFormFieldErrors] = useState<Record<string, string>>({});
  const [rowError, setRowError] = useState("");
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);

  const query = useAdminQuery(getAppContent, ["admin", "app-content"], perm.view);
  const rows = normalizeList(query.data, 1, 500).rows.filter((row: any) =>
    `${row.title} ${row.slug}`.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const saveMutation = useAdminMutation<{ slug?: string; body: Record<string, unknown> }, unknown>(({ slug, body }) =>
    slug ? updateAppContent(slug, body) : createAppContent(body),
  );
  const statusMutation = useAdminMutation<{ slug: string; published: boolean }, unknown>(({ slug, published }) =>
    setAppContentStatus(slug, published),
  );

  function openCreate() {
    setEditingSlug(null);
    setForm(EMPTY);
    setSlugTouched(false);
    setPreview(false);
    setFormError("");
    setFormFieldErrors({});
    setModalOpen(true);
  }

  async function openEdit(row: any) {
    setRowError("");
    setLoadingSlug(row.slug);
    try {
      const data: any = await getAppContentBySlug(row.slug);
      const page = data?.content ?? data?.page ?? data ?? row;
      setEditingSlug(row.slug);
      setForm({ slug: row.slug, title: page.title ?? row.title ?? "", body: page.body ?? "", is_published: Boolean(page.is_published ?? row.is_published) });
      setPreview(false);
      setFormError("");
      setFormFieldErrors({});
      setModalOpen(true);
    } catch (error) {
      setRowError(apiErrorMessage(error));
    } finally {
      setLoadingSlug(null);
    }
  }

  function update<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((c) => {
      const next = { ...c, [key]: value };
      if (!editingSlug && key === "title" && !slugTouched) next.slug = slugify(String(value));
      return next;
    });
    setFormFieldErrors((c) => ({ ...c, [key]: "" }));
    setFormError("");
  }

  function wrapSelection(open: string, close: string) {
    const el = document.getElementById("content-body") as HTMLTextAreaElement | null;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end, value } = el;
    const next = value.slice(0, start) + open + value.slice(start, end) + close + value.slice(end);
    update("body", next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + open.length, end + open.length);
    });
  }

  async function handleSave() {
    const errors: Record<string, string> = {};
    if (!form.title.trim()) errors.title = "Title is required.";
    if (!editingSlug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)) errors.slug = "Use lower-case letters, numbers and dashes.";
    if (Object.keys(errors).length) {
      setFormFieldErrors(errors);
      return;
    }
    const body: Record<string, unknown> = { title: form.title.trim(), body: form.body, is_published: form.is_published };
    if (!editingSlug) body.slug = form.slug;
    try {
      await saveMutation.mutateAsync({ slug: editingSlug ?? undefined, body });
      setModalOpen(false);
    } catch (error) {
      setFormFieldErrors(fieldErrors(error));
      setFormError(apiErrorMessage(error));
    }
  }

  async function toggle(row: any) {
    setRowError("");
    try {
      await statusMutation.mutateAsync({ slug: row.slug, published: !row.is_published });
    } catch (error) {
      setRowError(apiErrorMessage(error));
    }
  }

  const columns: DataTableColumn[] = [
    {
      header: "Page",
      key: "title",
      render: (v, row) => (
        <div className="min-w-[200px]">
          <p className="font-medium text-foreground">{v}</p>
          <p className="text-xs text-muted-foreground">/{row.slug}</p>
        </div>
      ),
    },
    { header: "Status", key: "is_published", render: (v) => <StatusBadge tone={v ? "success" : "neutral"}>{v ? "Published" : "Hidden"}</StatusBadge> },
    { header: "Updated", key: "updated_at", render: (v) => <span className="text-xs text-muted-foreground">{v ? formatDateTime(v) : "—"}</span> },
  ];
  if (perm.edit) {
    columns.push({
      header: "Actions",
      key: "actions",
      align: "right",
      render: (_, row) => (
        <div className="flex justify-end gap-1.5">
          <RowAction onClick={() => void openEdit(row)} disabled={loadingSlug === row.slug}>
            {loadingSlug === row.slug ? <RefreshCw className="size-3.5 animate-spin" /> : <Pencil className="size-3.5" />} Edit
          </RowAction>
          <RowAction onClick={() => void toggle(row)} disabled={statusMutation.isPending}>
            <Power className="size-3.5" /> {row.is_published ? "Hide" : "Publish"}
          </RowAction>
        </div>
      ),
    });
  }

  if (!perm.loading && !perm.view) return <NoAccess />;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "App Content" }, { label: "Static Content" }]}
        title="Static Content"
        description="Pages like Terms and Privacy shown in the apps. Pages can be hidden but not deleted."
        actions={
          perm.add && (
            <Button type="button" className="h-9 gap-1.5 text-xs font-semibold" onClick={openCreate}>
              <Plus className="size-4" /> Add page
            </Button>
          )
        }
      />
      <InlineError className="mb-4">{rowError}</InlineError>

      <ListCard
        title="Pages"
        subtitle={query.isLoading ? "Loading…" : `${rows.length} page${rows.length === 1 ? "" : "s"}`}
        error={query.error ? apiErrorMessage(query.error) : undefined}
        filters={<SearchInput value={search} onChange={setSearch} placeholder="Search pages…" />}
      >
        <DataTable columns={columns} data={rows} loading={query.isLoading} empty={{ icon: <FileText className="size-5" />, title: "No pages yet" }} />
      </ListCard>

      <AdminModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        busy={saveMutation.isPending}
        size="lg"
        title={editingSlug ? `Edit “${form.title || editingSlug}”` : "Add page"}
        footer={
          <>
            <Button type="button" variant="outline" className="h-9 text-xs" onClick={() => setModalOpen(false)} disabled={saveMutation.isPending}>
              Cancel
            </Button>
            <Button type="button" className="h-9 text-xs" onClick={() => void handleSave()} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <RefreshCw className="mr-1.5 size-4 animate-spin" />}
              {editingSlug ? "Save page" : "Add page"}
            </Button>
          </>
        }
      >
        {saveMutation.isPending && !form.title ? (
          <LoadingBlock />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Title" required error={formFieldErrors.title}>
                <Input value={form.title} onChange={(e) => update("title", e.target.value)} className="h-9 text-sm" autoFocus />
              </FormField>
              <FormField
                label="Slug"
                required={!editingSlug}
                error={formFieldErrors.slug}
                hint={editingSlug ? "The slug can't be changed." : "The app needs an update before a new slug is shown."}
              >
                <Input
                  value={form.slug}
                  disabled={Boolean(editingSlug)}
                  onChange={(e) => {
                    setSlugTouched(true);
                    update("slug", e.target.value);
                  }}
                  className="h-9 font-mono text-sm"
                />
              </FormField>
            </div>

            <div>
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium text-foreground">Content</span>
                <div className="flex rounded-md border border-border p-0.5">
                  {[
                    { key: false, label: "Edit HTML" },
                    { key: true, label: "Preview" },
                  ].map((mode) => (
                    <button
                      key={String(mode.key)}
                      type="button"
                      onClick={() => setPreview(mode.key)}
                      className={cn(
                        "rounded px-2.5 py-1 text-xs font-medium transition",
                        preview === mode.key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {mode.key && <Eye className="mr-1 inline size-3.5" />}
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>
              {preview ? (
                <div
                  className="prose-sm max-h-[50vh] min-h-[240px] overflow-y-auto rounded-md border border-border bg-card p-4 text-sm leading-6 text-foreground [&_a]:text-primary [&_a]:underline [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mb-1 [&_h3]:mt-3 [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-3"
                  dangerouslySetInnerHTML={{ __html: form.body || "<p>Nothing to preview yet.</p>" }}
                />
              ) : (
                <>
                  <div className="mb-1.5 flex flex-wrap gap-1">
                    {TOOLS.map((tool) => (
                      <button
                        key={tool.label}
                        type="button"
                        onClick={() => wrapSelection(tool.open, tool.close)}
                        className="rounded border border-border bg-muted/40 px-2 py-1 text-xs text-foreground transition hover:bg-muted"
                      >
                        {tool.label}
                      </button>
                    ))}
                  </div>
                  <textarea
                    id="content-body"
                    value={form.body}
                    onChange={(e) => update("body", e.target.value)}
                    spellCheck
                    className={cn(textareaClass, "min-h-[280px] font-mono text-xs leading-5")}
                  />
                </>
              )}
            </div>

            <SwitchRow
              label="Published"
              description="Hidden pages aren't shown in the apps."
              checked={form.is_published}
              onChange={(v) => update("is_published", v)}
            />
            {!editingSlug && <InlineNotice>New pages only appear in the app once the app knows the slug.</InlineNotice>}
            <InlineError>{formError}</InlineError>
          </>
        )}
      </AdminModal>
    </>
  );
}
