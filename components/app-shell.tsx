"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { getAdminToken } from "@/lib/api/client";
import { Sidebar } from "@/components/header";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === "/login";
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!isLogin && !getAdminToken()) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [isLogin, pathname, router]);

  // Close the mobile drawer on navigation
  useEffect(() => setMobileOpen(false), [pathname]);

  if (isLogin) {
    return <main className="min-h-screen w-full">{children}</main>;
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Skip link for keyboard users */}
      <a
        href="#main"
        className="sr-only z-[60] rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>

      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-[2px] lg:hidden"
        />
      )}

      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-card/90 px-4 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="flex size-9 items-center justify-center rounded-lg text-foreground hover:bg-muted"
          >
            <Menu className="size-5" />
          </button>
          <Link href="/dashboard" className="flex items-center rounded-md">
            <Image src="https://symcure.com/wp-content/uploads/2026/05/Symcure-Logo.png" alt="Symcure" width={100} height={50} className="h-auto w-[113px] object-contain" />
          </Link>
        </div>

        <main id="main" className="mx-auto min-h-screen w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6 lg:min-h-0 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
