"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Icon } from "@/components/icons";
import { StatusBadge } from "@/components/status-badge";
import { useToast } from "@/components/toast";
import { Badge, Button, Card, cn } from "@/components/ui";
import { api, ApiError, errorMessage } from "@/lib/api";
import { durationLabel, formatDate, formatDateTime, formatINR, formatTime } from "@/lib/format";
import type { BookingRequest, ProBooking } from "@/lib/types";

/** An open request: what, when, roughly where, and what they'd earn — with Accept. */
export function RequestCard({ request, onGone }: { request: BookingRequest; onGone: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [accepting, setAccepting] = useState(false);
  const minutes = (Date.parse(request.scheduled_end_at) - Date.parse(request.scheduled_start_at)) / 60_000;

  async function accept() {
    setAccepting(true);
    try {
      await api(`/bookings/${request.id}/accept`, { method: "POST" });
      toast.success("Accepted — here's your visit.");
      // Straight to the visit: address, contact and "On my way" are all there.
      router.push(`/pro/bookings/${request.id}`);
    } catch (err) {
      toast.error(
        err instanceof ApiError && err.status === 409
          ? "Another professional accepted this one first."
          : err instanceof ApiError && err.status === 403
            ? "This clashes with a visit you've already accepted."
            : errorMessage(err),
      );
      onGone();
      setAccepting(false);
    }
  }

  return (
    <Card className="animate-rise p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-slate-900">{request.service_name}</p>
            {request.preferred_gender === "female" && (
              <Badge tone="violet">
                <Icon name="female" className="size-3.5" /> Female professional requested
              </Badge>
            )}
          </div>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-600">
            <Icon name="calendar" className="size-4 text-slate-400" />
            {formatDateTime(request.scheduled_start_at)} · {durationLabel(minutes)}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-600">
            <Icon name="pin" className="size-4 text-slate-400" />
            {request.area} · {request.distance_km} km away
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">You earn</p>
          <p className="text-xl font-bold text-emerald-700">{formatINR(request.earning_amount)}</p>
        </div>
      </div>
      {request.patient_notes && (
        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">&ldquo;{request.patient_notes}&rdquo;</p>
      )}
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">Full address and contact are shared once you accept.</p>
        <Button onClick={accept} loading={accepting} icon="check">
          Accept
        </Button>
      </div>
    </Card>
  );
}

const ENDED = ["cancelled", "failed", "no_show"];

/** One of the professional's own bookings in a list. */
export function ProBookingRow({ booking }: { booking: ProBooking }) {
  const ended = ENDED.includes(booking.status);
  return (
    <Link
      href={`/pro/bookings/${booking.id}`}
      className="group flex items-center gap-4 rounded-(--radius-card) border border-slate-200/80 bg-white p-4 shadow-xs transition duration-150 ease-out hover:border-brand-300 active:scale-[0.99]"
    >
      <div
        className={cn(
          "flex w-16 shrink-0 flex-col items-center justify-center rounded-xl py-2 text-center",
          ended ? "bg-slate-100 text-slate-500" : "bg-brand-50 text-brand-800",
        )}
      >
        <span className="text-[11px] font-semibold uppercase leading-tight">{formatDate(booking.scheduled_start_at)}</span>
        <span className="mt-0.5 text-xs font-medium leading-tight">{formatTime(booking.scheduled_start_at)}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-semibold text-slate-900">{booking.service_name}</p>
          <StatusBadge status={booking.status} />
        </div>
        <p className="mt-1 truncate text-sm text-slate-500">
          {booking.contact_hidden ? `Patient ${booking.patient_ref}` : booking.patient_name} · {booking.address}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className={cn("text-sm font-semibold", ended ? "text-slate-400 line-through" : "text-emerald-700")}>
          {formatINR(booking.earning_amount)}
        </p>
        <Icon name="chevronRight" className="ml-auto mt-1 size-5 text-slate-400 transition group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
