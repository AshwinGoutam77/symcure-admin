"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Activity, ArrowRight, CalendarDays, Clock3, FileCheck2, RefreshCw, ShieldAlert, Stethoscope,
} from "lucide-react";

import { getDashboard } from "@/lib/api/admin";
import { useAdminQuery } from "@/hooks/use-admin-api";
import { appIcons } from "@/lib/icons";
import {
  formatDate, formatDateTime, formatMoney, formatNumber, formatPercent, getInitials, toNumber,
} from "@/lib/formatters";

import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { AttentionCard } from "@/components/attention-card";
import { SectionCard } from "@/components/section-card";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { DataTable } from "@/components/data-table";
import { AlertBox } from "@/components/alert-box";
import { ChartCard, BarCompareChart, DonutChart } from "@/components/charts";
import { Button } from "@/components/ui/button";

type DashboardData = {
  user?: { full_name?: string; name?: string };
  counters?: {
    total_doctors?: number;
    total_pending_applications?: number;
    today_appointments?: number;
    platform_total_commission_this_month?: number;
    total_appointment_amt_this_month?: number;
    unresolved_appointments_24h?: number;
    suspended_doctors_with_appointments?: number;
  };
  pending_applications?: any[];
  recent_activity?: any[];
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 21) return "Good evening";
  return "Good night";
}

const AGE_BUCKETS = [
  { key: "lt1", label: "< 1 day", max: 1 },
  { key: "d1_3", label: "1–3 days", max: 3 },
  { key: "d3_7", label: "3–7 days", max: 7 },
  { key: "gt7", label: "> 7 days", max: Infinity },
];

