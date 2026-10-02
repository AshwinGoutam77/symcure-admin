"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Info,
  Loader2,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";

import { importMaster } from "@/lib/api/admin";
import { useAdminMutation } from "@/hooks/use-admin-api";

import { AlertBox } from "@/components/alert-box";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/* =========================================================
   MODULE CONFIGURATION
========================================================= */

type ModuleConfig = {
  title: string;
  description: string;
  icon: string;
  maxSizeMB: number;
  expectedColumns: string;
  columnNote: string;
};

const moduleConfigs: Record<
  string,
  ModuleConfig
> = {
  medicines: {
    title: "Medicine Reference",
    description:
      "Import generic and brand medicine names, strengths, and dosage forms used for prescription auto-suggest.",
    icon: "💊",
    maxSizeMB: 10,
    expectedColumns:
      "Generic Name, Brand Name, Strength, Dosage Form, Route",
    columnNote:
      "Minimum required columns. Additional columns are accepted.",
  },

  tests: {
    title: "Diagnostic Tests Reference",
    description:
      "Import pathology and radiology test catalogs used for clinical ordering and laboratory integration.",
    icon: "🔬",
    maxSizeMB: 5,
    expectedColumns:
      "Test Code, Test Name, Category, Sample Type, Normal Range",
    columnNote:
      "Category may be Pathology, Radiology, Cardiology, etc.",
  },

  symptoms: {
    title: "Symptoms Reference Master",
    description:
      "Import common clinical symptoms used for patient triage, search and doctor consultation workflows.",
    icon: "🌡️",
    maxSizeMB: 3,
    expectedColumns:
      "Symptom Name, Category, Common Synonyms, Snomed Code",
    columnNote:
      "Synonyms should be comma-separated.",
  },

  diagnosis: {
    title: "Diagnosis Reference",
    description:
      "Import diagnosis codes and descriptions used for prescription auto-suggest and clinical reference.",
    icon: "🏥",
    maxSizeMB: 5,
    expectedColumns:
      "Code, Description",
    columnNote:
      "ICD-10 codes are recommended but not mandatory.",
  },

  "medical-council": {
    title: "Medical Council Reference",
    description:
      "Import official state and national medical council registries used for doctor license verification.",
    icon: "🏛️",
    maxSizeMB: 5,
    expectedColumns:
      "Council ID, Council Name, State/Region, Country",
    columnNote:
      "Required for automated license verification workflows.",
  },

  colleges: {
    title: "Medical Colleges Reference",
    description:
      "Import accredited medical university and college data used for doctor qualification mapping.",
    icon: "🎓",
    maxSizeMB: 8,
    expectedColumns:
      "College Code, College Name, University, City, State, Country",
    columnNote:
      "Used during profile education and qualification verification.",
  },

  specializations: {
    title: "Specializations Reference",
    description:
      "Import medical specialties and sub-specialties used for doctor directory filtering and matching.",
    icon: "🩺",
    maxSizeMB: 2,
    expectedColumns:
      "Specialty ID, Specialty Name, Department Category, Description",
    columnNote:
      "Keeps specialization data consistent across the platform.",
  },

  qualifications: {
    title: "Qualifications Reference",
    description:
      "Import recognized medical degrees and certifications such as MBBS, MD, MS, DM and MCh.",
    icon: "📜",
    maxSizeMB: 2,
    expectedColumns:
      "Qualification Code, Degree Name, Full Title, Level",
    columnNote:
      "Level may be UG, PG or Fellowship.",
  },
};

/* =========================================================
   API RESOURCE MAP
========================================================= */

const resourceMap: Record<
  string,
  string
> = {
  medicines: "medicines",
  tests: "lab-tests",
  symptoms: "symptoms",
  diagnosis: "diagnoses",
  "medical-council": "medical-councils",
  colleges: "colleges",
  specializations: "specializations",
  qualifications:
    "qualification-specializations",
};

/* =========================================================
   PAGE
========================================================= */

