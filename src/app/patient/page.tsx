"use client";

import Link from "next/link";

import { ProfessionIcon } from "@/components/brand";
import { Icon, type IconName } from "@/components/icons";
import { useCatalog } from "@/components/service-catalog";
import { RatingPill, ServiceImage } from "@/components/service-visual";
import { StatusBadge } from "@/components/status-badge";
import { ContactOptions, EmergencyCard } from "@/components/support";
import { Alert, ButtonLink, Card, cn, SectionHeading, Skeleton } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { type Banner, type HomeSection, resolveDeeplink, useConfig } from "@/lib/config";
import { isUpcoming } from "@/lib/constants";
import { formatDateTime, formatINR } from "@/lib/format";
import { useApi, useNow } from "@/lib/hooks";
import { type Translate, useT } from "@/lib/i18n";
import type { Address, BookingListItem, Service } from "@/lib/types";

import { usePatientBookings } from "./patient-context";

// ── Sections ─────────────────────────────────────────────────────────────

function BannerCard({ banner }: { banner: Banner }) {
  const link = resolveDeeplink(banner.deeplink);
  const body = (
    <div
      className="relative flex h-full min-h-36 overflow-hidden rounded-(--radius-card) p-5 transition duration-150 ease-out active:scale-[0.99]"
      style={{ backgroundColor: banner.bg_color, color: banner.text_color }}
    >
      <div className="relative z-10 flex max-w-[70%] flex-col">
        <p className="font-display text-xl font-bold leading-tight">{banner.title}</p>
        {banner.subtitle && <p className="mt-1 text-sm opacity-90">{banner.subtitle}</p>}
        {banner.cta_label && link && (
          <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold">
            {banner.cta_label} <Icon name="arrowRight" className="size-4" />
          </span>
        )}
      </div>
      {banner.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- banner art from the portal
        <img src={banner.image_url} alt="" loading="lazy" className="absolute inset-y-0 right-0 h-full w-2/5 object-cover" />
      ) : (
        <span className="absolute -bottom-6 -right-6 size-32 rounded-full bg-white/10" aria-hidden="true" />
      )}
    </div>
  );
  if (!link) return body;
  return link.external ? (
    <a href={link.href} target="_blank" rel="noreferrer" className="block">
      {body}
    </a>
  ) : (
    <Link href={link.href} className="block">
      {body}
    </Link>
  );
}

function BannersSection() {
  const banners = useConfig("app.banners").items;
  if (banners.length === 0) return null;
  return (
    <section className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 lg:grid-cols-3">
      {banners.map((banner) => (
        <div key={banner.id} className="w-[85%] shrink-0 snap-start sm:w-auto">
          <BannerCard banner={banner} />
        </div>
      ))}
    </section>
  );
}

