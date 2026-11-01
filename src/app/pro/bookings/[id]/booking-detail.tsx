"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { Icon } from "@/components/icons";
import { Modal } from "@/components/modal";
import { StatusBadge } from "@/components/status-badge";
import { EmergencyCard } from "@/components/support";
import { useToast } from "@/components/toast";
import { Alert, Button, Card, Chip, cn, Field, Input, PageSkeleton, Textarea } from "@/components/ui";
import { api, ApiError, errorMessage } from "@/lib/api";
import { useConfig, usePollMs, useRules } from "@/lib/config";
import { ACTIVE_STATUSES, CANCELLED_BY_PRO_VIEW } from "@/lib/constants";
import { displayPhone, durationLabel, formatDateTime, formatINR, formatTime, telLink } from "@/lib/format";
import { useApi, useNow } from "@/lib/hooks";
import { useT } from "@/lib/i18n";
import type { ProBooking } from "@/lib/types";

const STARTABLE = ["assigned", "confirmed", "en_route"];
// The backend lets a professional hand a visit back only until they've set off.
const RELEASABLE = ["assigned", "confirmed"];

const VITALS: { key: string; label: string; placeholder: string; unit: string }[] = [
  { key: "BP", label: "Blood pressure", placeholder: "120/80", unit: "mmHg" },
  { key: "Pulse", label: "Pulse", placeholder: "76", unit: "bpm" },
  { key: "SpO2", label: "SpO₂", placeholder: "98", unit: "%" },
  { key: "Temp", label: "Temperature", placeholder: "98.6", unit: "°F" },
  { key: "Sugar", label: "Blood sugar", placeholder: "110", unit: "mg/dL" },
];

/** Accepted → On the way → Started → Completed, with the times we know. */
function VisitProgress({ booking }: { booking: ProBooking }) {
  const steps = [
    { label: "Accepted", at: booking.created_at, done: true },
    { label: "On the way", at: booking.en_route_at, done: !!booking.en_route_at || ["in_progress", "completed"].includes(booking.status) },
    { label: "Started", at: booking.started_at, done: !!booking.started_at },
    { label: "Completed", at: booking.completed_at, done: booking.status === "completed" },
  ];
  if (!ACTIVE_STATUSES.includes(booking.status) && booking.status !== "completed") return null;
  return (
    <ol className="grid grid-cols-4 gap-2">
      {steps.map((step, index) => (
        <li key={step.label} className="flex flex-col items-center text-center">
          <div className="flex w-full items-center">
            <span className={cn("h-0.5 flex-1", index === 0 ? "bg-transparent" : step.done ? "bg-brand-500" : "bg-slate-200")} />
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                step.done ? "bg-brand-600 text-white" : "bg-slate-200 text-slate-500",
              )}
            >
              {step.done ? <Icon name="check" className="size-4" /> : index + 1}
            </span>
            <span
              className={cn(
                "h-0.5 flex-1",
                index === steps.length - 1 ? "bg-transparent" : steps[index + 1].done ? "bg-brand-500" : "bg-slate-200",
              )}
            />
          </div>
          <span className={cn("mt-1.5 text-xs font-medium", step.done ? "text-slate-900" : "text-slate-400")}>{step.label}</span>
          {step.done && step.at && index > 0 && <span className="text-[11px] text-slate-500">{formatTime(step.at)}</span>}
        </li>
      ))}
    </ol>
  );
}

