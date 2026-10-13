"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Database, Pencil, Plus, Power, RefreshCw, Upload } from "lucide-react";
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
  ListFooter,
  NoAccess,
  RowAction,
  SearchInput,
  SwitchRow,
  filterSelectClass,
  selectClass,
  textareaClass,
  useDebounced,
} from "@/components/admin/kit";
import { createMaster, getLocations, getMaster, getMasters, setMasterStatus, updateMaster } from "@/lib/api/admin";
import { useAdminMutation, useAdminQuery } from "@/hooks/use-admin-api";
import { usePermission } from "@/hooks/use-permission";
import { normalizeList } from "@/lib/list";
import { apiErrorMessage, errorCode, errorDetails, fieldErrors } from "@/lib/api/errors";
import { MASTER_BY_KEY, SYSTEM_FIELDS, masterRowTitle, parseDiscovery, type MasterField } from "@/lib/masters";
import { formatDate } from "@/lib/formatters";

const LIMIT = 20;

type Values = Record<string, any>;

function emptyValues(fields: MasterField[]): Values {
  return Object.fromEntries(fields.map((field) => [field.name, field.type === "boolean" ? false : ""]));
}

/** Scalar fields present on a row that the configured field list doesn't cover. */
function extraRowFields(row: any, known: MasterField[]): MasterField[] {
  if (!row) return [];
  const knownNames = new Set(known.map((f) => f.name));
  return Object.entries(row)
    .filter(([name, value]) => {
      if (knownNames.has(name) || SYSTEM_FIELDS.has(name)) return false;
      if (name.startsWith("normalized") || name.endsWith("_count") || name.endsWith("_at")) return false;
      if (name.endsWith("_name") && `${name.replace(/_name$/, "_id")}` in row) return false;
      if (name.endsWith("_id")) return false;
      return value === null || ["string", "number", "boolean"].includes(typeof value);
    })
    .map(([name, value]) => ({
      name,
      label: name.replaceAll("_", " ").replace(/^\w/, (c) => c.toUpperCase()),
      type: typeof value === "boolean" ? "boolean" : typeof value === "number" ? "number" : "text",
    }));
}

