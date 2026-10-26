"use client";

import { AlertCard, AlertStack, useArrivals } from "@/components/arrival-alerts";
import { formatDateTime, formatINR } from "@/lib/format";
import type { BookingRequest, ProBooking } from "@/lib/types";

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
    <AlertStack>
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
    </AlertStack>
  );
}
