"use client";

import { useState } from "react";

import { PatientBookingRow } from "@/components/booking-cards";
import { Alert, ButtonLink, Chip, EmptyState, ListSkeleton, PageHeader } from "@/components/ui";
import { isUpcoming } from "@/lib/constants";
import { useNow } from "@/lib/hooks";
import { useT } from "@/lib/i18n";

import { usePatientBookings } from "../patient-context";

export default function PatientBookingsPage() {
  const { data, error, loading } = usePatientBookings();
  const t = useT();
  const now = useNow(60_000);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  const all = data ?? [];
  // Soonest first for what's coming; newest first for history. A request nobody accepted
  // before its time is history, even before the backend marks it failed.
  const upcoming = all
    .filter((b) => isUpcoming(b, now))
    .sort((a, b) => a.scheduled_start_at.localeCompare(b.scheduled_start_at));
  const past = all
    .filter((b) => !isUpcoming(b, now))
    .sort((a, b) => b.scheduled_start_at.localeCompare(a.scheduled_start_at));
  const shown = tab === "upcoming" ? upcoming : past;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={t("bookings.title")}
        action={
          <ButtonLink href="/patient/book" icon="plus">
            {t("bookings.new")}
          </ButtonLink>
        }
      />
      <div className="mb-5 flex gap-2">
        <Chip selected={tab === "upcoming"} onClick={() => setTab("upcoming")}>
          {t("bookings.upcoming")} ({upcoming.length})
        </Chip>
        <Chip selected={tab === "past"} onClick={() => setTab("past")}>
          {t("bookings.past")} ({past.length})
        </Chip>
      </div>
      {error && !data ? (
        <Alert tone="error">{error.message}</Alert>
      ) : loading ? (
        <ListSkeleton rows={4} />
      ) : shown.length === 0 ? (
        <EmptyState
          icon="calendar"
          title={tab === "upcoming" ? t("bookings.emptyUpcoming") : t("bookings.emptyPast")}
          action={
            tab === "upcoming" && (
              <ButtonLink href="/patient/book" icon="plus">
                {t("home.bookVisit")}
              </ButtonLink>
            )
          }
        >
          {tab === "upcoming" && "Book a nurse, physiotherapist or caregiver for a home visit."}
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {shown.map((booking) => (
            <PatientBookingRow key={booking.id} booking={booking} />
          ))}
        </div>
      )}
    </div>
  );
}