export default function MasterDataImportPage() {
  const params = useParams();

  const moduleKey =
    (params?.importmodual as string) || "";

  const config =
    moduleConfigs[moduleKey];

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [errorMsg, setErrorMsg] =
    useState<string | null>(null);

  const [successMsg, setSuccessMsg] =
    useState<string | null>(null);

  /* =========================================================
     IMPORT API
  ========================================================== */

  const importMutation =
    useAdminMutation<File, unknown>(
      async (file) => {
        const resource =
          resourceMap[moduleKey];

        if (!resource) {
          throw new Error(
            "Unsupported import module.",
          );
        }

        return importMaster(
          resource,
          file,
        );
      },
    );

  /* =========================================================
     INVALID MODULE
  ========================================================== */

  if (!config) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm">

          <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="size-7" />
          </div>

          <h1 className="text-xl font-semibold tracking-tight">
            Invalid Import Module
          </h1>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            The module path{" "}
            <span className="font-mono font-medium text-foreground">
              "{moduleKey}"
            </span>{" "}
            does not exist in the master data registry.
          </p>

          <Button
            asChild
            className="mt-6 gap-2"
          >
            <Link href="/dashboard">
              <ArrowLeft className="size-4" />
              Go to Dashboard
            </Link>
          </Button>

        </div>
      </div>
    );
  }

  /* =========================================================
     FILE SELECTION
  ========================================================== */

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const file =
      e.target.files?.[0];

    if (!file) {
      return;
    }

    const extension =
      file.name
        .split(".")
        .pop()
        ?.toLowerCase();

    if (
      extension !== "csv" &&
      extension !== "xlsx"
    ) {
      setSelectedFile(null);
      setErrorMsg(
        "Invalid file format. Only CSV and XLSX files are accepted.",
      );

      e.target.value = "";
      return;
    }

    const fileSizeMB =
      file.size /
      (1024 * 1024);

    if (
      fileSizeMB >
      config.maxSizeMB
    ) {
      setSelectedFile(null);
      setErrorMsg(
        `File size exceeds the ${config.maxSizeMB} MB limit for this module.`,
      );

      e.target.value = "";
      return;
    }

    setSelectedFile(file);
  };

  /* =========================================================
     REMOVE FILE
  ========================================================== */

  const removeFile = () => {
    setSelectedFile(null);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  /* =========================================================
     IMPORT
  ========================================================== */

  const handleUploadSubmit =
    async () => {
      if (!selectedFile) {
        return;
      }

      setErrorMsg(null);
      setSuccessMsg(null);

      try {
        const result: any =
          await importMutation.mutateAsync(
            selectedFile,
          );

        const inserted =
          result?.records_inserted;

        const skipped =
          result?.records_skipped_existing;

        let summary =
          "The server accepted the import.";

        if (
          inserted !== undefined ||
          skipped !== undefined
        ) {
          summary = `${inserted ?? 0} inserted, ${
            skipped ?? 0
          } skipped.`;
        }

        setSuccessMsg(
          `Successfully imported ${selectedFile.name}. ${summary}`,
        );

        setSelectedFile(null);
      } catch (error) {
        setErrorMsg(
          error instanceof Error
            ? error.message
            : "Import failed. Please try again.",
        );
      }
    };

  /* =========================================================
     FILE SIZE
  ========================================================== */

  const selectedFileSize =
    selectedFile
      ? (
          selectedFile.size /
          (1024 * 1024)
        ).toFixed(2)
      : null;

  /* =========================================================
     RENDER
  ========================================================== */

  return (
    <div className="w-full">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

        <div>

          <div className="flex items-center gap-3">
            <div>

              <h1 className="text-2xl font-semibold leading-tight tracking-tight text-foreground">
                {config.title} Import
              </h1>

              <p className="mt-1 text-sm text-muted-foreground">
                Import reference data into the
                platform master.
              </p>

            </div>

          </div>

        </div>
      </div>

      {/* =====================================================
          MAIN CONTENT
      ====================================================== */}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">

        {/* ===================================================
            MAIN IMPORT CARD
        ==================================================== */}

        <Card className="overflow-hidden shadow-sm">

          <CardHeader className="border-b border-border/60 px-5 py-4 pt-0">

            <div className="flex items-start justify-between gap-4">

              <div>

                <CardTitle className="text-base">
                  Upload File
                </CardTitle>

                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {config.description}
                </p>

              </div>

              <Badge
                variant="secondary"
                className="shrink-0 text-xs"
              >
                Max {config.maxSizeMB} MB
              </Badge>

            </div>

          </CardHeader>

          <CardContent className="space-y-5 p-5">

            {/* =================================================
                REQUIREMENT NOTE
            ================================================== */}

            <AlertBox type="warning">
              <div className="text-xs leading-5">
                <span className="font-semibold">
                  Before importing:
                </span>{" "}
                Make sure the CSV or Excel file
                contains clean, structured master
                data. Duplicate records are handled
                by the server according to the
                import rules.
              </div>
            </AlertBox>

            {/* =================================================
                UPLOAD AREA
            ================================================== */}

            {!selectedFile ? (
              <label className="group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center transition hover:border-primary/40 hover:bg-muted/40">

                <input
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={
                    handleFileChange
                  }
                  className="absolute inset-0 size-full cursor-pointer opacity-0"
                />

                <div className="mb-4 flex size-12 items-center justify-center rounded-xl border border-border bg-card shadow-sm transition group-hover:border-primary/30">

                  <Upload className="size-5 text-muted-foreground group-hover:text-primary" />

                </div>

                <p className="text-sm font-semibold text-foreground">
                  Upload {config.title}
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  Drag and drop or click to browse
                </p>

                <div className="mt-4 flex items-center gap-2">

                  <Badge
                    variant="secondary"
                    className="gap-1.5 text-[11px]"
                  >
                    <FileText className="size-3" />
                    CSV
                  </Badge>

                  <Badge
                    variant="secondary"
                    className="gap-1.5 text-[11px]"
                  >
                    <FileSpreadsheet className="size-3" />
                    XLSX
                  </Badge>

                </div>

                <p className="mt-3 text-[11px] text-muted-foreground">
                  Maximum file size:{" "}
                  {config.maxSizeMB} MB
                </p>

              </label>
            ) : (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">

                <div className="flex items-center gap-3">

                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-card">

                    <FileSpreadsheet className="size-5 text-primary" />

                  </div>

                  <div className="min-w-0 flex-1">

                    <p className="truncate text-sm font-medium text-foreground">
                      {selectedFile.name}
                    </p>

                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {selectedFileSize} MB
                      {" · "}
                      {selectedFile.type ||
                        "Excel/CSV file"}
                    </p>

                  </div>

                  <button
                    type="button"
                    onClick={
                      removeFile
                    }
                    disabled={
                      importMutation.isPending
                    }
                    className="rounded-md p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                  >
                    <X className="size-4" />
                  </button>

                </div>

              </div>
            )}

            {/* =================================================
                ERROR
            ================================================== */}

            {errorMsg && (
              <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3.5">

                <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />

                <div className="min-w-0">

                  <p className="text-xs font-semibold text-destructive">
                    Import failed
                  </p>

                  <p className="mt-1 text-xs leading-5 text-destructive/80">
                    {errorMsg}
                  </p>

                </div>

              </div>
            )}

            {/* =================================================
                SUCCESS
            ================================================== */}

            {successMsg && (
              <div className="flex items-start gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3.5">

                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />

                <div className="min-w-0">

                  <p className="text-xs font-semibold text-emerald-700">
                    Import completed
                  </p>

                  <p className="mt-1 text-xs leading-5 text-emerald-700/80">
                    {successMsg}
                  </p>

                </div>

              </div>
            )}

            {/* =================================================
                EXPECTED COLUMNS
            ================================================== */}

            <div className="rounded-lg border border-border bg-muted/30 p-4">

              <div className="mb-2 flex items-center gap-2">

                <Info className="size-4 text-muted-foreground" />

                <p className="text-xs font-semibold text-foreground">
                  Expected columns
                </p>

              </div>

              <p className="font-mono text-xs leading-6 text-foreground">
                {config.expectedColumns}
              </p>

              <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                {config.columnNote}
              </p>

            </div>

            {/* =================================================
                ACTION
            ================================================== */}

            {selectedFile && (
              <div className="flex items-center justify-end border-t border-border/60 pt-5">

                <Button
                  type="button"
                  onClick={
                    handleUploadSubmit
                  }
                  disabled={
                    importMutation.isPending
                  }
                  className="min-w-[150px] gap-2"
                >

                  {importMutation.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="size-4" />
                      Process & Import
                    </>
                  )}

                </Button>

              </div>
            )}

          </CardContent>

        </Card>

        {/* ===================================================
            RIGHT INFORMATION PANEL
        ==================================================== */}

        <div className="space-y-5">

          {/* Import information */}
          <Card className="shadow-sm">

            <CardHeader className="border-b border-border/60 px-5 py-4 pt-0">

              <CardTitle className="text-sm">
                Import Information
              </CardTitle>

            </CardHeader>

            <CardContent className="space-y-4 p-5">

              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Reference
                </p>

                <p className="mt-1 text-sm font-medium text-foreground">
                  {config.title}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Accepted formats
                </p>

                <div className="mt-2 flex gap-2">

                  <Badge
                    variant="secondary"
                    className="text-[11px]"
                  >
                    CSV
                  </Badge>

                  <Badge
                    variant="secondary"
                    className="text-[11px]"
                  >
                    XLSX
                  </Badge>

                </div>
              </div>

              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  File limit
                </p>

                <p className="mt-1 text-sm font-medium text-foreground">
                  {config.maxSizeMB} MB
                </p>
              </div>

              <div className="border-t border-border/60 pt-4">

                <div className="flex items-start gap-2">

                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />

                  <p className="text-xs leading-5 text-muted-foreground">
                    The import is processed by the
                    server. Existing records and
                    duplicates are handled according
                    to the master import rules.
                  </p>

                </div>

              </div>

            </CardContent>

          </Card>

          {/* =================================================
              EXPECTED DATA
          ================================================== */}

          <Card className="shadow-sm">

            <CardHeader className="border-b border-border/60 px-5 py-4 pt-0">

              <CardTitle className="text-sm">
                Data Structure
              </CardTitle>

            </CardHeader>

            <CardContent className="p-5">

              <p className="text-xs leading-5 text-muted-foreground">
                Make sure the first row contains
                the expected column headers.
              </p>

              <div className="mt-3 rounded-lg bg-muted/50 p-3">

                <p className="break-words font-mono text-[10px] leading-5 text-foreground">
                  {config.expectedColumns}
                </p>

              </div>

            </CardContent>

          </Card>

        </div>

      </div>

      {/* =====================================================
          FOOTER
      ====================================================== */}

      <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground/80">

        <span>
          Symcure Administration Portal
        </span>

        <span>
          Permission controlled
        </span>

      </div>

    </div>
  );
}