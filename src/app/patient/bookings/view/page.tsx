import { Suspense } from "react";

import { PageSpinner } from "@/components/ui";

import { PatientBookingDetail } from "./booking-detail";

export default function PatientBookingPage() {
  // The detail reads ?id= — URL data must sit inside Suspense to prerender.
  return (
    <Suspense fallback={<PageSpinner />}>
      <PatientBookingDetail />
    </Suspense>
  );
}
