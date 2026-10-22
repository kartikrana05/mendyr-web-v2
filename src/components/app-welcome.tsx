"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { ButtonLink } from "@/components/ui";
import { homeFor, useAuth } from "@/lib/auth";

/**
 * The app build's first screen (the website shows the marketing page instead). Signed-in
 * users go straight to their area; everyone else gets the brand and two clear choices.
 */
export function AppWelcome() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace(homeFor(user.role));
  }, [loading, user, router]);

  const deciding = loading || !!user;
  return (
    <main className="flex min-h-dvh flex-col px-6 pt-[calc(1.5rem+var(--safe-top))] pb-[calc(1.5rem+var(--safe-bottom))]">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <Image src="/mendyr.png" alt="Mendyr" width={96} height={96} priority className="size-24" />
        {!deciding && (
          <>
            <h1 className="mt-6 text-3xl font-bold text-slate-900">Mendyr</h1>
            <p className="mt-3 max-w-xs text-base leading-relaxed text-slate-500">
              Trusted nurses and caregivers, at your doorstep.
            </p>
          </>
        )}
      </div>
      {!deciding && (
        <div className="mx-auto w-full max-w-sm space-y-3">
          <ButtonLink href="/register" size="lg" className="w-full">
            Create an account
          </ButtonLink>
          <ButtonLink href="/login" size="lg" variant="outline" className="w-full">
            Log in
          </ButtonLink>
          <p className="pt-2 text-center text-sm text-slate-500">
            Nurse or caregiver?{" "}
            <Link href="/register/professional" className="font-semibold text-brand-700">
              Start earning
            </Link>
          </p>
        </div>
      )}
    </main>
  );
}
