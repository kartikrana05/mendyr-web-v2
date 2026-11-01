"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { Logo } from "@/components/brand";
import { Icon, type IconName } from "@/components/icons";
import { Avatar, Button, cn, PageSkeleton } from "@/components/ui";
import { homeFor, isStaff, useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import type { Role } from "@/lib/types";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  /** Match only this exact path (for section roots like /patient). */
  exact?: boolean;
  /** A count to flag on the tab (e.g. open requests); hidden when 0. */
  badge?: number;
}

function NavBadge({ count, className }: { count?: number; className?: string }) {
  if (!count) return null;
  return (
    <span
      className={cn(
        "inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white",
        className,
      )}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

/** Shown to Mendyr team accounts (admin, super admin, ops): they work in the config portal. */
export function StaffScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const t = useT();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Logo />
      <div className="mt-8 w-full max-w-md rounded-(--radius-card) border border-slate-200 bg-white p-6 text-center shadow-xs">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-50 text-brand-700">
          <Icon name="shield" className="size-6" />
        </span>
        <h1 className="mt-4 text-xl font-bold text-slate-900">{t("staff.title")}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{t("staff.body")}</p>
        {user && (
          <p className="mt-4 text-xs text-slate-500">
            Signed in as {user.email ?? user.full_name} · {user.role.replace("_", " ")}
          </p>
        )}
        <Button
          className="mt-6 w-full"
          variant="outline"
          icon="logout"
          onClick={async () => {
            await logout();
            router.replace("/login");
          }}
        >
          {t("common.logout")}
        </Button>
      </div>
    </div>
  );
}

/**
 * Lets only signed-in users with `role` through: anyone else goes to login (and comes back
 * to the same page, query string included, afterwards) or to their own area. Team accounts
 * get a clear screen instead of a redirect loop.
 */
export function RoleGate({ role, children }: { role: Role; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const staff = user ? isStaff(user.role) : false;

  useEffect(() => {
    if (loading || staff) return;
    if (!user) {
      const here = window.location.pathname + window.location.search;
      router.replace(`/login?next=${encodeURIComponent(here)}`);
    } else if (user.role !== role) {
      router.replace(homeFor(user.role));
    }
  }, [loading, user, role, router, staff]);

  if (staff) return <StaffScreen />;
  if (loading || !user || user.role !== role) return <ShellSkeleton />;
  return <>{children}</>;
}

/** The app frame with placeholder content — while the session check runs. */
export function ShellSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="h-16 border-b border-slate-200/70 bg-white" />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <PageSkeleton />
      </div>
    </div>
  );
}

/**
 * Signed-in chrome: top bar on desktop, bottom tab bar on mobile. Must sit inside a
 * <Suspense> boundary — it reads the pathname (for the active tab), which suspends below
 * dynamic routes when Cache Components is on.
 */
export function AppShell({
  nav,
  bell,
  children,
}: {
  nav: NavItem[];
  /** The notifications bell, with its unread count. */
  bell?: { href: string; count: number };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const t = useT();
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
                <NavBadge count={item.badge} />
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {bell && (
              <Link
                href={bell.href}
                aria-label={`${t("nav.notifications")}${bell.count ? ` (${bell.count} unread)` : ""}`}
                className={cn(
                  "relative inline-flex size-9 items-center justify-center rounded-lg transition-colors",
                  pathname === bell.href ? "bg-brand-50 text-brand-800" : "text-slate-600 hover:bg-slate-100",
                )}
              >
                <Icon name="bell" className="size-5" />
                <NavBadge count={bell.count} className="absolute -right-0.5 -top-0.5" />
              </Link>
            )}
            {user && <Avatar name={user.full_name} src={user.avatar_url} size="sm" />}
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              <Icon name="logout" className="size-4" />
              <span className="hidden md:inline">{t("common.logout")}</span>
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
                "relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
                isActive(item) ? "text-brand-700" : "text-slate-500",
              )}
            >
              <Icon name={item.icon} className="size-5" />
              {item.label}
              <NavBadge count={item.badge} className="absolute left-1/2 top-1 ml-1.5" />
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
