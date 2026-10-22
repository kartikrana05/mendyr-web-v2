"use client";

import Link from "next/link";

import { Logo } from "@/components/brand";
import { ButtonLink } from "@/components/ui";
import { homeFor, useAuth } from "@/lib/auth";

/** Header for the public pages (home, services, login, register). */
export function SiteHeader() {
  const { user, loading } = useAuth();
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
          <Link href="/services" className="hover:text-slate-900">
            Services
          </Link>
          <Link href="/#how-it-works" className="hover:text-slate-900">
            How it works
          </Link>
          <Link href="/#for-professionals" className="hover:text-slate-900">
            For professionals
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          {loading ? null : user ? (
            <ButtonLink href={homeFor(user.role)} size="sm">
              My dashboard
            </ButtonLink>
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost" size="sm">
                Log in
              </ButtonLink>
              <ButtonLink href="/register" size="sm">
                Sign up
              </ButtonLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="space-y-2">
          <Logo />
          <p>Healthcare at home — and flexible work for the people who provide it.</p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/services" className="hover:text-slate-900">
            Services
          </Link>
          <Link href="/register/professional" className="hover:text-slate-900">
            Work with us
          </Link>
          <Link href="/login" className="hover:text-slate-900">
            Log in
          </Link>
        </div>
      </div>
      <p className="pb-8 text-center text-xs text-slate-400">
        © Mendyr · Prototype · Maps data © OpenStreetMap contributors
      </p>
    </footer>
  );
}
