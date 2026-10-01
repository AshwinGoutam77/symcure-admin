"use client";

import {
  Suspense,
  useEffect,
  useState,
} from "react";
import {
  RefreshCw,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";

import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { Pagination } from "@/components/pagination";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type NotificationRow = {
  timestamp: string;
  channel: string;
  recipient: string;
  role: string;
  eventType: string;
  entityId: string;
  template: string;
  status: string;
};

function NotificationsPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /* =========================================================
     URL STATE
  ========================================================== */

  const initialDateFrom =
    searchParams.get("date_from") ?? "";

  const initialDateTo =
    searchParams.get("date_to") ?? "";

  const initialChannel =
    searchParams.get("channel") ?? "";

  const initialEventType =
    searchParams.get("event_type") ?? "";

  const initialStatus =
    searchParams.get("status") ?? "";

  const initialRecipient =
    searchParams.get("recipient") ?? "";

  const initialPage = Math.max(
    1,
    Number(searchParams.get("page") ?? "1") || 1,
  );

  /* =========================================================
     STATE
  ========================================================== */

  const [dateFrom, setDateFrom] =
    useState(initialDateFrom);

  const [dateTo, setDateTo] =
    useState(initialDateTo);

  const [channel, setChannel] =
    useState(initialChannel);

  const [eventType, setEventType] =
    useState(initialEventType);

  const [status, setStatus] =
    useState(initialStatus);

  const [recipient, setRecipient] =
    useState(initialRecipient);

  const [page, setPage] =
    useState(initialPage);

  const limit = 20;

  /* =========================================================
     UPDATE URL
  ========================================================== */

  const updateListUrl = (
    nextDateFrom: string,
    nextDateTo: string,
    nextChannel: string,
    nextEventType: string,
    nextStatus: string,
    nextRecipient: string,
    nextPage: number,
  ) => {
    const params = new URLSearchParams();

    if (nextDateFrom) {
      params.set(
        "date_from",
        nextDateFrom,
      );
    }

    if (nextDateTo) {
      params.set(
        "date_to",
        nextDateTo,
      );
    }

    if (nextChannel) {
      params.set(
        "channel",
        nextChannel,
      );
    }

    if (nextEventType) {
      params.set(
        "event_type",
        nextEventType,
      );
    }

    if (nextStatus) {
      params.set(
        "status",
        nextStatus,
      );
    }

    if (nextRecipient.trim()) {
      params.set(
        "recipient",
        nextRecipient.trim(),
      );
    }

    params.set(
      "page",
      String(Math.max(1, nextPage)),
    );

    const query = params.toString();

    router.replace(
      query
        ? `${pathname}?${query}`
        : pathname,
      {
        scroll: false,
      },
    );
  };

  /* =========================================================
     SYNC STATE FROM URL
  ========================================================== */

  useEffect(() => {
    const urlDateFrom =
      searchParams.get("date_from") ?? "";

    const urlDateTo =
      searchParams.get("date_to") ?? "";

    const urlChannel =
      searchParams.get("channel") ?? "";

    const urlEventType =
      searchParams.get("event_type") ?? "";

    const urlStatus =
      searchParams.get("status") ?? "";

    const urlRecipient =
      searchParams.get("recipient") ?? "";

    const urlPage = Math.max(
      1,
      Number(searchParams.get("page") ?? "1") || 1,
    );

    setDateFrom((current) =>
      current === urlDateFrom
        ? current
        : urlDateFrom,
    );

    setDateTo((current) =>
      current === urlDateTo
        ? current
        : urlDateTo,
    );

    setChannel((current) =>
      current === urlChannel
        ? current
        : urlChannel,
    );

    setEventType((current) =>
      current === urlEventType
        ? current
        : urlEventType,
    );

    setStatus((current) =>
      current === urlStatus
        ? current
        : urlStatus,
    );

    setRecipient((current) =>
      current === urlRecipient
        ? current
        : urlRecipient,
    );

    setPage((current) =>
      current === urlPage
        ? current
        : urlPage,
    );
  }, [searchParams]);

  /* =========================================================
     NOTIFICATION DATA
     
     Keep your existing data exactly as provided.
  ========================================================== */

  const notificationData: NotificationRow[] = [
    {
      timestamp: "2026-03-07 14:38:25",
      channel: "WhatsApp",
      recipient: "+91 98765 43210",
      role: "Doctor",
      eventType: "Doctor Approved",
      entityId: "SYR-D-0887",
      template: "doctor_approval_v1",
      status: "Delivered",
    },
    {
      timestamp: "2026-03-07 14:15:10",
      channel: "WhatsApp",
      recipient: "+91 98765 01234",
      role: "Patient",
      eventType: "Booking Confirmed",
      entityId: "APT-20260307-042",
      template: "booking_confirm_v2",
      status: "Delivered",
    },
    {
      timestamp: "2026-03-07 12:08:85",
      channel: "WhatsApp",
      recipient: "+91 98765 01234",
      role: "Patient",
      eventType: "Appointment Reminder",
      entityId: "APT-20260308-051",
      template: "appt_reminder_24hr_v1",
      status: "Delivered",
    },
    {
      timestamp: "2026-03-07 11:55:44",
      channel: "WhatsApp",
      recipient: "+91 97654 32101",
      role: "Doctor",
      eventType: "New Appointment Booked",
      entityId: "APT-20260308-051",
      template: "new_booking_doctor_v1",
      status: "Delivered",
    },
    {
      timestamp: "2026-03-07 11:42:18",
      channel: "WhatsApp",
      recipient: "+91 97654 21099",
      role: "Patient",
      eventType: "Refund Initiated",
      entityId: "APT-20260386-811",
      template: "refund_initiated_v1",
      status: "Delivered",
    },
    {
      timestamp: "2026-03-07 09:05:33",
      channel: "SMS",
      recipient: "+91 87654 00112",
      role: "Doctor",
      eventType: "Doctor Suspended",
      entityId: "SYR-D-0843",
      template: "doctor_suspend_v1",
      status: "Delivered",
    },
    {
      timestamp: "2026-03-06 16:25:02",
      channel: "WhatsApp",
      recipient: "+91 97654 21099",
      role: "Patient",
      eventType: "Appointment Rescheduled",
      entityId: "APT-20260386-028",
      template: "reschedule_v1",
      status: "Failed",
    },
  ];

  /* =========================================================
     FILTER DATA
     
     This is temporary local filtering because this file
     currently has no notification API.
  ========================================================== */

  const filteredRows =
    notificationData.filter((notification) => {
      const matchesChannel =
        !channel ||
        notification.channel.toLowerCase() ===
          channel.toLowerCase();

      const matchesEventType =
        !eventType ||
        notification.eventType
          .toLowerCase()
          .replace(/\s+/g, "_") ===
          eventType.toLowerCase();

      const matchesStatus =
        !status ||
        notification.status.toLowerCase() ===
          status.toLowerCase();

      const matchesRecipient =
        !recipient ||
        notification.recipient
          .toLowerCase()
          .includes(
            recipient.toLowerCase(),
          );

      const notificationDate =
        notification.timestamp.slice(0, 10);

      const matchesDateFrom =
        !dateFrom ||
        notificationDate >= dateFrom;

      const matchesDateTo =
        !dateTo ||
        notificationDate <= dateTo;

      return (
        matchesChannel &&
        matchesEventType &&
        matchesStatus &&
        matchesRecipient &&
        matchesDateFrom &&
        matchesDateTo
      );
    });

  /* =========================================================
     PAGINATION
     
     Keep 1284 because that is what your original screen
     currently represents as the backend total.
  ========================================================== */

  const totalNotifications = 1284;

  const currentPage = page;

  const totalPages = Math.ceil(
    totalNotifications / limit,
  );

  const startRecord =
    totalNotifications === 0
      ? 0
      : (currentPage - 1) * limit + 1;

  const endRecord = Math.min(
    currentPage * limit,
    totalNotifications,
  );

  /* =========================================================
     FILTER STATE
  ========================================================== */

  const hasFilters =
    Boolean(dateFrom) ||
    Boolean(dateTo) ||
    Boolean(channel) ||
    Boolean(eventType) ||
    Boolean(status) ||
    Boolean(recipient);

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setChannel("");
    setEventType("");
    setStatus("");
    setRecipient("");
    setPage(1);

    updateListUrl(
      "",
      "",
      "",
      "",
      "",
      "",
      1,
    );
  };

  /* =========================================================
     STATUS
  ========================================================== */

  const getStatusType = (
    value: string,
  ) => {
    const currentStatus =
      value.toLowerCase();

    if (
      currentStatus === "delivered"
    ) {
      return "active";
    }

    if (
      currentStatus === "failed"
    ) {
      return "failed";
    }

    if (
      currentStatus === "pending"
    ) {
      return "pending";
    }

    return "pending";
  };

  /* =========================================================
     RENDER
  ========================================================== */

  return (
    <div className="w-full">
      <div className="w-full">

        {/* =====================================================
            HEADER
        ====================================================== */}

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>

            {/* Breadcrumb */}
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground/80">
              <span>
                Administration
              </span>

              <span className="text-muted-foreground/50">
                /
              </span>

              <span className="text-muted-foreground">
                Notifications
              </span>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-semibold leading-tight tracking-tight text-foreground">
              Notification Log
            </h1>

            <p className="mt-1.5 text-sm text-muted-foreground">
              Record of all WhatsApp & SMS
              notifications sent by the
              platform.
            </p>

          </div>

          {/* Export */}
          <button
            type="button"
            className="text-sm font-medium text-primary hover:underline"
          >
            Export CSV
          </button>

        </div>

        {/* =====================================================
            ERROR
        ====================================================== */}

        {/*
          When the real notification API is connected,
          use the same error block as Doctors:

          {error && (
            <div className="mb-5 ...">
              ...
            </div>
          )}
        */}

        {/* =====================================================
            MAIN TABLE
        ====================================================== */}

        <section className="mt-5 overflow-hidden rounded-lg bg-card shadow-sm">

          {/* ===================================================
              TABLE HEADER
          ==================================================== */}

          <div className="border-b border-border/60">

            <div className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between mt-2">
              {/* Filters */}
              <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto lg:flex-wrap">

                {/* Recipient Search */}
                <div className="relative w-full sm:w-[260px]">

                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/80" />

                  <Input
                    value={recipient}
                    onChange={(e) => {
                      const value =
                        e.target.value;

                      setRecipient(value);
                      setPage(1);

                      updateListUrl(
                        dateFrom,
                        dateTo,
                        channel,
                        eventType,
                        status,
                        value,
                        1,
                      );
                    }}
                    placeholder="Recipient mobile / email..."
                    className="h-9 border-border bg-muted/50 pl-9 pr-9 text-xs focus:bg-card"
                  />

                  {recipient && (
                    <button
                      type="button"
                      onClick={() => {
                        setRecipient("");
                        setPage(1);

                        updateListUrl(
                          dateFrom,
                          dateTo,
                          channel,
                          eventType,
                          status,
                          "",
                          1,
                        );
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/80 transition hover:text-foreground/80"
                    >
                      <X className="size-4" />
                    </button>
                  )}

                </div>

                {/* Channel */}
                <select
                  value={channel}
                  onChange={(e) => {
                    const value =
                      e.target.value;

                    setChannel(value);
                    setPage(1);

                    updateListUrl(
                      dateFrom,
                      dateTo,
                      value,
                      eventType,
                      status,
                      recipient,
                      1,
                    );
                  }}
                  className="h-9 min-w-[135px] rounded-md border border-border bg-muted/50 px-3 text-xs text-muted-foreground outline-none transition focus:border-input focus:bg-card focus:ring-2 focus:ring-border/60"
                >
                  <option value="">
                    All channels
                  </option>

                  <option value="whatsapp">
                    WhatsApp
                  </option>

                  <option value="sms">
                    SMS
                  </option>
                </select>

                {/* Event Type */}
                <select
                  value={eventType}
                  onChange={(e) => {
                    const value =
                      e.target.value;

                    setEventType(value);
                    setPage(1);

                    updateListUrl(
                      dateFrom,
                      dateTo,
                      channel,
                      value,
                      status,
                      recipient,
                      1,
                    );
                  }}
                  className="h-9 min-w-[175px] rounded-md border border-border bg-muted/50 px-3 text-xs text-muted-foreground outline-none transition focus:border-input focus:bg-card focus:ring-2 focus:ring-border/60"
                >
                  <option value="">
                    All event types
                  </option>

                  <option value="doctor_approved">
                    Doctor Approved
                  </option>

                  <option value="booking_confirmed">
                    Booking Confirmed
                  </option>

                  <option value="appointment_reminder">
                    Appointment Reminder
                  </option>

                  <option value="new_appointment_booked">
                    New Appointment Booked
                  </option>

                  <option value="refund_initiated">
                    Refund Initiated
                  </option>

                  <option value="doctor_suspended">
                    Doctor Suspended
                  </option>

                  <option value="appointment_rescheduled">
                    Appointment Rescheduled
                  </option>
                </select>

                {/* Status */}
                <select
                  value={status}
                  onChange={(e) => {
                    const value =
                      e.target.value;

                    setStatus(value);
                    setPage(1);

                    updateListUrl(
                      dateFrom,
                      dateTo,
                      channel,
                      eventType,
                      value,
                      recipient,
                      1,
                    );
                  }}
                  className="h-9 min-w-[130px] rounded-md border border-border bg-muted/50 px-3 text-xs text-muted-foreground outline-none transition focus:border-input focus:bg-card focus:ring-2 focus:ring-border/60"
                >
                  <option value="">
                    All statuses
                  </option>

                  <option value="delivered">
                    Delivered
                  </option>

                  <option value="failed">
                    Failed
                  </option>

                  <option value="pending">
                    Pending
                  </option>
                </select>

                {/* Start Date */}
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    const value =
                      e.target.value;

                    setDateFrom(value);
                    setPage(1);

                    updateListUrl(
                      value,
                      dateTo,
                      channel,
                      eventType,
                      status,
                      recipient,
                      1,
                    );
                  }}
                  className="h-9 rounded-md border border-border bg-muted/50 px-3 text-xs text-muted-foreground outline-none transition focus:border-input focus:bg-card focus:ring-2 focus:ring-border/60"
                />

                {/* End Date */}
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    const value =
                      e.target.value;

                    setDateTo(value);
                    setPage(1);

                    updateListUrl(
                      dateFrom,
                      value,
                      channel,
                      eventType,
                      status,
                      recipient,
                      1,
                    );
                  }}
                  className="h-9 rounded-md border border-border bg-muted/50 px-3 text-xs text-muted-foreground outline-none transition focus:border-input focus:bg-card focus:ring-2 focus:ring-border/60"
                />

              </div>

            </div>

            {/* Active filters */}
            {hasFilters && (
              <div className="flex items-center justify-between border-t border-border/60 px-5 py-2.5">

                <p className="text-xs text-muted-foreground">
                  Filters applied
                </p>

                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Clear filters
                </button>

              </div>
            )}

          </div>

          {/* ===================================================
              TABLE
          ==================================================== */}

          <div className="mt-5 overflow-x-auto px-5">

            <DataTable
              columns={[

                /* ------------------------------------------------
                   TIMESTAMP
                ------------------------------------------------- */

                {
                  header: "Timestamp",
                  key: "timestamp",
                  render: (value) => (
                    <span className="whitespace-nowrap text-xs text-muted-foreground">
                      {value}
                    </span>
                  ),
                },

                /* ------------------------------------------------
                   CHANNEL
                ------------------------------------------------- */

                {
                  header: "Channel",
                  key: "channel",
                  render: (value) => (
                    <Badge
                      variant="secondary"
                      className="font-medium"
                    >
                      {value}
                    </Badge>
                  ),
                },

                /* ------------------------------------------------
                   RECIPIENT
                ------------------------------------------------- */

                {
                  header: "Recipient",
                  key: "recipient",
                  render: (value) => (
                    <span className="text-xs text-muted-foreground">
                      {value ?? "—"}
                    </span>
                  ),
                },

                /* ------------------------------------------------
                   ROLE
                ------------------------------------------------- */

                {
                  header: "Role",
                  key: "role",
                  render: (value) => (
                    <span className="text-xs font-medium text-primary">
                      ● {value}
                    </span>
                  ),
                },

                /* ------------------------------------------------
                   EVENT TYPE
                ------------------------------------------------- */

                {
                  header: "Event Type",
                  key: "eventType",
                  render: (value) => (
                    <StatusBadge status="pending">
                      {value}
                    </StatusBadge>
                  ),
                },

                /* ------------------------------------------------
                   ENTITY ID
                ------------------------------------------------- */

                {
                  header: "Entity ID",
                  key: "entityId",
                  render: (value) => (
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {value ?? "—"}
                    </span>
                  ),
                },

                /* ------------------------------------------------
                   TEMPLATE
                ------------------------------------------------- */

                {
                  header: "Template",
                  key: "template",
                  render: (value) => (
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {value ?? "—"}
                    </span>
                  ),
                },

                /* ------------------------------------------------
                   STATUS
                ------------------------------------------------- */

                {
                  header: "Status",
                  key: "status",
                  render: (value) => (
                    <StatusBadge
                      status={getStatusType(
                        value,
                      )}
                    >
                      {value}
                    </StatusBadge>
                  ),
                },
              ]}
              data={filteredRows}
            />

          </div>

          {/* ===================================================
              LOADING
              
              Ready for useAdminQuery when API is connected.
          ==================================================== */}

          {false && (
            <div className="flex items-center justify-center gap-2 border-t border-border/60 py-12">

              <RefreshCw className="size-4 animate-spin text-primary" />

              <span className="text-xs text-muted-foreground">
                Loading notifications...
              </span>

            </div>
          )}

          {/* ===================================================
              PAGINATION
          ==================================================== */}

          {filteredRows.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-border/60 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">

              {/* COUNT */}
              <p className="text-xs text-muted-foreground/80">

                Showing{" "}

                <span className="font-medium text-muted-foreground">
                  {(currentPage - 1) *
                    limit +
                    1}
                </span>

                {" – "}

                <span className="font-medium text-muted-foreground">
                  {Math.min(
                    currentPage *
                      limit,
                    totalNotifications,
                  )}
                </span>

                {" of "}

                <span className="font-medium text-muted-foreground">
                  {totalNotifications.toLocaleString(
                    "en-IN",
                  )}
                </span>

              </p>

              {/* PAGINATION */}
              <Pagination
                currentPage={
                  currentPage
                }
                totalPages={
                  totalPages
                }
                onPageChange={(
                  nextPage,
                ) => {
                  setPage(
                    nextPage,
                  );

                  updateListUrl(
                    dateFrom,
                    dateTo,
                    channel,
                    eventType,
                    status,
                    recipient,
                    nextPage,
                  );
                }}
              />

            </div>
          )}

        </section>

        {/* =====================================================
            FOOTER
        ====================================================== */}

        <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground/80">

          <span>
            Symcure Administration
            Portal
          </span>

          <span>
            Permission controlled
          </span>

        </div>

      </div>
    </div>
  );
}

/* =============================================================
   PAGE
============================================================= */

export default function NotificationsPage() {
  return (
    <Suspense fallback={null}>
      <NotificationsPageContent />
    </Suspense>
  );
}