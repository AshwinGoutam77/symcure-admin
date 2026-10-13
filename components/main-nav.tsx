"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown, FileSearch, MapPin, Newspaper, PanelsTopLeft, Search, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAdminMe } from "@/lib/api/admin";
import { useAdminQuery } from "@/hooks/use-admin-api";
import { appIcons } from "@/lib/icons";
import { MASTER_RESOURCES } from "@/lib/masters";

interface SubItem {
  label: string;
  href: string;
  /** One key or several (visible when the role can view any of them) */
  permissionKey?: string | string[];
  superAdminOnly?: boolean;
}

interface NavItem {
  label: string;
  href?: string;
  badge?: number;
  icon: React.ElementType;
  subItems?: SubItem[];
  permissionKey?: string | string[];
  superAdminOnly?: boolean;
  disabled?: boolean;
  comingSoon?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const masterItems: SubItem[] = [
  ...MASTER_RESOURCES.map((resource) => ({
    label: resource.label,
    href: `/masters/${resource.key}`,
    permissionKey: resource.key,
  })),
  { label: "Lookup Options", href: "/lookup-options", permissionKey: "lookup_options" },
];

const locationItems: SubItem[] = [
  { label: "States", href: "/states", permissionKey: "states" },
  { label: "Districts", href: "/districts", permissionKey: "districts" },
  { label: "Cities", href: "/cities", permissionKey: "cities" },
];

const contentItems: SubItem[] = [
  { label: "Static Content", href: "/app-content", permissionKey: "app_content" },
  // { label: "Seasonal Health", href: "/seasonal-health", permissionKey: "seasonal_health" },
];

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/dashboard", icon: appIcons.dashboard, permissionKey: "dashboard" }],
  },
  {
    label: "Care network",
    items: [
      { label: "Doctors", href: "/doctors", icon: appIcons.doctors, permissionKey: "doctors" },
      { label: "Applications", href: "/applications", icon: appIcons.applications, permissionKey: "doctor_applications" },
      { label: "Appointments", href: "/appointments", icon: appIcons.appointments, permissionKey: "appointments" },
      { label: "Patients", href: "/patients", icon: appIcons.patients, permissionKey: "patients" },
    ],
  },
  {
    label: "Business",
    items: [
      { label: "App Specialty Groups", href: "/app-specialty-groups", icon: appIcons.specialties, permissionKey: "app_specialty_groups" },
      { label: "App Search Keywords", href: "/app-search-keywords", icon: Search, permissionKey: "app_search_keywords" },
      { label: "Patient Search Logs", href: "/patient-search-logs", icon: FileSearch, permissionKey: "patient_search_logs" },
      { label: "App Content", icon: Newspaper, subItems: contentItems },
      { label: "Finance", href: "/finance", icon: appIcons.finance, permissionKey: "earnings" },
      { label: "Audit Log", href: "/audit-log", icon: appIcons.audit, permissionKey: "activity_logs" },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Master Data", icon: appIcons.masterData, subItems: masterItems },
      { label: "Master Imports", href: "/imports", icon: Upload, permissionKey: "imports" },
      { label: "Locations", icon: MapPin, subItems: locationItems },
      { label: "Roles", href: "/roles", icon: appIcons.roles, permissionKey: "roles", superAdminOnly: true },
      { label: "Menus", href: "/menus", icon: PanelsTopLeft, permissionKey: "menus", superAdminOnly: true },
      { label: "Role Permissions", href: "/role-permission", icon: appIcons.permissions, permissionKey: "role_permissions", superAdminOnly: true },
      { label: "System Users", href: "/system-users", icon: appIcons.systemUsers, permissionKey: "system_users" },
      {
        label: "Settings",
        href: "/settings",
        icon: appIcons.settings,
        permissionKey: ["system_settings", "payment_settings", "settings"],
      },
    ],
  },
];

interface MainNavProps {
  isCollapsed?: boolean;
  onNavigate?: () => void;
}

const row = "group relative flex h-10 w-full items-center rounded-lg text-sm transition-colors";

