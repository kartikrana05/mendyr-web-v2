"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { BookingTimeline } from "@/components/booking-timeline";
import { Icon } from "@/components/icons";
import { Modal } from "@/components/modal";
import { StatusBadge } from "@/components/status-badge";
import { EmergencyCard } from "@/components/support";
import { useToast } from "@/components/toast";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  ButtonLink,
  Card,
  Chip,
  cn,
  PageSkeleton,
  Stars,
  Textarea,
} from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import {
  ACTIVE_STATUSES,
  CANCELLABLE_STATUSES,
  CANCELLED_BY_PATIENT_VIEW,
  FEE_STATUSES,
  PROFESSION_LABEL,
  REVIEW_TAGS,
} from "@/lib/constants";
import { useConfig, useFeature, usePollMs, useRules } from "@/lib/config";
import { displayPhone, durationLabel, formatDateTime, formatINR, telLink } from "@/lib/format";
import { useApi, useNow } from "@/lib/hooks";
import { useT } from "@/lib/i18n";
import type { Booking } from "@/lib/types";

const HERO_TONES: Record<string, string> = {
  searching: "border-amber-200 bg-amber-50 text-amber-900",
  created: "border-amber-200 bg-amber-50 text-amber-900",
  assigned: "border-brand-200 bg-brand-50 text-brand-900",
  confirmed: "border-brand-200 bg-brand-50 text-brand-900",
  en_route: "border-teal-200 bg-teal-50 text-teal-900",
  in_progress: "border-teal-200 bg-teal-50 text-teal-900",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-900",
  cancelled: "border-slate-200 bg-slate-50 text-slate-800",
  failed: "border-red-200 bg-red-50 text-red-900",
  no_show: "border-red-200 bg-red-50 text-red-900",
};

/** The big "where things stand" card at the top. */
function StatusHero({ booking }: { booking: Booking }) {
  const t = useT();
  const name = booking.professional?.full_name.split(" ")[0] ?? "Your professional";
  const live = ACTIVE_STATUSES.includes(booking.status);
  const sub: Record<string, string> = {
    searching: "Your request is with verified professionals near you who are free at this time.",
    created: "Your request is with verified professionals near you who are free at this time.",
    assigned: `Arriving ${formatDateTime(booking.scheduled_start_at)}. You'll see when they set off.`,
    confirmed: `Arriving ${formatDateTime(booking.scheduled_start_at)}. You'll see when they set off.`,
    en_route: "They've set off for your address.",
    in_progress: "Your professional has started the visit.",
    completed: "Thank you for choosing Mendyr.",
    failed: t("detail.failedBody"),
    no_show: "This visit didn't happen. Contact support if you need help.",
    cancelled: booking.cancelled_by ? CANCELLED_BY_PATIENT_VIEW[booking.cancelled_by] : "",
  };
  return (
    <div className={cn("rounded-(--radius-card) border p-5", HERO_TONES[booking.status])}>
      <div className="flex items-center gap-2">
        {live && (
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-50" />
            <span className="relative inline-flex size-2.5 rounded-full bg-current" />
          </span>
        )}
        <p className="text-lg font-semibold">{t(`status.${booking.status}`, { name })}</p>
      </div>
      {sub[booking.status] && <p className="mt-1 text-sm opacity-80">{sub[booking.status]}</p>}
      {booking.status === "cancelled" && booking.cancellation_reason && (
        <p className="mt-1 text-sm opacity-80">Reason: {booking.cancellation_reason}</p>
      )}
    </div>
  );
}

function VisitPinCard({ pin }: { pin: string }) {
  const t = useT();
  return (
    <Card className="flex items-center gap-4 border-brand-200 p-5">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
        <Icon name="lock" className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">{t("detail.visitPin")}</p>
        <p className="mt-0.5 text-xs text-slate-500">{t("detail.visitPinBody")}</p>
      </div>
      <p className="font-display text-3xl font-bold tracking-[0.3em] text-slate-900" aria-label={`PIN ${pin.split("").join(" ")}`}>
        {pin}
      </p>
    </Card>
  );
}

