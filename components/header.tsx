"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "next-themes";
import { ChevronLeft, ChevronRight, LogOut, Moon, Sun, User, X } from "lucide-react";

import { MainNav } from "./main-nav";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/formatters";
import { getAdminMe, logoutAdmin } from "@/lib/api/admin";
import { useAdminMutation, useAdminQuery } from "@/hooks/use-admin-api";

const COLLAPSE_KEY = "symcure:sidebar-collapsed";

interface SidebarProps {
  /** Mobile drawer state (below lg the sidebar is an off-canvas drawer) */
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  // Remember the collapsed preference across sessions
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {}
  }, []);
  const toggleCollapsed = () =>
    setCollapsed((prev) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, prev ? "0" : "1");
      } catch {}
      return !prev;
    });

  const { data: admin } = useAdminQuery(getAdminMe, ["admin", "me"]);
  const logout = useAdminMutation<{ reason?: string }, void>(async () => {
    await logoutAdmin();
  });

  const adminName = admin?.user?.full_name || admin?.user?.name || "Administrator";
  const adminRole = admin?.role?.name || "Administrator";
  const initials = getInitials(adminName, "AD");

  // The drawer is always full-width on mobile; collapse only applies on desktop
  const isCollapsed = collapsed;

  return (
    <aside
      className={cn(
        "sidebar fixed inset-y-0 left-0 z-50 flex h-screen flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground",
        "w-[272px] -translate-x-full transition-[transform,width] duration-300 ease-out",
        mobileOpen && "translate-x-0 shadow-pop",
        "lg:sticky lg:top-0 lg:z-30 lg:translate-x-0 lg:shadow-none",
        isCollapsed ? "lg:w-[76px]" : "lg:w-[260px]",
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-sidebar-border px-4",
          isCollapsed ? "lg:justify-center lg:px-2" : "justify-between",
        )}
      >
        <Link href="/dashboard" onClick={onMobileClose} className="flex shrink-0 items-center" aria-label="Symcure dashboard">
          {!isCollapsed ? (
            <Image src="/symcure-logo-white.png" alt="Symcure" width={125} height={45} priority className="h-auto w-[120px] object-contain" />
          ) : (
            <>
              <Image src="/symcure-logo-white.png" alt="Symcure" width={125} height={45} priority className="h-auto w-[120px] object-contain lg:hidden" />
              <span className="hidden size-10 items-center justify-center rounded-xl bg-sidebar-primary text-lg font-bold text-sidebar-primary-foreground lg:flex">
                S
              </span>
            </>
          )}
        </Link>

        {/* Desktop collapse */}
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "hidden size-8 items-center justify-center rounded-lg border border-sidebar-border text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground lg:flex",
            isCollapsed && "absolute -right-3 top-5 bg-sidebar shadow-card",
          )}
        >
          {isCollapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
        </button>

        {/* Mobile close */}
        <button
          type="button"
          onClick={onMobileClose}
          aria-label="Close menu"
          className="flex size-8 items-center justify-center rounded-lg text-sidebar-muted hover:bg-sidebar-accent lg:hidden"
        >
          <X className="size-5" />
        </button>
      </div>

      {/* Navigation */}
      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-none">
        <div className={cn("px-3 py-5", isCollapsed && "lg:px-2")}>
          <MainNav isCollapsed={isCollapsed} onNavigate={onMobileClose} />
        </div>
      </div>

      {/* Account */}
      <div className="shrink-0 border-t border-sidebar-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex w-full items-center rounded-xl p-2 text-left transition-colors hover:bg-sidebar-accent",
                isCollapsed ? "lg:justify-center lg:p-1.5" : "gap-3",
              )}
            >
              <Avatar className="size-9 shrink-0 border border-sidebar-border">
                <AvatarFallback className="bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-sidebar-accent-foreground">{adminName}</p>
                    <p className="mt-0.5 truncate text-xs text-sidebar-muted">{adminRole}</p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-sidebar-muted" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent side="right" align="end" sideOffset={10} className="w-60 rounded-xl">
            <div className="flex items-center gap-3 px-3 py-3">
              <Avatar className="size-9">
                <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{adminName}</p>
                <p className="truncate text-xs text-muted-foreground">{adminRole}</p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer gap-2 py-2.5 text-destructive focus:text-destructive"
              onSelect={async (event) => {
                event.preventDefault();
                await logout.mutateAsync({}).catch(() => undefined);
                window.location.replace("/login");
              }}
            >
              <LogOut className="size-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
