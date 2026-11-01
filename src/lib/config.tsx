"use client";

// The server-driven config bundle (`GET /configs/app`): feature flags, theme, home layout,
// banners, copy overrides, support numbers, booking rules and polling intervals. The app
// never waits for it — it renders with the bundled defaults (or the last cached bundle)
// and swaps in the fresh one when it arrives. Shapes mirror the backend's
// app/core/config_registry.py.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { api } from "@/lib/api";
import type { Faq } from "@/lib/types";

export interface FeatureFlags {
  reviews: boolean;
  visit_otp: boolean;
  sos: boolean;
  live_status: boolean;
  gender_preference: boolean;
  coupons: boolean;
  prescription_upload: boolean;
  chat: boolean;
  wallet: boolean;
  referrals: boolean;
  hindi: boolean;
  [flag: string]: boolean;
}

export interface ThemeConfig {
  primary: string;
  primary_dark: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
  radius: number;
}

export type HomeSectionType =
  | "banners"
  | "categories"
  | "book_again"
  | "trust"
  | "how_it_works"
  | "offers"
  | "support";

export interface HomeSection {
  type: HomeSectionType;
  enabled: boolean;
  title: string | null;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  cta_label: string | null;
  deeplink: string | null;
  bg_color: string;
  text_color: string;
}

export interface SupportConfig {
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  hours: string;
  sos_number: string;
  ambulance_number: string;
  faqs: Faq[];
}

export interface BookingRules {
  slot_start_hour: number;
  slot_end_hour: number;
  slot_step_minutes: number;
  min_lead_minutes: number;
  horizon_days: number;
  free_cancel_window_minutes: number;
  cancellation_fee_pct: number;
  travel_buffer_minutes: number;
  early_start_minutes: number;
}

export interface PollingConfig {
  active_booking: number;
  lists: number;
  requests: number;
}

export interface AppConfigs {
  "app.features": FeatureFlags;
  "app.theme": ThemeConfig;
  "app.home": { sections: HomeSection[] };
  "app.banners": { items: Banner[] };
  "app.onboarding": { slides: { title: string; body: string; image_url: string | null; icon: string | null }[] };
  "app.copy": { locales: Record<string, Record<string, string>> };
  "app.support": SupportConfig;
  "app.maintenance": { enabled: boolean; title: string; message: string };
  "app.polling": PollingConfig;
  "booking.rules": BookingRules;
  "booking.cancel_reasons": { patient: string[]; professional: string[] };
  "pro.settings": {
    radius_options_km: number[];
    default_radius_km: number;
    languages: string[];
    required_documents: string[];
  };
}

/** Bundled fallback — the backend's defaults, so a cold start with no network still works. */
export const DEFAULT_CONFIGS: AppConfigs = {
  "app.features": {
    reviews: true,
    visit_otp: false,
    sos: true,
    live_status: true,
    gender_preference: true,
    coupons: false,
    prescription_upload: false,
    chat: false,
    wallet: false,
    referrals: false,
    hindi: true,
  },
  "app.theme": {
    primary: "#1262E2",
    primary_dark: "#0F4ABF",
    accent: "#0EA5A4",
    success: "#16A34A",
    warning: "#F59E0B",
    danger: "#EF4444",
    radius: 16,
  },
  "app.home": {
    sections: [
      { type: "banners", enabled: true, title: null },
      { type: "categories", enabled: true, title: "What do you need today?" },
      { type: "book_again", enabled: true, title: "Book again" },
      { type: "trust", enabled: true, title: null },
      { type: "how_it_works", enabled: true, title: "How Mendyr works" },
      { type: "support", enabled: true, title: null },
    ],
  },
  "app.banners": {
    items: [
      {
        id: "welcome",
        title: "Trusted care, at home",
        subtitle: "Verified nurses & caregivers. Pay after the visit.",
        image_url: null,
        cta_label: "Book a visit",
        deeplink: "/book",
        bg_color: "#1262E2",
        text_color: "#FFFFFF",
      },
    ],
  },
  "app.onboarding": { slides: [] },
  "app.copy": { locales: {} },
  "app.support": {
    phone: null,
    whatsapp: null,
    email: null,
    hours: "7 AM – 10 PM, all days",
    sos_number: "112",
    ambulance_number: "108",
    faqs: [],
  },
  "app.maintenance": {
    enabled: false,
    title: "We'll be right back",
    message: "Mendyr is getting an upgrade. Please check back in a little while.",
  },
  "app.polling": { active_booking: 10, lists: 30, requests: 15 },
  "booking.rules": {
    slot_start_hour: 7,
    slot_end_hour: 21,
    slot_step_minutes: 30,
    min_lead_minutes: 60,
    horizon_days: 14,
    free_cancel_window_minutes: 60,
    cancellation_fee_pct: 25,
    travel_buffer_minutes: 30,
    early_start_minutes: 120,
  },
  "booking.cancel_reasons": {
    patient: [
      "Booked by mistake",
      "Need a different time",
      "Found care elsewhere",
      "Patient's condition changed",
      "Price is too high",
      "Other",
    ],
    professional: [
      "Personal emergency",
      "Running late / can't reach in time",
      "Patient asked me to cancel",
      "Address is too far",
      "Other",
    ],
  },
  "pro.settings": {
    radius_options_km: [3, 5, 10, 15, 20, 30],
    default_radius_km: 10,
    languages: [
      "English",
      "Hindi",
      "Bengali",
      "Marathi",
      "Telugu",
      "Tamil",
      "Gujarati",
      "Kannada",
      "Malayalam",
      "Punjabi",
      "Odia",
      "Urdu",
    ],
    required_documents: ["government_id", "profile_photo", "nursing_council_certificate"],
  },
};

