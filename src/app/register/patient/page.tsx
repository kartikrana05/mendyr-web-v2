import type { Metadata } from "next";
import { Suspense } from "react";

import { RegisterForm } from "@/components/auth-forms";
import { PageSkeleton } from "@/components/ui";

export const metadata: Metadata = { title: "Create your account" };

export default function PatientRegisterPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <RegisterForm role="patient" />
    </Suspense>
  );
}
