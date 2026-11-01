import { Suspense } from "react";

import { RoleGate, ShellSkeleton } from "@/components/app-shell";

import { ProfessionalProvider } from "./professional-context";

export default function ProfessionalLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ShellSkeleton />}>
      <RoleGate role="professional">
        <ProfessionalProvider>{children}</ProfessionalProvider>
      </RoleGate>
    </Suspense>
  );
}
