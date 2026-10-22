"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { Logo } from "@/components/brand";
import { Icon, type IconName } from "@/components/icons";
import { Avatar, cn, PageSpinner } from "@/components/ui";
import { homeFor, useAuth } from "@/lib/auth";
import type { Role } from "@/lib/types";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  /** Match only this exact path (for section roots like /patient). */
  exact?: boolean;
}

/**
 * Lets only signed-in users with `role` through: anyone else goes to login (and comes back
 * to the same page, query string included, afterwards) or to their own area.
 */
export function RoleGate({ role, children }: { role: Role; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      const here = window.location.pathname + window.location.search;
      router.replace(`/login?next=${encodeURIComponent(here)}`);
    } else if (user.role !== role) {
      router.replace(homeFor(user.role));
    }
  }, [loading, user, role, router]);

  if (loading || !user || user.role !== role) return <PageSpinner />;
  return <>{children}</>;
}

/**
 * Signed-in chrome: top bar on desktop, bottom tab bar on mobile. Must sit inside a
 * <Suspense> boundary — it reads the pathname (for the active tab), which suspends below
 * dynamic routes when Cache Components is on.
 */
export function AppShell({ nav, children }: { nav: NavItem[]; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);

  async function handleLogout() {
    await logout();
    router.replace("/");
  }

  return (
    <div className="min-h-screen pb-20 sm:pb-0">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo href={nav[0]?.href ?? "/"} />
          <nav className="hidden items-center gap-1 sm:flex">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors",
                  isActive(item) ? "bg-brand-50 text-brand-800" : "text-slate-600 hover:bg-slate-100",
                )}
              >
                <Icon name={item.icon} className="size-4" />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {user && <Avatar name={user.full_name} size="sm" />}
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              <Icon name="logout" className="size-4" />
              <span className="hidden md:inline">Log out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white sm:hidden">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }}>
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
                isActive(item) ? "text-brand-700" : "text-slate-500",
              )}
            >
              <Icon name={item.icon} className="size-5" />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
