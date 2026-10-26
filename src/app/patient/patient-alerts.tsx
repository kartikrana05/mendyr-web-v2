"use client";

import { AlertCard, AlertStack, useArrivals } from "@/components/arrival-alerts";
import { formatDateTime } from "@/lib/format";
import type { BookingListItem, BookingStatus } from "@/lib/types";

const OPEN: BookingStatus[] = ["created", "searching"];
const ASSIGNED: BookingStatus[] = ["assigned", "confirmed"];

const isNewlyConfirmed = (booking: BookingListItem, before: BookingListItem | undefined) =>
  ASSIGNED.includes(booking.status) && before !== undefined && OPEN.includes(before.status);
// A professional who drops out hands the booking back to `searching` (only the patient can
// cancel one outright, and they already know).
const isNewlyDropped = (booking: BookingListItem, before: BookingListItem | undefined) =>
  booking.status === "searching" && before !== undefined && ASSIGNED.includes(before.status);

export interface BookingUpdates {
  confirmed: BookingListItem[];
  dropped: BookingListItem[];
  dismissConfirmed: () => void;
  dismissDropped: () => void;
}

/**
 * Bookings a poll found newly confirmed by a professional, or handed back by one, until
 * dismissed. Each only while it's still true, so a booking dropped and then picked up again
 * shows just the confirmation.
 */
export function useBookingUpdates(bookings?: BookingListItem[]): BookingUpdates {
  const [confirmed, dismissConfirmed] = useArrivals(bookings, isNewlyConfirmed);
  const [dropped, dismissDropped] = useArrivals(bookings, isNewlyDropped);
  return {
    confirmed: confirmed.filter((booking) => ASSIGNED.includes(booking.status)),
    dropped: dropped.filter((booking) => booking.status === "searching"),
    dismissConfirmed,
    dismissDropped,
  };
}

/** Pops up over any /patient page when one of the patient's bookings is confirmed or dropped. */
export function PatientAlerts({ confirmed, dropped, dismissConfirmed, dismissDropped }: BookingUpdates) {
  if (confirmed.length === 0 && dropped.length === 0) return null;

  return (
    <AlertStack>
      {dropped[0] && (
        <AlertCard
          tone="red"
          icon="x"
          title={dropped.length > 1 ? `${dropped.length} professionals cancelled` : "Your professional cancelled"}
          href={dropped.length > 1 ? "/patient/bookings" : `/patient/bookings/${dropped[0].id}`}
          action={dropped.length > 1 ? "View bookings" : "View booking"}
          onDismiss={dismissDropped}
        >
          <p className="mt-0.5 truncate text-sm text-slate-700">
            {dropped[0].service_name_snapshot} · {formatDateTime(dropped[0].scheduled_start_at)}
          </p>
          <p className="text-xs text-slate-500">We&apos;re finding you another professional</p>
        </AlertCard>
      )}
      {confirmed[0] && (
        <AlertCard
          tone="green"
          icon="check"
          title={confirmed.length > 1 ? `${confirmed.length} bookings confirmed` : "Booking confirmed"}
          href={confirmed.length > 1 ? "/patient/bookings" : `/patient/bookings/${confirmed[0].id}`}
          action={confirmed.length > 1 ? "View bookings" : "View booking"}
          onDismiss={dismissConfirmed}
        >
          <p className="mt-0.5 truncate text-sm text-slate-700">{confirmed[0].service_name_snapshot}</p>
          <p className="text-xs text-slate-500">
            {confirmed[0].professional_name ?? "Your professional"} will visit{" "}
            {formatDateTime(confirmed[0].scheduled_start_at)}
          </p>
        </AlertCard>
      )}
    </AlertStack>
  );
}