function ProfessionalCard({ booking }: { booking: Booking }) {
  const t = useT();
  const pro = booking.professional;
  if (!pro) return null;
  if (booking.contact_hidden) {
    return (
      <Card className="flex items-center gap-4 p-5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <Icon name="user" className="size-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-900">Professional {pro.user_ref}</p>
          <p className="mt-0.5 text-xs text-slate-500">{t("detail.privacy")}</p>
        </div>
      </Card>
    );
  }
  return (
    <Card className="p-5">
      <div className="flex items-center gap-4">
        <Avatar name={pro.full_name} src={pro.avatar_url} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 font-semibold text-slate-900">
            {pro.full_name}
            {pro.is_verified && (
              <Badge tone="green">
                <Icon name="shield" className="size-3.5" /> {t("common.verified")}
              </Badge>
            )}
          </p>
          <p className="text-sm text-slate-500">
            {PROFESSION_LABEL[pro.professional_type]} · {t("common.yrsExp", { years: pro.years_of_experience })}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
            {pro.total_ratings > 0 ? (
              <>
                <Stars value={pro.average_rating} /> {pro.average_rating.toFixed(1)} ({pro.total_ratings})
              </>
            ) : (
              t("common.new")
            )}
          </p>
        </div>
        {pro.phone_number && ACTIVE_STATUSES.includes(booking.status) && (
          <a
            href={telLink(pro.phone_number)}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition active:scale-[0.97] hover:bg-brand-700"
            title={displayPhone(pro.phone_number)}
          >
            <Icon name="phone" className="size-4" /> {t("detail.call")}
          </a>
        )}
      </div>
      {!!pro.languages_spoken?.length && (
        <p className="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-3 text-sm text-slate-600">
          <Icon name="globe" className="size-4 text-slate-400" /> Speaks {pro.languages_spoken.join(", ")}
        </p>
      )}
    </Card>
  );
}

function ReviewForm({ bookingId, onDone }: { bookingId: string; onDone: () => void }) {
  const toast = useToast();
  const t = useT();
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const options = rating >= 4 ? REVIEW_TAGS.good : REVIEW_TAGS.bad;

  async function submit() {
    setSaving(true);
    try {
      await api("/reviews", {
        method: "POST",
        body: {
          booking_id: bookingId,
          rating,
          comment: comment.trim() || null,
          tags: tags.filter((tag) => options.includes(tag)),
        },
      });
      toast.success(t("detail.rateThanks"));
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-5">
      <h2 className="font-semibold text-slate-900">{t("detail.rate")}</h2>
      <div className="mt-3 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() => setRating(n)}
            className="rounded p-0.5 transition active:scale-90"
          >
            <Icon name="star" className={cn("size-8", n <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300")} />
          </button>
        ))}
      </div>
      {rating > 0 && (
        <div className="mt-4 space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">
              {rating >= 4 ? "What went well?" : "What could have been better?"}
            </p>
            <div className="flex flex-wrap gap-2">
              {options.map((tag) => (
                <Chip
                  key={tag}
                  selected={tags.includes(tag)}
                  onClick={() => setTags((current) => (current.includes(tag) ? current.filter((x) => x !== tag) : [...current, tag]))}
                >
                  {tag}
                </Chip>
              ))}
            </div>
          </div>
          <Textarea
            rows={2}
            placeholder="Anything else you'd like to share? (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <Button onClick={submit} loading={saving}>
            Submit rating
          </Button>
        </div>
      )}
    </Card>
  );
}

