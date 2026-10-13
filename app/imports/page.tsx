"use client";

import { Suspense, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileUp,
  History,
  Info,
  RefreshCw,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FormField,
  InlineError,
  InlineNotice,
  ListCard,
  ListFooter,
  NoAccess,
  RowAction,
  SearchInput,
  filterSelectClass,
  selectClass,
  useDebounced,
} from "@/components/admin/kit";
import {
  downloadImportFile,
  downloadImportTemplate,
  getImportLogs,
  getSystemUsers,
  uploadMasterImport,
} from "@/lib/api/admin";
import { useAdminMutation, useAdminQuery } from "@/hooks/use-admin-api";
import { usePermission } from "@/hooks/use-permission";
import { normalizeList } from "@/lib/list";
import { apiErrorMessage, errorCode, errorDetails } from "@/lib/api/errors";
import { formatDateTime, formatNumber } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const IMPORT_MASTERS = [
  { slug: "medicines", logKey: "master_medicines", label: "Medicines", headers: ["generic_name"] },
  { slug: "diagnoses", logKey: "master_diagnoses", label: "Diagnoses", headers: ["name"] },
  { slug: "symptoms", logKey: "master_symptoms", label: "Symptoms", headers: ["name"] },
  { slug: "lab-tests", logKey: "master_lab_tests", label: "Lab Tests", headers: ["name"] },
  {
    slug: "qualification-specializations",
    logKey: "qualification_specializations",
    label: "Qualification Specializations",
    headers: ["name"],
  },
  { slug: "colleges", logKey: "colleges", label: "Colleges", headers: ["College Name", "State", "Management Of College"] },
] as const;

const MAX_MB = 10;
const LIMIT = 15;

type ImportLog = {
  id: number | string;
  status?: string;
  master?: string;
  master_label?: string;
  total_rows?: number;
  inserted?: number;
  skipped_existing?: number;
  skipped_duplicate_in_file?: number;
  skipped_invalid?: number;
  original_file_name?: string;
  download_url?: string | null;
  error_message?: string | null;
  message?: string | null;
  created_at?: string;
  [key: string]: any;
};

function uploaderName(row: ImportLog) {
  return (
    row.admin_user?.full_name ??
    row.admin_user?.name ??
    row.uploaded_by?.full_name ??
    row.uploaded_by?.name ??
    row.admin_name ??
    row.actor_name ??
    row.uploader_name ??
    "—"
  );
}

