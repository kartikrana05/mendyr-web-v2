"use client";

import { FullPageError } from "@/components/error-view";

export default function RootError({ error, retry }: { error: unknown; retry: () => void }) {
  return <FullPageError error={error} retry={retry} />;
}
