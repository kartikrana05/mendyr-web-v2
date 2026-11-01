"use client";

import { useEffect } from "react";

import { Logo } from "@/components/brand";
import { Icon } from "@/components/icons";
import { Button, ButtonLink } from "@/components/ui";

/** The body of an error boundary: what happened, a retry, and a way home. */
export function ErrorView({ error, retry, home = "/" }: { error: unknown; retry: () => void; home?: string }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-4 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-red-50 text-red-600">
        <Icon name="alert" className="size-6" />
      </span>
      <h1 className="mt-4 text-xl font-bold text-slate-900">Something went wrong</h1>
      <p className="mt-2 text-sm text-slate-600">
        This page couldn&apos;t load. Check your connection and try again — your bookings are safe.
      </p>
      <div className="mt-6 flex gap-3">
        <Button onClick={retry} icon="activity">
          Try again
        </Button>
        <ButtonLink href={home} variant="outline">
          Go home
        </ButtonLink>
      </div>
    </div>
  );
}

export function FullPageError(props: { error: unknown; retry: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <Logo />
      <ErrorView {...props} />
    </div>
  );
}
