"use client";

import Link from "next/link";
import { useState } from "react";

import { Icon, type IconName } from "@/components/icons";
import { ProBookingRow, RequestCard } from "@/components/pro-cards";
import { useToast } from "@/components/toast";
import { Alert, Card, cn, EmptyState, SectionHeading, Switch } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ACTIVE_STATUSES, PROFESSION_LABEL } from "@/lib/constants";
import { formatINR, istDateKey } from "@/lib/format";
import { useApi } from "@/lib/hooks";
import type { AvailabilitySlot, ProfessionalProfile } from "@/lib/types";

import { useMyBookings, useOpenRequests, useProfessional } from "./professional-context";

function Stat({ icon, label, value, tone }: { icon: IconName; label: string; value: string; tone: string }) {
  return (
    <Card className="p-4">
      <span className={cn("flex size-9 items-center justify-center rounded-lg", tone)}>
        <Icon name={icon} className="size-4.5" />
      </span>
      <p className="mt-3 text-xl font-bold text-slate-900">{value}</p>
      <p className="text-xs font-medium text-slate-500">{label}</p>
    </Card>
  );
}

export default function ProDashboardPage() {
  const { user } = useAuth();
  const { profile, setProfile } = useProfessional();
  const toast = useToast();
  const requests = useOpenRequests();
  const bookings = useMyBookings();
  const slots = useApi<AvailabilitySlot[]>("/professionals/me/availability/slots");
  const [toggling, setToggling] = useState(false);

  async function setAccepting(on: boolean) {
    setToggling(true);
    try {
      const updated = await api<ProfessionalProfile>("/professionals/me", {
        method: "PATCH",
        body: { is_accepting_bookings: on },
      });
      setProfile(updated);
      void requests.reload();
      toast.success(on ? "You're accepting new requests." : "New requests paused.");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setToggling(false);
    }
  }

  const all = bookings.data ?? [];
  const upcoming = all
    .filter((b) => ACTIVE_STATUSES.includes(b.status))
    .sort((a, b) => a.scheduled_start_at.localeCompare(b.scheduled_start_at));
  const thisMonth = istDateKey(new Date()).slice(0, 7);
  const monthEarnings = all
    .filter((b) => b.status === "completed" && b.completed_at && istDateKey(new Date(b.completed_at)).startsWith(thisMonth))
    .reduce((sum, b) => sum + b.earning_amount, 0);
  const openRequests = requests.data ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Hi, {user?.full_name.split(" ")[0]}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {PROFESSION_LABEL[profile.professional_type]} · serving within {profile.service_radius_km} km
        </p>
      </div>

      {profile.verification_status !== "approved" && (
        <Alert tone="warning" title="Your profile is being reviewed">
          {profile.verification_status === "rejected"
            ? `It wasn't approved: ${profile.rejection_reason ?? "please contact support."}`
            : "You'll start seeing requests once it's approved."}
        </Alert>
      )}

      <Card className="flex items-center justify-between gap-4 p-5">
        <div>
          <p className="font-semibold text-slate-900">
            {profile.is_accepting_bookings ? "Accepting new requests" : "Not accepting new requests"}
          </p>
          <p className="mt-0.5 text-sm text-slate-500">
            {profile.is_accepting_bookings
              ? "Requests near you, inside your timings, show up below."
              : "Turn this on when you're ready to take visits."}
          </p>
        </div>
        <Switch
          checked={profile.is_accepting_bookings}
          disabled={toggling}
          label="Accepting new requests"
          onChange={setAccepting}
        />
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon="rupee" label="Earned this month" value={formatINR(monthEarnings)} tone="bg-emerald-50 text-emerald-600" />
        <Stat icon="check" label="Visits completed" value={String(profile.total_visits_completed)} tone="bg-sky-50 text-sky-600" />
        <Stat icon="calendar" label="Upcoming visits" value={String(upcoming.length)} tone="bg-violet-50 text-violet-600" />
        <Stat
          icon="star"
          label={profile.total_ratings ? `${profile.total_ratings} ratings` : "No ratings yet"}
          value={profile.total_ratings ? profile.average_rating.toFixed(1) : "—"}
          tone="bg-amber-50 text-amber-600"
        />
      </div>

      {slots.data?.length === 0 && (
        <Alert tone="info" title="Set your timings">
          Right now you&apos;ll see requests for any time of day.{" "}
          <Link href="/pro/schedule" className="font-semibold underline">
            Choose when you&apos;re free
          </Link>{" "}
          to only see the ones that fit.
        </Alert>
      )}

      <section>
        <SectionHeading
          title={`New requests near you${openRequests.length ? ` (${openRequests.length})` : ""}`}
          action={
            openRequests.length > 2 && (
              <Link href="/pro/requests" className="text-sm font-semibold text-brand-700">
                See all
              </Link>
            )
          }
        />
        {requests.loading ? (
          <div className="h-32 animate-pulse rounded-2xl bg-slate-200/60" />
        ) : openRequests.length === 0 ? (
          <EmptyState icon="bell" title="No new requests right now">
            {profile.is_accepting_bookings
              ? "We'll show requests here as patients near you book. This page refreshes on its own."
              : "You've paused new requests."}
          </EmptyState>
        ) : (
          <div className="space-y-3">
            {openRequests.slice(0, 2).map((request) => (
              <RequestCard key={request.id} request={request} onGone={requests.reload} />
            ))}
          </div>
        )}
      </section>

      {upcoming.length > 0 && (
        <section>
          <SectionHeading
            title="Your upcoming visits"
            action={
              <Link href="/pro/bookings" className="text-sm font-semibold text-brand-700">
                All bookings
              </Link>
            }
          />
          <div className="space-y-3">
            {upcoming.slice(0, 3).map((booking) => (
              <ProBookingRow key={booking.id} booking={booking} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
