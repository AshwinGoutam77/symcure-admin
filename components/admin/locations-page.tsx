"use client";

import { useMemo, useState } from "react";
import { MapPin, Pencil, Plus, Power, RefreshCw, Trash2 } from "lucide-react";
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
  filterSelectClass,
  selectClass,
  useDebounced,
} from "@/components/admin/kit";
import {
  createLocation,
  deleteLocation,
  getLocations,
  setLocationStatus,
  updateLocation,
  type LocationKind,
} from "@/lib/api/admin";
import { useAdminMutation, useAdminQuery } from "@/hooks/use-admin-api";
import { usePermission } from "@/hooks/use-permission";
import { normalizeList } from "@/lib/list";
import { apiErrorMessage, describeUsage, errorCode, errorDetails, fieldErrors } from "@/lib/api/errors";
import { formatDate } from "@/lib/formatters";

const LABELS: Record<LocationKind, { one: string; many: string; description: string }> = {
  states: {
    one: "State",
    many: "States",
    description: "States and union territories used by doctor registration and the patient app.",
  },
  districts: {
    one: "District",
    many: "Districts",
    description: "Districts sit between a state and its cities (State → District → City).",
  },
  cities: {
    one: "City",
    many: "Cities",
    description: "Cities shown in registration dropdowns and the patient-app city search.",
  },
};

type FormState = {
  name: string;
  code: string;
  type: string;
  lgd_code: string;
  state_id: string;
  district_id: string;
  is_active: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  code: "",
  type: "state",
  lgd_code: "",
  state_id: "",
  district_id: "",
  is_active: true,
};

const LIMIT = 20;

