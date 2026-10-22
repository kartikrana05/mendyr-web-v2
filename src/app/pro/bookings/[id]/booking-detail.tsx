"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { Icon } from "@/components/icons";
import { StatusBadge } from "@/components/status-badge";
import { useToast } from "@/components/toast";
import { Alert, Button, Card, Field, PageSpinner, Textarea } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { displayPhone, durationLabel, formatDateTime, formatINR, formatTime } from "@/lib/format";
import { useApi, useNow } from "@/lib/hooks";
import type { ProBooking } from "@/lib/types";

const STARTABLE = ["assigned", "confirmed", "en_route"];
const EARLY_START_MS = 2 * 60 * 60 * 1000; // matches the backend's 2-hour window

function CompleteVisitForm({ booking, onDone }: { booking: ProBooking; onDone: (b: ProBooking) => void }) {
  const toast = useToast();
  const [notes, setNotes] = useState("");
  const [vitals, setVitals] = useState("");
  const [saving, setSaving] = useState(false);

  async function complete() {
    setSaving(true);
    try {
      const updated = await api<ProBooking>(`/bookings/${booking.id}/check-out`, {
        method: "POST",
        body: { visit_summary_notes: notes.trim() || null, vitals_recorded: vitals.trim() || null },
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
      <p className="mt-1 text-sm text-slate-500">The patient sees your notes in their booking.</p>
      <div className="mt-4 space-y-4">
        <Field label="Visit notes" htmlFor="visit-notes" optional>
          <Textarea
            id="visit-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What you did, how the patient is doing, anything to watch for."
          />
        </Field>
        <Field label="Vitals" htmlFor="vitals" optional>
          <Textarea
            id="vitals"
            rows={2}
            value={vitals}
            onChange={(e) => setVitals(e.target.value)}
            placeholder="e.g. BP 128/82, pulse 76, SpO2 97%, temp 98.4°F"
          />
        </Field>
        <Button onClick={complete} loading={saving} icon="check">
          Mark visit completed
        </Button>
      </div>
    </Card>
  );
}

export function ProBookingDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { data: booking, error, mutate } = useApi<ProBooking>(`/bookings/professional/${id}`);
  const [busy, setBusy] = useState<"start" | "release" | null>(null);
  const now = useNow();

  if (error && !booking) {
    return (
      <div className="space-y-4">
        <Alert tone="error">{error.message}</Alert>
        <Link href="/pro/bookings" className="text-sm font-semibold text-brand-700">
          ← Back to my bookings
        </Link>
      </div>
    );
  }
  if (!booking) return <PageSpinner />;

  const startsAt = Date.parse(booking.scheduled_start_at);
  const minutes = (Date.parse(booking.scheduled_end_at) - startsAt) / 60_000;
  const startable = STARTABLE.includes(booking.status);
  const tooEarly = startable && startsAt - now > EARLY_START_MS;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${booking.latitude},${booking.longitude}`;

  async function start() {
    setBusy("start");
    try {
      mutate(await api<ProBooking>(`/bookings/${booking!.id}/check-in`, { method: "POST" }));
      toast.success("Visit started.");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function release() {
    if (!window.confirm("Hand this booking back? It will be offered to other professionals.")) return;
    setBusy("release");
    try {
      await api(`/bookings/${booking!.id}/release`, { method: "POST" });
      toast.success("Booking handed back. The patient will be matched with someone else.");
      router.replace("/pro/bookings");
    } catch (err) {
      toast.error(errorMessage(err));
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/pro/bookings" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800">
        <Icon name="chevronLeft" className="size-4" /> My bookings
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

      <Card className="divide-y divide-slate-100">
        <div className="flex gap-3 p-4">
          <Icon name="calendar" className="mt-0.5 size-5 shrink-0 text-slate-400" />
          <div>
            <p className="text-sm font-medium text-slate-900">{formatDateTime(booking.scheduled_start_at)}</p>
            <p className="text-sm text-slate-500">{durationLabel(minutes)} · India time</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4">
          <Icon name="user" className="size-5 shrink-0 text-slate-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-900">{booking.patient_name}</p>
            <p className="text-sm text-slate-500">{displayPhone(booking.patient_phone)}</p>
          </div>
          <a
            href={`tel:${booking.patient_phone}`}
            className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <Icon name="phone" className="size-4" /> Call
          </a>
        </div>
        <div className="flex items-start gap-3 p-4">
          <Icon name="pin" className="mt-0.5 size-5 shrink-0 text-slate-400" />
          <div className="flex-1">
            <p className="text-sm text-slate-900">{booking.address}</p>
            {booking.landmark && <p className="text-sm text-slate-500">Landmark: {booking.landmark}</p>}
            {booking.instructions && <p className="mt-1 text-sm text-slate-600">“{booking.instructions}”</p>}
          </div>
          <a
            href={directions}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Icon name="navigation" className="size-4" /> Directions
          </a>
        </div>
        {booking.patient_notes && (
          <div className="flex gap-3 p-4">
            <Icon name="list" className="mt-0.5 size-5 shrink-0 text-slate-400" />
            <p className="whitespace-pre-line text-sm text-slate-700">{booking.patient_notes}</p>
          </div>
        )}
      </Card>

      {startable && (
        <Card className="p-5">
          <h2 className="font-semibold text-slate-900">Start the visit</h2>
          <p className="mt-1 text-sm text-slate-500">
            {tooEarly
              ? `You can start from 2 hours before — at ${formatTime(new Date(startsAt - EARLY_START_MS))} on the day.`
              : "Tap start when you reach the patient."}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={start} loading={busy === "start"} disabled={tooEarly || busy !== null} icon="check">
              Start visit
            </Button>
            <Button variant="dangerGhost" loading={busy === "release"} disabled={busy !== null} onClick={release}>
              Can&apos;t make it
            </Button>
          </div>
        </Card>
      )}

      {booking.status === "in_progress" && <CompleteVisitForm booking={booking} onDone={mutate} />}

      {booking.status === "completed" && (
        <Card className="p-5">
          <h2 className="font-semibold text-slate-900">Visit completed</h2>
          {booking.completed_at && (
            <p className="mt-1 text-sm text-slate-500">Finished at {formatDateTime(booking.completed_at)}</p>
          )}
          {booking.visit_summary_notes && (
            <p className="mt-3 whitespace-pre-line text-sm text-slate-700">{booking.visit_summary_notes}</p>
          )}
        </Card>
      )}

      {booking.status === "cancelled" && (
        <Alert tone="error" title="The patient cancelled this booking" />
      )}
    </div>
  );
}
