"use client";

import { useState } from "react";

import { PatientBookingRow } from "@/components/booking-cards";
import { Alert, ButtonLink, Chip, EmptyState, PageHeader, PageSpinner } from "@/components/ui";
import { ACTIVE_STATUSES } from "@/lib/constants";

import { usePatientBookings } from "../patient-context";

export default function PatientBookingsPage() {
  const { data, error, loading } = usePatientBookings();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  const upcoming = (data ?? [])
    .filter((b) => ACTIVE_STATUSES.includes(b.status))
    .sort((a, b) => a.scheduled_start_at.localeCompare(b.scheduled_start_at));
  const past = (data ?? []).filter((b) => !ACTIVE_STATUSES.includes(b.status));
  const shown = tab === "upcoming" ? upcoming : past;

  return (
    <div>
      <PageHeader
        title="My bookings"
        action={
          <ButtonLink href="/patient/book" icon="plus">
            New booking
          </ButtonLink>
        }
      />
      <div className="mb-5 flex gap-2">
        <Chip selected={tab === "upcoming"} onClick={() => setTab("upcoming")}>
          Upcoming ({upcoming.length})
        </Chip>
        <Chip selected={tab === "past"} onClick={() => setTab("past")}>
          Past ({past.length})
        </Chip>
      </div>
      {error ? (
        <Alert tone="error">{error.message}</Alert>
      ) : loading ? (
        <PageSpinner />
      ) : shown.length === 0 ? (
        <EmptyState
          icon="calendar"
          title={tab === "upcoming" ? "No upcoming visits" : "No past visits yet"}
          action={
            tab === "upcoming" && (
              <ButtonLink href="/patient/book" icon="plus">
                Book a visit
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
