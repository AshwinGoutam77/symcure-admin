/**
 * Master-data configuration.
 *
 * GET /admin/masters returns the resources the caller may view plus field metadata.
 * The shape of that metadata is parsed defensively here; when it doesn't describe
 * the fields, the fallback list below is used so every master still gets a full
 * add/edit form (not just "name").
 */

export type MasterFieldType = "text" | "textarea" | "number" | "boolean" | "select" | "state";

export interface MasterField {
  name: string;
  label: string;
  type: MasterFieldType;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  /** Show in the table */
  list?: boolean;
}

export interface MasterResource {
  key: string;
  label: string;
  singular: string;
  /** Slug used by the CSV import endpoints, when the master can be imported */
  importKey?: string;
  duplicateRule: string;
  fields: MasterField[];
}

export const MASTER_RESOURCES: MasterResource[] = [
  {
    key: "master_medicines",
    label: "Medicines",
    singular: "Medicine",
    importKey: "medicines",
    duplicateRule: "Generic name + brand name must be unique.",
    fields: [
      { name: "generic_name", label: "Generic name", type: "text", required: true, list: true },
      { name: "brand_name", label: "Brand name", type: "text", list: true },
      { name: "is_common", label: "Common", type: "boolean" },
    ],
  },
  {
    key: "master_diagnoses",
    label: "Diagnoses",
    singular: "Diagnosis",
    importKey: "diagnoses",
    duplicateRule: "Name must be unique.",
    fields: [
      { name: "name", label: "Name", type: "text", required: true, list: true },
      { name: "is_common", label: "Common", type: "boolean" },
    ],
  },
  {
    key: "master_symptoms",
    label: "Symptoms",
    singular: "Symptom",
    importKey: "symptoms",
    duplicateRule: "Name must be unique.",
    fields: [
      { name: "name", label: "Name", type: "text", required: true, list: true },
      { name: "is_common", label: "Common", type: "boolean" },
    ],
  },
  {
    key: "master_lab_tests",
    label: "Lab Tests",
    singular: "Lab test",
    importKey: "lab-tests",
    duplicateRule: "Name must be unique.",
    fields: [
      { name: "name", label: "Name", type: "text", required: true, list: true },
      { name: "code", label: "Code", type: "text", list: true },
      { name: "category", label: "Category", type: "text", list: true },
      { name: "is_common", label: "Common", type: "boolean" },
    ],
  },
  {
    key: "colleges",
    label: "Colleges",
    singular: "College",
    importKey: "colleges",
    duplicateRule: "College name + state must be unique.",
    fields: [
      { name: "name", label: "College name", type: "text", required: true, list: true },
      { name: "state", label: "State", type: "text", list: true },
      { name: "management_of_college", label: "Management of college", type: "text", list: true },
    ],
  },
  {
    key: "degrees",
    label: "Degrees",
    singular: "Degree",
    duplicateRule: "Name must be unique.",
    fields: [{ name: "name", label: "Name", type: "text", required: true, list: true }],
  },
  {
    key: "medical_councils",
    label: "Medical Councils",
    singular: "Medical council",
    duplicateRule: "Name must be unique.",
    fields: [{ name: "name", label: "Name", type: "text", required: true, list: true }],
  },
  {
    key: "specializations",
    label: "Specializations",
    singular: "Specialization",
    duplicateRule: "Name must be unique.",
    fields: [{ name: "name", label: "Name", type: "text", required: true, list: true }],
  },
  {
    key: "qualification_specializations",
    label: "Qualification Specializations",
    singular: "Qualification specialization",
    importKey: "qualification-specializations",
    duplicateRule: "Name must be unique.",
    fields: [{ name: "name", label: "Name", type: "text", required: true, list: true }],
  },
];

export const MASTER_BY_KEY: Record<string, MasterResource> = Object.fromEntries(
  MASTER_RESOURCES.map((resource) => [resource.key, resource]),
);

/** Old preview URLs (/import-master-date/preview/medicines …) → resource keys */
export const LEGACY_MASTER_SLUGS: Record<string, string> = {
  medicines: "master_medicines",
  tests: "master_lab_tests",
  symptoms: "master_symptoms",
  diagnosis: "master_diagnoses",
  "medical-council": "medical_councils",
  colleges: "colleges",
  specializations: "specializations",
  qualifications: "qualification_specializations",
  degrees: "degrees",
};

/** Fields that are never edited through the generic master form. */
export const SYSTEM_FIELDS = new Set([
  "id",
  "is_active",
  "status",
  "created_at",
  "updated_at",
  "deleted_at",
  "created_by",
  "updated_by",
  "created_by_user_id",
  "updated_by_user_id",
  "normalized_name",
  "normalized_key",
  "in_use",
  "used_by",
]);

