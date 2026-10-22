import { Suspense } from "react";

import { AppShell, RoleGate, type NavItem } from "@/components/app-shell";
import { PageSpinner } from "@/components/ui";

const NAV: NavItem[] = [
  { href: "/patient", label: "Home", icon: "home", exact: true },
  { href: "/patient/book", label: "Book", icon: "plus" },
  { href: "/patient/bookings", label: "Bookings", icon: "calendar" },
  { href: "/patient/account", label: "Account", icon: "user" },
];

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<PageSpinner />}>
      <RoleGate role="patient">
        <AppShell nav={NAV}>{children}</AppShell>
      </RoleGate>
    </Suspense>
  );
}
