"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { DataTable } from "@/components/data-table";

import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  FileCheck2,
  FileText,
  RefreshCw,
  Search,
  X,
  XCircle,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  approveApplication,
  getApplications,
  rejectApplication,
} from "@/lib/api/admin";

import {
  useAdminMutation,
  useAdminQuery,
} from "@/hooks/use-admin-api";
import { formatDate, formatTime } from "@/lib/formatters";
import Link from "next/link";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function getApplicationName(row: any) {
  return (
    row?.full_name ??
    (
      [row?.first_name, row?.last_name]
        .filter(Boolean)
        .join(" ") ||
      row?.name ||
      "—"
    )
  );
}

function normalizeStatus(value: any) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function getStatusBadge(status: any) {
  const value = normalizeStatus(status);

  if (value === "approved") {
    return (
      <StatusBadge status="active">
        Approved
      </StatusBadge>
    );
  }

  if (value === "rejected") {
    return (
      <StatusBadge status="rejected">
        Rejected
      </StatusBadge>
    );
  }

  if (value === "suspended") {
    return (
      <StatusBadge status="suspended">
        Suspended
      </StatusBadge>
    );
  }

  if (value === "draft") {
    return (
      <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
        Draft
      </span>
    );
  }

  return (
    <StatusBadge status="pending">
      Pending
    </StatusBadge>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function ApplicationsPage() {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);

    useEffect(() => {
    const key = "applications-scroll-position";

    const restoreScroll = () => {
      const savedPosition = sessionStorage.getItem(key);

      if (!savedPosition) return;

      const scrollY = Number(savedPosition);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo({
            top: scrollY,
            behavior: "auto",
          });
        });
      });
    };

    const saveScroll = () => {
      sessionStorage.setItem(key, String(window.scrollY));
    };

    restoreScroll();

    window.addEventListener("scroll", saveScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", saveScroll);
    };
  }, []);

  /* ------------------------------------------------------------------------ */
  /* Confirmation modal state                                                 */
  /* ------------------------------------------------------------------------ */

  const [approveId, setApproveId] = useState<string | null>(null);
  const [approveName, setApproveName] = useState("");

  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectName, setRejectName] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  /* ------------------------------------------------------------------------ */
  /* Query                                                                    */
  /* ------------------------------------------------------------------------ */

  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useAdminQuery(
    () =>
      getApplications({
        search,
        status,
        page,
        limit: 20,
      }),
    [
      "admin",
      "doctor-applications",
      {
        search,
        status,
        page,
        limit: 20,
      },
    ],
  );

  /* ------------------------------------------------------------------------ */
  /* Mutations                                                                */
  /* ------------------------------------------------------------------------ */

  const approve = useAdminMutation<
    { id: string; note?: string },
    unknown
  >(({ id, note }) =>
    approveApplication(id, note),
  );

  const reject = useAdminMutation<
    { id: string; reason: string },
    unknown
  >(({ id, reason }) =>
    rejectApplication(id, reason),
  );

  /* ------------------------------------------------------------------------ */
  /* Response                                                                 */
  /* ------------------------------------------------------------------------ */

  const payload: any = data ?? {};

  const rows: any[] = Array.isArray(payload)
    ? payload
    : payload?.data ?? [];

  const meta = payload?.meta ?? {};

  /* ------------------------------------------------------------------------ */
  /* Stats                                                                    */
  /* ------------------------------------------------------------------------ */

  const stats = useMemo(() => {
    const apiStats =
      payload?.stats ??
      payload?.counts ??
      payload?.summary ??
      {};

    const local = rows.reduce(
      (acc, item) => {
        const current = normalizeStatus(item?.status);

        acc.total += 1;

        if (current === "pending") {
          acc.pending += 1;
        }

        if (current === "approved") {
          acc.approved += 1;
        }

        if (current === "rejected") {
          acc.rejected += 1;
        }

        return acc;
      },
      {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
      },
    );

    return {
      total:
        apiStats?.total ??
        apiStats?.total_applications ??
        meta?.total ??
        local.total,

      pending:
        apiStats?.pending ??
        apiStats?.pending_applications ??
        (status === "pending"
          ? meta?.total ?? local.pending
          : local.pending),

      approved:
        apiStats?.approved ??
        apiStats?.approved_applications ??
        (status === "approved"
          ? meta?.total ?? local.approved
          : local.approved),

      rejected:
        apiStats?.rejected ??
        apiStats?.rejected_applications ??
        (status === "rejected"
          ? meta?.total ?? local.rejected
          : local.rejected),
    };
  }, [payload, rows, meta, status]);

  /* ------------------------------------------------------------------------ */
  /* Open Approve Modal                                                       */
  /* ------------------------------------------------------------------------ */

  function openApproveModal(row: any) {
    setApproveId(String(row.id));
    setApproveName(getApplicationName(row));
  }

  /* ------------------------------------------------------------------------ */
  /* Confirm Approve                                                         */
  /* ------------------------------------------------------------------------ */

  async function handleApproveConfirmed() {
    if (!approveId) return;

    try {
      await approve.mutateAsync({
        id: approveId,
      });

      setApproveId(null);
      setApproveName("");

      await refetch();
    } catch {
      // Error is displayed from mutation state.
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Open Reject Modal                                                        */
  /* ------------------------------------------------------------------------ */

  function openRejectModal(row: any) {
    setRejectId(String(row.id));
    setRejectName(getApplicationName(row));
    setRejectReason("");
  }

  /* ------------------------------------------------------------------------ */
  /* Confirm Reject                                                           */
  /* ------------------------------------------------------------------------ */

  async function handleRejectConfirmed() {
    if (!rejectId) return;

    const reason = rejectReason.trim();

    if (!reason) return;

    try {
      await reject.mutateAsync({
        id: rejectId,
        reason,
      });

      setRejectId(null);
      setRejectName("");
      setRejectReason("");

      await refetch();
    } catch {
      // Error is displayed from mutation state.
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Pagination                                                               */
  /* ------------------------------------------------------------------------ */

  const currentPage =
    Number(meta?.current_page) || page;

  const lastPage =
    Number(meta?.last_page) || 1;

  const total =
    Number(meta?.total) || rows.length;

  const hasPrevious = currentPage > 1;

  const hasNext = meta?.last_page
    ? currentPage < lastPage
    : rows.length >= 20;

  const mutationError =
    approve.error || reject.error;

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <>
      <div className="w-full">
        <div className="mx-auto flex w-full flex-col gap-5">

          {/* ================================================================ */}
          {/* PAGE HEADER                                                       */}
          {/* ================================================================ */}

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-1.5 flex items-center gap-2 text-xs text-muted-foreground/80">
                <span>Administration</span>

                <span className="text-muted-foreground/50">
                  /
                </span>

                <span className="font-medium text-muted-foreground">
                  Applications
                </span>
              </div>

              <h1 className="text-2xl font-semibold leading-tight tracking-tight text-foreground">
                Application Management
              </h1>

              <p className="mt-1 text-sm text-muted-foreground">
                Review and manage doctor registration applications.
              </p>
            </div>
          </div>

          {/* ================================================================ */}
          {/* TABLE                                                             */}
          {/* ================================================================ */}

          <section className="overflow-hidden rounded-lg bg-card shadow-sm">

            {/* Table Header */}
            <div className="border-b border-border/60">
              <div className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    Doctor Applications
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {isLoading
                      ? "Loading application records..."
                      : `${total} ${total === 1 ? "application" : "applications"} found`}
                  </p>
                </div>

                <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
                  <div className="relative w-full sm:w-[300px]">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/80" />
                    <Input
                      value={search}
                      onChange={(event) => {
                        setPage(1);
                        setSearch(event.target.value);
                      }}
                      placeholder="Search name, mobile or email..."
                      className="h-9 border-border bg-muted/50 pl-9 pr-9 text-xs focus:bg-card"
                    />
                    {search && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearch("");
                          setPage(1);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/80 transition hover:text-foreground/80"
                      >
                        <X className="size-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {error || mutationError ? (
              <div className="border-b border-destructive/25 bg-destructive-soft px-5 py-3 text-xs text-destructive">
                {(error || mutationError)?.message ??
                  "Something went wrong while loading applications."}
              </div>
            ) : null}

            {/* DataTable */}
            <div className="overflow-x-auto px-5 mt-5">
              <DataTable
                columns={[
                  {
                    header: "Applicant",
                    key: "name",
                    render: (_, row) => {
                      const name = getApplicationName(row);
                      const code =
                        row?.application_code ??
                        row?.doctor_code ??
                        row?.id ??
                        "—";

                      return (
                        <div className="flex items-center gap-3">
                          <div className="min-w-0">
                            <p className="max-w-[190px] truncate text-[12px] font-semibold text-slate-800">
                              {name}
                            </p>
                            <span className="font-mono text-[10px] font-medium text-slate-800">
                              {code}
                            </span>
                          </div>
                        </div>
                      );
                    },
                  },
                  {
                    header: "Mobile",
                    key: "mobile",
                    render: (value) => (
                      <span className="text-sm text-muted-foreground">
                        {value ?? "—"}
                      </span>
                    ),
                  },
                  {
                    header: "Submitted",
                    key: "submitted_at",
                    render: (_, row) => {
                      const submittedAt = row?.submitted_at ?? row?.created_at;

                      return (
                        <div className="min-w-[100px]">
                          <p className="text-[12px] font-medium text-slate-700">
                            {formatDate(submittedAt)}
                          </p>
                          {formatTime(submittedAt) && (
                            <p className="mt-0.5 text-[10px] text-slate-400">
                              {formatTime(submittedAt)}
                            </p>
                          )}
                        </div>
                      );
                    },
                  },

                  {
                    header: "Specialty",
                    key: "specialization_name",
                    render: (_, row) => (
                      <span className="text-xs text-muted-foreground">
                        {row.specialization_name ??
                          row.specialization?.name ??
                          row.specialty ??
                          "—"}
                      </span>
                    ),
                  },

                  {
                    header: "Status",
                    key: "status",
                    render: (_, row) => getStatusBadge(row?.status),
                  },
                  {
                    header: "",
                    key: "action",
                    render: (_, row) => {
                      const rowStatus = normalizeStatus(row?.status);

                      return (
                        <div className="flex items-center justify-end gap-1.5">
                          {rowStatus === "pending" && (
                            <>
                              <Button
                                type="button"
                                variant="primary"
                                size="sm"
                                disabled={approve.isPending || reject.isPending}
                                onClick={() => openApproveModal(row)}
                              >
                                {/* <Check className="mr-1 size-4" /> */}
                                Approve
                              </Button>

                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                disabled={approve.isPending || reject.isPending}
                                onClick={() => openRejectModal(row)}
                              >
                                {/* <X className="mr-1 size-4" /> */}
                                Reject
                              </Button>


                            </>
                          )}
                          <Link
                            href={`/applications/${row.id}`}
                            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground/50 transition bg-muted text-muted-foreground"
                            title="View doctor"
                          >
                            <ChevronRight className="size-4" />
                          </Link>
                        </div>
                      );
                    },
                  },
                ]}
                data={isLoading ? [] : rows}
              />
            </div>

            {/* Loading */}
            {isLoading && (
              <div className="flex items-center justify-center gap-2 border-t border-border/60 py-12">
                <RefreshCw className="size-4 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">
                  Loading applications...
                </span>
              </div>
            )}

            {/* Pagination */}
            {!isLoading && rows.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-border/60 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground/80">
                  Showing{" "}
                  <span className="font-medium text-muted-foreground">
                    {total === 0 ? 0 : (currentPage - 1) * 20 + 1}
                  </span>
                  {" – "}
                  <span className="font-medium text-muted-foreground">
                    {Math.min(currentPage * 20, total)}
                  </span>
                  {" of "}
                  <span className="font-medium text-muted-foreground">
                    {total}
                  </span>
                </p>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 text-xs"
                    disabled={currentPage <= 1 || isFetching}
                    onClick={() =>
                      setPage((previous) => Math.max(1, previous - 1))
                    }
                  >
                    <ChevronLeft className="mr-1 size-4" />
                    Previous
                  </Button>

                  <div className="flex h-8 min-w-8 items-center justify-center rounded-md bg-foreground px-2 text-xs font-semibold text-white">
                    {currentPage}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 text-xs"
                    disabled={
                      isFetching ||
                      (meta?.last_page
                        ? currentPage >= lastPage
                        : rows.length < 20)
                    }
                    onClick={() => setPage((previous) => previous + 1)}
                  >
                    Next
                    <ChevronRight className="ml-1 size-4" />
                  </Button>
                </div>
              </div>
            )}
          </section>
          {/* ================================================================== */}
          {/* APPROVE CONFIRMATION MODAL                                         */}
          {/* ================================================================== */}

          <Dialog
            open={Boolean(approveId)}
            onOpenChange={(open) => {
              if (!open && !approve.isPending) {
                setApproveId(null);
                setApproveName("");
              }
            }}
          >
            <DialogContent className="w-[calc(100%-32px)] max-w-[460px] rounded-2xl border-0 p-0 shadow-2xl">
              <div className="p-6">

                {/* Icon */}

                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-success-soft">
                  <Check className="size-6 text-success" />
                </div>

                <DialogHeader className="space-y-2 text-left">
                  <DialogTitle className="text-lg font-semibold text-foreground">
                    Approve Doctor Application
                  </DialogTitle>

                  <DialogDescription className="text-sm leading-5 text-muted-foreground">
                    Are you sure you want to approve{" "}
                    <span className="font-semibold text-foreground/80">
                      {approveName || "this doctor"}
                    </span>
                    ?
                  </DialogDescription>
                </DialogHeader>

                {/* Info */}

                <div className="mt-5 rounded-xl border border-success/25 bg-success-soft/70 px-4 py-3">
                  <div className="flex gap-3">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" />

                    <div>
                      <p className="text-xs font-semibold text-success">
                        Application will be approved
                      </p>

                      <p className="mt-0.5 text-xs leading-4 text-success">
                        The approval action will be recorded in the admin activity log.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Buttons */}

                <DialogFooter className="mt-6 flex flex-row justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 rounded-lg border-border px-4 text-xs font-medium"
                    disabled={approve.isPending}
                    onClick={() => {
                      setApproveId(null);
                      setApproveName("");
                    }}
                  >
                    Cancel
                  </Button>

                  <Button
                    type="button"
                    className="h-9 rounded-lg bg-success px-4 text-xs font-semibold text-white hover:bg-success/90"
                    disabled={approve.isPending}
                    onClick={() =>
                      void handleApproveConfirmed()
                    }
                  >
                    <Check className="mr-1.5 size-4" />

                    {approve.isPending
                      ? "Approving..."
                      : "Confirm Approval"}
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>

          {/* ================================================================== */}
          {/* REJECT CONFIRMATION MODAL                                          */}
          {/* ================================================================== */}

          <Dialog
            open={Boolean(rejectId)}
            onOpenChange={(open) => {
              if (!open && !reject.isPending) {
                setRejectId(null);
                setRejectName("");
                setRejectReason("");
              }
            }}
          >
            <DialogContent className="w-[calc(100%-32px)] max-w-[500px] rounded-2xl border-0 p-0 shadow-2xl">
              <div className="p-6">

                {/* Icon */}

                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-destructive-soft">
                  <AlertTriangle className="size-6 text-destructive" />
                </div>

                <DialogHeader className="space-y-2 text-left">
                  <DialogTitle className="text-lg font-semibold text-foreground">
                    Reject Doctor Application
                  </DialogTitle>

                  <DialogDescription className="text-sm leading-5 text-muted-foreground">
                    Are you sure you want to reject{" "}
                    <span className="font-semibold text-foreground/80">
                      {rejectName || "this doctor"}
                    </span>
                    ?
                  </DialogDescription>
                </DialogHeader>

                {/* Warning */}

                <div className="mt-5 rounded-xl border border-destructive/25 bg-destructive-soft/70 px-4 py-3">
                  <div className="flex gap-3">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />

                    <div>
                      <p className="text-xs font-semibold text-destructive">
                        This action will reject the application
                      </p>

                      <p className="mt-0.5 text-xs leading-4 text-destructive">
                        Please provide a reason so the rejection is properly recorded.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Reason */}

                <div className="mt-5">
                  <label
                    htmlFor="reject-reason"
                    className="mb-1.5 block text-xs font-semibold text-foreground/80"
                  >
                    Rejection Reason
                    <span className="ml-1 text-destructive">
                      *
                    </span>
                  </label>

                  <textarea
                    id="reject-reason"
                    value={rejectReason}
                    onChange={(event) =>
                      setRejectReason(
                        event.target.value,
                      )
                    }
                    placeholder="Enter the reason for rejecting this application..."
                    rows={4}
                    disabled={reject.isPending}
                    className="
                  w-full
                  resize-none
                  rounded-xl
                  border
                  border-border
                  bg-card
                  px-3
                  py-2.5
                  text-sm
                  text-foreground/80
                  outline-none
                  transition
                  placeholder:text-muted-foreground/80
                  focus:border-destructive/25
                  focus:ring-2
                  focus:ring-destructive/30
                  disabled:cursor-not-allowed
                  disabled:bg-muted/50
                "
                  />

                  <div className="mt-1.5 flex justify-between">
                    <span className="text-xs text-muted-foreground/80">
                      This reason will be submitted with the rejection.
                    </span>

                    <span className="text-xs text-muted-foreground/80">
                      {rejectReason.length}/500
                    </span>
                  </div>
                </div>

                {/* Buttons */}

                <DialogFooter className="mt-6 flex flex-row justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 rounded-lg border-border px-4 text-xs font-medium"
                    disabled={reject.isPending}
                    onClick={() => {
                      setRejectId(null);
                      setRejectName("");
                      setRejectReason("");
                    }}
                  >
                    Cancel
                  </Button>

                  <Button
                    type="button"
                    className="h-9 rounded-lg bg-destructive px-4 text-xs font-semibold text-white hover:bg-destructive/90 disabled:opacity-50"
                    disabled={
                      reject.isPending ||
                      !rejectReason.trim()
                    }
                    onClick={() =>
                      void handleRejectConfirmed()
                    }
                  >
                    <X className="mr-1.5 size-4" />

                    {reject.isPending
                      ? "Rejecting..."
                      : "Confirm Rejection"}
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </>
  );
}