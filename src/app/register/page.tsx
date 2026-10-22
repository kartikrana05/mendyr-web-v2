import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AuthCard, RegisterChoices } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Sign up" };

export default function RegisterChoicePage() {
  return (
    <AuthCard
      title="Join Mendyr"
      subtitle="How will you use Mendyr?"
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-brand-700 hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <Suspense fallback={<div className="h-44" />}>
        <RegisterChoices />
      </Suspense>
    </AuthCard>
  );
}
