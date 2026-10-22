"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AddressForm, addressLine } from "@/components/address-form";
import { Icon } from "@/components/icons";
import { serviceCopy, useCatalog } from "@/components/service-catalog";
import { useToast } from "@/components/toast";
import { Alert, Button, Card, cn, PageHeader, Select, Textarea } from "@/components/ui";
import { api, errorMessage, query } from "@/lib/api";
import { PROFESSION_LABEL } from "@/lib/constants";
import { durationLabel, formatDateTime, formatINR, istDateKey, istIso, MARKET_TZ } from "@/lib/format";
import { useApi } from "@/lib/hooks";
import type { Address, Booking, NearbyProfessional, Quote } from "@/lib/types";

const FIRST_SLOT_HOUR = 6;
const LAST_SLOT_HOUR = 22;
const LEAD_MINUTES = 60; // earliest bookable time is an hour from now
const DAYS_SHOWN = 14;

const SLOTS = Array.from({ length: (LAST_SLOT_HOUR - FIRST_SLOT_HOUR) * 2 + 1 }, (_, i) => {
  const minutes = FIRST_SLOT_HOUR * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});

function slotsFor(dateKey: string, now: Date): string[] {
  const earliest = now.getTime() + LEAD_MINUTES * 60_000;
  return SLOTS.filter((slot) => new Date(istIso(dateKey, slot)).getTime() >= earliest);
}

function buildDates(now: Date) {
  const weekday = new Intl.DateTimeFormat("en-IN", { timeZone: MARKET_TZ, weekday: "short" });
  const day = new Intl.DateTimeFormat("en-IN", { timeZone: MARKET_TZ, day: "numeric" });
  const month = new Intl.DateTimeFormat("en-IN", { timeZone: MARKET_TZ, month: "short" });
  return Array.from({ length: DAYS_SHOWN }, (_, i) => {
    const date = new Date(now.getTime() + i * 86_400_000);
    return {
      key: istDateKey(date),
      label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : weekday.format(date),
      day: day.format(date),
      month: month.format(date),
    };
  });
}

function slotLabel(slot: string): string {
  const [h, m] = slot.split(":").map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}

function Step({
  number,
  title,
  optional,
  children,
}: {
  number: number;
  title: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <h2 className="mb-4 flex items-center gap-2.5 font-semibold text-slate-900">
        <span className="flex size-6 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
          {number}
        </span>
        {title}
        {optional && <span className="text-sm font-normal text-slate-400">(optional)</span>}
      </h2>
      {children}
    </Card>
  );
}