function CompleteVisitForm({ booking, onDone }: { booking: ProBooking; onDone: (b: ProBooking) => void }) {
  const toast = useToast();
  const [notes, setNotes] = useState("");
  const [vitals, setVitals] = useState<Record<string, string>>({});
  const [otherVitals, setOtherVitals] = useState("");
  const [saving, setSaving] = useState(false);

  const vitalsText = [
    ...VITALS.filter((v) => vitals[v.key]?.trim()).map((v) => `${v.key} ${vitals[v.key].trim()} ${v.unit}`),
    otherVitals.trim(),
  ]
    .filter(Boolean)
    .join(", ");

  async function complete() {
    setSaving(true);
    try {
      const updated = await api<ProBooking>(`/bookings/${booking.id}/check-out`, {
        method: "POST",
        body: { visit_summary_notes: notes.trim() || null, vitals_recorded: vitalsText || null },
      });
      toast.success(`Visit completed — ${formatINR(booking.earning_amount)} earned.`);
      onDone(updated);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-5">
      <h2 className="font-semibold text-slate-900">Finish the visit</h2>
      <p className="mt-1 text-sm text-slate-500">The patient and their family see your notes and vitals in their booking.</p>
      <div className="mt-4 space-y-5">
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">
            Vitals <span className="font-normal text-slate-400">(optional)</span>
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {VITALS.map((v) => (
              <label key={v.key} className="block">
                <span className="mb-1 block text-xs text-slate-500">
                  {v.label} ({v.unit})
                </span>
                <Input
                  inputMode="decimal"
                  placeholder={v.placeholder}
                  value={vitals[v.key] ?? ""}
                  onChange={(e) => setVitals((current) => ({ ...current, [v.key]: e.target.value }))}
                />
              </label>
            ))}
          </div>
          <Input
            className="mt-3"
            placeholder="Other readings, e.g. weight 64 kg"
            value={otherVitals}
            onChange={(e) => setOtherVitals(e.target.value)}
          />
        </div>
        <Field label="Visit notes" htmlFor="visit-notes" optional>
          <Textarea
            id="visit-notes"
            rows={3}
            maxLength={4000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What you did, how the patient is doing, anything to watch for."
          />
        </Field>
        <Button onClick={complete} loading={saving} icon="check">
          Mark visit completed
        </Button>
      </div>
    </Card>
  );
}

function ReleaseModal({
  booking,
  open,
  onClose,
}: {
  booking: ProBooking;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const reasons = useConfig("booking.cancel_reasons").professional;
  const [reason, setReason] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function release() {
    setSaving(true);
    try {
      // The release endpoint takes no body yet, so the reason only shapes this flow.
      await api(`/bookings/${booking.id}/release`, { method: "POST" });
      toast.success("Visit handed back. The patient will be matched with someone else.");
      onClose();
      router.replace("/pro/bookings");
    } catch (err) {
      toast.error(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Can't make this visit?"
      description="It goes back to other professionals nearby. Handing back visits often can affect the requests you get."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Keep the visit
          </Button>
          <Button variant="danger" onClick={release} loading={saving} disabled={!reason}>
            Hand it back
          </Button>
        </>
      }
    >
      <p className="mb-2 text-sm font-medium text-slate-700">What happened?</p>
      <div className="flex flex-wrap gap-2">
        {reasons.map((r) => (
          <Chip key={r} selected={reason === r} onClick={() => setReason(r)}>
            {r}
          </Chip>
        ))}
      </div>
    </Modal>
  );
}

export function ProBookingDetail() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const t = useT();
  const rules = useRules();
  const activeMs = usePollMs("active_booking");
  const [live, setLive] = useState(true);
  const { data: booking, error, mutate } = useApi<ProBooking>(`/bookings/professional/${id}`, {
    pollMs: live ? activeMs : undefined,
  });
  const isLive = booking ? ACTIVE_STATUSES.includes(booking.status) : true;
  if (live !== isLive) setLive(isLive);

  const [busy, setBusy] = useState<"start" | "en_route" | null>(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [releasing, setReleasing] = useState(false);
  const now = useNow();

  if (error && !booking) {
    return (
      <div className="space-y-4">
        <Alert tone="error">{error.message}</Alert>
        <Link href="/pro/bookings" className="text-sm font-semibold text-brand-700">
          ← Back to my visits
        </Link>
      </div>
    );
  }
  if (!booking) return <PageSkeleton />;

  const startsAt = Date.parse(booking.scheduled_start_at);
  const minutes = (Date.parse(booking.scheduled_end_at) - startsAt) / 60_000;
  const startable = STARTABLE.includes(booking.status);
  const earlyMs = rules.early_start_minutes * 60_000;
  const tooEarly = startable && startsAt - now > earlyMs;
  const hidden = booking.contact_hidden;
  const canCall = !hidden && !!booking.patient_phone && (ACTIVE_STATUSES.includes(booking.status) || booking.status === "completed");
  const directions =
    !hidden && booking.latitude !== null && booking.longitude !== null
      ? `https://www.google.com/maps/dir/?api=1&destination=${booking.latitude},${booking.longitude}`
      : null;
  const pinNeeded = booking.requires_visit_pin;

  async function setOff() {
    setBusy("en_route");
    try {
      mutate(await api<ProBooking>(`/bookings/${booking!.id}/en-route`, { method: "POST" }));
      toast.success("The patient has been told you're on the way.");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function start() {
    if (pinNeeded && !/^\d{4}$/.test(pin)) {
      setPinError("Enter the 4-digit PIN the patient shows you.");
      return;
    }
    setPinError(null);
    setBusy("start");
    try {
      mutate(
        await api<ProBooking>(`/bookings/${booking!.id}/check-in`, {
          method: "POST",
          body: pinNeeded ? { visit_pin: pin } : {},
        }),
      );
      setPin("");
      toast.success("Visit started.");
    } catch (err) {
      if (err instanceof ApiError && err.code === "visit_pin_invalid") {
        setPinError("That PIN doesn't match. Ask the patient to check the PIN in their Mendyr booking.");
      } else {
        toast.error(errorMessage(err));
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/pro/bookings" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800">
        <Icon name="chevronLeft" className="size-4" /> My visits
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{booking.service_name}</h1>
          <p className="mt-1 text-sm text-slate-500">Booking {booking.booking_code}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <StatusBadge status={booking.status} />
          <p className="text-sm font-semibold text-emerald-700">You earn {formatINR(booking.earning_amount)}</p>
        </div>
      </div>

      <VisitProgress booking={booking} />

      {booking.status === "cancelled" && (
        <Alert tone={booking.cancelled_by === "professional" ? "info" : "warning"} title={booking.cancelled_by ? CANCELLED_BY_PRO_VIEW[booking.cancelled_by] : "This booking was cancelled"}>
          {booking.cancellation_reason}
        </Alert>
      )}
      {booking.status === "no_show" && <Alert tone="warning" title="Marked as a missed visit" />}
      {booking.status === "failed" && <Alert tone="warning" title="This booking was closed" />}

      <Card className="divide-y divide-slate-100">
        <div className="flex gap-3 p-4">
          <Icon name="calendar" className="mt-0.5 size-5 shrink-0 text-slate-400" />
          <div>
            <p className="text-sm font-medium text-slate-900">{formatDateTime(booking.scheduled_start_at)}</p>
            <p className="text-sm text-slate-500">
              {durationLabel(minutes)} · {t("common.ist")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4">
          <Icon name="user" className="size-5 shrink-0 text-slate-400" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-900">
              {hidden ? `Patient ${booking.patient_ref}` : booking.patient_name}
            </p>
            {canCall && booking.patient_phone && <p className="text-sm text-slate-500">{displayPhone(booking.patient_phone)}</p>}
          </div>
          {canCall && booking.patient_phone && (
            <a
              href={telLink(booking.patient_phone)}
              className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white transition active:scale-[0.97] hover:bg-brand-700"
            >
              <Icon name="phone" className="size-4" /> {t("detail.call")}
            </a>
          )}
        </div>
        <div className="flex items-start gap-3 p-4">
          <Icon name="pin" className="mt-0.5 size-5 shrink-0 text-slate-400" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-900">{booking.address}</p>
            {!hidden && booking.landmark && <p className="text-sm text-slate-500">Landmark: {booking.landmark}</p>}
            {!hidden && booking.instructions && <p className="mt-1 text-sm text-slate-600">“{booking.instructions}”</p>}
          </div>
          {directions && ACTIVE_STATUSES.includes(booking.status) && (
            <a
              href={directions}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-700 transition active:scale-[0.97] hover:bg-slate-50"
            >
              <Icon name="navigation" className="size-4" /> Directions
            </a>
          )}
        </div>
        {booking.patient_notes && (
          <div className="flex gap-3 p-4">
            <Icon name="list" className="mt-0.5 size-5 shrink-0 text-slate-400" />
            <p className="whitespace-pre-line text-sm text-slate-700">{booking.patient_notes}</p>
          </div>
        )}
        {hidden && (
          <p className="flex items-center gap-2 p-4 text-xs text-slate-500">
            <Icon name="lock" className="size-4 shrink-0" />
            {t("detail.privacy")}
          </p>
        )}
      </Card>

      {startable && (
        <Card className="p-5">
          {booking.status !== "en_route" && (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-5">
              <div>
                <h2 className="font-semibold text-slate-900">Leaving for the visit?</h2>
                <p className="mt-0.5 text-sm text-slate-500">Let the patient know you&apos;re on your way.</p>
              </div>
              <Button variant="secondary" icon="route" loading={busy === "en_route"} disabled={busy !== null} onClick={setOff}>
                On my way
              </Button>
            </div>
          )}
          {booking.status === "en_route" && booking.en_route_at && (
            <p className="mb-4 flex items-center gap-2 text-sm text-teal-800">
              <Icon name="route" className="size-4" /> On the way since {formatTime(booking.en_route_at)}
            </p>
          )}
          <h2 className="font-semibold text-slate-900">Start the visit</h2>
          <p className="mt-1 text-sm text-slate-500">
            {tooEarly
              ? `You can start from ${rules.early_start_minutes / 60 >= 1 ? `${rules.early_start_minutes / 60} hours` : `${rules.early_start_minutes} minutes`} before — at ${formatTime(new Date(startsAt - earlyMs))}.`
              : pinNeeded
                ? "When you reach the patient, ask for the 4-digit visit PIN in their Mendyr booking."
                : "Tap start when you reach the patient."}
          </p>
          {pinNeeded && !tooEarly && (
            <div className="mt-4 max-w-xs">
              <label htmlFor="visit-pin" className="mb-1.5 block text-sm font-medium text-slate-700">
                Visit PIN
              </label>
              <Input
                id="visit-pin"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={4}
                placeholder="• • • •"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 4));
                  setPinError(null);
                }}
                className="text-center font-display text-2xl tracking-[0.5em]"
                aria-invalid={!!pinError}
              />
              {pinError && <p className="mt-1.5 text-sm text-red-600">{pinError}</p>}
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={start} loading={busy === "start"} disabled={tooEarly || busy !== null} icon="check">
              Start visit
            </Button>
            {RELEASABLE.includes(booking.status) && (
              <Button variant="dangerGhost" disabled={busy !== null} onClick={() => setReleasing(true)}>
                Can&apos;t make it
              </Button>
            )}
          </div>
        </Card>
      )}

      {booking.status === "in_progress" && <CompleteVisitForm booking={booking} onDone={mutate} />}

      {booking.status === "completed" && (
        <Card className="p-5">
          <h2 className="font-semibold text-slate-900">Visit completed</h2>
          {booking.completed_at && <p className="mt-1 text-sm text-slate-500">Finished {formatDateTime(booking.completed_at)}</p>}
          {booking.vitals_recorded && (
            <div className="mt-3 rounded-xl bg-teal-50/70 p-3.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">{t("detail.vitals")}</p>
              <p className="mt-1 whitespace-pre-line text-sm text-slate-800">{booking.vitals_recorded}</p>
            </div>
          )}
          {booking.visit_summary_notes && (
            <p className="mt-3 whitespace-pre-line text-sm text-slate-700">{booking.visit_summary_notes}</p>
          )}
        </Card>
      )}

      {ACTIVE_STATUSES.includes(booking.status) && <EmergencyCard compact />}

      <ReleaseModal booking={booking} open={releasing} onClose={() => setReleasing(false)} />
    </div>
  );
}
