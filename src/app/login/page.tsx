import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginForm } from "@/components/auth-forms";
import { PageSpinner } from "@/components/ui";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  // LoginForm reads ?next= — URL data must sit inside Suspense to prerender.
  return (
    <Suspense fallback={<PageSpinner />}>
      <LoginForm />
    </Suspense>
  );
}
