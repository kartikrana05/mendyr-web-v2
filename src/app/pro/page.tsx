"use client";

import Link from "next/link";
import { useState } from "react";

import { Icon, type IconName } from "@/components/icons";
import { ProBookingRow, RequestCard } from "@/components/pro-cards";
import { useToast } from "@/components/toast";
import { Alert, Badge, ButtonLink, Card, cn, EmptyState, SectionHeading, Skeleton, Switch } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useConfig } from "@/lib/config";
import { ACTIVE_STATUSES, PROFESSION_LABEL } from "@/lib/constants";
import { summariseEarnings } from "@/lib/earnings";
import { formatINR, whatsappLink } from "@/lib/format";
import { useApi } from "@/lib/hooks";
import { useT } from "@/lib/i18n";
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

/** Where the professional's verification stands — and what happens next. */
function VerificationBanner({ profile }: { profile: ProfessionalProfile }) {
  const support = useConfig("app.support");
  const contact = support.whatsapp ? (
    <a href={whatsappLink(support.whatsapp, "Hi Mendyr, about my professional verification")} target="_blank" rel="noreferrer" className="font-semibold underline">
      WhatsApp our team
    </a>
  ) : (
    <Link href="/pro/support" className="font-semibold underline">
      contact support
    </Link>
  );
  switch (profile.verification_status) {
    case "approved":
      return null;
    case "pending":
      return (
        <Alert tone="info" title="Your profile is waiting for verification">
          Our team checks every professional before their first visit — usually within 1–2 working days. You&apos;ll
          start seeing requests as soon as you&apos;re approved. Meanwhile, set your{" "}
          <Link href="/pro/schedule" className="font-semibold underline">
            timings
          </Link>{" "}
          and{" "}
          <Link href="/pro/profile" className="font-semibold underline">
            services
          </Link>
          .
        </Alert>
      );
    case "in_review":
      return (
        <Alert tone="info" title="Verification in progress">
          We&apos;re reviewing your details now. We&apos;ll notify you as soon as there&apos;s a decision.
        </Alert>
      );
    case "rejected":
      return (
        <Alert tone="error" title="Your profile wasn't approved">
          {profile.rejection_reason ? <>Reason: {profile.rejection_reason}. </> : null}
          Update your details in your profile, or {contact} to ask for another review.
        </Alert>
      );
    default:
      return null;
  }
}

export default function ProDashboardPage() {
  const { user } = useAuth();
  const t = useT();
  const { profile, setProfile } = useProfessional();
  const toast = useToast();
  const requests = useOpenRequests();
  const bookings = useMyBookings();
  const slots = useApi<AvailabilitySlot[]>("/professionals/me/availability/slots");
  const [saving, setSaving] = useState(false);
  const approved = profile.verification_status === "approved";

  // Optimistic: flip at once, put it back if the save fails.
  async function setAccepting(on: boolean) {
    const before = profile;
    setProfile({ ...profile, is_accepting_bookings: on });
    setSaving(true);
    try {
      const updated = await api<ProfessionalProfile>("/professionals/me", {
        method: "PATCH",
        body: { is_accepting_bookings: on },
      });
      setProfile(updated);
      void requests.reload();
    } catch (err) {
      setProfile(before);
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const all = bookings.data ?? [];
  const upcoming = all
    .filter((b) => ACTIVE_STATUSES.includes(b.status))
    .sort((a, b) => a.scheduled_start_at.localeCompare(b.scheduled_start_at));
  const earnings = summariseEarnings(all);
  const openRequests = requests.data ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
            Hi, {user?.full_name.split(" ")[0]}
            {approved && (
              <Badge tone="green">
                <Icon name="shield" className="size-3.5" /> {t("common.verified")}
              </Badge>
            )}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {PROFESSION_LABEL[profile.professional_type]} · serving within {profile.service_radius_km} km
          </p>
        </div>
      </div>

      <VerificationBanner profile={profile} />

      <Card className={cn("flex items-center justify-between gap-4 p-5", profile.is_accepting_bookings && approved && "border-emerald-200")}>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "size-3 shrink-0 rounded-full",
              profile.is_accepting_bookings && approved ? "bg-emerald-500" : "bg-slate-300",
            )}
          />
          <div>
            <p className="font-semibold text-slate-900">
              {profile.is_accepting_bookings ? "Accepting new requests" : "Not accepting new requests"}
            </p>
            <p className="mt-0.5 text-sm text-slate-500">
              {!approved
                ? "Requests start once your profile is approved."
                : profile.is_accepting_bookings
                  ? "Requests near you, inside your timings, show up below."
                  : "Turn this on when you're ready to take visits."}
            </p>
          </div>
        </div>
        <Switch
          checked={profile.is_accepting_bookings}
          disabled={saving}
          label="Accepting new requests"
          onChange={setAccepting}
        />
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon="rupee" label="Earned today" value={formatINR(earnings.today)} tone="bg-emerald-50 text-emerald-600" />
        <Stat icon="wallet" label="This week" value={formatINR(earnings.week)} tone="bg-teal-50 text-teal-700" />
        <Stat icon="calendar" label="Upcoming visits" value={String(upcoming.length)} tone="bg-brand-50 text-brand-700" />
        <Stat
          icon="star"
          label={profile.total_ratings ? `${profile.total_ratings} ratings` : "No ratings yet"}
          value={profile.total_ratings ? profile.average_rating.toFixed(1) : "—"}
          tone="bg-amber-50 text-amber-600"
        />
      </div>

      {upcoming.length > 0 && (
        <section>
          <SectionHeading
            title="Your next visits"
            action={
              <Link href="/pro/bookings" className="text-sm font-semibold text-brand-700">
                {t("common.seeAll")}
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

      {approved && slots.data?.length === 0 && (
        <Alert tone="info" title="Set your timings">
          Right now you&apos;ll see requests for any time of day.{" "}
          <Link href="/pro/schedule" className="font-semibold underline">
            Choose when you&apos;re free
          </Link>{" "}
          to only see the ones that fit.
        </Alert>
      )}

      {approved && (
        <section>
          <SectionHeading
            title={`New requests near you${openRequests.length ? ` (${openRequests.length})` : ""}`}
            action={
              openRequests.length > 2 && (
                <Link href="/pro/requests" className="text-sm font-semibold text-brand-700">
                  {t("common.seeAll")}
                </Link>
              )
            }
          />
          {requests.loading ? (
            <Skeleton className="h-32 rounded-(--radius-card)" />
          ) : openRequests.length === 0 ? (
            <EmptyState icon="inbox" title="No new requests right now">
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
      )}

      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/pro/earnings" variant="outline" icon="rupee">
          Earnings
        </ButtonLink>
        <ButtonLink href="/pro/schedule" variant="outline" icon="clock">
          {t("nav.timings")}
        </ButtonLink>
        <ButtonLink href="/pro/support" variant="outline" icon="help">
          {t("nav.help")}
        </ButtonLink>
      </div>
    </div>
  );
}
