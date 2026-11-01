import { Icon, type IconName } from "@/components/icons";
import { PopularServices, ServiceShowcase } from "@/components/service-catalog";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { Badge, ButtonLink } from "@/components/ui";

const STEPS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "list",
    title: "Pick a service",
    body: "Nursing, physiotherapy, elder care, mother & baby care or lab sample collection.",
  },
  {
    icon: "calendar",
    title: "Choose a time and address",
    body: "Book for yourself or a parent — for today or any day in the next two weeks.",
  },
  {
    icon: "route",
    title: "Track the visit",
    body: "See who's coming, when they set off and when the visit starts. Pay after the visit.",
  },
];

const TRUST: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "shield",
    title: "Verified professionals",
    body: "Our team checks every professional's ID and qualifications before their first visit.",
  },
  {
    icon: "lock",
    title: "Visit PIN",
    body: "The visit starts only when you share your PIN with the professional at your door.",
  },
  {
    icon: "female",
    title: "Female caregiver option",
    body: "Prefer a woman for personal care? Ask for a female professional when you book.",
  },
  {
    icon: "wallet",
    title: "Pay after the visit",
    body: "Cash or UPI once the visit is done. Nothing is charged online when you book.",
  },
  {
    icon: "activity",
    title: "Visit notes and vitals",
    body: "See what was done and the readings taken — useful when you're caring from another city.",
  },
  {
    icon: "siren",
    title: "Help in an emergency",
    body: "Emergency and ambulance numbers are one tap away on every booking, and our care team is a call away.",
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
    body: "Only see visits inside the area you choose, and never two that clash.",
  },
  {
    icon: "rupee",
    title: "Know your earning upfront",
    body: "Every request shows exactly what you take home before you accept it.",
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
                <Icon name="shield" className="size-3.5" /> Verified care, at home
              </Badge>
              <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl">
                Nurses and caregivers, <span className="text-brand-600">at your doorstep</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
                Book a verified nurse, physiotherapist, elder-care attendant or lab technician for a visit at home — for
                yourself or your parents. Pay after the visit, in cash or UPI.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/services" size="lg" icon="calendar">
                  Book a visit
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

            <div className="relative mx-auto w-full max-w-md lg:mx-0 lg:ml-auto">
              <div className="absolute -right-6 -top-6 size-40 rounded-full bg-brand-100 blur-2xl" aria-hidden="true" />
              <div className="relative">
                <PopularServices />
              </div>
            </div>
          </div>
        </section>

        {/* Services */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">Care we bring home</h2>
              <p className="mt-2 text-slate-600">Prices are per visit. GST is added at checkout.</p>
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
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">How Mendyr works</h2>
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

        {/* Trust & safety */}
        <section id="safety" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Safe, accountable care</h2>
            <p className="mt-2 text-slate-600">
              Letting someone into your home to care for a loved one takes trust. Here&apos;s how we earn it.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TRUST.map((item) => (
              <div key={item.title} className="rounded-(--radius-card) border border-slate-200/80 bg-white p-5 shadow-xs">
                <span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <Icon name={item.icon} className="size-5" />
                </span>
                <h3 className="mt-4 font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* For professionals */}
        <section id="for-professionals" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-16 sm:px-6">
          <div className="overflow-hidden rounded-3xl bg-slate-900 px-6 py-12 text-white sm:px-12">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-center">
              <div>
                <Badge tone="dark">For nurses & medical staff</Badge>
                <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Turn your free hours into extra income</h2>
                <p className="mt-4 text-lg text-slate-300">
                  Nurses, physiotherapists, caretakers, lab technicians — take home visits near you, on the days and
                  times that suit you.
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
