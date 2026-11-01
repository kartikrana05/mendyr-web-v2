"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect } from "react";

import { AppShell, type NavItem } from "@/components/app-shell";
import { InboxProvider } from "@/components/notifications";
import { usePollMs } from "@/lib/config";
import { useApi } from "@/lib/hooks";
import { type Translate, useT } from "@/lib/i18n";
import type { BookingListItem } from "@/lib/types";

import { PatientAlerts, useBookingUpdates } from "./patient-alerts";

function navFor(updates: number, t: Translate): NavItem[] {
  return [
    { href: "/patient", label: t("nav.home"), icon: "home", exact: true },
    { href: "/patient/book", label: t("nav.book"), icon: "plus" },
    { href: "/patient/bookings", label: t("nav.bookings"), icon: "calendar", badge: updates },
    { href: "/patient/support", label: t("nav.help"), icon: "help" },
    { href: "/patient/account", label: t("nav.account"), icon: "user" },
  ];
}

type MyBookings = ReturnType<typeof useApi<BookingListItem[]>>;

const PatientBookingsContext = createContext<MyBookings | null>(null);

/**
 * Polls the patient's bookings for every /patient page — feeding the confirmed / professional
 * cancelled pop-ups and the Bookings badge, and shared with the pages that list them. Sits
 * inside the layout's Suspense boundary: it reads the pathname.
 */
export function PatientProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useT();
  const bookings = useApi<BookingListItem[]>("/bookings?page_size=100", { pollMs: usePollMs("lists") });
  const updates = useBookingUpdates(bookings.data);
  const { reload } = bookings;

  // Refreshing on navigation keeps the lists fresh, e.g. right after booking or cancelling.
  useEffect(() => {
    void reload();
  }, [pathname, reload]);

  return (
    <PatientBookingsContext.Provider value={bookings}>
      <InboxProvider>
        {(unread) => (
          <AppShell
            nav={navFor(updates.confirmed.length + updates.dropped.length, t)}
            bell={{ href: "/patient/notifications", count: unread }}
          >
            {children}
            <PatientAlerts {...updates} />
          </AppShell>
        )}
      </InboxProvider>
    </PatientBookingsContext.Provider>
  );
}

/** The patient's bookings, polled by the provider for every /patient page. */
export function usePatientBookings(): MyBookings {
  const context = useContext(PatientBookingsContext);
  if (!context) throw new Error("Must be used inside <PatientProvider>");
  return context;
}
