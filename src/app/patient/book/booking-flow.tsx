"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AddressForm, addressLine } from "@/components/address-form";
import { DocumentChooser, MedicalUploadForm } from "@/components/documents";
import { Icon, type IconName } from "@/components/icons";
import { serviceCopy, useCatalog } from "@/components/service-catalog";
import { RatingPill, ServiceImage } from "@/components/service-visual";
import { useToast } from "@/components/toast";
import { Alert, Badge, Button, Card, Chip, cn, Input, Skeleton, Switch, Textarea } from "@/components/ui";
import { api, ApiError, errorMessage, query } from "@/lib/api";
import { type BookingRules, useConfigRefresh, useFeature, useRules } from "@/lib/config";
import { PROFESSION_LABEL } from "@/lib/constants";
import { VIEW_URL_REFRESH_MS } from "@/lib/documents";
import { durationLabel, formatDateTime, formatINR, istDateKey, istIso, MARKET_TZ } from "@/lib/format";
import { useApi } from "@/lib/hooks";
import { type Translate, useT } from "@/lib/i18n";
import type { Address, Booking, MedicalDocument, NearbyProfessional, Quote, Service } from "@/lib/types";

// ── Slots, from `booking.rules` (the server enforces the same lead time and horizon) ──

function slotTimes(rules: BookingRules): string[] {
  const out: string[] = [];
  for (let m = rules.slot_start_hour * 60; m < rules.slot_end_hour * 60; m += rules.slot_step_minutes) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  }
  return out;
}

function slotsFor(dateKey: string, now: Date, rules: BookingRules): string[] {
  const earliest = now.getTime() + rules.min_lead_minutes * 60_000;
  const latest = now.getTime() + rules.horizon_days * 86_400_000;
  return slotTimes(rules).filter((slot) => {
    const at = new Date(istIso(dateKey, slot)).getTime();
    return at >= earliest && at <= latest;
  });
}

function buildDates(now: Date, rules: BookingRules, t: Translate) {
  const weekday = new Intl.DateTimeFormat("en-IN", { timeZone: MARKET_TZ, weekday: "short" });
  const day = new Intl.DateTimeFormat("en-IN", { timeZone: MARKET_TZ, day: "numeric" });
  const month = new Intl.DateTimeFormat("en-IN", { timeZone: MARKET_TZ, month: "short" });
  return Array.from({ length: rules.horizon_days + 1 }, (_, i) => {
    const date = new Date(now.getTime() + i * 86_400_000);
    return {
      key: istDateKey(date),
      label: i === 0 ? t("common.today") : i === 1 ? t("common.tomorrow") : weekday.format(date),
      day: day.format(date),
      month: month.format(date),
    };
  }).filter((d) => slotsFor(d.key, now, rules).length > 0);
}

function slotLabel(slot: string): string {
  const [h, m] = slot.split(":").map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

const DAYPARTS: { label: string; icon: IconName; from: number; to: number }[] = [
  { label: "Morning", icon: "sparkles", from: 0, to: 12 },
  { label: "Afternoon", icon: "clock", from: 12, to: 17 },
  { label: "Evening", icon: "clock", from: 17, to: 24 },
];

// ── Steps ────────────────────────────────────────────────────────────────

type StepKey = "service" | "when" | "where" | "details" | "review";
const STEPS: { key: StepKey; label: Parameters<Translate>[0] }[] = [
  { key: "service", label: "book.step.service" },
  { key: "when", label: "book.step.when" },
  { key: "where", label: "book.step.where" },
  { key: "details", label: "book.step.details" },
  { key: "review", label: "book.step.review" },
];

function Stepper({
  current,
  done,
  onPick,
}: {
  current: number;
  done: (index: number) => boolean;
  onPick: (index: number) => void;
}) {
  const t = useT();
  return (
    <ol className="no-scrollbar -mx-4 mb-6 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      {STEPS.map((step, index) => {
        const reachable = index <= current || STEPS.slice(0, index).every((_, i) => done(i));
        const active = index === current;
        return (
          <li key={step.key} className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              disabled={!reachable}
              onClick={() => onPick(index)}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-full px-3 text-sm font-medium transition duration-150",
                active ? "bg-brand-600 text-white" : reachable ? "text-slate-700 hover:bg-slate-100" : "text-slate-400",
              )}
            >
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full text-[11px] font-bold",
                  active ? "bg-white/20" : done(index) ? "bg-brand-100 text-brand-700" : "bg-slate-200 text-slate-500",
                )}
              >
                {done(index) && !active ? <Icon name="check" className="size-3" /> : index + 1}
              </span>
              {t(step.label)}
            </button>
            {index < STEPS.length - 1 && <Icon name="chevronRight" className="size-4 text-slate-300" />}
          </li>
        );
      })}
    </ol>
  );
}

