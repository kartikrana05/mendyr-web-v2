import type { Metadata } from "next";

import { ServiceCatalog } from "@/components/service-catalog";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export const metadata: Metadata = { title: "Services" };

export default function ServicesPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto min-h-[70vh] max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Our services</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          A qualified professional comes to your home. Prices are per visit or shift; GST is added at
          checkout, and you pay after the visit.
        </p>
        <div className="mt-8">
          <ServiceCatalog />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