export function MainNav({ isCollapsed = false, onNavigate }: MainNavProps) {
  const pathname = usePathname();

  const { data: adminSession } = useAdminQuery(getAdminMe, ["admin", "me"]);
  const permissions = adminSession?.permissions ?? null;
  const isSuperAdmin = Boolean(adminSession?.role?.is_super_admin);

  const allowed = (entry: { permissionKey?: string | string[]; superAdminOnly?: boolean }) => {
    if (entry.superAdminOnly && !isSuperAdmin) return false;
    if (!entry.permissionKey || entry.permissionKey === "dashboard") return true;
    if (isSuperAdmin) return true;
    if (!permissions) return false;
    const keys = Array.isArray(entry.permissionKey) ? entry.permissionKey : [entry.permissionKey];
    return permissions.some(
      (p: any) => (keys.includes(p.key) || keys.includes(p.slug)) && Boolean(p.permissions?.view),
    );
  };

  const canView = (item: NavItem) => {
    if (item.subItems) return item.subItems.some(allowed);
    return allowed(item);
  };

  const allItems = navGroups.flatMap((g) => g.items);
  const initialActiveSection =
    allItems.find((item) => item.subItems?.some((sub) => pathname.startsWith(sub.href)))?.label || null;
  const [openSection, setOpenSection] = useState<string | null>(initialActiveSection);

  const layout = isCollapsed ? "mx-auto size-11 justify-center" : "gap-3 px-3";

  return (
    <nav aria-label="Main" className="flex flex-col gap-5">
      {navGroups.map((group) => {
        const items = group.items.filter(canView);
        if (items.length === 0) return null;
        return (
          <div key={group.label}>
            {!isCollapsed ? (
              <p className="mb-1.5 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-muted/80">
                {group.label}
              </p>
            ) : (
              <div className="mx-auto mb-2 h-px w-6 bg-sidebar-border" />
            )}

            <div className="flex flex-col gap-0.5">
              {items.map((item) => {
                const Icon = item.icon;
                const hasSub = !!item.subItems?.length;
                const isOpen = openSection === item.label;
                const sectionActive = item.subItems?.some((s) => pathname.startsWith(s.href));
                const isActive = item.href ? pathname.startsWith(item.href) : false;

                /* Coming soon / disabled */
                if (item.disabled) {
                  return (
                    <div
                      key={item.label}
                      title={isCollapsed ? `${item.label} — Coming soon` : undefined}
                      aria-disabled
                      className={cn(row, layout, "cursor-not-allowed text-sidebar-muted/60")}
                    >
                      <Icon className="size-5 shrink-0" />
                      {!isCollapsed && (
                        <>
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.comingSoon && (
                            <span className="shrink-0 rounded-md border border-sidebar-border px-1.5 py-0.5 text-xs font-medium">
                              Soon
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  );
                }

                /* Expandable section */
                if (hasSub) {
                  return (
                    <div key={item.label} className="flex flex-col">
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        onClick={() => setOpenSection(isOpen ? null : item.label)}
                        title={isCollapsed ? item.label : undefined}
                        className={cn(
                          row, layout, "text-left text-sidebar-foreground hover:bg-sidebar-accent",
                          sectionActive && "bg-sidebar-accent text-sidebar-accent-foreground",
                        )}
                      >
                        <Icon className="size-5 shrink-0" />
                        {!isCollapsed && (
                          <>
                            <span className="flex-1 truncate">{item.label}</span>
                            <ChevronDown className={cn("size-4 shrink-0 transition-transform", isOpen && "rotate-180")} />
                          </>
                        )}
                      </button>
                      {isOpen && !isCollapsed && (
                        <div className="ml-5 mt-1 flex flex-col gap-0.5 border-l border-sidebar-border pl-3">
                          {item.subItems!.filter(allowed).map((sub) => (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              onClick={onNavigate}
                              className={cn(
                                "truncate rounded-md px-3 py-2 text-sm text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                pathname.startsWith(sub.href) && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
                              )}
                            >
                              {sub.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                /* Standard link */
                return (
                  <Link
                    key={item.label}
                    href={item.href || "#"}
                    onClick={onNavigate}
                    title={isCollapsed ? item.label : undefined}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      row, layout,
                      isActive
                        ? "bg-sidebar-primary/15 font-medium text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent",
                    )}
                  >
                    {isActive && !isCollapsed && (
                      <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-sidebar-primary" />
                    )}
                    <Icon className={cn("size-5 shrink-0", isActive && "text-sidebar-primary")} />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                    {item.badge && !isCollapsed ? (
                      <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-semibold text-destructive-foreground">
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