export type ConfigRole = "patient" | "professional";

interface Bundle {
  version: string;
  configs: Partial<Record<string, unknown>>;
}

/** Fill every key from the defaults, so a partial or older bundle never leaves a hole. */
function resolve(bundle: Bundle | null): AppConfigs {
  if (!bundle) return DEFAULT_CONFIGS;
  const merged = { ...DEFAULT_CONFIGS } as Record<string, unknown>;
  for (const key of Object.keys(DEFAULT_CONFIGS) as (keyof AppConfigs)[]) {
    const value = bundle.configs[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      merged[key] = { ...(DEFAULT_CONFIGS[key] as object), ...(value as object) };
    }
  }
  return merged as unknown as AppConfigs;
}

const cacheKey = (role: ConfigRole) => `mendyr:config:${role}`;

function readCache(role: ConfigRole): Bundle | null {
  try {
    const raw = window.localStorage.getItem(cacheKey(role));
    return raw ? (JSON.parse(raw) as Bundle) : null;
  } catch {
    return null;
  }
}

function writeCache(role: ConfigRole, bundle: Bundle) {
  try {
    window.localStorage.setItem(cacheKey(role), JSON.stringify(bundle));
  } catch {
    // Storage full or blocked (private mode) — the in-memory bundle still works.
  }
}

interface ConfigContextValue {
  configs: AppConfigs;
  version: string | null;
  refresh: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextValue>({
  configs: DEFAULT_CONFIGS,
  version: null,
  refresh: async () => undefined,
});

const REFRESH_AFTER_MS = 60_000;

/** Theme colours as CSS variables; the Tailwind `brand-*` scale is derived from them. */
function applyTheme(theme: ThemeConfig) {
  const root = document.documentElement.style;
  root.setProperty("--color-brand-600", theme.primary);
  root.setProperty("--color-brand-700", theme.primary_dark);
  root.setProperty("--color-teal", theme.accent);
  root.setProperty("--color-success", theme.success);
  root.setProperty("--color-warning", theme.warning);
  root.setProperty("--color-danger", theme.danger);
  root.setProperty("--radius-card", `${theme.radius}px`);
}

export function ConfigProvider({ role, children }: { role: ConfigRole; children: React.ReactNode }) {
  const [state, setState] = useState<{ role: ConfigRole; bundle: Bundle | null }>({ role, bundle: null });

  const refresh = useCallback(async () => {
    try {
      const bundle = await api<Bundle>(`/configs/app?role=${role}&platform=web`);
      writeCache(role, bundle);
      setState({ role, bundle });
    } catch {
      // Offline or the backend is down: keep what we have (cache or defaults).
    }
  }, [role]);

  useEffect(() => {
    const cached = readCache(role);
    // Cached bundle first (instant), then the network one.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after mount
    if (cached) setState({ role, bundle: cached });
    void refresh();

    let last = Date.now();
    const onFocus = () => {
      if (document.visibilityState !== "visible" || Date.now() - last < REFRESH_AFTER_MS) return;
      last = Date.now();
      void refresh();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [role, refresh]);

  const bundle = state.role === role ? state.bundle : null;
  const configs = useMemo(() => resolve(bundle), [bundle]);

  useEffect(() => applyTheme(configs["app.theme"]), [configs]);

  const value = useMemo(
    () => ({ configs, version: bundle?.version ?? null, refresh }),
    [configs, bundle, refresh],
  );

  const maintenance = configs["app.maintenance"];
  return (
    <ConfigContext.Provider value={value}>
      {maintenance.enabled ? <MaintenanceScreen title={maintenance.title} message={maintenance.message} /> : children}
    </ConfigContext.Provider>
  );
}

function MaintenanceScreen({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element -- tiny static logo, no layout shift */}
      <img src="/mendyr.png" alt="Mendyr" width={56} height={56} className="size-14" />
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <p className="max-w-md text-slate-600">{message}</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
      >
        Try again
      </button>
    </div>
  );
}

export function useConfig<K extends keyof AppConfigs>(key: K): AppConfigs[K] {
  return useContext(ConfigContext).configs[key];
}

export function useConfigRefresh(): () => Promise<void> {
  return useContext(ConfigContext).refresh;
}

/** A feature flag; unknown flags are off. */
export function useFeature(flag: keyof FeatureFlags): boolean {
  return useConfig("app.features")[flag] === true;
}

export function useRules(): BookingRules {
  return useConfig("booking.rules");
}

/** Poll interval in ms for one of the `app.polling` kinds. */
export function usePollMs(kind: keyof PollingConfig): number {
  return useConfig("app.polling")[kind] * 1000;
}

/** `/book?service=x` style banner deeplinks → this site's routes; https links pass through. */
export function resolveDeeplink(link: string | null, role: ConfigRole = "patient"): { href: string; external: boolean } | null {
  if (!link) return null;
  if (/^https?:\/\//.test(link)) return { href: link, external: true };
  if (!link.startsWith("/")) return null;
  const [path, search = ""] = link.split("?");
  const qs = search ? `?${search}` : "";
  if (role === "professional") return { href: path === "/support" ? "/pro/support" : "/pro", external: false };
  if (path === "/book") return { href: `/patient/book${qs}`, external: false };
  if (path.startsWith("/service/")) return { href: `/services/${path.slice("/service/".length)}`, external: false };
  if (path.startsWith("/services")) return { href: `${path}${qs}`, external: false };
  if (path === "/support") return { href: "/patient/support", external: false };
  if (path === "/bookings") return { href: "/patient/bookings", external: false };
  if (path.startsWith("/bookings/")) return { href: `/patient${path}`, external: false };
  if (path === "/notifications") return { href: "/patient/notifications", external: false };
  return { href: link, external: false };
}
