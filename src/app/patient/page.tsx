"use client";

import Link from "next/link";

import { PatientBookingRow } from "@/components/booking-cards";
import { ProfessionIcon } from "@/components/brand";
import { Icon } from "@/components/icons";
import { useCatalog } from "@/components/service-catalog";
import { Alert, ButtonLink, Card, SectionHeading } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { ACTIVE_STATUSES } from "@/lib/constants";
import { formatINR } from "@/lib/format";
import { useApi } from "@/lib/hooks";
import type { Address } from "@/lib/types";

import { usePatientBookings } from "./patient-context";

export default function PatientHomePage() {
  const { user } = useAuth();
  const bookings = usePatientBookings();
  const addresses = useApi<Address[]>("/addresses");
  const { groups } = useCatalog();

  const upcoming = (bookings.data ?? [])
    .filter((b) => ACTIVE_STATUSES.includes(b.status))
    .sort((a, b) => a.scheduled_start_at.localeCompare(b.scheduled_start_at));
  const firstName = user?.full_name.split(" ")[0];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Hello, {firstName}</h1>
          <p className="mt-1 text-sm text-slate-500">What care do you need today?</p>
        </div>
        <ButtonLink href="/patient/book" icon="plus">
          Book a visit
        </ButtonLink>
      </div>

      {addresses.data?.length === 0 && (
        <Alert tone="info" title="Add your address">
          We use it to find professionals near you.{" "}
          <Link href="/patient/account" className="font-semibold underline">
            Add an address
          </Link>
        </Alert>
      )}

      {upcoming.length > 0 && (
        <section>
          <SectionHeading
            title="Upcoming"
            action={
              <Link href="/patient/bookings" className="text-sm font-semibold text-brand-700">
                All bookings
              </Link>
            }
          />
          <div className="space-y-3">
            {upcoming.slice(0, 3).map((booking) => (
              <PatientBookingRow key={booking.id} booking={booking} />
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionHeading title="Book a service" />
        {!groups ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-200/60" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {groups.flatMap(({ services }) =>
              services.map((service) => (
                <Link key={service.id} href={`/patient/book?service=${service.id}`}>
                  <Card className="flex items-center gap-3 p-4 transition hover:border-brand-300">
                    <ProfessionIcon type={service.required_professional_type} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-900">{service.name}</p>
                      <p className="text-sm text-slate-500">{formatINR(service.base_price)} + GST</p>
                    </div>
                    <Icon name="chevronRight" className="size-5 text-slate-400" />
                  </Card>
                </Link>
              )),
            )}
          </div>
        )}
      </section>
    </div>
  );
}
