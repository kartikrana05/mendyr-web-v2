"use client";

import { FaqList } from "@/components/faq-list";
import { Icon, type IconName } from "@/components/icons";
import { Card, cn } from "@/components/ui";
import { useConfig, useFeature } from "@/lib/config";
import { telLink, whatsappLink } from "@/lib/format";
import { useT } from "@/lib/i18n";

function ContactTile({
  href,
  icon,
  label,
  detail,
  external,
  tone = "brand",
}: {
  href: string;
  icon: IconName;
  label: string;
  detail?: string;
  external?: boolean;
  tone?: "brand" | "green" | "red";
}) {
  const tones = {
    brand: "bg-brand-50 text-brand-700",
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-600",
  };
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="flex items-center gap-3 rounded-(--radius-card) border border-slate-200/80 bg-white p-4 shadow-xs transition duration-150 ease-out hover:border-brand-300 active:scale-[0.98]"
    >
      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", tones[tone])}>
        <Icon name={icon} className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-slate-900">{label}</span>
        {detail && <span className="block truncate text-xs text-slate-500">{detail}</span>}
      </span>
    </a>
  );
}

/** SOS and ambulance call buttons — shown while the `sos` flag is on. */
export function EmergencyCard({ compact = false }: { compact?: boolean }) {
  const support = useConfig("app.support");
  const sos = useFeature("sos");
  const t = useT();
  if (!sos) return null;
  return (
    <Card className={cn("border-red-200 bg-red-50/60", compact ? "p-4" : "p-5")}>
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
          <Icon name="siren" className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-red-900">{t("support.emergency")}</p>
          <p className="mt-0.5 text-sm text-red-800/80">{t("support.emergencyBody")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={telLink(support.sos_number)}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition active:scale-[0.97] hover:bg-red-700"
            >
              <Icon name="phone" className="size-4" /> {t("support.sos", { number: support.sos_number })}
            </a>
            <a
              href={telLink(support.ambulance_number)}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-300 bg-white px-4 text-sm font-semibold text-red-700 transition active:scale-[0.97] hover:bg-red-50"
            >
              <Icon name="ambulance" className="size-4" /> {t("support.ambulance", { number: support.ambulance_number })}
            </a>
          </div>
        </div>
      </div>
    </Card>
  );
}

/** Call / WhatsApp / email tiles from `app.support`; missing channels are left out. */
export function ContactOptions() {
  const support = useConfig("app.support");
  const t = useT();
  const tiles = [
    support.phone && (
      <ContactTile key="call" href={telLink(support.phone)} icon="phone" label={t("support.call")} detail={support.phone} />
    ),
    support.whatsapp && (
      <ContactTile
        key="wa"
        href={whatsappLink(support.whatsapp, "Hi Mendyr, I need help with")}
        icon="message"
        label={t("support.whatsapp")}
        detail={support.whatsapp}
        external
        tone="green"
      />
    ),
    support.email && (
      <ContactTile key="mail" href={`mailto:${support.email}`} icon="mail" label={t("support.email")} detail={support.email} />
    ),
  ].filter(Boolean);
  if (tiles.length === 0) return null;
  return <div className="grid gap-3 sm:grid-cols-3">{tiles}</div>;
}

/** The Help & support screen, for both patients and professionals. */
export function SupportScreen() {
  const support = useConfig("app.support");
  const t = useT();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t("support.title")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("support.subtitle", { hours: support.hours })}</p>
      </div>
      <EmergencyCard />
      <ContactOptions />
      {!support.phone && !support.whatsapp && !support.email && (
        <Card className="p-5 text-sm text-slate-600">
          Our helpline details will appear here shortly. For anything urgent about a visit, use the call button on
          your booking.
        </Card>
      )}
      {support.faqs.length > 0 && (
        <section>
          <h2 className="mb-3 text-base font-semibold text-slate-900">{t("support.faqs")}</h2>
          <FaqList faqs={support.faqs} />
        </section>
      )}
    </div>
  );
}
