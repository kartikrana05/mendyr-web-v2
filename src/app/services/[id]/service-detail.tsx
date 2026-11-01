"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { FaqList } from "@/components/faq-list";
import { Icon } from "@/components/icons";
import { RatingPill, ServiceImage } from "@/components/service-visual";
import { serviceCopy } from "@/components/service-catalog";
import { Alert, Badge, ButtonLink, Card, Skeleton } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { PROFESSION_LABEL } from "@/lib/constants";
import { durationLabel, formatINR } from "@/lib/format";
import { useApi } from "@/lib/hooks";
import { useT } from "@/lib/i18n";
import type { Service } from "@/lib/types";

function DetailSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-4">
        <Skeleton className="aspect-[16/9] w-full rounded-(--radius-card)" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
      <Skeleton className="h-56 rounded-(--radius-card)" />
    </div>
  );
}

export function ServiceDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const t = useT();
  const { data: service, error } = useApi<Service>(`/services/${id}`);

  if (error && !service) {
    return (
      <div className="space-y-4">
        <Alert tone={error.status === 404 ? "info" : "error"} title={error.status === 404 ? "Service not found" : undefined}>
          {error.status === 404 ? "This service is no longer offered." : error.message}
        </Alert>
        <ButtonLink href="/services" variant="outline" icon="chevronLeft">
          All services
        </ButtonLink>
      </div>
    );
  }
  if (!service) return <DetailSkeleton />;

  const canBook = !user || user.role === "patient";
  const bookHref = `/patient/book?service=${service.id}`;

  return (
    <div className="animate-rise">
      <Link href="/services" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800">
        <Icon name="chevronLeft" className="size-4" /> All services
      </Link>

      <div className="mt-4 grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <ServiceImage service={service} className="aspect-[16/9] w-full" rounded="rounded-(--radius-card)" />

          <div>
            <div className="flex flex-wrap items-center gap-2">
              {service.badge && <Badge tone="brand">{service.badge}</Badge>}
              <Badge tone="gray">{PROFESSION_LABEL[service.required_professional_type]}</Badge>
              {service.requires_prescription && <Badge tone="amber">Prescription needed</Badge>}
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{service.name}</h1>
            {service.tagline && <p className="mt-2 text-lg text-slate-600">{service.tagline}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
              <RatingPill avg={service.rating_avg} count={service.rating_count} className="text-sm" />
              {!!service.bookings_count && (
                <span className="inline-flex items-center gap-1">
                  <Icon name="users" className="size-4" />
                  {service.bookings_count.toLocaleString("en-IN")} visits booked
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Icon name="clock" className="size-4" /> {durationLabel(service.duration_minutes)}
              </span>
            </div>
          </div>

          <p className="leading-relaxed text-slate-700">{serviceCopy(service)}</p>

          {(service.includes?.length || service.excludes?.length) ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {!!service.includes?.length && (
                <Card className="p-5">
                  <h2 className="font-semibold text-slate-900">What&apos;s included</h2>
                  <ul className="mt-3 space-y-2 text-sm text-slate-700">
                    {service.includes.map((item) => (
                      <li key={item} className="flex gap-2">
                        <Icon name="check" className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
              {!!service.excludes?.length && (
                <Card className="p-5">
                  <h2 className="font-semibold text-slate-900">Not included</h2>
                  <ul className="mt-3 space-y-2 text-sm text-slate-700">
                    {service.excludes.map((item) => (
                      <li key={item} className="flex gap-2">
                        <Icon name="x" className="mt-0.5 size-4 shrink-0 text-slate-400" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>
          ) : null}

          {!!service.faqs?.length && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-slate-900">Questions people ask</h2>
              <FaqList faqs={service.faqs} />
            </section>
          )}
        </div>

        <Card className="p-5 lg:sticky lg:top-24">
          <p className="text-sm text-slate-500">Per visit</p>
          <p className="mt-1">
            <span className="text-3xl font-bold text-slate-900">{formatINR(service.base_price)}</span>
            <span className="ml-1 text-sm text-slate-500">+ GST</span>
          </p>
          <ul className="mt-4 space-y-2.5 text-sm text-slate-700">
            <li className="flex gap-2">
              <Icon name="shield" className="size-4 shrink-0 text-brand-600" /> {t("home.trust.verified")}
            </li>
            <li className="flex gap-2">
              <Icon name="wallet" className="size-4 shrink-0 text-brand-600" /> {t("common.payAfter")}
            </li>
            <li className="flex gap-2">
              <Icon name="route" className="size-4 shrink-0 text-brand-600" /> {t("home.trust.trackBody")}
            </li>
          </ul>
          {canBook ? (
            <ButtonLink href={bookHref} size="lg" className="mt-5 w-full" icon="calendar">
              {t("home.bookVisit")}
            </ButtonLink>
          ) : (
            <p className="mt-5 text-sm text-slate-500">Signed in as a professional — patients book from their account.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
