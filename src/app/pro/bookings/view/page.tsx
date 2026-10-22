import { Suspense } from "react";

import { PageSpinner } from "@/components/ui";

import { ProBookingDetail } from "./booking-detail";

export default function ProBookingPage() {
  // The detail reads ?id= — URL data must sit inside Suspense to prerender.
  return (
    <Suspense fallback={<PageSpinner />}>
      <ProBookingDetail />
    </Suspense>
  );
}
