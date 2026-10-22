"use client";

import { useState } from "react";

import { ProBookingRow } from "@/components/pro-cards";
import { Alert, ButtonLink, Chip, EmptyState, PageHeader, PageSpinner } from "@/components/ui";
import { ACTIVE_STATUSES } from "@/lib/constants";
import { useApi } from "@/lib/hooks";
import type { ProBooking } from "@/lib/types";

type Tab = "upcoming" | "completed" | "cancelled";

export default function ProBookingsPage() {
  const { data, error, loading } = useApi<ProBooking[]>("/bookings/professional/mine?page_size=100");
  const [tab, setTab] = useState<Tab>("upcoming");

  const all = data ?? [];
  const groups: Record<Tab, ProBooking[]> = {
    upcoming: all
      .filter((b) => ACTIVE_STATUSES.includes(b.status))
      .sort((a, b) => a.scheduled_start_at.localeCompare(b.scheduled_start_at)),
    completed: all.filter((b) => b.status === "completed"),
    cancelled: all.filter((b) => ["cancelled", "no_show", "failed"].includes(b.status)),
  };
  const shown = groups[tab];

  return (
    <div>
      <PageHeader title="My bookings" subtitle="Visits you've accepted." />
      <div className="mb-5 flex flex-wrap gap-2">
        {(["upcoming", "completed", "cancelled"] as Tab[]).map((t) => (
          <Chip key={t} selected={tab === t} onClick={() => setTab(t)}>
            {t[0].toUpperCase() + t.slice(1)} ({groups[t].length})
          </Chip>
        ))}
      </div>
      {error ? (
        <Alert tone="error">{error.message}</Alert>
      ) : loading ? (
        <PageSpinner />
      ) : shown.length === 0 ? (
        <EmptyState
          icon="calendar"
          title={tab === "upcoming" ? "No upcoming visits" : `No ${tab} visits`}
          action={tab === "upcoming" && <ButtonLink href="/pro/requests">See new requests</ButtonLink>}
        >
          {tab === "upcoming" && "Accept a request and it will show up here."}
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {shown.map((booking) => (
            <ProBookingRow key={booking.id} booking={booking} />
          ))}
        </div>
      )}
    </div>
  );
}
