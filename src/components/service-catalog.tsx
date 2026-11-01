"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ProfessionIcon } from "@/components/brand";
import { Icon } from "@/components/icons";
import { RatingPill, ServiceImage } from "@/components/service-visual";
import { Alert, Badge, ButtonLink, Chip, cn, Skeleton } from "@/components/ui";
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

export function CatalogSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-64 rounded-(--radius-card)" />
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
          className="group rounded-(--radius-card) border border-slate-200 bg-white p-5 shadow-xs transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
        >
          {category.icon_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- category art from the portal
            <img src={category.icon_url} alt="" loading="lazy" className="size-11 rounded-xl object-cover" />
          ) : (
            <ProfessionIcon type={services[0].required_professional_type} />
          )}
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

/** A catalogue card: image, name, highlights, price — links to the service's own page. */
export function ServiceCard({ service, action }: { service: Service; action?: React.ReactNode }) {
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-(--radius-card) border border-slate-200/80 bg-white shadow-xs transition duration-200 ease-out hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md">
      <div className="relative">
        <ServiceImage service={service} className="aspect-[16/9] w-full" rounded="rounded-none" />
        {service.badge && (
          <Badge tone="brand" className="absolute left-3 top-3 bg-white/95 shadow-xs">
            {service.badge}
          </Badge>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-snug text-slate-900">
            <Link href={`/services/${service.id}`} className="after:absolute after:inset-0">
              {service.name}
            </Link>
          </h3>
          <RatingPill avg={service.rating_avg} count={service.rating_count} className="shrink-0 pt-0.5" />
        </div>
        <p className="mt-0.5 text-xs font-medium text-slate-500">
          {PROFESSION_LABEL[service.required_professional_type]} · {durationLabel(service.duration_minutes)}
        </p>
        <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-slate-600">
          {service.tagline ?? serviceCopy(service)}
        </p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <p>
            <span className="text-lg font-bold text-slate-900">{formatINR(service.base_price)}</span>
            <span className="ml-1 text-xs text-slate-500">+ GST</span>
          </p>
          {action && <div className="relative z-10">{action}</div>}
        </div>
      </div>
    </div>
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

/** Hero panel on the landing page: the most-booked services, live from the catalogue. */
export function PopularServices() {
  const { groups, error } = useCatalog();
  if (error) return null;
  const popular = (groups ?? [])
    .flatMap((g) => g.services)
    .sort((a, b) => (b.bookings_count ?? 0) - (a.bookings_count ?? 0))
    .slice(0, 4);
  return (
    <div className="rounded-(--radius-card) border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60">
      <p className="text-sm font-semibold text-slate-900">Popular at home</p>
      <div className="mt-3 divide-y divide-slate-100">
        {!groups
          ? Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex items-center gap-3 py-3">
                <Skeleton className="size-12" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))
          : popular.map((service) => (
              <Link
                key={service.id}
                href={`/services/${service.id}`}
                className="flex items-center gap-3 py-3 transition-colors hover:bg-slate-50/80"
              >
                <ServiceImage service={service} className="size-12 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{service.name}</p>
                  <p className="text-xs text-slate-500">
                    {PROFESSION_LABEL[service.required_professional_type]} · {durationLabel(service.duration_minutes)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-slate-900">{formatINR(service.base_price)}</p>
                  <RatingPill avg={service.rating_avg} count={service.rating_count} />
                </div>
              </Link>
            ))}
      </div>
      <Link href="/services" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-700">
        See all services <Icon name="arrowRight" className="size-4" />
      </Link>
    </div>
  );
}
