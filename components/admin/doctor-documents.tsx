"use client";

import { useRef, useState } from "react";
import { Eye, FileImage, FileText, RefreshCw, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { SectionCard } from "@/components/section-card";
import { AdminModal, ConfirmDialog, FormField, InlineError, selectClass } from "@/components/admin/kit";
import {
  deleteDoctorDocument,
  getDoctorDocumentUrl,
  uploadDoctorDocument,
  type DoctorDocumentType,
} from "@/lib/api/admin";
import { useAdminMutation } from "@/hooks/use-admin-api";
import { apiErrorMessage } from "@/lib/api/errors";
import { formatDateTime } from "@/lib/formatters";
import { cn } from "@/lib/utils";

export const DOCUMENT_TYPES: Array<{ value: DoctorDocumentType; label: string }> = [
  { value: "mci_nmc_certificate", label: "MCI / NMC certificate" },
  { value: "photo_id", label: "Photo ID" },
  { value: "other", label: "Other document" },
];

const ACCEPTED = ["jpg", "jpeg", "png", "pdf"];
const MAX_MB = 10;

function typeLabel(type?: string) {
  return DOCUMENT_TYPES.find((t) => t.value === type)?.label ?? (type ? type.replaceAll("_", " ") : "Document");
}

function sizeLabel(bytes?: number | null) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function DoctorDocuments({
  doctorId,
  documents,
  canEdit,
}: {
  doctorId: string;
  documents: any[];
  canEdit: boolean;
}) {
  const [openingId, setOpeningId] = useState<string | number | null>(null);
  const [error, setError] = useState("");

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadType, setUploadType] = useState<DoctorDocumentType>("mci_nmc_certificate");
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const uploadMutation = useAdminMutation<{ type: DoctorDocumentType; file: File }, unknown>(({ type, file }) =>
    uploadDoctorDocument(doctorId, type, file),
  );
  const deleteMutation = useAdminMutation<string | number, unknown>((documentId) => deleteDoctorDocument(doctorId, documentId));

  // Newest first, grouped visually by type with the current one flagged.
  const sorted = [...documents].sort(
    (a, b) => new Date(b.uploaded_at ?? b.created_at ?? 0).getTime() - new Date(a.uploaded_at ?? a.created_at ?? 0).getTime(),
  );

  async function openDocument(doc: any) {
    setError("");
    // Open the tab synchronously so pop-up blockers allow it, then point it at the URL.
    const tab = window.open("", "_blank");
    setOpeningId(doc.id);
    try {
      const result = await getDoctorDocumentUrl(doctorId, doc.id);
      const url = result?.url ?? doc.view_url;
      if (!url) throw new Error("No file URL was returned for this document.");
      if (tab) tab.location.href = url;
      else window.open(url, "_blank", "noopener");
    } catch (err) {
      tab?.close();
      if (doc.view_url) window.open(doc.view_url, "_blank", "noopener");
      else setError(apiErrorMessage(err, "Couldn't open the document."));
    } finally {
      setOpeningId(null);
    }
  }

  function pickFile(next?: File | null) {
    setUploadError("");
    if (!next) return;
    const ext = next.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ACCEPTED.includes(ext)) {
      setFile(null);
      setUploadError("Use a JPG, PNG or PDF file.");
      return;
    }
    if (next.size > MAX_MB * 1024 * 1024) {
      setFile(null);
      setUploadError(`The file is larger than ${MAX_MB} MB.`);
      return;
    }
    setFile(next);
  }

  async function handleUpload() {
    if (!file) {
      setUploadError("Choose a file to upload.");
      return;
    }
    try {
      await uploadMutation.mutateAsync({ type: uploadType, file });
      setUploadOpen(false);
      setFile(null);
    } catch (err) {
      setUploadError(apiErrorMessage(err, "Upload failed."));
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteError("");
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(apiErrorMessage(err, "Couldn't delete the document."));
    }
  }

  return (
    <>
      <SectionCard
        title="Documents"
        description="Certificates and ID proofs. Uploading a new file of the same type keeps older ones as history."
        action={
          canEdit && (
            <Button
              type="button"
              className="h-9 gap-1.5 text-xs font-semibold"
              onClick={() => {
                setFile(null);
                setUploadError("");
                setUploadType("mci_nmc_certificate");
                setUploadOpen(true);
              }}
            >
              <Upload className="size-4" /> Upload document
            </Button>
          )
        }
      >
        <InlineError className="mb-3">{error}</InlineError>
        {sorted.length ? (
          <div className="space-y-3">
            {sorted.map((doc) => {
              const isImage = String(doc.mime_type ?? "").startsWith("image/");
              return (
                <div
                  key={doc.id}
                  className={cn(
                    "flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between",
                    doc.is_current ? "border-primary/20 bg-primary/5" : "border-border bg-muted/40",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      {isImage ? <FileImage className="size-5" /> : <FileText className="size-5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{typeLabel(doc.type)}</p>
                        {doc.is_current ? (
                          <StatusBadge tone="success">Current</StatusBadge>
                        ) : (
                          <StatusBadge tone="neutral" dot={false}>
                            Older version
                          </StatusBadge>
                        )}
                        {doc.from_application && (
                          <StatusBadge tone="info" dot={false}>
                            From application
                          </StatusBadge>
                        )}
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {[doc.file_name, sizeLabel(doc.size_bytes), doc.uploaded_at ? `Uploaded ${formatDateTime(doc.uploaded_at)}` : ""]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs"
                      onClick={() => void openDocument(doc)}
                      disabled={openingId === doc.id}
                    >
                      {openingId === doc.id ? <RefreshCw className="size-3.5 animate-spin" /> : <Eye className="size-3.5" />}
                      View
                    </Button>
                    {canEdit && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 border-destructive/25 text-xs text-destructive hover:bg-destructive-soft hover:text-destructive"
                        onClick={() => {
                          setDeleteError("");
                          setDeleteTarget(doc);
                        }}
                      >
                        <Trash2 className="size-3.5" /> Delete
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={<FileText className="size-5" />}
            title="No documents yet"
            description={canEdit ? "Upload the doctor's MCI/NMC certificate or photo ID." : "This doctor has no uploaded documents."}
          />
        )}
      </SectionCard>

      <AdminModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        busy={uploadMutation.isPending}
        title="Upload document"
        description="JPG, PNG or PDF, up to 10 MB."
        size="sm"
        footer={
          <>
            <Button type="button" variant="outline" className="h-9 text-xs" onClick={() => setUploadOpen(false)} disabled={uploadMutation.isPending}>
              Cancel
            </Button>
            <Button type="button" className="h-9 text-xs" onClick={() => void handleUpload()} disabled={uploadMutation.isPending || !file}>
              {uploadMutation.isPending && <RefreshCw className="mr-1.5 size-4 animate-spin" />}
              Upload
            </Button>
          </>
        }
      >
        <FormField label="Document type" required>
          <select value={uploadType} onChange={(e) => setUploadType(e.target.value as DoctorDocumentType)} className={selectClass}>
            {DOCUMENT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="File" required>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="flex w-full items-center justify-between gap-3 rounded-md border border-dashed border-border bg-muted/40 px-3 py-3 text-left text-sm transition hover:border-primary/50"
          >
            <span className={cn("truncate", file ? "text-foreground" : "text-muted-foreground")}>
              {file ? file.name : "Choose a file…"}
            </span>
            <Upload className="size-4 shrink-0 text-muted-foreground" />
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
        </FormField>
        <InlineError>{uploadError}</InlineError>
      </AdminModal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        busy={deleteMutation.isPending}
        title="Delete document"
        confirmLabel="Delete document"
        description={
          deleteTarget?.from_application
            ? "This file also belongs to the doctor's application. It will be removed from the doctor's profile, but the application keeps its copy."
            : "The document and its stored file will be removed permanently."
        }
        error={deleteError}
      />
    </>
  );
}
