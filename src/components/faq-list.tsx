import { Icon } from "@/components/icons";

/** Question-and-answer rows that expand in place (native <details>, no JS). */
export function FaqList({ faqs }: { faqs: { q: string; a: string }[] }) {
  return (
    <div className="divide-y divide-slate-100 rounded-(--radius-card) border border-slate-200/80 bg-white">
      {faqs.map((faq) => (
        <details key={faq.q} className="group p-4 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-slate-900">
            {faq.q}
            <Icon name="chevronDown" className="size-4 shrink-0 text-slate-400 transition group-open:rotate-180" />
          </summary>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{faq.a}</p>
        </details>
      ))}
    </div>
  );
}
