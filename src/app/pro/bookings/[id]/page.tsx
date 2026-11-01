import { Suspense } from "react";

import { PageSkeleton } from "@/components/ui";

import { ProBookingDetail } from "./booking-detail";

export default function ProBookingPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ProBookingDetail />
    </Suspense>
  );
}
