"use client";

import { cn } from "@/components/ui";
import { formatDate, formatTime } from "@/lib/format";
import type { BookingStatus, StatusEvent } from "@/lib/types";

interface Step {
  key: string;
  label: string;
  matches: BookingStatus[];
}

const STEPS: Step[] = [
  { key: "requested", label: "Booking requested", matches: ["created", "searching"] },
  { key: "assigned", label: "Professional assigned", matches: ["assigned", "confirmed"] },
  { key: "en_route", label: "On the way", matches: ["en_route"] },
  { key: "started", label: "Visit started", matches: ["in_progress"] },
  { key: "completed", label: "Visit completed", matches: ["completed"] },
];

const RANK: Record<BookingStatus, number> = {
  created: 0,
  searching: 0,
  assigned: 1,
  confirmed: 1,
  en_route: 2,
  in_progress: 3,
  completed: 4,
  cancelled: -1,
  failed: -1,
  no_show: -1,
};

const TERMINAL: Partial<Record<BookingStatus, string>> = {
  cancelled: "Cancelled",
  failed: "No professional was available",
  no_show: "Missed visit",
};

function stamp(iso: string) {
  return `${formatDate(iso)}, ${formatTime(iso)}`;
}

/**
 * A live status timeline (Zomato-style): the steps a visit goes through, with the time each
 * happened, the current one pulsing. Ended bookings show how far they got, then why they ended.
 */
export function BookingTimeline({
  status,
  timeline,
  createdAt,
}: {
  status: BookingStatus;
  timeline: StatusEvent[];
  createdAt: string;
}) {
  const lastAt = (matches: BookingStatus[]) => {
    for (let i = timeline.length - 1; i >= 0; i -= 1) {
      if (matches.includes(timeline[i].status)) return timeline[i];
    }
    return null;
  };

  const terminal = TERMINAL[status];
  // How far an ended booking got: the furthest step it has an event for.
  const reached = terminal
    ? Math.max(0, ...timeline.map((e) => RANK[e.status]).filter((r) => r >= 0))
    : RANK[status];
  const shown = terminal ? STEPS.slice(0, reached + 1) : STEPS;
  const endEvent = terminal ? lastAt([status]) : null;

  return (
    <ol className="relative">
      {shown.map((step, index) => {
        const event = index === 0 ? (lastAt(step.matches) ?? { at: createdAt, note: null }) : lastAt(step.matches);
        const done = index < reached || (index === reached && (status === "completed" || !!terminal));
        const current = !terminal && index === reached && status !== "completed";
        const isLast = index === shown.length - 1 && !terminal;
        return (
          <li key={step.key} className="relative flex gap-3 pb-5 last:pb-0">
            {!isLast && (
              <span
                className={cn(
                  "absolute left-[11px] top-6 h-[calc(100%-12px)] w-0.5",
                  index < reached ? "bg-brand-500" : "bg-slate-200",
                )}
                aria-hidden="true"
              />
            )}
            <span className="relative mt-0.5 flex size-6 shrink-0 items-center justify-center">
              {current && <span className="absolute inline-flex size-6 animate-ping rounded-full bg-brand-400 opacity-40" />}
              <span
                className={cn(
                  "relative flex size-6 items-center justify-center rounded-full border-2",
                  done
                    ? "border-brand-600 bg-brand-600"
                    : current
                      ? "border-brand-600 bg-white"
                      : "border-slate-300 bg-white",
                )}
              >
                {done && (
                  <svg viewBox="0 0 24 24" className="size-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={3}>
                    <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {current && <span className="size-2 rounded-full bg-brand-600" />}
              </span>
            </span>
            <div className="min-w-0 pt-0.5">
              <p className={cn("text-sm font-medium", done || current ? "text-slate-900" : "text-slate-400")}>{step.label}</p>
              {event && (done || current) && <p className="text-xs text-slate-500">{stamp(event.at)}</p>}
              {event?.note && (done || current) && <p className="mt-0.5 text-xs text-slate-500">{event.note}</p>}
            </div>
          </li>
        );
      })}
      {terminal && (
        <li className="relative flex gap-3">
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-500 text-white">
            <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={3}>
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </span>
          <div className="min-w-0 pt-0.5">
            <p className="text-sm font-medium text-slate-900">{terminal}</p>
            {endEvent && <p className="text-xs text-slate-500">{stamp(endEvent.at)}</p>}
            {endEvent?.note && <p className="mt-0.5 text-xs text-slate-500">{endEvent.note}</p>}
          </div>
        </li>
      )}
    </ol>
  );
}