function humanize(name: string) {
  const text = name.replace(/_id$/, "").replaceAll("_", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function mapType(raw: any, name: string, options?: unknown[]): MasterFieldType {
  const type = String(raw ?? "").toLowerCase();
  if (name === "state_id") return "state";
  if (["bool", "boolean", "checkbox", "switch", "toggle"].includes(type)) return "boolean";
  if (["textarea", "longtext", "text_long", "rich_text"].includes(type)) return "textarea";
  if (["int", "integer", "number", "numeric", "decimal", "float"].includes(type)) return "number";
  if (["select", "enum", "dropdown"].includes(type) || (options && options.length)) return "select";
  if (name.startsWith("is_")) return "boolean";
  return "text";
}

function normalizeOptions(options: unknown): MasterField["options"] {
  if (!Array.isArray(options)) {
    if (options && typeof options === "object") {
      return Object.entries(options as Record<string, unknown>).map(([value, label]) => ({ value, label: String(label) }));
    }
    return undefined;
  }
  return options.map((option: any) =>
    typeof option === "object" && option
      ? { value: String(option.value ?? option.id ?? option.key ?? ""), label: String(option.label ?? option.name ?? option.value ?? "") }
      : { value: String(option), label: String(option) },
  );
}

function parseFields(raw: unknown): MasterField[] {
  if (!raw) return [];
  const entries: Array<[string, any]> = Array.isArray(raw)
    ? raw.map((item: any) =>
        typeof item === "string" ? [item, {}] : [String(item?.name ?? item?.key ?? item?.field ?? item?.column ?? ""), item],
      )
    : typeof raw === "object"
      ? Object.entries(raw as Record<string, any>).map(([name, meta]) => [name, typeof meta === "string" ? { type: meta } : meta ?? {}])
      : [];

  return entries
    .filter(([name]) => name && !SYSTEM_FIELDS.has(name))
    .map(([name, meta]) => {
      const options = normalizeOptions(meta?.options ?? meta?.values ?? meta?.choices);
      const rules = Array.isArray(meta?.rules) ? meta.rules.join("|") : String(meta?.rules ?? "");
      return {
        name,
        label: String(meta?.label ?? meta?.title ?? humanize(name)),
        type: mapType(meta?.type ?? meta?.input, name, options),
        required: Boolean(meta?.required) || /(^|\|)required(\||$)/.test(rules),
        options,
        list: meta?.list ?? meta?.listable ?? meta?.show_in_list,
      } satisfies MasterField;
    });
}

/**
 * Merge discovery metadata (if any) over the fallback config.
 * Returns the list of resource keys the caller may view, or null if discovery
 * didn't return a recognisable list (then permissions from /admin/me decide).
 */
export function parseDiscovery(payload: any): { allowed: string[] | null; resources: Record<string, MasterResource> } {
  const resources: Record<string, MasterResource> = { ...MASTER_BY_KEY };
  const raw = payload?.resources ?? payload?.masters ?? payload?.data ?? payload;

  const items: Array<[string, any]> = Array.isArray(raw)
    ? raw.map((item: any) => [String(item?.key ?? item?.resource ?? item?.name ?? item?.slug ?? ""), item])
    : raw && typeof raw === "object"
      ? Object.entries(raw).filter(([, value]) => value && typeof value === "object")
      : [];

  const allowed: string[] = [];
  items.forEach(([key, meta]) => {
    if (!key || key === "lookup_options") {
      if (key === "lookup_options") allowed.push(key);
      return;
    }
    allowed.push(key);
    const base = resources[key];
    const fields = parseFields(meta?.fields ?? meta?.columns ?? meta?.editable_fields ?? meta?.field_metadata);
    if (!base && !fields.length) return;

    const merged: MasterField[] = fields.length
      ? fields.map((field) => {
          const fallback = base?.fields.find((f) => f.name === field.name);
          return { ...fallback, ...field, list: field.list ?? fallback?.list ?? field.required };
        })
      : base?.fields ?? [];

    // Always keep is_common editable when the base knows about it.
    if (base?.fields.some((f) => f.name === "is_common") && !merged.some((f) => f.name === "is_common")) {
      merged.push({ name: "is_common", label: "Common", type: "boolean" });
    }

    resources[key] = {
      key,
      label: String(meta?.label ?? meta?.title ?? base?.label ?? humanize(key)),
      singular: base?.singular ?? String(meta?.singular ?? meta?.label ?? humanize(key)),
      importKey: base?.importKey,
      duplicateRule: base?.duplicateRule ?? "Name must be unique.",
      fields: merged,
    };
  });

  return { allowed: allowed.length ? allowed : null, resources };
}

/** Value shown in suggestion lists / confirmations for a row of a master. */
export function masterRowTitle(resource: MasterResource, row: any) {
  const primary = resource.fields.find((f) => f.required) ?? resource.fields[0];
  const value = row?.[primary?.name ?? "name"] ?? row?.name ?? row?.generic_name ?? `#${row?.id}`;
  if (resource.key === "master_medicines" && row?.brand_name) return `${value} (${row.brand_name})`;
  return String(value);
}
