import type { Metadata } from "next";
import { Suspense } from "react";

import { RegisterForm } from "@/components/auth-forms";
import { PageSpinner } from "@/components/ui";

export const metadata: Metadata = { title: "Join as a professional" };

export default function ProfessionalRegisterPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <RegisterForm role="professional" />
    </Suspense>
  );
}
