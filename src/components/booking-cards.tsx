import Link from "next/link";

import { Icon } from "@/components/icons";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/components/ui";
import { formatDateTime, formatINR } from "@/lib/format";
import type { BookingListItem, BookingStatus } from "@/lib/types";

/** One booking in a patient's list. */
export function PatientBookingRow({ booking }: { booking: BookingListItem }) {
  return (
    <Link
      href={`/patient/bookings/view?id=${booking.id}`}
      className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-brand-300"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-slate-900">{booking.service_name_snapshot}</p>
          <StatusBadge status={booking.status} />
        </div>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
          <Icon name="calendar" className="size-4" /> {formatDateTime(booking.scheduled_start_at)}
        </p>
        <p className="mt-0.5 text-sm text-slate-500">
          {booking.professional_name ? `With ${booking.professional_name}` : "No professional yet"} ·{" "}
          {formatINR(booking.total_amount)}
        </p>
      </div>
      <Icon name="chevronRight" className="size-5 shrink-0 text-slate-400" />
    </Link>
  );
}

const STEPS: { label: string; reached: BookingStatus[] }[] = [
  { label: "Requested", reached: ["searching", "assigned", "confirmed", "en_route", "in_progress", "completed"] },
  { label: "Accepted", reached: ["assigned", "confirmed", "en_route", "in_progress", "completed"] },
  { label: "In progress", reached: ["in_progress", "completed"] },
  { label: "Completed", reached: ["completed"] },
];

/** Requested → Accepted → In progress → Completed. */
export function BookingProgress({ status }: { status: BookingStatus }) {
  if (["cancelled", "failed", "no_show"].includes(status)) return null;
  return (
    <ol className="flex items-center gap-2">
      {STEPS.map((step, index) => {
        const done = step.reached.includes(status);
        return (
          <li key={step.label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                done ? "bg-brand-600 text-white" : "bg-slate-200 text-slate-500",
              )}
            >
              {done ? <Icon name="check" className="size-4" /> : index + 1}
            </span>
            <span className={cn("hidden text-xs font-medium sm:inline", done ? "text-slate-900" : "text-slate-400")}>
              {step.label}
            </span>
            {index < STEPS.length - 1 && (
              <span className={cn("h-0.5 flex-1 rounded", done ? "bg-brand-500" : "bg-slate-200")} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
