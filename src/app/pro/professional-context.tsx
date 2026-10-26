"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect } from "react";

import { AppShell, type NavItem } from "@/components/app-shell";
import { Logo } from "@/components/brand";
import { Icon } from "@/components/icons";
import { Alert, PageSpinner } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/hooks";
import type { BookingRequest, ProBooking, ProfessionalProfile } from "@/lib/types";

import { ProAlerts } from "./pro-alerts";

function navFor(openRequests: number): NavItem[] {
  return [
    { href: "/pro", label: "Dashboard", icon: "home", exact: true },
    { href: "/pro/requests", label: "Requests", icon: "bell", badge: openRequests },
    { href: "/pro/bookings", label: "Bookings", icon: "calendar" },
    { href: "/pro/schedule", label: "Timings", icon: "clock" },
    { href: "/pro/profile", label: "Profile", icon: "user" },
  ];
}

type OpenRequests = ReturnType<typeof useApi<BookingRequest[]>>;
type MyBookings = ReturnType<typeof useApi<ProBooking[]>>;

interface ProfessionalContextValue {
  profile: ProfessionalProfile | null;
  setProfile: (profile: ProfessionalProfile) => void;
  reload: () => Promise<void>;
  requests: OpenRequests;
  bookings: MyBookings;
}

const ProfessionalContext = createContext<ProfessionalContextValue | null>(null);

function OnboardingShell({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();
  const router = useRouter();
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200/70 bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Logo href="/" />
          <button
            type="button"
            onClick={async () => {
              await logout();
              router.replace("/");
            }}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <Icon name="logout" className="size-4" /> Log out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </div>
  );
}

/**
 * Loads the professional's profile once for every /pro page. No profile yet means they
 * signed up but haven't finished onboarding, so they're sent there (and away from it once
 * done). Once onboarded, also polls open requests and the professional's bookings for
 * every page — feeding the Requests badge and the new-request / cancelled-booking pop-ups,
 * and shared with the pages that list them. Sits inside the layout's Suspense boundary: it
 * reads the pathname.
 */
export function ProfessionalProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const onOnboarding = pathname === "/pro/onboarding";
  const { data: profile, error, reload, mutate } = useApi<ProfessionalProfile>("/professionals/me");
  const needsOnboarding = error?.status === 404;
  const requests = useApi<BookingRequest[]>(profile ? "/bookings/professional/requests" : null, {
    pollMs: 15_000,
  });
  const bookings = useApi<ProBooking[]>(profile ? "/bookings/professional/mine?page_size=100" : null, {
    pollMs: 30_000,
  });
  const { reload: reloadRequests } = requests;
  const { reload: reloadBookings } = bookings;

  // Pages used to fetch these on mount; refreshing on navigation keeps them as fresh, e.g.
  // the bookings list right after accepting or releasing one.
  useEffect(() => {
    void reloadRequests();
    void reloadBookings();
  }, [pathname, reloadRequests, reloadBookings]);

  useEffect(() => {
    if (needsOnboarding && !onOnboarding) router.replace("/pro/onboarding");
    if (profile && onOnboarding) router.replace("/pro");
  }, [needsOnboarding, onOnboarding, profile, router]);

  const value: ProfessionalContextValue = { profile: profile ?? null, setProfile: mutate, reload, requests, bookings };

  if (onOnboarding) {
    if (!needsOnboarding) return <PageSpinner />; // loading, or onboarded and redirecting
    return (
      <ProfessionalContext.Provider value={value}>
        <OnboardingShell>{children}</OnboardingShell>
      </ProfessionalContext.Provider>
    );
  }
  if (!profile) {
    if (error && !needsOnboarding) {
      return (
        <div className="mx-auto max-w-md p-6">
          <Alert tone="error" title="Couldn't load your profile">
            {error.message}
          </Alert>
        </div>
      );
    }
    return <PageSpinner />;
  }
  return (
    <ProfessionalContext.Provider value={value}>
      <AppShell nav={navFor(requests.data?.length ?? 0)}>
        {children}
        <ProAlerts requests={requests.data} bookings={bookings.data} />
      </AppShell>
    </ProfessionalContext.Provider>
  );
}

function useProfessionalContext(): ProfessionalContextValue {
  const context = useContext(ProfessionalContext);
  if (!context) throw new Error("Must be used inside <ProfessionalProvider>");
  return context;
}

/** For onboarding: the provider's reload, to pick up the newly created profile. */
export function useProfessionalReload() {
  return useProfessionalContext().reload;
}

/** The signed-in professional's profile (pages outside onboarding always have one). */
export function useProfessional() {
  const { profile, setProfile, reload } = useProfessionalContext();
  if (!profile) throw new Error("useProfessional() used before the profile loaded");
  return { profile, setProfile, reload };
}

/** Open requests near the professional, polled by the provider for every /pro page. */
export function useOpenRequests(): OpenRequests {
  return useProfessionalContext().requests;
}

/** The professional's own bookings, polled by the provider for every /pro page. */
export function useMyBookings(): MyBookings {
  return useProfessionalContext().bookings;
}
