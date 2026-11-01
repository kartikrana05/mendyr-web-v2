import { Suspense } from "react";

import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { PageSkeleton } from "@/components/ui";

import { ServiceDetail } from "./service-detail";

export default function ServicePage() {
  // The service id is only known at request time, so the detail renders inside Suspense.
  return (
    <>
      <SiteHeader />
      <main className="mx-auto min-h-[70vh] max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <Suspense fallback={<PageSkeleton />}>
          <ServiceDetail />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
