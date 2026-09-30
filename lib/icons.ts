import {
  LayoutDashboard, Stethoscope, FileUser, CalendarCheck, Users, Layers3, IndianRupee,
  FileText, Bell, Database, Eye, ShieldCheck, ListChecks, UserCog, Settings,
  type LucideIcon,
} from "lucide-react";

/**
 * Central icon registry: one icon per concept, used by the sidebar, page
 * headers, stat cards and empty states. Change it here, it changes everywhere.
 * (Finance uses IndianRupee — the product is INR-based, not USD.)
 */
export const appIcons = {
  dashboard: LayoutDashboard,
  doctors: Stethoscope,
  applications: FileUser,
  appointments: CalendarCheck,
  patients: Users,
  specialties: Layers3,
  finance: IndianRupee,
  audit: FileText,
  notifications: Bell,
  masterData: Database,
  preview: Eye,
  roles: ShieldCheck,
  permissions: ListChecks,
  systemUsers: UserCog,
  settings: Settings,
} satisfies Record<string, LucideIcon>;

/** Icon size scale — use these instead of ad-hoc h-3.5 / h-[18px] / size={15}. */
export const iconSize = {
  xs: "size-3.5",
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
} as const;
