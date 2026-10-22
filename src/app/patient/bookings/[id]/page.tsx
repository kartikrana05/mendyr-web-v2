import { Suspense } from "react";

import { PageSpinner } from "@/components/ui";

import { PatientBookingDetail } from "./booking-detail";

export default function PatientBookingPage() {
  // The booking id is only known at request time, so the detail renders inside Suspense.
  return (
    <Suspense fallback={<PageSpinner />}>
      <PatientBookingDetail />
    </Suspense>
  );
}