function MasterPageContent() {
  const params = useParams();
  const resourceKey = String(params?.resource ?? "");
  const perm = usePermission(resourceKey);

  const discoveryQuery = useAdminQuery(getMasters, ["admin", "masters", "discovery"]);
  const discovery = useMemo(() => parseDiscovery(discoveryQuery.data), [discoveryQuery.data]);
  const resource = discovery.resources[resourceKey] ?? MASTER_BY_KEY[resourceKey];

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounced(search);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [values, setValues] = useState<Values>({});
  const [formError, setFormError] = useState("");
  const [formFieldErrors, setFormFieldErrors] = useState<Record<string, string>>({});
  const [duplicate, setDuplicate] = useState<{ id: string | number; active: boolean } | null>(null);
  const [rowError, setRowError] = useState("");

  const query = { search: debouncedSearch.trim(), is_active: status, page, limit: LIMIT };
  const listQuery = useAdminQuery(
    () => getMaster(resourceKey, query),
    ["admin", "master", resourceKey, query],
    Boolean(resource) && perm.view,
  );
  const list = normalizeList(listQuery.data, page, LIMIT);

  const needsStates = resource?.fields.some((f) => f.type === "state");
  const statesQuery = useAdminQuery(
    () => getLocations("states", { limit: 500 }),
    ["admin", "locations", "states", "options"],
    Boolean(needsStates),
  );
  const stateOptions = normalizeList(statesQuery.data, 1, 500).rows;

  const saveMutation = useAdminMutation<{ id?: string | number; body: Values }, unknown>(({ id, body }) =>
    id ? updateMaster(resourceKey, String(id), body) : createMaster(resourceKey, body),
  );
  const statusMutation = useAdminMutation<{ id: string | number; active: boolean }, unknown>(({ id, active }) =>
    setMasterStatus(resourceKey, String(id), active),
  );

  const formFields = useMemo(() => {
    if (!resource) return [];
    return editing ? [...resource.fields, ...extraRowFields(editing, resource.fields)] : resource.fields;
  }, [resource, editing]);

  function openAdd() {
    if (!resource) return;
    setEditing(null);
    setValues(emptyValues(resource.fields));
    resetErrors();
    setModalOpen(true);
  }

  function openEdit(row: any) {
    if (!resource) return;
    const fields = [...resource.fields, ...extraRowFields(row, resource.fields)];
    const next: Values = {};
    fields.forEach((field) => {
      const value = row?.[field.name];
      next[field.name] = field.type === "boolean" ? Boolean(value) : value === null || value === undefined ? "" : String(value);
    });
    setEditing(row);
    setValues(next);
    resetErrors();
    setModalOpen(true);
  }

  function resetErrors() {
    setFormError("");
    setFormFieldErrors({});
    setDuplicate(null);
  }

  function setValue(name: string, value: any) {
    setValues((current) => ({ ...current, [name]: value }));
    setFormFieldErrors((current) => ({ ...current, [name]: "" }));
    setFormError("");
    setDuplicate(null);
  }

  function toPayloadValue(field: MasterField, value: any) {
    if (field.type === "boolean") return Boolean(value);
    const text = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : value;
    if (text === "" || text === undefined) return null;
    if (field.type === "number" || field.type === "state") return Number(text);
    return text;
  }

  async function handleSave() {
    if (!resource) return;
    resetErrors();

    const errors: Record<string, string> = {};
    formFields.forEach((field) => {
      if (field.required && field.type !== "boolean" && !String(values[field.name] ?? "").trim()) {
        errors[field.name] = `${field.label} is required.`;
      }
    });
    if (Object.keys(errors).length) {
      setFormFieldErrors(errors);
      return;
    }

    const body: Values = {};
    formFields.forEach((field) => {
      const next = toPayloadValue(field, values[field.name]);
      if (editing) {
        const previous = toPayloadValue(field, field.type === "boolean" ? Boolean(editing[field.name]) : editing[field.name] ?? "");
        if (next === previous) return; // PATCH only what changed
      }
      if (!editing && next === null) return;
      body[field.name] = next;
    });
    if (!editing) body.is_active = true;

    if (editing && Object.keys(body).length === 0) {
      setModalOpen(false);
      return;
    }

    try {
      await saveMutation.mutateAsync({ id: editing?.id, body });
      setModalOpen(false);
      if (!editing && page !== 1) setPage(1);
    } catch (error) {
      if (errorCode(error) === "DUPLICATE_ENTRY") {
        const details = errorDetails<any>(error);
        setDuplicate({ id: details?.existing_id, active: Boolean(details?.existing_is_active) });
      }
      setFormFieldErrors(fieldErrors(error));
      setFormError(apiErrorMessage(error));
    }
  }

  async function reactivateDuplicate() {
    if (!duplicate) return;
    try {
      await statusMutation.mutateAsync({ id: duplicate.id, active: true });
      setModalOpen(false);
    } catch (error) {
      setFormError(apiErrorMessage(error));
    }
  }

  function showDuplicateInList() {
    const primary = resource?.fields.find((f) => f.required) ?? resource?.fields[0];
    setSearch(String(values[primary?.name ?? "name"] ?? ""));
    setStatus("");
    setPage(1);
    setModalOpen(false);
  }

  async function toggleStatus(row: any) {
    setRowError("");
    try {
      await statusMutation.mutateAsync({ id: row.id, active: !row.is_active });
    } catch (error) {
      setRowError(apiErrorMessage(error));
    }
  }

  const columns = useMemo<DataTableColumn[]>(() => {
    if (!resource) return [];
    const listed = resource.fields.filter((f) => f.list && f.type !== "boolean");
    const shown = listed.length ? listed : resource.fields.filter((f) => f.type !== "boolean").slice(0, 3);
    const cols: DataTableColumn[] = [
      { header: "ID", key: "id", className: "w-16", render: (v) => <span className="tabular text-xs text-muted-foreground">{v}</span> },
      ...shown.map<DataTableColumn>((field, index) => ({
        header: field.label,
        key: field.name,
        render: (value, row) =>
          field.type === "state" ? (
            row.state_name ?? value ?? "—"
          ) : index === 0 ? (
            <span className="font-medium text-foreground">{value ?? "—"}</span>
          ) : (
            <span className="text-muted-foreground">{value === null || value === "" || value === undefined ? "—" : String(value)}</span>
          ),
      })),
    ];
    if (resource.fields.some((f) => f.name === "is_common")) {
      cols.push({
        header: "Common",
        key: "is_common",
        render: (value) => (value ? <StatusBadge tone="info" dot={false}>Common</StatusBadge> : <span className="text-xs text-muted-foreground">—</span>),
      });
    }
    cols.push(
      { header: "Status", key: "is_active", render: (value) => <StatusBadge status={value ? "active" : "inactive"} /> },
      { header: "Updated", key: "updated_at", render: (value) => (value ? formatDate(value) : "—") },
    );
    if (perm.edit) {
      cols.push({
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
    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource, perm.edit, statusMutation.isPending]);

  if (!resource) {
    return (
      <NoAccess title="Unknown master" />
    );
  }
  if (!perm.loading && !perm.view) return <NoAccess />;

  const hasFilters = Boolean(search || status);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Administration" }, { label: "Master Data" }, { label: resource.label }]}
        title={resource.label}
        description={`Reference data used across the doctor portal and patient app. Records are never deleted — deactivate to hide them from new dropdowns. ${resource.duplicateRule}`}
        actions={
          <>
            {resource.importKey && (
              <Button asChild variant="outline" className="h-9 gap-1.5 text-xs">
                <Link href={`/imports?master=${resource.importKey}`}>
                  <Upload className="size-4" /> Import CSV
                </Link>
              </Button>
            )}
            {perm.add && (
              <Button type="button" className="h-9 gap-1.5 text-xs font-semibold" onClick={openAdd}>
                <Plus className="size-4" /> Add {resource.singular.toLowerCase()}
              </Button>
            )}
          </>
        }
      />

      <InlineError className="mb-4">{rowError}</InlineError>

      <ListCard
        title={resource.label}
        subtitle={listQuery.isLoading ? "Loading…" : `${list.total} record${list.total === 1 ? "" : "s"} found`}
        error={listQuery.error ? apiErrorMessage(listQuery.error) : undefined}
        filters={
          <>
            <SearchInput
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder={`Search ${resource.label.toLowerCase()}…`}
            />
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              className={filterSelectClass}
            >
              <option value="">All statuses</option>
              <option value="1">Active</option>
              <option value="0">Inactive</option>
            </select>
          </>
        }
        footer={<ListFooter list={list} onPageChange={setPage} disabled={listQuery.isFetching} />}
      >
        <DataTable
          columns={columns}
          data={list.rows}
          loading={listQuery.isLoading}
          empty={{
            icon: <Database className="size-5" />,
            title: "No records found",
            description: hasFilters ? "Try a different search or status filter." : `Add the first ${resource.singular.toLowerCase()} or import a CSV.`,
          }}
        />
      </ListCard>

      <AdminModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        busy={saveMutation.isPending}
        title={editing ? `Edit ${resource.singular.toLowerCase()}` : `Add ${resource.singular.toLowerCase()}`}
        description={resource.duplicateRule + " Inactive records count too."}
        footer={
          <>
            <Button type="button" variant="outline" className="h-9 text-xs" onClick={() => setModalOpen(false)} disabled={saveMutation.isPending}>
              Cancel
            </Button>
            <Button type="button" className="h-9 text-xs" onClick={() => void handleSave()} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <RefreshCw className="mr-1.5 size-4 animate-spin" />}
              {editing ? "Save changes" : `Add ${resource.singular.toLowerCase()}`}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {formFields
            .filter((field) => field.type !== "boolean")
            .map((field) => (
              <FormField
                key={field.name}
                label={field.label}
                required={field.required}
                error={formFieldErrors[field.name]}
                className={field.type === "textarea" || field.required ? "sm:col-span-2" : undefined}
              >
                {field.type === "textarea" ? (
                  <textarea
                    value={values[field.name] ?? ""}
                    onChange={(event) => setValue(field.name, event.target.value)}
                    className={textareaClass}
                  />
                ) : field.type === "select" ? (
                  <select value={values[field.name] ?? ""} onChange={(event) => setValue(field.name, event.target.value)} className={selectClass}>
                    <option value="">Select</option>
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === "state" ? (
                  <select value={values[field.name] ?? ""} onChange={(event) => setValue(field.name, event.target.value)} className={selectClass}>
                    <option value="">Select state</option>
                    {stateOptions.map((state: any) => (
                      <option key={state.id} value={state.id}>
                        {state.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    type={field.type === "number" ? "number" : "text"}
                    value={values[field.name] ?? ""}
                    onChange={(event) => setValue(field.name, event.target.value)}
                    className="h-9 text-sm"
                  />
                )}
              </FormField>
            ))}
        </div>

        {formFields
          .filter((field) => field.type === "boolean")
          .map((field) => (
            <SwitchRow
              key={field.name}
              label={field.label}
              description={field.name === "is_common" ? "Common items appear in the doctor's quick-pick list." : undefined}
              checked={Boolean(values[field.name])}
              onChange={(value) => setValue(field.name, value)}
            />
          ))}

        {duplicate ? (
          <InlineNotice tone="warning">
            <p className="font-medium">{formError || "This record already exists."}</p>
            <p className="mt-1">
              {duplicate.active
                ? "An active record with the same value already exists — use it instead of adding another."
                : "A matching record exists but is inactive. Reactivate it instead of creating a duplicate."}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {!duplicate.active && perm.edit && (
                <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={() => void reactivateDuplicate()}>
                  Reactivate existing record
                </Button>
              )}
              <Button type="button" size="sm" variant="ghost" className="h-8 text-xs" onClick={showDuplicateInList}>
                Show it in the list
              </Button>
            </div>
          </InlineNotice>
        ) : (
          <InlineError>{formError}</InlineError>
        )}

        {editing && (
          <p className="text-xs text-muted-foreground">
            Editing “{masterRowTitle(resource, editing)}”. Existing prescriptions and profiles that use it keep resolving.
          </p>
        )}
      </AdminModal>
    </>
  );
}

export default function MasterPage() {
  return (
    <Suspense fallback={null}>
      <MasterPageContent />
    </Suspense>
  );
}