function CancelModal({
  booking,
  open,
  onClose,
  onCancelled,
}: {
  booking: Booking;
  open: boolean;
  onClose: () => void;
  onCancelled: (b: Booking) => void;
}) {
  const toast = useToast();
  const t = useT();
  const reasons = useConfig("booking.cancel_reasons").patient;
  const rules = useRules();
  const now = useNow();
  const [reason, setReason] = useState<string | null>(null);
  const [other, setOther] = useState("");
  const [saving, setSaving] = useState(false);

  const minutesToStart = (Date.parse(booking.scheduled_start_at) - now) / 60_000;
  const feeApplies =
    FEE_STATUSES.includes(booking.status) &&
    minutesToStart < rules.free_cancel_window_minutes &&
    rules.cancellation_fee_pct > 0;
  const fee = Math.round(booking.total_amount * rules.cancellation_fee_pct) / 100;
  const isOther = reason === "Other";
  const finalReason = isOther ? other.trim() || "Other" : reason;

  async function cancel() {
    if (!finalReason) return;
    setSaving(true);
    try {
      const updated = await api<Booking>(`/bookings/${booking.id}/cancel`, { method: "POST", body: { reason: finalReason } });
      toast.success("Booking cancelled.");
      onCancelled(updated);
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("detail.cancelTitle")}
      description="Tell us why — it helps us improve."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            {t("detail.keep")}
          </Button>
          <Button variant="danger" onClick={cancel} loading={saving} disabled={!reason}>
            {t("detail.confirmCancel")}
          </Button>
        </>
      }
    >
      <div className="flex flex-wrap gap-2">
        {reasons.map((r) => (
          <Chip key={r} selected={reason === r} onClick={() => setReason(r)}>
            {r}
          </Chip>
        ))}
      </div>
      {isOther && (
        <Textarea
          className="mt-3"
          rows={2}
          maxLength={500}
          placeholder="Tell us a little more (optional)"
          value={other}
          onChange={(e) => setOther(e.target.value)}
        />
      )}
      <p
        className={cn(
          "mt-4 rounded-xl px-3 py-2.5 text-sm",
          feeApplies ? "bg-amber-50 text-amber-900" : "bg-emerald-50 text-emerald-800",
        )}
      >
        {feeApplies
          ? t("detail.cancelFee", {
              pct: rules.cancellation_fee_pct,
              amount: formatINR(fee),
              minutes: rules.free_cancel_window_minutes,
            })
          : t("detail.cancelFree")}
      </p>
    </Modal>
  );
}