function ServiceStep({
  groups,
  selected,
  onSelect,
}: {
  groups: ReturnType<typeof useCatalog>["groups"];
  selected: string | null;
  onSelect: (service: Service) => void;
}) {
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  if (!groups) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-(--radius-card)" />
        ))}
      </div>
    );
  }
  const needle = search.trim().toLowerCase();
  const visible = groups
    .filter((g) => !category || g.category.id === category)
    .map((g) => ({
      ...g,
      services: g.services.filter(
        (s) => !needle || s.name.toLowerCase().includes(needle) || (s.tagline ?? "").toLowerCase().includes(needle),
      ),
    }))
    .filter((g) => g.services.length > 0);

  return (
    <div>
      <Input
        type="search"
        placeholder="Search services — e.g. injection, physiotherapy"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Search services"
      />
      <div className="no-scrollbar -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
        <Chip selected={category === null} onClick={() => setCategory(null)}>
          All
        </Chip>
        {groups.map(({ category: c }) => (
          <Chip key={c.id} selected={category === c.id} onClick={() => setCategory(c.id)}>
            {c.name}
          </Chip>
        ))}
      </div>
      <div className="mt-4 space-y-6">
        {visible.length === 0 && <p className="text-sm text-slate-500">No services match “{search}”.</p>}
        {visible.map(({ category: c, services }) => (
          <div key={c.id}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{c.name}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {services.map((service) => {
                const active = service.id === selected;
                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => onSelect(service)}
                    aria-pressed={active}
                    className={cn(
                      "flex items-start gap-3 rounded-(--radius-card) border bg-white p-3 text-left transition duration-150 ease-out active:scale-[0.98]",
                      active ? "border-brand-500 ring-2 ring-brand-500/30" : "border-slate-200 hover:border-slate-300",
                    )}
                  >
                    <ServiceImage service={service} className="size-16 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold leading-snug text-slate-900">{service.name}</span>
                        {active && <Icon name="check" className="size-5 shrink-0 text-brand-600" />}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {PROFESSION_LABEL[service.required_professional_type]} · {durationLabel(service.duration_minutes)}
                      </span>
                      <span className="mt-1.5 flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{formatINR(service.base_price)}</span>
                        {service.badge && <Badge tone="brand">{service.badge}</Badge>}
                        <RatingPill avg={service.rating_avg} count={service.rating_count} />
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Flow ─────────────────────────────────────────────────────────────────

export function BookingFlow() {
  const router = useRouter();
  const toast = useToast();
  const t = useT();
  const rules = useRules();
  const genderPref = useFeature("gender_preference");
  const docsOn = useFeature("prescription_upload");
  const refreshConfig = useConfigRefresh();
  const { groups } = useCatalog();
  const services = useMemo(() => groups?.flatMap((g) => g.services) ?? [], [groups]);

  const initialService = useSearchParams().get("service");
  const [serviceId, setServiceId] = useState<string | null>(initialService);
  const service = services.find((s) => s.id === serviceId) ?? null;
  const [step, setStep] = useState(initialService ? 1 : 0);

  const addresses = useApi<Address[]>("/addresses");
  const addressList = addresses.data ?? [];
  const [pickedAddressId, setPickedAddressId] = useState<string | null>(null);
  const addressId = pickedAddressId ?? addressList.find((a) => a.is_default)?.id ?? addressList[0]?.id ?? null;
  const address = addressList.find((a) => a.id === addressId) ?? null;
  const [addingAddress, setAddingAddress] = useState(false);
  const showAddressForm = addingAddress || (addresses.data !== undefined && addressList.length === 0);

  const [now] = useState(() => new Date());
  const dates = useMemo(() => buildDates(now, rules, t), [now, rules, t]);
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const dateKey = pickedDate && dates.some((d) => d.key === pickedDate) ? pickedDate : (dates[0]?.key ?? null);
  const slots = dateKey ? slotsFor(dateKey, now, rules) : [];
  const [pickedTime, setPickedTime] = useState<string | null>(null);
  const time = pickedTime && slots.includes(pickedTime) ? pickedTime : null;
  const scheduledAt = dateKey && time ? istIso(dateKey, time) : null;

  // Prescriptions/reports to attach: only ones not already on another booking.
  const myDocs = useApi<MedicalDocument[]>(docsOn ? "/medical-documents" : null, { pollMs: VIEW_URL_REFRESH_MS });
  const freeDocs = (myDocs.data ?? []).filter((d) => d.booking_id === null);
  const [docIds, setDocIds] = useState<string[]>([]);
  const chosenDocs = docsOn ? freeDocs.filter((d) => docIds.includes(d.id)) : [];
  const [uploadingNew, setUploadingNew] = useState(false);
  const needsPrescription = docsOn && !!service?.requires_prescription;
  const hasPrescription = chosenDocs.some((d) => d.document_type === "prescription");

  const [preferFemale, setPreferFemale] = useState(false);
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
  // Patients pay base − discount + GST. `platform_fee` is Mendyr's cut of the professional's
  // payout, so it never appears here.
  const total = quote ? quote.base_price - quote.discount_amount + quote.tax_amount : null;
  const gstPct =
    quote && quote.base_price - quote.discount_amount > 0
      ? Math.round((quote.tax_amount / (quote.base_price - quote.discount_amount)) * 100)
      : null;

  const nearby = useApi<NearbyProfessional[]>(
    serviceId && addressId
      ? `/professionals/nearby${query({ service_id: serviceId, address_id: addressId, scheduled_at: scheduledAt })}`
      : null,
  );

  const done = (index: number) =>
    [!!service, !!scheduledAt, !!address, !needsPrescription || hasPrescription, false][index] ?? false;
  const canContinue = done(step);

  function go(index: number) {
    setStep(index);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function confirm() {
    if (!service || !address || !scheduledAt) return;
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
          ...(genderPref ? { preferred_gender: preferFemale ? "female" : null } : {}),
          ...(chosenDocs.length ? { document_ids: chosenDocs.map((d) => d.id) } : {}),
        },
      });
      toast.success(t("book.success"));
      // This page stays mounted (hidden) after navigating away; leave it fresh for next time.
      setPickedTime(null);
      setNotes("");
      setDocIds([]);
      setUploadingNew(false);
      setStep(0);
      router.push(`/patient/bookings/${booking.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.code === "prescription_required") {
        // The service needs a prescription (our copy of the flags may have been stale).
        toast.error(err.message);
        void refreshConfig();
        go(3);
      } else {
        setError(errorMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  }

  const summaryRows: { icon: IconName; value: string | null; empty: string; step: number }[] = [
    { icon: "list", value: service?.name ?? null, empty: "No service chosen", step: 0 },
    { icon: "calendar", value: scheduledAt ? formatDateTime(scheduledAt) : null, empty: "No time picked", step: 1 },
    { icon: "pin", value: address ? addressLine(address) : null, empty: "No address", step: 2 },
  ];

  const priceBlock = quote && total !== null && (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between text-slate-600">
        <dt>{t("book.visitCharge")}</dt>
        <dd>{formatINR(quote.base_price)}</dd>
      </div>
      {quote.discount_amount > 0 && (
        <div className="flex justify-between text-emerald-700">
          <dt>{t("book.discount")}</dt>
          <dd>−{formatINR(quote.discount_amount)}</dd>
        </div>
      )}
      <div className="flex justify-between text-slate-600">
        <dt>
          {t("book.gst")}
          {gstPct !== null && ` (${gstPct}%)`}
        </dt>
        <dd>{formatINR(quote.tax_amount)}</dd>
      </div>
      <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-bold text-slate-900">
        <dt>{t("book.total")}</dt>
        <dd>{formatINR(total)}</dd>
      </div>
    </dl>
  );

  const nearbyNote = nearby.data && (
    <p
      className={cn(
        "rounded-lg px-3 py-2 text-sm",
        nearby.data.length > 0 ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800",
      )}
    >
      {nearby.data.length > 0
        ? `${nearby.data.length} verified ${nearby.data.length === 1 ? "professional" : "professionals"} ${
            scheduledAt ? "available near you at this time" : "serve your area"
          }`
        : scheduledAt
          ? "No one near you is free at this time yet — you can still send the request."
          : "No professionals serve this area yet — you can still send a request."}
    </p>
  );

  const current = STEPS[step].key;

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t("book.title")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("book.subtitle")}</p>
      </div>
      <Stepper current={step} done={done} onPick={go} />

      {/* grid-cols-1 is minmax(0, 1fr): without it the single mobile column grows to fit
          the scrolling rows and the page overflows sideways. */}
      <div className="grid grid-cols-1 items-start gap-6 pb-24 lg:grid-cols-[minmax(0,1fr)_340px] lg:pb-0">
        <Card key={current} className="animate-rise min-w-0 p-5">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">{t(STEPS[step].label)}</h2>

          {current === "service" && (
            <ServiceStep
              groups={groups}
              selected={serviceId}
              onSelect={(s) => {
                setServiceId(s.id);
                go(1);
              }}
            />
          )}

          {current === "when" && (
            <div>
              {service && (
                <p className="mb-4 text-sm text-slate-600">
                  <span className="font-medium text-slate-800">{service.name}</span> · {durationLabel(service.duration_minutes)}
                </p>
              )}
              <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
                {dates.map((d) => (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => setPickedDate(d.key)}
                    className={cn(
                      "flex w-16 shrink-0 flex-col items-center rounded-xl border py-2 text-xs transition duration-150 active:scale-[0.97]",
                      d.key === dateKey
                        ? "border-brand-600 bg-brand-600 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                    )}
                  >
                    <span className="font-medium">{d.label}</span>
                    <span className="text-lg font-bold leading-tight">{d.day}</span>
                    <span>{d.month}</span>
                  </button>
                ))}
              </div>
              {slots.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">{t("book.noSlots")}</p>
              ) : (
                <div className="mt-4 space-y-4">
                  {DAYPARTS.map((part) => {
                    const inPart = slots.filter((s) => {
                      const h = Number(s.slice(0, 2));
                      return h >= part.from && h < part.to;
                    });
                    if (inPart.length === 0) return null;
                    return (
                      <div key={part.label}>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{part.label}</p>
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-6">
                          {inPart.map((slot) => (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => setPickedTime(slot)}
                              className={cn(
                                "h-10 rounded-lg border text-sm font-medium transition duration-150 active:scale-[0.97]",
                                slot === time
                                  ? "border-brand-600 bg-brand-600 text-white"
                                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                              )}
                            >
                              {slotLabel(slot)}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <p className="mt-4 text-xs text-slate-500">
                Times are {t("common.ist")}. Book at least {rules.min_lead_minutes} minutes ahead, up to {rules.horizon_days}{" "}
                days out.
              </p>
            </div>
          )}

          {current === "where" && (
            <div>
              {addresses.loading ? (
                <Skeleton className="h-16" />
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
                          <span className="mt-0.5 block text-xs text-slate-500">
                            For {a.contact_name}
                            {a.contact_phone ? ` · ${a.contact_phone}` : ""}
                          </span>
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
              <p className="mt-4 text-xs text-slate-500">
                Booking for a parent or relative? Add their address with their name and number — the professional
                will contact them.
              </p>
            </div>
          )}

          {current === "details" && (
            <div className="space-y-5">
              {docsOn && (
                <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <Icon name="file" className="size-4 text-brand-600" /> {t("book.docs.title")}
                      {!needsPrescription && <span className="font-normal text-slate-400">(optional)</span>}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">{t("book.docs.body")}</p>
                  </div>
                  {needsPrescription && !hasPrescription && service && (
                    <Alert tone="warning">{t("book.docs.required", { service: service.name })}</Alert>
                  )}
                  {myDocs.loading && <Skeleton className="h-14" />}
                  {freeDocs.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{t("book.docs.saved")}</p>
                      <DocumentChooser
                        docs={freeDocs}
                        selected={docIds}
                        onToggle={(id) =>
                          setDocIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]))
                        }
                      />
                    </div>
                  )}
                  {uploadingNew || (myDocs.data !== undefined && freeDocs.length === 0) ? (
                    <div className="rounded-xl bg-slate-50 p-4">
                      <MedicalUploadForm
                        onUploaded={(doc) => {
                          myDocs.mutate([doc, ...(myDocs.data ?? [])]);
                          setDocIds((current) => [...current, doc.id]);
                          setUploadingNew(false);
                        }}
                      />
                    </div>
                  ) : (
                    myDocs.data !== undefined && (
                      <Button variant="ghost" size="sm" icon="plus" onClick={() => setUploadingNew(true)}>
                        {t("book.docs.uploadNew")}
                      </Button>
                    )
                  )}
                </div>
              )}
              {genderPref && (
                <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 p-4">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <Icon name="female" className="size-4 text-brand-600" /> {t("book.femalePref")}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">{t("book.femalePrefBody")}</p>
                  </div>
                  <Switch checked={preferFemale} onChange={setPreferFemale} label={t("book.femalePref")} />
                </div>
              )}
              <div>
                <label htmlFor="booking-notes" className="mb-1.5 block text-sm font-medium text-slate-700">
                  {t("book.notes")} <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <Textarea
                  id="booking-notes"
                  value={notes}
                  maxLength={1000}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("book.notesPlaceholder")}
                />
              </div>
            </div>
          )}

          {current === "review" && (
            <div className="space-y-5">
              <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {summaryRows.map((row) => (
                  <div key={row.icon} className="flex items-start gap-3 p-3.5">
                    <Icon name={row.icon} className="mt-0.5 size-4 shrink-0 text-slate-400" />
                    <dd className={cn("min-w-0 flex-1 text-sm", row.value ? "text-slate-800" : "text-slate-400")}>
                      {row.value ?? row.empty}
                    </dd>
                    <button type="button" onClick={() => go(row.step)} className="text-sm font-semibold text-brand-700">
                      Change
                    </button>
                  </div>
                ))}
                {genderPref && preferFemale && (
                  <div className="flex items-center gap-3 p-3.5 text-sm text-slate-800">
                    <Icon name="female" className="size-4 text-slate-400" /> Female professional preferred
                  </div>
                )}
                {chosenDocs.length > 0 && (
                  <div className="flex items-center gap-3 p-3.5 text-sm text-slate-800">
                    <Icon name="file" className="size-4 shrink-0 text-slate-400" />
                    <span className="min-w-0 flex-1">{t("book.docs.count", { count: chosenDocs.length })}</span>
                    <button type="button" onClick={() => go(3)} className="text-sm font-semibold text-brand-700">
                      Change
                    </button>
                  </div>
                )}
                {notes.trim() && (
                  <div className="flex items-start gap-3 p-3.5 text-sm text-slate-700">
                    <Icon name="message" className="mt-0.5 size-4 shrink-0 text-slate-400" />
                    <span className="whitespace-pre-line">{notes.trim()}</span>
                  </div>
                )}
              </dl>
              {service && <p className="text-sm text-slate-600">{serviceCopy(service)}</p>}
              {priceBlock}
              <p className="flex items-center gap-2 rounded-xl bg-brand-50 px-3.5 py-3 text-sm font-medium text-brand-900">
                <Icon name="wallet" className="size-4 shrink-0" /> {t("common.payAfter")}
              </p>
              {nearbyNote}
              {error && <Alert tone="error">{error}</Alert>}
            </div>
          )}

          <div className="mt-6 hidden items-center justify-between gap-3 lg:flex">
            {step > 0 ? (
              <Button variant="ghost" icon="chevronLeft" onClick={() => go(step - 1)}>
                {t("common.back")}
              </Button>
            ) : (
              <span />
            )}
            {current === "review" ? (
              <Button size="lg" loading={submitting} disabled={!service || !address || !scheduledAt} onClick={confirm}>
                {t("book.confirm")}
              </Button>
            ) : (
              <Button size="lg" disabled={!canContinue} onClick={() => go(step + 1)}>
                {t("book.continue")}
              </Button>
            )}
          </div>
        </Card>

        <Card className="hidden p-5 lg:sticky lg:top-24 lg:block">
          <h2 className="font-semibold text-slate-900">Summary</h2>
          <dl className="mt-4 space-y-3 text-sm">
            {summaryRows.map((row) => (
              <div key={row.icon} className="flex gap-3">
                <Icon name={row.icon} className="size-4 shrink-0 text-slate-400" />
                <dd className={row.value ? "text-slate-800" : "text-slate-400"}>{row.value ?? row.empty}</dd>
              </div>
            ))}
          </dl>
          {priceBlock && <div className="mt-5 border-t border-slate-100 pt-4">{priceBlock}</div>}
          <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
            <Icon name="shield" className="size-3.5" /> {t("common.payAfter")}
          </p>
          {nearbyNote && <div className="mt-4">{nearbyNote}</div>}
        </Card>
      </div>

      {/* Phone action bar */}
      <div className="fixed inset-x-0 bottom-16 z-20 border-t border-slate-200 bg-white px-4 py-3 sm:bottom-0 lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          {step > 0 && (
            <Button variant="outline" onClick={() => go(step - 1)} aria-label={t("common.back")}>
              <Icon name="chevronLeft" className="size-4" />
            </Button>
          )}
          <div className="min-w-0 flex-1">
            {total !== null ? (
              <>
                <p className="text-base font-bold text-slate-900">{formatINR(total)}</p>
                <p className="text-[11px] text-slate-500">incl. GST · pay after visit</p>
              </>
            ) : (
              <p className="truncate text-sm text-slate-500">{service?.name ?? "Choose a service"}</p>
            )}
          </div>
          {current === "review" ? (
            <Button loading={submitting} disabled={!service || !address || !scheduledAt} onClick={confirm}>
              {t("book.confirm")}
            </Button>
          ) : (
            <Button disabled={!canContinue} onClick={() => go(step + 1)}>
              {t("book.continue")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
