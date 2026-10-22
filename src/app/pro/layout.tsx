import { Suspense } from "react";

import { RoleGate } from "@/components/app-shell";
import { PageSpinner } from "@/components/ui";

import { ProfessionalProvider } from "./professional-context";

export default function ProfessionalLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<PageSpinner />}>
      <RoleGate role="professional">
        <ProfessionalProvider>{children}</ProfessionalProvider>
      </RoleGate>
    </Suspense>
  );
}
