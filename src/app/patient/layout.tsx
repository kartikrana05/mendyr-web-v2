import { Suspense } from "react";

import { RoleGate } from "@/components/app-shell";
import { PageSpinner } from "@/components/ui";

import { PatientProvider } from "./patient-context";

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<PageSpinner />}>
      <RoleGate role="patient">
        <PatientProvider>{children}</PatientProvider>
      </RoleGate>
    </Suspense>
  );
}
