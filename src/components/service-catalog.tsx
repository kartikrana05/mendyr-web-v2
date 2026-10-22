"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ProfessionIcon } from "@/components/brand";
import { Icon } from "@/components/icons";
import { Alert, ButtonLink, Card, Chip, cn } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { PROFESSION_LABEL, PROFESSION_SERVICE_COPY } from "@/lib/constants";
import { durationLabel, formatINR } from "@/lib/format";
import { useApi } from "@/lib/hooks";
import type { Service, ServiceCategory } from "@/lib/types";

/** Categories with their services, cheapest first — the catalogue the patient browses. */
export function useCatalog() {
  const categories = useApi<ServiceCategory[]>("/services/categories");
  const services = useApi<Service[]>("/services");
  const groups = useMemo(() => {
    if (!categories.data || !services.data) return null;
    return categories.data
      .map((category) => ({
        category,
        services: services.data!
          .filter((service) => service.category_id === category.id)
          .sort((a, b) => a.base_price - b.base_price),
      }))
      .filter((group) => group.services.length > 0);
  }, [categories.data, services.data]);
  return { groups, error: categories.error ?? services.error };
}

export function serviceCopy(service: Service): string {
  return service.description ?? PROFESSION_SERVICE_COPY[service.required_professional_type];
}

function CatalogSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="h-44 animate-pulse rounded-2xl bg-slate-200/60" />
      ))}
    </div>
  );
}

/** Landing-page summary: one card per category. */
export function ServiceShowcase() {
  const { groups, error } = useCatalog();
  if (error) return <Alert tone="warning">Services couldn&apos;t be loaded right now.</Alert>;
  if (!groups) return <CatalogSkeleton />;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {groups.map(({ category, services }) => (
        <Link
          key={category.id}
          href={`/services#${category.slug}`}
          className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
        >
          <ProfessionIcon type={services[0].required_professional_type} />
          <h3 className="mt-4 text-lg font-semibold text-slate-900">{category.name}</h3>
          <p className="mt-1 text-sm text-slate-500">
            {services.length} {services.length === 1 ? "service" : "services"} · from{" "}
            <span className="font-semibold text-slate-700">{formatINR(services[0].base_price)}</span>
          </p>
          <ul className="mt-3 space-y-1 text-sm text-slate-600">
            {services.slice(0, 3).map((service) => (
              <li key={service.id} className="truncate">
                {service.name}
              </li>
            ))}
          </ul>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700">
            View & book <Icon name="arrowRight" className="size-4 transition group-hover:translate-x-0.5" />
          </span>
        </Link>
      ))}
    </div>
  );
}

export function ServiceCard({ service, action }: { service: Service; action?: React.ReactNode }) {
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start gap-3">
        <ProfessionIcon type={service.required_professional_type} />
        <div className="min-w-0">
          <h3 className="font-semibold leading-snug text-slate-900">{service.name}</h3>
          <p className="mt-0.5 text-xs font-medium text-slate-500">
            {PROFESSION_LABEL[service.required_professional_type]} · {durationLabel(service.duration_minutes)}
          </p>
        </div>
      </div>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">{serviceCopy(service)}</p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p>
          <span className="text-lg font-bold text-slate-900">{formatINR(service.base_price)}</span>
          <span className="ml-1 text-xs text-slate-500">+ GST</span>
        </p>
        {action}
      </div>
    </Card>
  );
}

/** The full catalogue with category filters, for /services. */
export function ServiceCatalog() {
  const { groups, error } = useCatalog();
  const { user } = useAuth();
  const [active, setActive] = useState<string | null>(null);

  if (error) return <Alert tone="warning">Services couldn&apos;t be loaded right now. Please try again shortly.</Alert>;
  if (!groups) return <CatalogSkeleton count={6} />;

  const visible = active ? groups.filter((g) => g.category.id === active) : groups;
  const canBook = user?.role !== "professional";

  return (
    <div>
      <div className="-mx-4 mb-8 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <Chip selected={active === null} onClick={() => setActive(null)}>
          All
        </Chip>
        {groups.map(({ category }) => (
          <Chip key={category.id} selected={active === category.id} onClick={() => setActive(category.id)}>
            {category.name}
          </Chip>
        ))}
      </div>

      <div className="space-y-12">
        {visible.map(({ category, services }) => (
          <section key={category.id} id={category.slug} className="scroll-mt-24">
            <h2 className="text-xl font-bold text-slate-900">{category.name}</h2>
            {category.description && <p className="mt-1 text-sm text-slate-500">{category.description}</p>}
            <div className={cn("mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3")}>
              {services.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  action={
                    canBook ? (
                      <ButtonLink href={`/patient/book?service=${service.id}`} size="sm">
                        Book
                      </ButtonLink>
                    ) : null
                  }
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