export function PatientBookingDetail() {
  const { id } = useParams<{ id: string }>();
  const t = useT();
  const reviewsOn = useFeature("reviews");
  const activeMs = usePollMs("active_booking");
  const [cancelling, setCancelling] = useState(false);
  const [live, setLive] = useState(true);
  // Poll while something can still change on the other side (a professional accepting,
  // setting off, starting or completing the visit).
  const { data: booking, error, mutate, reload } = useApi<Booking>(`/bookings/${id}`, {
    pollMs: live ? activeMs : undefined,
  });
  const isLive = booking ? ACTIVE_STATUSES.includes(booking.status) : true;
  if (live !== isLive) setLive(isLive);

  if (error && !booking) {
    return (
      <div className="space-y-4">
        <Alert tone="error">{error.message}</Alert>
        <Link href="/patient/bookings" className="text-sm font-semibold text-brand-700">
          ← Back to my bookings
        </Link>
      </div>
    );
  }
  if (!booking) return <PageSkeleton />;

  const minutes = (Date.parse(booking.scheduled_end_at) - Date.parse(booking.scheduled_start_at)) / 60_000;
  const ended = ["completed", "cancelled", "failed", "no_show"].includes(booking.status);
  const proName = booking.professional?.full_name.split(" ")[0] ?? "your professional";

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/patient/bookings"
        className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800"
      >
        <Icon name="chevronLeft" className="size-4" /> {t("bookings.title")}
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{booking.service_name_snapshot}</h1>
          <p className="mt-1 text-sm text-slate-500">Booking {booking.booking_code}</p>
        </div>
        <StatusBadge status={booking.status} />
      </div>

      <div className="mt-5 grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <StatusHero booking={booking} />
          {booking.visit_pin && <VisitPinCard pin={booking.visit_pin} />}
          <ProfessionalCard booking={booking} />

          {(booking.visit_summary_notes || booking.vitals_recorded) && (
            <Card className="p-5">
              <h2 className="font-semibold text-slate-900">{t("detail.summary")}</h2>
              {booking.vitals_recorded && (
                <div className="mt-3 rounded-xl bg-teal-50/70 p-3.5">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-teal-800">
                    <Icon name="activity" className="size-4" /> {t("detail.vitals")}
                  </p>
                  <p className="mt-1.5 whitespace-pre-line text-sm text-slate-800">{booking.vitals_recorded}</p>
                </div>
              )}
              {booking.visit_summary_notes && (
                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t("detail.notesFrom", { name: proName })}
                  </p>
                  <p className="mt-1.5 whitespace-pre-line text-sm text-slate-700">{booking.visit_summary_notes}</p>
                </div>
              )}
            </Card>
          )}

          {booking.status === "completed" &&
            reviewsOn &&
            (booking.review_rating ? (
              <Card className="flex items-center justify-between p-5">
                <p className="text-sm font-medium text-slate-700">{t("detail.yourRating")}</p>
                <Stars value={booking.review_rating} />
              </Card>
            ) : (
              <ReviewForm bookingId={booking.id} onDone={reload} />
            ))}

          <Card className="divide-y divide-slate-100">
            <div className="flex gap-3 p-4">
              <Icon name="calendar" className="mt-0.5 size-5 shrink-0 text-slate-400" />
              <div>
                <p className="text-sm font-medium text-slate-900">{formatDateTime(booking.scheduled_start_at)}</p>
                <p className="text-sm text-slate-500">
                  {durationLabel(minutes)} visit · {t("common.ist")}
                </p>
              </div>
            </div>
            <div className="flex gap-3 p-4">
              <Icon name="pin" className="mt-0.5 size-5 shrink-0 text-slate-400" />
              {booking.contact_hidden ? (
                <p className="text-sm text-slate-500">{t("detail.privacy")}</p>
              ) : (
                <p className="text-sm text-slate-700">{booking.address_snapshot}</p>
              )}
            </div>
            {booking.preferred_gender === "female" && (
              <div className="flex gap-3 p-4">
                <Icon name="female" className="mt-0.5 size-5 shrink-0 text-slate-400" />
                <p className="text-sm text-slate-700">Female professional requested</p>
              </div>
            )}
            {booking.patient_notes && (
              <div className="flex gap-3 p-4">
                <Icon name="list" className="mt-0.5 size-5 shrink-0 text-slate-400" />
                <p className="whitespace-pre-line text-sm text-slate-700">{booking.patient_notes}</p>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="font-semibold text-slate-900">{t("detail.payment")}</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <dt>{t("book.visitCharge")}</dt>
                <dd>{formatINR(booking.base_price)}</dd>
              </div>
              {booking.discount_amount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <dt>{t("book.discount")}</dt>
                  <dd>−{formatINR(booking.discount_amount)}</dd>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <dt>{t("book.gst")}</dt>
                <dd>{formatINR(booking.tax_amount)}</dd>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2 font-bold text-slate-900">
                <dt>{t("book.total")}</dt>
                <dd>{formatINR(booking.base_price - booking.discount_amount + booking.tax_amount)}</dd>
              </div>
              {booking.cancellation_fee_amount > 0 && (
                <div className="flex justify-between text-amber-800">
                  <dt>Cancellation fee</dt>
                  <dd>{formatINR(booking.cancellation_fee_amount)}</dd>
                </div>
              )}
            </dl>
            {!ended && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                <Icon name="wallet" className="size-3.5" /> {t("common.payAfter")}
              </p>
            )}
          </Card>

          <div className="flex flex-wrap gap-3">
            {ended && (
              <ButtonLink href={`/patient/book?service=${booking.service_id}`} icon="refresh">
                {t("detail.bookAgain")}
              </ButtonLink>
            )}
            {CANCELLABLE_STATUSES.includes(booking.status) && (
              <Button variant="dangerGhost" onClick={() => setCancelling(true)}>
                {t("detail.cancel")}
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-5 lg:sticky lg:top-24">
          <Card className="p-5">
            <h2 className="mb-4 font-semibold text-slate-900">{t("detail.timeline")}</h2>
            <BookingTimeline status={booking.status} timeline={booking.timeline} createdAt={booking.created_at} />
          </Card>
          {!ended && <EmergencyCard compact />}
          <Link
            href="/patient/support"
            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <Icon name="help" className="size-4" /> Need help with this booking?
          </Link>
        </div>
      </div>

      <CancelModal booking={booking} open={cancelling} onClose={() => setCancelling(false)} onCancelled={mutate} />
    </div>
  );
}
