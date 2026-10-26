"use client";

import Link from "next/link";
import { useState } from "react";

import { Icon } from "@/components/icons";
import { formatDateTime, formatINR } from "@/lib/format";
import type { BookingRequest } from "@/lib/types";

interface Tracked {
  /** The poll result last diffed, so each new response is compared exactly once. */
  from?: BookingRequest[];
  /** Arrivals not yet seen or dismissed, newest first. */
  fresh: BookingRequest[];
}

/**
 * Pops up over any /pro page when a poll returns requests that weren't in the previous one.
 * The first response is the baseline (no pop-up for what was already open on load), and
 * `quiet` — set on the requests page, which already lists them — swallows arrivals.
 * Requests that close (accepted elsewhere, expired) drop out of the pop-up on the next poll.
 */
export function NewRequestAlert({ requests, quiet }: { requests?: BookingRequest[]; quiet: boolean }) {
  const [tracked, setTracked] = useState<Tracked>({ fresh: [] });

  if (requests && requests !== tracked.from) {
    const before = new Set(tracked.from?.map((r) => r.id));
    const open = new Set(requests.map((r) => r.id));
    const arrived = tracked.from ? requests.filter((r) => !before.has(r.id)) : [];
    const fresh = quiet ? [] : [...arrived, ...tracked.fresh].filter((r) => open.has(r.id));
    setTracked({ from: requests, fresh });
  } else if (quiet && tracked.fresh.length > 0) {
    setTracked({ ...tracked, fresh: [] });
  }

  const dismiss = () => setTracked({ ...tracked, fresh: [] });
  const [latest, ...more] = tracked.fresh;
  if (!latest) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 top-20 z-40 sm:left-auto sm:right-6 sm:w-96"
    >
      <div className="rounded-2xl border border-brand-200 bg-white p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <span className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <Icon name="bell" className="size-5" />
            <span className="absolute -right-0.5 -top-0.5 size-2.5 animate-ping rounded-full bg-brand-500" />
            <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-brand-600" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">
              {more.length ? `${more.length + 1} new requests` : "New request"}
            </p>
            <p className="mt-0.5 truncate text-sm text-slate-700">
              {latest.service_name} · {latest.area} · {latest.distance_km} km
            </p>
            <p className="text-xs text-slate-500">
              {formatDateTime(latest.scheduled_start_at)} · You earn{" "}
              <span className="font-semibold text-emerald-700">{formatINR(latest.earning_amount)}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="-m-1 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <Icon name="x" className="size-4" />
          </button>
        </div>
        <Link
          href="/pro/requests"
          onClick={dismiss}
          className="mt-3 flex h-9 items-center justify-center rounded-xl bg-brand-600 text-sm font-semibold text-white hover:bg-brand-700"
        >
          {more.length ? "View requests" : "View request"}
        </Link>
      </div>
    </div>
  );
}
