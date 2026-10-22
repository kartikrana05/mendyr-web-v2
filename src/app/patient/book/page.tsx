import type { Metadata } from "next";
import { Suspense } from "react";

import { PageSpinner } from "@/components/ui";

import { BookingFlow } from "./booking-flow";

export const metadata: Metadata = { title: "Book a visit" };

export default function BookPage() {
  // BookingFlow reads ?service= — URL data must sit inside Suspense to prerender.
  return (
    <Suspense fallback={<PageSpinner />}>
      <BookingFlow />
    </Suspense>
  );
}