function ResultSummary({ log, failed }: { log: ImportLog; failed?: boolean }) {
  const stats = [
    { label: "Total rows", value: log.total_rows },
    { label: "Inserted", value: log.inserted, tone: "text-success" },
    { label: "Already existed", value: log.skipped_existing },
    { label: "Duplicate in file", value: log.skipped_duplicate_in_file },
    { label: "Invalid rows", value: log.skipped_invalid, tone: Number(log.skipped_invalid) > 0 ? "text-warning" : undefined },
  ];
  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        failed ? "border-destructive/25 bg-destructive-soft" : "border-success/25 bg-success-soft",
      )}
    >
      <div className="flex items-start gap-3">
        {failed ? <XCircle className="mt-0.5 size-5 text-destructive" /> : <CheckCircle2 className="mt-0.5 size-5 text-success" />}
        <div className="min-w-0 flex-1">
          <p className={cn("text-sm font-semibold", failed ? "text-destructive" : "text-success")}>
            {failed ? "Import failed" : "Import finished"}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {log.master_label ?? log.master} · {log.original_file_name}
          </p>
          {failed && (log.error_message || log.message) && (
            <p className="mt-1 text-xs text-destructive">{log.error_message || log.message}</p>
          )}
        </div>
      </div>
      {!failed && (
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-md bg-card px-3 py-2">
              <dt className="text-xs text-muted-foreground">{stat.label}</dt>
              <dd className={cn("tabular mt-0.5 text-lg font-semibold text-foreground", stat.tone)}>{formatNumber(stat.value ?? 0)}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function ImportsContent() {
  const searchParams = useSearchParams();
  const perm = usePermission("imports");
  const initialMaster = IMPORT_MASTERS.find((m) => m.slug === searchParams.get("master"))?.slug ?? IMPORT_MASTERS[0].slug;

  const [master, setMaster] = useState<string>(initialMaster);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [result, setResult] = useState<{ log: ImportLog; failed: boolean } | null>(null);
  const [templateBusy, setTemplateBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // History filters
  const [historyMaster, setHistoryMaster] = useState("");
  const [historyStatus, setHistoryStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [uploader, setUploader] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [downloadError, setDownloadError] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | number | null>(null);
  const debouncedSearch = useDebounced(search);

  const selected = IMPORT_MASTERS.find((m) => m.slug === master) ?? IMPORT_MASTERS[0];

  const historyParams = {
    master: historyMaster,
    status: historyStatus,
    date_from: dateFrom,
    date_to: dateTo,
    search: debouncedSearch.trim(),
    admin_user_id: perm.isSuperAdmin ? uploader : undefined,
    page,
    limit: LIMIT,
  };
  const historyQuery = useAdminQuery(() => getImportLogs(historyParams), ["admin", "imports", "logs", historyParams], perm.view);
  const history = normalizeList<ImportLog>(historyQuery.data, page, LIMIT);

  const usersQuery = useAdminQuery(
    () => getSystemUsers({ limit: 200 }),
    ["admin", "system-users", "uploader-options"],
    perm.isSuperAdmin,
  );
  const uploaderOptions = normalizeList(usersQuery.data, 1, 200).rows;

  const uploadMutation = useAdminMutation<{ master: string; file: File }, any>(({ master, file }) =>
    uploadMasterImport(master, file),
  );

  function pickFile(next: File | null | undefined) {
    setFileError("");
    setUploadError("");
    setResult(null);
    if (!next) return;
    if (!next.name.toLowerCase().endsWith(".csv")) {
      setFile(null);
      setFileError("Only .csv files can be imported. Save the sheet as CSV and try again.");
      return;
    }
    if (next.size > MAX_MB * 1024 * 1024) {
      setFile(null);
      setFileError(`The file is ${(next.size / 1024 / 1024).toFixed(1)} MB. The limit is ${MAX_MB} MB.`);
      return;
    }
    setFile(next);
  }

  async function handleTemplate() {
    setTemplateBusy(true);
    setUploadError("");
    try {
      await downloadImportTemplate(selected.slug);
    } catch (error) {
      setUploadError(apiErrorMessage(error, "Couldn't download the template."));
    } finally {
      setTemplateBusy(false);
    }
  }

  async function handleUpload() {
    if (!file) return;
    setUploadError("");
    setResult(null);
    try {
      const response = await uploadMutation.mutateAsync({ master: selected.slug, file });
      const log: ImportLog = response?.import_log ?? response;
      setResult({ log, failed: log?.status === "failed" });
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
    } catch (error) {
      const code = errorCode(error);
      if (code === "IMPORT_FAILED") {
        const log = errorDetails<any>(error)?.import_log;
        if (log) setResult({ log: { ...log, error_message: log.error_message ?? apiErrorMessage(error) }, failed: true });
        else setUploadError(apiErrorMessage(error));
        return;
      }
      if (code === "IMPORT_IN_PROGRESS") {
        setUploadError(`A ${selected.label.toLowerCase()} import is already running. Wait a moment and upload again.`);
        return;
      }
      setUploadError(apiErrorMessage(error));
    }
  }

  async function handleDownload(row: ImportLog) {
    setDownloadError("");
    setDownloadingId(row.id);
    try {
      await downloadImportFile(row);
    } catch (error) {
      setDownloadError(apiErrorMessage(error, "Couldn't download the file."));
    } finally {
      setDownloadingId(null);
    }
  }

  const columns: DataTableColumn[] = [
    { header: "Uploaded", key: "created_at", render: (v) => <span className="whitespace-nowrap text-xs">{formatDateTime(v)}</span> },
    {
      header: "Master",
      key: "master_label",
      render: (v, row) => <span className="font-medium text-foreground">{v ?? row.master}</span>,
    },
    {
      header: "File",
      key: "original_file_name",
      render: (v) => (
        <span className="flex max-w-[220px] items-center gap-1.5 truncate text-xs text-muted-foreground">
          <FileSpreadsheet className="size-3.5 shrink-0" />
          <span className="truncate">{v ?? "—"}</span>
        </span>
      ),
    },
    ...(perm.isSuperAdmin ? [{ header: "Uploaded by", key: "uploader", render: (_: unknown, row: any) => uploaderName(row) }] : []),
    { header: "Status", key: "status", render: (v) => <StatusBadge status={v} /> },
    { header: "Rows", key: "total_rows", align: "right", render: (v) => <span className="tabular">{formatNumber(v ?? 0)}</span> },
    { header: "Inserted", key: "inserted", align: "right", render: (v) => <span className="tabular text-success">{formatNumber(v ?? 0)}</span> },
    {
      header: "Skipped",
      key: "skipped_existing",
      align: "right",
      render: (_, row) => (
        <span
          className="tabular text-xs text-muted-foreground"
          title={`Existing ${row.skipped_existing ?? 0} · Duplicate in file ${row.skipped_duplicate_in_file ?? 0} · Invalid ${row.skipped_invalid ?? 0}`}
        >
          {formatNumber(row.skipped_existing ?? 0)} / {formatNumber(row.skipped_duplicate_in_file ?? 0)} / {formatNumber(row.skipped_invalid ?? 0)}
        </span>
      ),
    },
    {
      header: "",
      key: "download",
      align: "right",
      render: (_, row) => (
        <RowAction onClick={() => void handleDownload(row as ImportLog)} disabled={downloadingId === row.id}>
          {downloadingId === row.id ? <RefreshCw className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
          File
        </RowAction>
      ),
    },
  ];

  if (!perm.loading && !perm.view) return <NoAccess />;

  const hasHistoryFilters = Boolean(historyMaster || historyStatus || dateFrom || dateTo || search || uploader);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Administration" }, { label: "Master Imports" }]}
        title="Master Imports"
        description="Upload a CSV to add records to a master. Every upload is kept below with its counts and a copy of the file."
      />

      <div className="mb-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Upload */}
        <section className="overflow-hidden rounded-lg bg-card shadow-card">
          <div className="border-b border-border/60 px-5 py-4">
            <h2 className="text-base font-semibold text-foreground">Upload a CSV</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Pick the master, check the header row, then upload.</p>
          </div>
          <div className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <FormField label="Master">
                <select
                  value={master}
                  onChange={(e) => {
                    setMaster(e.target.value);
                    setResult(null);
                    setUploadError("");
                  }}
                  className={selectClass}
                  disabled={uploadMutation.isPending}
                >
                  {IMPORT_MASTERS.map((m) => (
                    <option key={m.slug} value={m.slug}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <Button type="button" variant="outline" className="h-9 gap-1.5 text-xs" onClick={() => void handleTemplate()} disabled={templateBusy}>
                {templateBusy ? <RefreshCw className="size-4 animate-spin" /> : <Download className="size-4" />}
                Download sample file
              </Button>
            </div>

            <div className="rounded-md border border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
              Required header{selected.headers.length > 1 ? "s" : ""}:{" "}
              {selected.headers.map((header, index) => (
                <span key={header}>
                  <code className="rounded bg-card px-1.5 py-0.5 font-medium text-foreground">{header}</code>
                  {index < selected.headers.length - 1 ? ", " : ""}
                </span>
              ))}
              . The first row of the file must be the header row.
            </div>

            {perm.add ? (
              <>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    pickFile(e.dataTransfer.files?.[0]);
                  }}
                  onClick={() => fileInput.current?.click()}
                  className={cn(
                    "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 text-center transition",
                    dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/40",
                  )}
                >
                  <FileUp className="size-7 text-primary" />
                  <p className="mt-2 text-sm font-medium text-foreground">Drop a CSV here or click to choose</p>
                  <p className="mt-1 text-xs text-muted-foreground">.csv only · up to {MAX_MB} MB</p>
                  <input
                    ref={fileInput}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => pickFile(e.target.files?.[0])}
                  />
                </div>

                {file && (
                  <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/40 px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <FileSpreadsheet className="size-4 shrink-0 text-primary" />
                      <span className="truncate text-sm text-foreground">{file.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        if (fileInput.current) fileInput.current.value = "";
                      }}
                      disabled={uploadMutation.isPending}
                      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label="Remove file"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                )}

                <InlineError>{fileError || uploadError}</InlineError>

                <div className="flex justify-end">
                  <Button type="button" className="h-9 gap-1.5 text-xs font-semibold" disabled={!file || uploadMutation.isPending} onClick={() => void handleUpload()}>
                    {uploadMutation.isPending ? <RefreshCw className="size-4 animate-spin" /> : <Upload className="size-4" />}
                    {uploadMutation.isPending ? "Importing…" : `Import ${selected.label.toLowerCase()}`}
                  </Button>
                </div>
              </>
            ) : (
              <InlineNotice tone="info">Your role can view import history but can&apos;t upload. Uploading needs the Imports “add” permission.</InlineNotice>
            )}

            {result && <ResultSummary log={result.log} failed={result.failed} />}
          </div>
        </section>

        {/* Rules */}
        <section className="h-fit overflow-hidden rounded-lg bg-card shadow-card">
          <div className="flex items-center gap-2 border-b border-border/60 px-5 py-4">
            <Info className="size-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">How imports work</h2>
          </div>
          <ul className="space-y-3 p-5 text-xs leading-5 text-muted-foreground">
            <li>Records that already exist are skipped. Nothing is updated or deleted.</li>
            <li>Rows repeated inside the same file are counted once; invalid rows are skipped and counted.</li>
            <li>Each upload runs once. To import again, upload the file again — it creates a new history entry.</li>
            <li>Only one import per master can run at a time.</li>
            <li>{perm.isSuperAdmin ? "You see every admin's uploads." : "You see your own uploads."}</li>
          </ul>
        </section>
      </div>

      {/* History */}
      <ListCard
        title={
          <span className="flex items-center gap-2">
            <History className="size-4 text-muted-foreground" /> Import history
          </span>
        }
        subtitle={historyQuery.isLoading ? "Loading…" : `${history.total} upload${history.total === 1 ? "" : "s"}`}
        error={historyQuery.error ? apiErrorMessage(historyQuery.error) : downloadError || undefined}
        filters={
          <>
            <SearchInput
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder="Search file name…"
              className="sm:w-[220px]"
            />
            <select
              value={historyMaster}
              onChange={(e) => {
                setHistoryMaster(e.target.value);
                setPage(1);
              }}
              className={filterSelectClass}
            >
              <option value="">All masters</option>
              {IMPORT_MASTERS.map((m) => (
                <option key={m.logKey} value={m.logKey}>
                  {m.label}
                </option>
              ))}
            </select>
            <select
              value={historyStatus}
              onChange={(e) => {
                setHistoryStatus(e.target.value);
                setPage(1);
              }}
              className={filterSelectClass}
            >
              <option value="">All statuses</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="processing">Processing</option>
            </select>
            {perm.isSuperAdmin && (
              <select
                value={uploader}
                onChange={(e) => {
                  setUploader(e.target.value);
                  setPage(1);
                }}
                className={filterSelectClass}
              >
                <option value="">All uploaders</option>
                {uploaderOptions.map((user: any) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name ?? user.name ?? `User #${user.id}`}
                  </option>
                ))}
              </select>
            )}
            <Input
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="h-9 w-[150px] bg-muted/50 text-xs"
              aria-label="From date"
            />
            <Input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="h-9 w-[150px] bg-muted/50 text-xs"
              aria-label="To date"
            />
          </>
        }
        footer={<ListFooter list={history} onPageChange={setPage} disabled={historyQuery.isFetching} />}
      >
        <DataTable
          columns={columns}
          data={history.rows}
          loading={historyQuery.isLoading}
          empty={{
            icon: <History className="size-5" />,
            title: "No imports yet",
            description: hasHistoryFilters ? "No uploads match these filters." : "Uploads you make appear here with their counts.",
          }}
        />
        {history.total > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">Skipped = already existed / duplicate in file / invalid.</p>
        )}
      </ListCard>
    </>
  );
}

export default function ImportsPage() {
  return (
    <Suspense fallback={null}>
      <ImportsContent />
    </Suspense>
  );
}