export function LocationsPage({ kind }: { kind: LocationKind }) {
  const label = LABELS[kind];
  const perm = usePermission(kind);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [districtFilter, setDistrictFilter] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounced(search);

  const [editing, setEditing] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [formFieldErrors, setFormFieldErrors] = useState<Record<string, string>>({});
  const [duplicate, setDuplicate] = useState<{ id: string | number; active: boolean } | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleteUsage, setDeleteUsage] = useState("");
  const [rowError, setRowError] = useState("");

  const params = {
    search: debouncedSearch.trim(),
    is_active: status,
    state_id: kind !== "states" ? stateFilter : undefined,
    district_id: kind === "cities" ? districtFilter : undefined,
    page,
    limit: LIMIT,
  };

  const listQuery = useAdminQuery(() => getLocations(kind, params), ["admin", "locations", kind, params], perm.view);
  const list = normalizeList(listQuery.data, page, LIMIT);

  // Parent dropdowns (all states; districts of the chosen state)
  const statesQuery = useAdminQuery(
    () => getLocations("states", { limit: 500 }),
    ["admin", "locations", "states", "options"],
    kind !== "states" && perm.view,
  );
  const stateOptions = normalizeList(statesQuery.data, 1, 500).rows;

  const districtStateId = modalOpen ? form.state_id : stateFilter;
  const districtsQuery = useAdminQuery(
    () => getLocations("districts", { state_id: districtStateId, limit: 500 }),
    ["admin", "locations", "districts", "options", districtStateId],
    kind === "cities" && Boolean(districtStateId) && perm.view,
  );
  const districtOptions = normalizeList(districtsQuery.data, 1, 500).rows;

  const saveMutation = useAdminMutation<{ id?: string | number; body: Record<string, unknown> }, unknown>(
    ({ id, body }) => (id ? updateLocation(kind, id, body) : createLocation(kind, body)),
  );
  const statusMutation = useAdminMutation<{ id: string | number; active: boolean }, unknown>(({ id, active }) =>
    setLocationStatus(kind, id, active),
  );
  const deleteMutation = useAdminMutation<string | number, unknown>((id) => deleteLocation(kind, id));

  function openAdd() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, state_id: kind !== "states" ? stateFilter : "", district_id: kind === "cities" ? districtFilter : "" });
    resetFormErrors();
    setModalOpen(true);
  }

  function openEdit(row: any) {
    setEditing(row);
    setForm({
      name: row.name ?? "",
      code: row.code ?? "",
      type: row.type ?? "state",
      lgd_code: row.lgd_code ?? "",
      state_id: row.state_id ? String(row.state_id) : "",
      district_id: row.district_id ? String(row.district_id) : "",
      is_active: Boolean(row.is_active),
    });
    resetFormErrors();
    setModalOpen(true);
  }

  function resetFormErrors() {
    setFormError("");
    setFormFieldErrors({});
    setDuplicate(null);
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setFormFieldErrors((current) => ({ ...current, [key]: "" }));
    setFormError("");
    setDuplicate(null);
  }

  function buildBody() {
    const body: Record<string, unknown> = { name: form.name.trim() };
    if (!editing) body.is_active = form.is_active;
    if (kind === "states") {
      body.code = form.code.trim() || null;
      body.type = form.type || "state";
    }
    if (kind === "districts") {
      body.state_id = Number(form.state_id);
      body.lgd_code = form.lgd_code.trim() || null;
    }
    if (kind === "cities") {
      body.state_id = Number(form.state_id);
      body.district_id = form.district_id ? Number(form.district_id) : null;
    }
    return body;
  }

  async function handleSave() {
    resetFormErrors();
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = "Name is required.";
    if (kind !== "states" && !form.state_id) errors.state_id = "Choose a state.";
    if (Object.keys(errors).length) {
      setFormFieldErrors(errors);
      return;
    }
    try {
      await saveMutation.mutateAsync({ id: editing?.id, body: buildBody() });
      setModalOpen(false);
    } catch (error) {
      const code = errorCode(error);
      const details = errorDetails<any>(error);
      if (code === "DUPLICATE_ENTRY" && details?.existing_id) {
        setDuplicate({ id: details.existing_id, active: Boolean(details.existing_is_active) });
      }
      if (code === "RECORD_IN_USE") {
        const usage = describeUsage(details?.used_by);
        setFormError(
          `This ${label.one.toLowerCase()} is already used${usage ? ` by ${usage}` : ""}, so its state can't be changed.`,
        );
        return;
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

  async function toggleStatus(row: any) {
    setRowError("");
    try {
      await statusMutation.mutateAsync({ id: row.id, active: !row.is_active });
    } catch (error) {
      setRowError(apiErrorMessage(error));
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteError("");
    setDeleteUsage("");
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (error) {
      if (errorCode(error) === "RECORD_IN_USE") {
        setDeleteUsage(describeUsage(errorDetails<any>(error)?.used_by) || "other records");
        return;
      }
      setDeleteError(apiErrorMessage(error));
    }
  }

  async function deactivateInstead() {
    if (!deleteTarget) return;
    try {
      await statusMutation.mutateAsync({ id: deleteTarget.id, active: false });
      setDeleteTarget(null);
    } catch (error) {
      setDeleteError(apiErrorMessage(error));
    }
  }

  const columns = useMemo<DataTableColumn[]>(() => {
    const cols: DataTableColumn[] = [
      {
        header: "Name",
        key: "name",
        render: (value, row) => (
          <div className="min-w-[160px]">
            <p className="text-sm font-medium text-foreground">{value}</p>
            {kind === "states" && (row.code || row.type) && (
              <p className="text-xs text-muted-foreground">
                {[row.code, row.type === "union_territory" ? "Union territory" : row.type ? "State" : ""]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
            {kind === "districts" && row.lgd_code && <p className="text-xs text-muted-foreground">LGD {row.lgd_code}</p>}
          </div>
        ),
      },
    ];
    if (kind !== "states") cols.push({ header: "State", key: "state_name", render: (v) => v || "—" });
    if (kind === "cities") cols.push({ header: "District", key: "district_name", render: (v) => v || "—" });
    cols.push(
      {
        header: "Used by",
        key: "used_by",
        render: (value, row) =>
          row.in_use ? (
            <span className="text-xs text-muted-foreground">{describeUsage(value) || "In use"}</span>
          ) : (
            <span className="text-xs text-muted-foreground/70">Not used</span>
          ),
      },
      {
        header: "Status",
        key: "is_active",
        render: (value) => <StatusBadge status={value ? "active" : "inactive"} />,
      },
      { header: "Updated", key: "updated_at", render: (value) => (value ? formatDate(value) : "—") },
    );
    if (perm.edit || perm.delete) {
      cols.push({
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
                <RowAction onClick={() => void toggleStatus(row)} disabled={statusMutation.isPending}>
                  <Power className="size-3.5" /> {row.is_active ? "Deactivate" : "Activate"}
                </RowAction>
              </>
            )}
            {perm.delete && (
              <RowAction
                tone="danger"
                disabled={Boolean(row.in_use)}
                title={row.in_use ? "In use — deactivate it instead" : undefined}
                onClick={() => {
                  setDeleteError("");
                  setDeleteUsage("");
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
    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, perm.edit, perm.delete, statusMutation.isPending]);

  if (!perm.loading && !perm.view) return <NoAccess />;

  const hasFilters = Boolean(search || status || stateFilter || districtFilter);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Administration" }, { label: "Locations" }, { label: label.many }]}
        title={label.many}
        description={label.description}
        actions={
          perm.add && (
            <Button type="button" className="h-9 gap-1.5 text-xs font-semibold" onClick={openAdd}>
              <Plus className="size-4" /> Add {label.one.toLowerCase()}
            </Button>
          )
        }
      />

      <InlineError className="mb-4">{rowError}</InlineError>

      <ListCard
        title={label.many}
        subtitle={listQuery.isLoading ? "Loading…" : `${list.total} ${list.total === 1 ? label.one.toLowerCase() : label.many.toLowerCase()} found`}
        error={listQuery.error ? apiErrorMessage(listQuery.error) : undefined}
        filters={
          <>
            <SearchInput
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder={`Search ${label.many.toLowerCase()}…`}
            />
            {kind !== "states" && (
              <select
                value={stateFilter}
                onChange={(event) => {
                  setStateFilter(event.target.value);
                  setDistrictFilter("");
                  setPage(1);
                }}
                className={filterSelectClass}
              >
                <option value="">All states</option>
                {stateOptions.map((state: any) => (
                  <option key={state.id} value={state.id}>
                    {state.name}
                  </option>
                ))}
              </select>
            )}
            {kind === "cities" && (
              <select
                value={districtFilter}
                disabled={!stateFilter}
                onChange={(event) => {
                  setDistrictFilter(event.target.value);
                  setPage(1);
                }}
                className={filterSelectClass}
              >
                <option value="">{stateFilter ? "All districts" : "Pick a state first"}</option>
                {districtOptions.map((district: any) => (
                  <option key={district.id} value={district.id}>
                    {district.name}
                  </option>
                ))}
              </select>
            )}
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
            icon: <MapPin className="size-5" />,
            title: `No ${label.many.toLowerCase()} found`,
            description: hasFilters ? "Try a different search or filter." : `Add the first ${label.one.toLowerCase()}.`,
          }}
        />
      </ListCard>

      {/* Add / edit */}
      <AdminModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        busy={saveMutation.isPending}
        title={editing ? `Edit ${label.one.toLowerCase()}` : `Add ${label.one.toLowerCase()}`}
        description={
          kind === "states"
            ? "State names must be unique."
            : `${label.one} names must be unique within a state.`
        }
        footer={
          <>
            <Button type="button" variant="outline" className="h-9 text-xs" onClick={() => setModalOpen(false)} disabled={saveMutation.isPending}>
              Cancel
            </Button>
            <Button type="button" className="h-9 text-xs" onClick={() => void handleSave()} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <RefreshCw className="mr-1.5 size-4 animate-spin" />}
              {editing ? "Save changes" : `Add ${label.one.toLowerCase()}`}
            </Button>
          </>
        }
      >
        {kind !== "states" && (
          <FormField label="State" required error={formFieldErrors.state_id}>
            <select
              value={form.state_id}
              onChange={(event) => {
                update("state_id", event.target.value);
                update("district_id", "");
              }}
              className={selectClass}
              disabled={editing?.in_use}
            >
              <option value="">Select state</option>
              {stateOptions.map((state: any) => (
                <option key={state.id} value={state.id}>
                  {state.name}
                  {state.is_active ? "" : " (inactive)"}
                </option>
              ))}
            </select>
            {editing?.in_use && (
              <p className="text-xs text-muted-foreground">The state can&apos;t change while this record is in use.</p>
            )}
          </FormField>
        )}

        {kind === "cities" && (
          <FormField label="District" hint="Optional. Must belong to the chosen state." error={formFieldErrors.district_id}>
            <select
              value={form.district_id}
              onChange={(event) => update("district_id", event.target.value)}
              className={selectClass}
              disabled={!form.state_id}
            >
              <option value="">{form.state_id ? "No district" : "Select a state first"}</option>
              {districtOptions.map((district: any) => (
                <option key={district.id} value={district.id}>
                  {district.name}
                  {district.is_active ? "" : " (inactive)"}
                </option>
              ))}
            </select>
          </FormField>
        )}

        <FormField label="Name" required error={formFieldErrors.name}>
          <Input
            value={form.name}
            autoFocus
            onChange={(event) => update("name", event.target.value)}
            placeholder={`${label.one} name`}
            className="h-9 text-sm"
          />
        </FormField>

        {kind === "states" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Code" hint="e.g. RJ" error={formFieldErrors.code}>
              <Input value={form.code} onChange={(event) => update("code", event.target.value)} className="h-9 text-sm" />
            </FormField>
            <FormField label="Type" error={formFieldErrors.type}>
              <select value={form.type} onChange={(event) => update("type", event.target.value)} className={selectClass}>
                <option value="state">State</option>
                <option value="union_territory">Union territory</option>
              </select>
            </FormField>
          </div>
        )}

        {kind === "districts" && (
          <FormField label="LGD code" hint="Optional government district code." error={formFieldErrors.lgd_code}>
            <Input value={form.lgd_code} onChange={(event) => update("lgd_code", event.target.value)} className="h-9 text-sm" />
          </FormField>
        )}

        {!editing && (
          <SwitchRow
            label="Active"
            description="Inactive records are hidden from registration and patient-app dropdowns."
            checked={form.is_active}
            onChange={(value) => update("is_active", value)}
          />
        )}

        {duplicate ? (
          <InlineNotice tone="warning">
            <p>{formError || `This ${label.one.toLowerCase()} already exists.`}</p>
            {!duplicate.active && perm.edit && (
              <Button type="button" size="sm" variant="outline" className="mt-2 h-8 text-xs" onClick={() => void reactivateDuplicate()}>
                Reactivate the existing {label.one.toLowerCase()}
              </Button>
            )}
            {duplicate.active && <p className="mt-1">It is already active — use that one.</p>}
          </InlineNotice>
        ) : (
          <InlineError>{formError}</InlineError>
        )}
      </AdminModal>

      {/* Delete */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        busy={deleteMutation.isPending || statusMutation.isPending}
        title={`Delete ${label.one.toLowerCase()}`}
        confirmLabel="Delete permanently"
        confirmDisabled={Boolean(deleteUsage)}
        description={
          deleteUsage
            ? undefined
            : `“${deleteTarget?.name ?? ""}” will be removed permanently. This can't be undone.`
        }
        error={deleteError}
      >
        {deleteUsage && (
          <InlineNotice tone="warning">
            <p>
              “{deleteTarget?.name}” can&apos;t be deleted because it is used by {deleteUsage}. Deactivate it instead —
              it disappears from new dropdowns but existing records keep showing it.
            </p>
            {perm.edit && deleteTarget?.is_active && (
              <Button type="button" size="sm" variant="outline" className="mt-2 h-8 text-xs" onClick={() => void deactivateInstead()}>
                Deactivate instead
              </Button>
            )}
          </InlineNotice>
        )}
      </ConfirmDialog>
    </>
  );
}
