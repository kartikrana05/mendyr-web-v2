"use client";

import Link from "next/link";

import { Icon } from "@/components/icons";
import { RequestCard } from "@/components/pro-cards";
import { Alert, Card, PageHeader, PageSpinner } from "@/components/ui";
import { useApi } from "@/lib/hooks";
import type { AvailabilitySlot, BookingRequest } from "@/lib/types";

import { useProfessional } from "../professional-context";

function Check({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <Icon name={ok ? "check" : "info"} className={ok ? "mt-0.5 size-4 text-emerald-600" : "mt-0.5 size-4 text-amber-600"} />
      <span>{children}</span>
    </li>
  );
}

export default function ProRequestsPage() {
  const { profile } = useProfessional();
  const requests = useApi<BookingRequest[]>("/bookings/professional/requests", { pollMs: 15_000 });
  const slots = useApi<AvailabilitySlot[]>("/professionals/me/availability/slots");

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="New requests"
        subtitle="Visits near you that start inside your timings. First to accept gets the booking."
      />
      {requests.error ? (
        <Alert tone="error">{requests.error.message}</Alert>
      ) : requests.loading ? (
        <PageSpinner />
      ) : requests.data && requests.data.length > 0 ? (
        <div className="space-y-3">
          {requests.data.map((request) => (
            <RequestCard key={request.id} request={request} onGone={requests.reload} />
          ))}
        </div>
      ) : (
        <Card className="p-6">
          <p className="font-semibold text-slate-900">No open requests right now</p>
          <p className="mt-1 text-sm text-slate-500">
            This page checks for new ones every few seconds. Things that decide what you see:
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            <Check ok={profile.is_accepting_bookings}>
              {profile.is_accepting_bookings ? (
                "You're accepting new requests."
              ) : (
                <>
                  You&apos;ve paused new requests —{" "}
                  <Link href="/pro" className="font-semibold text-brand-700 underline">
                    turn them on
                  </Link>
                  .
                </>
              )}
            </Check>
            <Check ok>
              You see visits within {profile.service_radius_km} km —{" "}
              <Link href="/pro/profile" className="font-semibold text-brand-700 underline">
                widen your area
              </Link>{" "}
              for more.
            </Check>
            <Check ok={slots.data !== undefined}>
              {slots.data?.length ? (
                <>
                  Only visits starting in your timings —{" "}
                  <Link href="/pro/schedule" className="font-semibold text-brand-700 underline">
                    add more hours
                  </Link>{" "}
                  for more.
                </>
              ) : (
                "No timings set, so you see visits at any time."
              )}
            </Check>
          </ul>
        </Card>
      )}
    </div>
  );
}
