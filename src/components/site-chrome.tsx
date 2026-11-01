"use client";

import Link from "next/link";

import { Logo } from "@/components/brand";
import { Icon } from "@/components/icons";
import { ButtonLink } from "@/components/ui";
import { homeFor, useAuth } from "@/lib/auth";
import { useConfig, useFeature } from "@/lib/config";
import { telLink, whatsappLink } from "@/lib/format";

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
          <Link href="/#safety" className="hover:text-slate-900">
            Safety
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
  const support = useConfig("app.support");
  const sos = useFeature("sos");
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 text-sm text-slate-600 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div className="space-y-3 lg:col-span-2">
          <Logo />
          <p className="max-w-sm">
            Verified nurses, physiotherapists and caregivers at home — and flexible work for the people who provide
            them.
          </p>
          {sos && (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              <span className="font-semibold text-red-600">Medical emergency?</span>
              <a href={telLink(support.sos_number)} className="font-semibold text-slate-700 hover:text-slate-900">
                Call {support.sos_number}
              </a>
              <span aria-hidden="true">·</span>
              <a href={telLink(support.ambulance_number)} className="font-semibold text-slate-700 hover:text-slate-900">
                Ambulance {support.ambulance_number}
              </a>
            </p>
          )}
        </div>
        <div>
          <p className="font-semibold text-slate-900">Mendyr</p>
          <ul className="mt-3 space-y-2">
            <li>
              <Link href="/services" className="hover:text-slate-900">
                Services
              </Link>
            </li>
            <li>
              <Link href="/#safety" className="hover:text-slate-900">
                Safety
              </Link>
            </li>
            <li>
              <Link href="/register/professional" className="hover:text-slate-900">
                Work with us
              </Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-slate-900">
                Log in
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-slate-900">Support</p>
          <ul className="mt-3 space-y-2">
            {support.phone && (
              <li>
                <a href={telLink(support.phone)} className="inline-flex items-center gap-1.5 hover:text-slate-900">
                  <Icon name="phone" className="size-4" /> {support.phone}
                </a>
              </li>
            )}
            {support.whatsapp && (
              <li>
                <a
                  href={whatsappLink(support.whatsapp)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 hover:text-slate-900"
                >
                  <Icon name="message" className="size-4" /> WhatsApp
                </a>
              </li>
            )}
            {support.email && (
              <li>
                <a href={`mailto:${support.email}`} className="inline-flex items-center gap-1.5 hover:text-slate-900">
                  <Icon name="mail" className="size-4" /> {support.email}
                </a>
              </li>
            )}
            <li className="text-xs text-slate-500">{support.hours}</li>
          </ul>
        </div>
      </div>
      <p className="border-t border-slate-100 py-6 text-center text-xs text-slate-400">
        © Mendyr · Map data © OpenStreetMap contributors
      </p>
    </footer>
  );
}
