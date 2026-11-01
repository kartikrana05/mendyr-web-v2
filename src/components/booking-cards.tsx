"use client";

import Link from "next/link";

import { Icon } from "@/components/icons";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/components/ui";
import { formatDate, formatINR, formatTime } from "@/lib/format";
import { useT } from "@/lib/i18n";
import type { BookingListItem } from "@/lib/types";

const DONE = ["completed"];
const ENDED = ["cancelled", "failed", "no_show"];

/** One booking in a patient's list: a date block, what, who, status. */
export function PatientBookingRow({ booking }: { booking: BookingListItem }) {
  const t = useT();
  const ended = ENDED.includes(booking.status);
  const sub =
    booking.status === "failed"
      ? t("status.failed")
      : booking.professional_name
        ? `With ${booking.professional_name}`
        : ended
          ? null
          : t("status.searching");
  return (
    <Link
      href={`/patient/bookings/${booking.id}`}
      className="group flex items-center gap-4 rounded-(--radius-card) border border-slate-200/80 bg-white p-4 shadow-xs transition duration-150 ease-out hover:border-brand-300 active:scale-[0.99]"
    >
      <div
        className={cn(
          "flex w-16 shrink-0 flex-col items-center justify-center rounded-xl py-2 text-center",
          ended ? "bg-slate-100 text-slate-500" : DONE.includes(booking.status) ? "bg-emerald-50 text-emerald-800" : "bg-brand-50 text-brand-800",
        )}
      >
        <span className="text-[11px] font-semibold uppercase leading-tight">{formatDate(booking.scheduled_start_at)}</span>
        <span className="mt-0.5 text-xs font-medium leading-tight">{formatTime(booking.scheduled_start_at)}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={cn("truncate font-semibold", ended ? "text-slate-600" : "text-slate-900")}>
            {booking.service_name_snapshot}
          </p>
          <StatusBadge status={booking.status} />
        </div>
        <p className="mt-1 truncate text-sm text-slate-500">
          {sub && <>{sub} · </>}
          {booking.booking_code}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className={cn("text-sm font-semibold", ended ? "text-slate-400 line-through" : "text-slate-900")}>
          {formatINR(booking.total_amount)}
        </p>
        <Icon name="chevronRight" className="ml-auto mt-1 size-5 text-slate-400 transition group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
