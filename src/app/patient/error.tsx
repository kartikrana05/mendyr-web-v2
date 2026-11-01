"use client";

import { ErrorView } from "@/components/error-view";

export default function AreaError({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorView error={error} retry={retry} home="/patient" />;
}
