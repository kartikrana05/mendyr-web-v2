"use client";

import { useMemo, useState } from "react";

import { AreaPicker, RadiusPicker } from "@/components/area-picker";
import { ProfessionIcon } from "@/components/brand";
import { Icon } from "@/components/icons";
import type { Coords } from "@/components/location";
import { Alert, Button, Card, Chip, cn, Field, Input, Textarea } from "@/components/ui";
import { slotsAreValid, WeeklySchedule } from "@/components/weekly-schedule";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { LANGUAGES, PROFESSIONS, registrationLabel } from "@/lib/constants";
import { formatINR } from "@/lib/format";
import { useApi } from "@/lib/hooks";
import type { AvailabilitySlot, ProfessionalProfile, ProfessionalType, Service } from "@/lib/types";

import { useProfessionalReload } from "../professional-context";

const STEPS = ["Profession", "Service area", "Services", "Timings"];
const COUNCIL_REGISTERED: ProfessionalType[] = ["nurse", "doctor", "physiotherapist"];

export default function OnboardingPage() {
  const { user } = useAuth();
  const reloadProfile = useProfessionalReload();
  const catalogue = useApi<Service[]>("/services");

  const [step, setStep] = useState(0);
  const [type, setType] = useState<ProfessionalType | null>(null);
  const [years, setYears] = useState("");
  const [registration, setRegistration] = useState("");
  const [languages, setLanguages] = useState<string[]>(["English", "Hindi"]);
  const [bio, setBio] = useState("");
  const [area, setArea] = useState<Coords | null>(null);
  const [radius, setRadius] = useState(10);
  const [deselected, setDeselected] = useState<string[]>([]);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const services = useMemo(
    () => (catalogue.data ?? []).filter((s) => s.required_professional_type === type),
    [catalogue.data, type],
  );
  const selectedIds = services.filter((s) => !deselected.includes(s.id)).map((s) => s.id);

  const stepError =
    step === 0 && !type
      ? "Choose your profession."
      : step === 0 && (Number(years) < 0 || Number(years) > 60)
        ? "Years of experience should be between 0 and 60."
        : step === 1 && !area
          ? "Set where you'll work from."
          : step === 2 && services.length > 0 && selectedIds.length === 0
            ? "Choose at least one service."
            : step === 3 && !slotsAreValid(slots)
              ? "Some timings end before they start."
              : null;

  function next() {
    if (stepError) {
      setError(stepError);
      return;
    }
    setError(null);
    if (step < STEPS.length - 1) setStep(step + 1);
    else void finish();
  }

  async function finish() {
    if (!type || !area) return;
    setSaving(true);
    setError(null);
    const isCouncil = COUNCIL_REGISTERED.includes(type);
    try {
      await api<ProfessionalProfile>("/professionals/onboard", {
        method: "POST",
        body: {
          professional_type: type,
          years_of_experience: Number(years) || 0,
          council_registration_number: isCouncil ? registration.trim() || null : null,
          license_number: isCouncil ? null : registration.trim() || null,
          languages_spoken: languages,
          bio: bio.trim() || null,
          location: { latitude: area.latitude, longitude: area.longitude },
          service_radius_km: radius,
          service_ids: selectedIds,
        },
      });
      if (slots.length > 0) {
        await api("/professionals/me/availability/slots", { method: "PUT", body: slots });
      }
      await reloadProfile(); // the layout sees the new profile and moves on to the dashboard
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <div>
      <p className="text-sm font-medium text-brand-700">Welcome, {user?.full_name.split(" ")[0]}</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Set up your professional profile</h1>
      <p className="mt-1 text-sm text-slate-500">Takes about two minutes. You can change all of this later.</p>

      <ol className="mt-6 grid grid-cols-4 gap-2">
        {STEPS.map((label, index) => (
          <li key={label}>
            <div className={cn("h-1.5 rounded-full", index <= step ? "bg-brand-600" : "bg-slate-200")} />
            <p className={cn("mt-1.5 text-xs font-medium", index === step ? "text-slate-900" : "text-slate-400")}>
              {label}
            </p>
          </li>
        ))}
      </ol>

      <Card className="mt-6 p-5 sm:p-6">
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-semibold text-slate-900">What&apos;s your profession?</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {PROFESSIONS.map((p) => (
                  <button
                    key={p.type}
                    type="button"
                    onClick={() => {
                      setType(p.type);
                      setDeselected([]);
                    }}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border p-3 text-left transition",
                      type === p.type
                        ? "border-brand-500 bg-brand-50/60 ring-1 ring-brand-500"
                        : "border-slate-200 hover:border-slate-300",
                    )}
                  >
                    <ProfessionIcon type={p.type} />
                    <span>
                      <span className="block text-sm font-semibold text-slate-900">{p.label}</span>
                      <span className="block text-xs text-slate-500">{p.blurb}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
            {type && (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Years of experience" htmlFor="years">
                    <Input
                      id="years"
                      type="number"
                      min={0}
                      max={60}
                      inputMode="numeric"
                      value={years}
                      onChange={(e) => setYears(e.target.value)}
                    />
                  </Field>
                  <Field label={registrationLabel(type)} htmlFor="registration" optional>
                    <Input id="registration" value={registration} onChange={(e) => setRegistration(e.target.value)} />
                  </Field>
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium text-slate-700">Languages you speak</p>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGES.map((language) => (
                      <Chip
                        key={language}
                        selected={languages.includes(language)}
                        onClick={() =>
                          setLanguages((current) =>
                            current.includes(language)
                              ? current.filter((l) => l !== language)
                              : [...current, language],
                          )
                        }
                      >
                        {language}
                      </Chip>
                    ))}
                  </div>
                </div>
                <Field label="About you" htmlFor="bio" optional hint="Shown to patients after you accept their booking.">
                  <Textarea
                    id="bio"
                    rows={3}
                    maxLength={1000}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="e.g. ICU nurse at a city hospital, experienced in post-operative and elderly care."
                  />
                </Field>
              </>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-semibold text-slate-900">Where will you work from?</h2>
              <p className="mt-1 text-sm text-slate-500">
                Usually your home. You&apos;ll only see requests within your travel distance of this place.
              </p>
            </div>
            <AreaPicker value={area} onChange={setArea} />
            <RadiusPicker value={radius} onChange={setRadius} />
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="font-semibold text-slate-900">Which services will you offer?</h2>
            <p className="mt-1 text-sm text-slate-500">
              You&apos;ll get requests for these, and see your exact earning on each request.
            </p>
            {catalogue.loading ? (
              <div className="mt-4 h-24 animate-pulse rounded-xl bg-slate-100" />
            ) : services.length === 0 ? (
              <Alert tone="info" className="mt-4">
                We don&apos;t have services for your profession yet. You can finish signing up — we&apos;ll
                add them soon.
              </Alert>
            ) : (
              <div className="mt-4 space-y-2.5">
                {services.map((service) => {
                  const on = !deselected.includes(service.id);
                  return (
                    <label
                      key={service.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition",
                        on ? "border-brand-500 bg-brand-50/50" : "border-slate-200",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() =>
                          setDeselected((current) =>
                            on ? [...current, service.id] : current.filter((id) => id !== service.id),
                          )
                        }
                        className="size-4 accent-brand-600"
                      />
                      <span className="flex-1 text-sm font-medium text-slate-900">{service.name}</span>
                      <span className="text-sm text-slate-500">{formatINR(service.base_price)} / visit</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-semibold text-slate-900">When are you free to take visits?</h2>
              <p className="mt-1 text-sm text-slate-500">
                You&apos;ll only see requests that start in these hours. Leave it empty to see requests at
                any time.
              </p>
            </div>
            <WeeklySchedule slots={slots} onChange={setSlots} />
          </div>
        )}

        {error && (
          <Alert tone="error" className="mt-5">
            {error}
          </Alert>
        )}

        <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
          {step > 0 ? (
            <Button variant="ghost" icon="chevronLeft" onClick={() => setStep(step - 1)} disabled={saving}>
              Back
            </Button>
          ) : (
            <span />
          )}
          <Button onClick={next} loading={saving}>
            {step === STEPS.length - 1 ? "Finish setup" : "Continue"}
            {step < STEPS.length - 1 && <Icon name="arrowRight" className="size-4" />}
          </Button>
        </div>
      </Card>
    </div>
  );
}