function CategoriesSection({ title }: { title: string }) {
  const { groups, error } = useCatalog();
  if (error) return <Alert tone="warning">Services couldn&apos;t be loaded right now.</Alert>;
  const popular = (groups ?? [])
    .flatMap((g) => g.services)
    .sort((a, b) => (b.bookings_count ?? 0) - (a.bookings_count ?? 0))
    .slice(0, 6);

  return (
    <section>
      <SectionHeading
        title={title}
        action={
          <Link href="/services" className="text-sm font-semibold text-brand-700">
            All services
          </Link>
        }
      />
      {!groups ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-32 rounded-(--radius-card)" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {groups.map(({ category, services }) => {
              const cover = services.find((s) => s.image_url) ?? services[0];
              return (
                <Link
                  key={category.id}
                  href={`/services#${category.slug}`}
                  className="group overflow-hidden rounded-(--radius-card) border border-slate-200/80 bg-white shadow-xs transition duration-150 ease-out hover:border-brand-300 active:scale-[0.97]"
                >
                  {category.icon_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- category art from the portal
                    <img src={category.icon_url} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover" />
                  ) : (
                    <ServiceImage service={cover} className="aspect-[4/3] w-full" rounded="rounded-none" />
                  )}
                  <div className="p-3">
                    <p className="truncate text-sm font-semibold text-slate-900">{category.name}</p>
                    <p className="text-xs text-slate-500">from {formatINR(services[0].base_price)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
          {popular.length > 0 && (
            <div className="no-scrollbar -mx-4 mt-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
              {popular.map((service) => (
                <CompactServiceCard key={service.id} service={service} />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function CompactServiceCard({ service, cta }: { service: Service; cta?: string }) {
  return (
    <Link
      href={cta ? `/patient/book?service=${service.id}` : `/services/${service.id}`}
      className="flex w-64 shrink-0 items-center gap-3 rounded-(--radius-card) border border-slate-200/80 bg-white p-3 shadow-xs transition duration-150 ease-out hover:border-brand-300 active:scale-[0.98]"
    >
      <ServiceImage service={service} className="size-14 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{service.name}</p>
        <p className="text-xs text-slate-500">{formatINR(service.base_price)} + GST</p>
        {cta ? (
          <p className="mt-0.5 text-xs font-semibold text-brand-700">{cta}</p>
        ) : (
          <RatingPill avg={service.rating_avg} count={service.rating_count} />
        )}
      </div>
    </Link>
  );
}

function BookAgainSection({ title, bookings }: { title: string; bookings: BookingListItem[] }) {
  const { groups } = useCatalog();
  const t = useT();
  const services = groups?.flatMap((g) => g.services) ?? [];
  // The list endpoint has no service id; match the name snapshot against the catalogue.
  const seen = new Set<string>();
  const again: Service[] = [];
  for (const booking of [...bookings].sort((a, b) => b.scheduled_start_at.localeCompare(a.scheduled_start_at))) {
    if (booking.status !== "completed" || seen.has(booking.service_name_snapshot)) continue;
    seen.add(booking.service_name_snapshot);
    const service = services.find((s) => s.name === booking.service_name_snapshot);
    if (service) again.push(service);
  }
  if (again.length === 0) return null;
  return (
    <section>
      <SectionHeading title={title} />
      <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {again.slice(0, 6).map((service) => (
          <CompactServiceCard key={service.id} service={service} cta={t("detail.bookAgain")} />
        ))}
      </div>
    </section>
  );
}

const TRUST: { icon: IconName; title: Parameters<Translate>[0]; body: Parameters<Translate>[0] }[] = [
  { icon: "shield", title: "home.trust.verified", body: "home.trust.verifiedBody" },
  { icon: "wallet", title: "home.trust.payAfter", body: "home.trust.payAfterBody" },
  { icon: "route", title: "home.trust.track", body: "home.trust.trackBody" },
  { icon: "message", title: "home.trust.support", body: "home.trust.supportBody" },
];

function TrustSection() {
  const t = useT();
  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {TRUST.map((item) => (
        <Card key={item.title} className="p-4">
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <Icon name={item.icon} className="size-4.5" />
          </span>
          <p className="mt-3 text-sm font-semibold text-slate-900">{t(item.title)}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{t(item.body)}</p>
        </Card>
      ))}
    </section>
  );
}

function HowItWorksSection({ title }: { title: string }) {
  const t = useT();
  const steps: { icon: IconName; key: Parameters<Translate>[0] }[] = [
    { icon: "calendar", key: "home.how.1" },
    { icon: "check", key: "home.how.2" },
    { icon: "home", key: "home.how.3" },
  ];
  return (
    <section>
      <SectionHeading title={title} />
      <Card className="grid gap-5 p-5 sm:grid-cols-3">
        {steps.map((step, index) => (
          <div key={step.key} className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
              {index + 1}
            </span>
            <p className="text-sm font-medium text-slate-800">{t(step.key)}</p>
          </div>
        ))}
      </Card>
    </section>
  );
}

function SupportSection() {
  const t = useT();
  const support = useConfig("app.support");
  return (
    <section className="space-y-3">
      <SectionHeading
        title={t("home.support.title")}
        action={
          <Link href="/patient/support" className="text-sm font-semibold text-brand-700">
            {t("support.title")}
          </Link>
        }
      />
      <p className="-mt-2 text-sm text-slate-500">{t("home.support.body", { hours: support.hours })}</p>
      <ContactOptions />
      <EmergencyCard compact />
    </section>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────

function ActiveVisit({ booking }: { booking: BookingListItem }) {
  const t = useT();
  const name = booking.professional_name?.split(" ")[0] ?? "";
  return (
    <Link
      href={`/patient/bookings/${booking.id}`}
      className="flex items-center gap-4 rounded-(--radius-card) border border-brand-200 bg-white p-4 shadow-sm transition duration-150 ease-out hover:border-brand-400 active:scale-[0.99]"
    >
      <span className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
        <Icon name="activity" className="size-5" />
        <span className="absolute right-0 top-0 size-2.5 rounded-full bg-brand-600 ring-2 ring-white" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-slate-900">
          {t(`status.${booking.status}`, { name: name || "Your professional" })}
        </p>
        <p className="truncate text-sm text-slate-500">
          {booking.service_name_snapshot} · {formatDateTime(booking.scheduled_start_at)}
        </p>
      </div>
      <StatusBadge status={booking.status} />
      <Icon name="chevronRight" className="hidden size-5 shrink-0 text-slate-400 sm:block" />
    </Link>
  );
}

export default function PatientHomePage() {
  const { user } = useAuth();
  const t = useT();
  const now = useNow(60_000);
  const bookings = usePatientBookings();
  const addresses = useApi<Address[]>("/addresses");
  const sections = useConfig("app.home").sections.filter((s) => s.enabled);

  const all = bookings.data ?? [];
  const upcoming = all.filter((b) => isUpcoming(b, now)).sort((a, b) => a.scheduled_start_at.localeCompare(b.scheduled_start_at));
  const firstName = user?.full_name.split(" ")[0] ?? "";

  function render(section: HomeSection) {
    switch (section.type) {
      case "banners":
        return <BannersSection key="banners" />;
      case "categories":
        return <CategoriesSection key="categories" title={section.title ?? t("home.categories")} />;
      case "book_again":
        return <BookAgainSection key="book_again" title={section.title ?? t("home.bookAgain")} bookings={all} />;
      case "trust":
        return <TrustSection key="trust" />;
      case "how_it_works":
        return <HowItWorksSection key="how" title={section.title ?? t("home.howItWorks")} />;
      case "support":
        return <SupportSection key="support" />;
      default:
        // "offers" needs coupons, which aren't live yet.
        return null;
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t("home.greeting", { name: firstName })}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("home.subtitle")}</p>
        </div>
        <ButtonLink href="/patient/book" icon="plus">
          {t("home.bookVisit")}
        </ButtonLink>
      </div>

      {addresses.data?.length === 0 && (
        <Alert tone="info" title={t("home.addAddress")}>
          {t("home.addAddressBody")}{" "}
          <Link href="/patient/account" className="font-semibold underline">
            Add an address
          </Link>
        </Alert>
      )}

      {upcoming.length > 0 && (
        <section>
          <SectionHeading
            title={t("home.upcoming")}
            action={
              <Link href="/patient/bookings" className="text-sm font-semibold text-brand-700">
                {t("common.seeAll")}
              </Link>
            }
          />
          <div className={cn("grid gap-3", upcoming.length > 1 && "lg:grid-cols-2")}>
            {upcoming.slice(0, 2).map((booking) => (
              <ActiveVisit key={booking.id} booking={booking} />
            ))}
          </div>
        </section>
      )}

      {sections.map(render)}

      {sections.length === 0 && (
        <Card className="flex items-center gap-4 p-5">
          <ProfessionIcon type="nurse" />
          <p className="text-sm text-slate-600">Book a nurse, physiotherapist or caregiver for a visit at home.</p>
        </Card>
      )}
    </div>
  );
}
