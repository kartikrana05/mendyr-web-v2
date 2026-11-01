import { Suspense } from "react";

import { RoleGate, ShellSkeleton } from "@/components/app-shell";

import { PatientProvider } from "./patient-context";

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ShellSkeleton />}>
      <RoleGate role="patient">
        <PatientProvider>{children}</PatientProvider>
      </RoleGate>
    </Suspense>
  );
}
