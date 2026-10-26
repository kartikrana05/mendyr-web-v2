"use client";

import Link from "next/link";
import { useState } from "react";

import { Icon, type IconName } from "@/components/icons";
import { cn } from "@/components/ui";
import { formatDateTime, formatINR } from "@/lib/format";
import type { BookingRequest, ProBooking } from "@/lib/types";

interface Tracked<T> {
  /** The poll result last diffed, so each new response is compared exactly once. */
  from?: T[];
  /** Ids of arrivals not yet seen or dismissed, newest first. */
  ids: string[];
}

/**
 * Items of a polled `list` that `arrived` since the previous poll, kept until dismissed or
 * gone from the list. The first response is the baseline (nothing has arrived on load).
 */
function useArrivals<T extends { id: string }>(
  list: T[] | undefined,
  arrived: (item: T, before: T | undefined) => boolean,
): [T[], () => void] {
  const [tracked, setTracked] = useState<Tracked<T>>({ ids: [] });

  if (list && list !== tracked.from) {
    const before = new Map(tracked.from?.map((item) => [item.id, item]));
    const present = new Set(list.map((item) => item.id));
    const fresh = tracked.from ? list.filter((item) => arrived(item, before.get(item.id))).map((item) => item.id) : [];
    setTracked({ from: list, ids: [...new Set([...fresh, ...tracked.ids.filter((id) => present.has(id))])] });
  }

  const byId = new Map(list?.map((item) => [item.id, item]));
  return [tracked.ids.flatMap((id) => byId.get(id) ?? []), () => setTracked({ ...tracked, ids: [] })];
}

function AlertCard({
  tone,
  icon,
  title,
  href,
  action,
  onDismiss,
  children,
}: {
  tone: "brand" | "red";
  icon: IconName;
  title: string;
  href: string;
  action: string;
  onDismiss: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "pointer-events-auto rounded-2xl border bg-white p-4 shadow-lg",
        tone === "brand" ? "border-brand-200" : "border-red-200",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "relative flex size-10 shrink-0 items-center justify-center rounded-xl",
            tone === "brand" ? "bg-brand-50 text-brand-700" : "bg-red-50 text-red-600",
          )}
        >
          <Icon name={icon} className="size-5" />
          <span
            className={cn(
              "absolute -right-0.5 -top-0.5 size-2.5 animate-ping rounded-full",
              tone === "brand" ? "bg-brand-500" : "bg-red-500",
            )}
          />
          <span
            className={cn(
              "absolute -right-0.5 -top-0.5 size-2.5 rounded-full",
              tone === "brand" ? "bg-brand-600" : "bg-red-600",
            )}
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          {children}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-m-1 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <Icon name="x" className="size-4" />
        </button>
      </div>
      <Link
        href={href}
        onClick={onDismiss}
        className={cn(
          "mt-3 flex h-9 items-center justify-center rounded-xl text-sm font-semibold text-white",
          tone === "brand" ? "bg-brand-600 hover:bg-brand-700" : "bg-red-600 hover:bg-red-700",
        )}
      >
        {action}
      </Link>
    </div>
  );
}

const isNewRequest = (_request: BookingRequest, before: BookingRequest | undefined) => !before;
const isNewlyCancelled = (booking: ProBooking, before: ProBooking | undefined) =>
  booking.status === "cancelled" && before !== undefined && before.status !== "cancelled";

/**
 * Pops up over any /pro page when a poll brings a new open request, or shows that one of
 * the professional's bookings was cancelled. Requests that close (accepted elsewhere,
 * expired) drop out.
 */
export function ProAlerts({ requests, bookings }: { requests?: BookingRequest[]; bookings?: ProBooking[] }) {
  const [newRequests, dismissRequests] = useArrivals(requests, isNewRequest);
  const [cancelled, dismissCancelled] = useArrivals(bookings, isNewlyCancelled);
  if (newRequests.length === 0 && cancelled.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 top-20 z-40 flex flex-col gap-3 sm:left-auto sm:right-6 sm:w-96"
    >
      {cancelled[0] && (
        <AlertCard
          tone="red"
          icon="x"
          title={cancelled.length > 1 ? `${cancelled.length} bookings cancelled` : "Booking cancelled"}
          href={cancelled.length > 1 ? "/pro/bookings" : `/pro/bookings/${cancelled[0].id}`}
          action={cancelled.length > 1 ? "View bookings" : "View booking"}
          onDismiss={dismissCancelled}
        >
          <p className="mt-0.5 truncate text-sm text-slate-700">
            {cancelled[0].service_name} · {cancelled[0].patient_name}
          </p>
          <p className="text-xs text-slate-500">
            Was on {formatDateTime(cancelled[0].scheduled_start_at)} · The patient cancelled
          </p>
        </AlertCard>
      )}
      {newRequests[0] && (
        <AlertCard
          tone="brand"
          icon="bell"
          title={newRequests.length > 1 ? `${newRequests.length} new requests` : "New request"}
          href="/pro/requests"
          action={newRequests.length > 1 ? "View requests" : "View request"}
          onDismiss={dismissRequests}
        >
          <p className="mt-0.5 truncate text-sm text-slate-700">
            {newRequests[0].service_name} · {newRequests[0].area} · {newRequests[0].distance_km} km
          </p>
          <p className="text-xs text-slate-500">
            {formatDateTime(newRequests[0].scheduled_start_at)} · You earn{" "}
            <span className="font-semibold text-emerald-700">{formatINR(newRequests[0].earning_amount)}</span>
          </p>
        </AlertCard>
      )}
    </div>
  );
}