export function BookingFlow() {
  const router = useRouter();
  const toast = useToast();
  const { groups } = useCatalog();
  const services = useMemo(() => groups?.flatMap((g) => g.services) ?? [], [groups]);

  const [serviceId, setServiceId] = useState<string | null>(useSearchParams().get("service"));
  const service = services.find((s) => s.id === serviceId) ?? null;

  const addresses = useApi<Address[]>("/addresses");
  const addressList = addresses.data ?? [];
  const [pickedAddressId, setPickedAddressId] = useState<string | null>(null);
  const addressId =
    pickedAddressId ?? addressList.find((a) => a.is_default)?.id ?? addressList[0]?.id ?? null;
  const address = addressList.find((a) => a.id === addressId) ?? null;
  const [addingAddress, setAddingAddress] = useState(false);
  const showAddressForm = addingAddress || (addresses.data !== undefined && addressList.length === 0);

  const [now] = useState(() => new Date());
  const dates = useMemo(() => buildDates(now), [now]);
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const dateKey = pickedDate ?? dates.find((d) => slotsFor(d.key, now).length > 0)?.key ?? dates[1].key;
  const slots = slotsFor(dateKey, now);
  const [pickedTime, setPickedTime] = useState<string | null>(null);
  const time = pickedTime && slots.includes(pickedTime) ? pickedTime : null;
  const scheduledAt = time ? istIso(dateKey, time) : null;

  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Price preview for the chosen service (POST, so not via useApi).
  const [quoted, setQuoted] = useState<{ serviceId: string; quote: Quote } | null>(null);
  useEffect(() => {
    if (!serviceId) return;
    let active = true;
    api<Quote>("/bookings/quote", { method: "POST", body: { service_id: serviceId } })
      .then((quote) => active && setQuoted({ serviceId, quote }))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [serviceId]);
  const quote = quoted?.serviceId === serviceId ? quoted.quote : null;

  const nearby = useApi<NearbyProfessional[]>(
    serviceId && addressId
      ? `/professionals/nearby${query({ service_id: serviceId, address_id: addressId, scheduled_at: scheduledAt })}`
      : null,
  );

  const missing = !service
    ? "Choose a service"
    : !address
      ? "Add an address"
      : !scheduledAt
        ? "Pick a time"
        : null;

  async function confirm() {
    if (missing || !service || !address || !scheduledAt) return;
    setSubmitting(true);
    setError(null);
    try {
      const booking = await api<Booking>("/bookings", {
        method: "POST",
        body: {
          service_id: service.id,
          address_id: address.id,
          scheduled_start_at: scheduledAt,
          patient_notes: notes.trim() || null,
        },
      });
      toast.success("Booking requested — we're finding a professional near you.");
      // This page stays mounted (hidden) after navigating away; leave it fresh for next time.
      setPickedTime(null);
      setNotes("");
      router.push(`/patient/bookings/${booking.id}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const gstPct = quote && quote.base_price > 0 ? Math.round((quote.tax_amount / (quote.base_price - quote.discount_amount)) * 100) : 18;

  return (
    <div>
      <PageHeader title="Book a visit" subtitle="It takes about a minute. You pay after the visit." />
      {/* grid-cols-1 is minmax(0, 1fr): without it the single mobile column grows to fit
          the scrolling row of date chips and the page overflows sideways. */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          <Step number={1} title="Service">
            <Select
              aria-label="Service"
              value={serviceId ?? ""}
              onChange={(e) => setServiceId(e.target.value || null)}
            >
              <option value="">Choose a service…</option>
              {groups?.map(({ category, services: inCategory }) => (
                <optgroup key={category.id} label={category.name}>
                  {inCategory.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {formatINR(s.base_price)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
            {service && (
              <p className="mt-3 text-sm text-slate-600">
                <span className="font-medium text-slate-800">
                  {PROFESSION_LABEL[service.required_professional_type]} ·{" "}
                  {durationLabel(service.duration_minutes)}.
                </span>{" "}
                {serviceCopy(service)}
              </p>
            )}
          </Step>

          <Step number={2} title="Address">
            {addresses.loading ? (
              <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
            ) : (
              <div className="space-y-2.5">
                {addressList.map((a) => (
                  <label
                    key={a.id}
                    className={cn(
                      "flex cursor-pointer gap-3 rounded-xl border p-3.5 transition",
                      a.id === addressId
                        ? "border-brand-500 bg-brand-50/60 ring-1 ring-brand-500"
                        : "border-slate-200 hover:border-slate-300",
                    )}
                  >
                    <input
                      type="radio"
                      name="address"
                      checked={a.id === addressId}
                      onChange={() => setPickedAddressId(a.id)}
                      className="mt-1 accent-brand-600"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold capitalize text-slate-900">{a.label}</span>
                      <span className="block text-sm text-slate-600">{addressLine(a)}</span>
                      {a.contact_name && (
                        <span className="mt-0.5 block text-xs text-slate-500">For {a.contact_name}</span>
                      )}
                    </span>
                  </label>
                ))}
                {showAddressForm ? (
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="mb-3 text-sm font-semibold text-slate-900">New address</p>
                    <AddressForm
                      makeDefault={addressList.length === 0}
                      onSaved={(saved) => {
                        addresses.mutate([...addressList, saved]);
                        setPickedAddressId(saved.id);
                        setAddingAddress(false);
                      }}
                      onCancel={addressList.length > 0 ? () => setAddingAddress(false) : undefined}
                    />
                  </div>
                ) : (
                  <Button variant="ghost" size="sm" icon="plus" onClick={() => setAddingAddress(true)}>
                    Add a new address
                  </Button>
                )}
              </div>
            )}
          </Step>

          <Step number={3} title="Date & time">
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
              {dates.map((d) => {
                const full = slotsFor(d.key, now).length === 0;
                return (
                  <button
                    key={d.key}
                    type="button"
                    disabled={full}
                    onClick={() => setPickedDate(d.key)}
                    className={cn(
                      "flex w-16 shrink-0 flex-col items-center rounded-xl border py-2 text-xs transition disabled:opacity-40",
                      d.key === dateKey
                        ? "border-brand-600 bg-brand-600 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                    )}
                  >
                    <span className="font-medium">{d.label}</span>
                    <span className="text-lg font-bold leading-tight">{d.day}</span>
                    <span>{d.month}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {slots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setPickedTime(slot)}
                  className={cn(
                    "h-10 rounded-lg border text-sm font-medium transition",
                    slot === time
                      ? "border-brand-600 bg-brand-600 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                  )}
                >
                  {slotLabel(slot)}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-500">Times are India time (IST).</p>
          </Step>

          <Step number={4} title="Notes for the professional" optional>
            <Textarea
              value={notes}
              maxLength={1000}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. 72-year-old father, dressing change after knee surgery. Bring gloves and gauze."
            />
          </Step>
        </div>

        <Card className="p-5 lg:sticky lg:top-24">
          <h2 className="font-semibold text-slate-900">Summary</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex gap-3">
              <Icon name="list" className="size-4 shrink-0 text-slate-400" />
              <dd className={service ? "text-slate-800" : "text-slate-400"}>{service?.name ?? "No service chosen"}</dd>
            </div>
            <div className="flex gap-3">
              <Icon name="calendar" className="size-4 shrink-0 text-slate-400" />
              <dd className={scheduledAt ? "text-slate-800" : "text-slate-400"}>
                {scheduledAt ? formatDateTime(scheduledAt) : "No time picked"}
              </dd>
            </div>
            <div className="flex gap-3">
              <Icon name="pin" className="size-4 shrink-0 text-slate-400" />
              <dd className={address ? "text-slate-800" : "text-slate-400"}>
                {address ? addressLine(address) : "No address"}
              </dd>
            </div>
          </dl>

          {quote && (
            <dl className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm">
              <div className="flex justify-between text-slate-600">
                <dt>Visit charge</dt>
                <dd>{formatINR(quote.base_price)}</dd>
              </div>
              {quote.discount_amount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <dt>Discount</dt>
                  <dd>−{formatINR(quote.discount_amount)}</dd>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <dt>GST ({gstPct}%)</dt>
                <dd>{formatINR(quote.tax_amount)}</dd>
              </div>
              <div className="flex justify-between pt-1 text-base font-bold text-slate-900">
                <dt>Total</dt>
                <dd>{formatINR(quote.total_amount)}</dd>
              </div>
              <p className="flex items-center gap-1.5 pt-1 text-xs text-slate-500">
                <Icon name="shield" className="size-3.5" /> Pay after the visit — nothing to pay now.
              </p>
            </dl>
          )}

          {nearby.data && (
            <p
              className={cn(
                "mt-4 rounded-lg px-3 py-2 text-sm",
                nearby.data.length > 0 ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800",
              )}
            >
              {nearby.data.length > 0
                ? `${nearby.data.length} ${nearby.data.length === 1 ? "professional" : "professionals"} ${
                    scheduledAt ? "available near you at this time" : "serve your area"
                  }`
                : scheduledAt
                  ? "No one near you is available at this time yet — you can still send the request."
                  : "No professionals serve this area yet — you can still send a request."}
            </p>
          )}

          {error && (
            <Alert tone="error" className="mt-4">
              {error}
            </Alert>
          )}
          <Button className="mt-5 w-full" size="lg" disabled={!!missing} loading={submitting} onClick={confirm}>
            {missing ?? "Confirm booking"}
          </Button>
        </Card>
      </div>
    </div>
  );
}