export default function DashboardPage() {
  const { data, isLoading, isFetching, error, refetch } = useAdminQuery(getDashboard, []);

  const dashboard: DashboardData = data ?? {};
  const counters = dashboard.counters ?? {};
  const pending = dashboard.pending_applications ?? [];
  const activity = dashboard.recent_activity ?? [];
  const firstName = (dashboard.user?.full_name || dashboard.user?.name || "Admin").split(" ")[0];

  /* ---- derived chart data (no invented numbers) ---- */
  const gross = toNumber(counters.total_appointment_amt_this_month);
  const commission = toNumber(counters.platform_total_commission_this_month);
  const doctorPayout = Math.max(gross - commission, 0);
  const commissionRate = gross > 0 ? (commission / gross) * 100 : 0;

  const backlog = useMemo(() => {
    const now = Date.now();
    const counts = AGE_BUCKETS.map((b) => ({ bucket: b.label, applications: 0 }));
    pending.forEach((item: any) => {
      const t = new Date(item.submitted_at || item.created_at).getTime();
      if (Number.isNaN(t)) return;
      const days = (now - t) / 86_400_000;
      const idx = AGE_BUCKETS.findIndex((b) => days < b.max);
      counts[idx === -1 ? AGE_BUCKETS.length - 1 : idx].applications += 1;
    });
    return counts;
  }, [pending]);

  const pendingRows = pending.slice(0, 5).map((item: any, index: number) => {
    const name =
      item.full_name || `${item.first_name ?? ""} ${item.last_name ?? ""}`.trim() || "Unknown doctor";
    return {
      id: item.id ?? index,
      name,
      sub: item.email || item.specialization || item.speciality || "—",
      code: item.application_code || item.code || `APP-${item.id ?? index + 1}`,
      submitted: item.submitted_at || item.created_at,
      status: item.status || "pending",
    };
  });

  const quickActions = [
    { href: "/applications", label: "Doctor applications", icon: appIcons.applications },
    { href: "/doctors", label: "Doctor management", icon: appIcons.doctors },
    { href: "/patients", label: "Patient management", icon: appIcons.patients },
    { href: "/appointments", label: "Appointments", icon: appIcons.appointments },
    { href: "/finance", label: "Finance", icon: appIcons.finance },
    // { href: "/system-users", label: "System users", icon: appIcons.systemUsers },
  ];

  return (
    <div className="w-full">
      <PageHeader
        breadcrumbs={[{ label: "Administration" }, { label: "Dashboard" }]}
        title={`${getGreeting()}, ${firstName}`}
        description="Platform overview and activity summary."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
              <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button asChild size="sm" className="gap-2">
              <Link href="/applications">
                <FileCheck2 className="size-4" />
                Review applications
              </Link>
            </Button>
          </>
        }
      />

      {error && (
        <AlertBox type="error" title="Unable to load dashboard" className="mb-5">
          {error.message}
        </AlertBox>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total doctors" value={formatNumber(counters.total_doctors)} description="Registered doctors"
          icon={<Stethoscope />} tone="primary" href="/doctors" loading={isLoading}
        />
        <StatCard
          title="Appointments today" value={formatNumber(counters.today_appointments)} description="Scheduled today"
          icon={<CalendarDays />} tone="violet" href="/appointments" loading={isLoading}
        />
        <StatCard
          title="Pending applications" value={formatNumber(counters.total_pending_applications)} description="Awaiting review"
          icon={<FileCheck2 />} tone="warning" href="/applications" loading={isLoading}
        />
        <StatCard
          title="Commission this month" value={formatMoney(commission)} description={gross > 0 ? `${formatPercent(commissionRate, 1)} of ${formatMoney(gross)} billed` : "Platform commission"}
          icon={<appIcons.finance />} tone="success" href="/finance" loading={isLoading}
        />
      </div>

      {/* Attention */}
      {!isLoading && (
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
          <AttentionCard
            tone="warning" icon={<Clock3 />} href="/appointments"
            title={`${formatNumber(counters.unresolved_appointments_24h)} unresolved appointments`}
            description="Appointments requiring attention for 24+ hours."
          />
          <AttentionCard
            tone="info" icon={<FileCheck2 />} href="/applications"
            title={`${formatNumber(counters.total_pending_applications)} applications awaiting review`}
            description="Doctor applications pending approval."
          />
          <AttentionCard
            tone="danger" icon={<ShieldAlert />} href="/doctors"
            title={`${formatNumber(counters.suspended_doctors_with_appointments)} suspended doctors`}
            description="Suspended doctors with active appointments."
          />
        </div>
      )}

      {/* Charts */}
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ChartCard
          title="Revenue split · this month"
          description="Platform commission vs. doctor payout on billed consultations"
          loading={isLoading} empty={gross <= 0} emptyText="No billed consultations this month yet"
        >
          <DonutChart
            data={[
              { name: "Platform commission", value: commission, color: "var(--chart-1)" },
              { name: "Doctor payout", value: doctorPayout, color: "var(--chart-2)" },
            ]}
            centerValue={formatPercent(commissionRate, 1)} centerLabel="commission rate"
            valueFormatter={(v) => formatMoney(v)}
          />
        </ChartCard>

        <ChartCard
          title="Application backlog by age"
          description="How long pending doctor applications have been waiting"
          loading={isLoading} empty={pending.length === 0} emptyText="No pending applications — you're all caught up"
          footer={`Based on the ${pending.length} most recent pending application${pending.length === 1 ? "" : "s"} returned by the API.`}
        >
          <BarCompareChart
            data={backlog} xKey="bucket"
            series={[{ key: "applications", label: "Applications", color: "var(--chart-3)" }]}
            valueFormatter={(v) => formatNumber(v)} height={200}
          />
        </ChartCard>
      </div>

      {/* Pending applications + quick actions */}
      <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <SectionCard
          title="Pending doctor applications" description="Applications waiting for administrative review" flush
          action={
            <Link href="/applications" className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground">
              View all <ArrowRight className="size-3.5" />
            </Link>
          }
        >
         <div className="p-4">
           <DataTable
            loading={isLoading}
            data={pendingRows}
            empty={{ title: "No pending applications", description: "New doctor applications will appear here.", icon: <FileCheck2 className="size-5" /> }}
            columns={[
              {
                key: "name", header: "Doctor",
                render: (_v, r) => (
                  <div className="flex items-center gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-xs text-foreground">{r.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{r.sub}</p>
                    </div>
                  </div>
                ),
              },
              { key: "code", header: "Application", render: (v) => <span className="font-mono text-xs text-muted-foreground">{v}</span> },
              { key: "submitted", header: "Submitted", render: (v) => <span className="text-xs text-muted-foreground">{formatDate(v)}</span> },
              { key: "status", header: "Status", render: (v) => <StatusBadge status={v} /> },
              {
                key: "action", header: "", align: "right",
                render: (_v, r) => (
                  <Link href={`/applications/${r.id}`} aria-label={`Review ${r.name}`} className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
                    <ArrowRight className="size-4" />
                  </Link>
                ),
              },
            ]}
          />
         </div>
        </SectionCard>

        <SectionCard title="Quick actions" description="">
          <div className="-mx-2 flex flex-col">
            {quickActions.map((a) => {
              const Icon = a.icon;
              return (
                <Link
                  key={a.href} href={a.href}
                  className="group flex h-11 items-center gap-3 rounded-lg px-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted"><Icon className="size-4" /></span>
                  <span className="flex-1 truncate">{a.label}</span>
                  <ArrowRight className="size-4 opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              );
            })}
          </div>
        </SectionCard>
      </div>

      {/* Recent activity */}
      <SectionCard
        className="mt-6" flush title="Recent activity" description="Latest administrative activity"
        action={
          <Link href="/audit-log" className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground">
            View all <ArrowRight className="size-3.5" />
          </Link>
        }
      >
        {activity.length ? (
          <ul className="grid grid-cols-1 divide-y md:grid-cols-2 md:divide-x md:divide-y-0">
            {activity.slice(0, 6).map((item: any, index: number) => {
              const actor = item.actor_name || item.actor || item.user_name || "System";
              const action = item.description || item.action || "performed an action";
              const timestamp = item.created_at || item.timestamp || item.updated_at;
              return (
                <li key={item.id ?? index} className="flex items-start gap-3 px-5 py-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                    {getInitials(actor, "SY")}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">
                      <span className="font-semibold">{actor}</span>{" "}
                      <span className="text-muted-foreground">{action}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground/80">{formatDateTime(timestamp)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState icon={<Activity className="size-5" />} title="No recent activity" description="Administrative activity will appear here." />
        )}
      </SectionCard>
    </div>
  );
}
