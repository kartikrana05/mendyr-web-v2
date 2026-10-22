import { ProfessionIcon } from "@/components/brand";
import { Icon, type IconName } from "@/components/icons";
import { ServiceShowcase } from "@/components/service-catalog";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { Avatar, Badge, ButtonLink } from "@/components/ui";
import { PROFESSIONAL_SHARE_PCT } from "@/lib/constants";

const STEPS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "list",
    title: "Pick a service",
    body: "Nursing, physiotherapy, elder care, mother & baby care or lab sample collection.",
  },
  {
    icon: "calendar",
    title: "Choose a time and address",
    body: "Book for yourself or a family member — for today or any day in the next two weeks.",
  },
  {
    icon: "check",
    title: "A professional nearby accepts",
    body: "You see who's coming and can call them. Pay after the visit.",
  },
];

const PRO_POINTS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "clock",
    title: "Work when you're free",
    body: "Set your weekly timings — evenings, weekends, around your hospital shifts.",
  },
  {
    icon: "pin",
    title: "Requests near you",
    body: "Only see visits inside the area you choose, from 3 to 30 km.",
  },
  {
    icon: "rupee",
    title: `Keep ${PROFESSIONAL_SHARE_PCT}% of every visit`,
    body: "See exactly what you'll earn before you accept a visit.",
  },
];

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-white to-white">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:py-24">
            <div>
              <Badge tone="brand" className="mb-5">
                <Icon name="sparkles" className="size-3.5" /> Home healthcare, on demand
              </Badge>
              <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl">
                Nurses and caregivers, <span className="text-brand-600">at your doorstep</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
                Book a nurse, physiotherapist, elder-care attendant or lab technician for a visit at
                home — in a couple of minutes. Pay after the visit.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/services" size="lg" icon="calendar">
                  Book a service
                </ButtonLink>
                <ButtonLink href="/register/professional" size="lg" variant="outline">
                  Join as a professional
                </ButtonLink>
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
                {["Book in under 2 minutes", "See who's coming", "Pay after the visit"].map((point) => (
                  <li key={point} className="flex items-center gap-1.5">
                    <Icon name="check" className="size-4 text-brand-600" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            {/* Illustration: what a booking looks like, drawn with real UI pieces */}
            <div className="relative mx-auto w-full max-w-md lg:mx-0 lg:ml-auto">
              <div className="absolute -right-6 -top-6 size-40 rounded-full bg-brand-100 blur-2xl" />
              <div className="relative space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ProfessionIcon type="nurse" />
                      <div>
                        <p className="font-semibold text-slate-900">General nursing visit</p>
                        <p className="text-sm text-slate-500">Today · 6:00 pm · Indiranagar</p>
                      </div>
                    </div>
                    <Badge tone="blue">Confirmed</Badge>
                  </div>
                  <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                    <Avatar name="Priya Sharma" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">Priya Sharma</p>
                      <p className="text-xs text-slate-500">Nurse · 6 yrs experience · ★ 4.9</p>
                    </div>
                    <span className="flex size-9 items-center justify-center rounded-full bg-brand-600 text-white">
                      <Icon name="phone" className="size-4" />
                    </span>
                  </div>
                </div>
                <div className="ml-10 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-200/60">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      <Icon name="rupee" className="size-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">You earn ₹1,440</p>
                      <p className="text-xs text-slate-500">Evening shift · 4.2 km away</p>
                    </div>
                    <span className="ml-auto rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white">
                      Accept
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Services */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">Care we bring home</h2>
              <p className="mt-2 text-slate-600">Prices include the visit. GST is added at checkout.</p>
            </div>
            <ButtonLink href="/services" variant="secondary" icon="arrowRight">
              All services
            </ButtonLink>
          </div>
          <ServiceShowcase />
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-20 border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">How it works</h2>
            <div className="mt-10 grid gap-8 md:grid-cols-3">
              {STEPS.map((step, index) => (
                <div key={step.title}>
                  <div className="flex items-center gap-3">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-brand-600 text-white">
                      <Icon name={step.icon} />
                    </span>
                    <span className="text-sm font-semibold text-brand-700">Step {index + 1}</span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">{step.title}</h3>
                  <p className="mt-1.5 text-slate-600">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* For professionals */}
        <section id="for-professionals" className="scroll-mt-20 mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="overflow-hidden rounded-3xl bg-slate-900 px-6 py-12 text-white sm:px-12">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-center">
              <div>
                <Badge tone="dark">For nurses & medical staff</Badge>
                <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                  Turn your free hours into extra income
                </h2>
                <p className="mt-4 text-lg text-slate-300">
                  Nurses, physiotherapists, caretakers, lab technicians — take home visits near you,
                  on the days and times that suit you.
                </p>
                <ButtonLink href="/register/professional" size="lg" className="mt-8">
                  Start earning with Mendyr
                </ButtonLink>
              </div>
              <div className="space-y-5">
                {PRO_POINTS.map((point) => (
                  <div key={point.title} className="flex gap-4 rounded-2xl bg-white/5 p-5">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/20 text-brand-300">
                      <Icon name={point.icon} />
                    </span>
                    <div>
                      <p className="font-semibold">{point.title}</p>
                      <p className="mt-1 text-sm text-slate-300">{point.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
