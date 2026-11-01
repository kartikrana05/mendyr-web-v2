"use client";

import { useState } from "react";

import { AreaPicker, RadiusPicker } from "@/components/area-picker";
import type { Coords } from "@/components/location";
import { Icon } from "@/components/icons";
import { LanguageSwitch } from "@/components/language-switch";
import { ProfileForm } from "@/components/profile-form";
import { useToast } from "@/components/toast";
import { Badge, Button, ButtonLink, Card, Chip, Field, Input, PageHeader, Switch, Textarea } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { useConfig } from "@/lib/config";
import { PROFESSION_LABEL, registrationLabel } from "@/lib/constants";
import { formatINR } from "@/lib/format";
import { useApi } from "@/lib/hooks";
import type { MyService, ProfessionalProfile } from "@/lib/types";

import { useProfessional } from "../professional-context";

function useSaveProfile() {
  const { setProfile } = useProfessional();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  async function save(body: Record<string, unknown>, message: string) {
    setSaving(true);
    try {
      setProfile(await api<ProfessionalProfile>("/professionals/me", { method: "PATCH", body }));
      toast.success(message);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }
  return { save, saving };
}

function ProfessionalDetails() {
  const { profile } = useProfessional();
  const { save, saving } = useSaveProfile();
  const council = ["nurse", "doctor", "physiotherapist"].includes(profile.professional_type);
  const [years, setYears] = useState(String(profile.years_of_experience));
  const [registration, setRegistration] = useState(
    (council ? profile.council_registration_number : profile.license_number) ?? "",
  );
  const [languages, setLanguages] = useState(profile.languages_spoken ?? []);
  const [bio, setBio] = useState(profile.bio ?? "");
  const offered = useConfig("pro.settings").languages;
  // Keep languages saved earlier selectable even if the portal list changed.
  const languageOptions = [...offered, ...languages.filter((l) => !offered.includes(l))];

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-semibold text-slate-900">Professional details</h2>
        <Badge tone="brand">{PROFESSION_LABEL[profile.professional_type]}</Badge>
      </div>
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Years of experience" htmlFor="pro-years">
            <Input id="pro-years" type="number" min={0} max={60} value={years} onChange={(e) => setYears(e.target.value)} />
          </Field>
          <Field label={registrationLabel(profile.professional_type)} htmlFor="pro-registration" optional>
            <Input id="pro-registration" value={registration} onChange={(e) => setRegistration(e.target.value)} />
          </Field>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Languages</p>
          <div className="flex flex-wrap gap-2">
            {languageOptions.map((language) => (
              <Chip
                key={language}
                selected={languages.includes(language)}
                onClick={() =>
                  setLanguages((current) =>
                    current.includes(language) ? current.filter((l) => l !== language) : [...current, language],
                  )
                }
              >
                {language}
              </Chip>
            ))}
          </div>
        </div>
        <Field label="About you" htmlFor="pro-bio" optional>
          <Textarea id="pro-bio" rows={3} maxLength={1000} value={bio} onChange={(e) => setBio(e.target.value)} />
        </Field>
        <Button
          loading={saving}
          onClick={() =>
            save(
              {
                years_of_experience: Math.min(60, Math.max(0, Number(years) || 0)),
                [council ? "council_registration_number" : "license_number"]: registration.trim() || null,
                languages_spoken: languages,
                bio: bio.trim() || null,
              },
              "Details saved.",
            )
          }
        >
          Save details
        </Button>
      </div>
    </Card>
  );
}

function ServiceArea() {
  const { profile } = useProfessional();
  const { save, saving } = useSaveProfile();
  const [area, setArea] = useState<Coords | null>(null);
  const [radius, setRadius] = useState(profile.service_radius_km);
  const changed = area !== null || radius !== profile.service_radius_km;

  return (
    <Card className="p-5">
      <h2 className="font-semibold text-slate-900">Service area</h2>
      <p className="mt-1 text-sm text-slate-500">
        You see requests within {profile.service_radius_km} km of the place you set. Change it if you&apos;ve moved.
      </p>
      <div className="mt-4 space-y-5">
        <AreaPicker value={area} onChange={setArea} />
        <RadiusPicker value={radius} onChange={setRadius} />
        <Button
          loading={saving}
          disabled={!changed}
          onClick={async () => {
            await save(
              {
                service_radius_km: radius,
                ...(area ? { location: { latitude: area.latitude, longitude: area.longitude } } : {}),
              },
              "Service area updated.",
            );
            setArea(null);
          }}
        >
          Save service area
        </Button>
      </div>
    </Card>
  );
}

function ServicesOffered() {
  const toast = useToast();
  const { data, reload } = useApi<MyService[]>("/professionals/me/services");
  const [busy, setBusy] = useState<string | null>(null);

  async function toggle(service: MyService, on: boolean) {
    setBusy(service.service_id);
    try {
      await api(`/professionals/me/services/${service.service_id}`, { method: "PUT", body: { is_opted_in: on } });
      await reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="p-5">
      <h2 className="font-semibold text-slate-900">Services you offer</h2>
      <p className="mt-1 text-sm text-slate-500">You only get requests for the services switched on.</p>
      <div className="mt-4 divide-y divide-slate-100">
        {(data ?? []).map((service) => (
          <div key={service.service_id} className="flex items-center justify-between gap-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-900">{service.service_name}</p>
              <p className="text-xs text-slate-500">
                {service.category_name} · {formatINR(service.base_price)} / visit
              </p>
            </div>
            <Switch
              checked={service.is_opted_in}
              disabled={busy === service.service_id}
              label={`Offer ${service.service_name}`}
              onChange={(on) => toggle(service, on)}
            />
          </div>
        ))}
        {data?.length === 0 && <p className="py-3 text-sm text-slate-500">No services for your profession yet.</p>}
      </div>
    </Card>
  );
}

const VERIFICATION = {
  approved: { tone: "green", label: "Verified", body: "Patients see a Verified badge on your profile." },
  pending: { tone: "amber", label: "Awaiting verification", body: "Our team will review your profile shortly." },
  in_review: { tone: "blue", label: "Under review", body: "We're checking your details now." },
  rejected: { tone: "red", label: "Not approved", body: "Update your details or contact support for another review." },
} as const;

function VerificationStatus() {
  const { profile } = useProfessional();
  const meta = VERIFICATION[profile.verification_status];
  return (
    <Card className="flex items-start gap-3 p-5">
      <Icon name="shield" className="mt-0.5 size-5 shrink-0 text-slate-400" />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 font-semibold text-slate-900">
          Verification <Badge tone={meta.tone}>{meta.label}</Badge>
        </p>
        <p className="mt-0.5 text-sm text-slate-500">
          {profile.verification_status === "rejected" && profile.rejection_reason
            ? `Reason: ${profile.rejection_reason}. `
            : null}
          {meta.body}
        </p>
      </div>
    </Card>
  );
}

export default function ProProfilePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Profile" />
      <VerificationStatus />
      <ProfileForm />
      <ProfessionalDetails />
      <ServiceArea />
      <ServicesOffered />
      <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h2 className="font-semibold text-slate-900">Weekly timings</h2>
          <p className="mt-0.5 text-sm text-slate-500">Only requests inside these hours reach you.</p>
        </div>
        <ButtonLink href="/pro/schedule" variant="outline" icon="clock">
          Edit timings
        </ButtonLink>
      </Card>
      <LanguageSwitch />
      <ButtonLink href="/pro/support" variant="ghost" icon="help">
        Help & support
      </ButtonLink>
    </div>
  );
}
