import { ProfessionIcon } from "@/components/brand";
import { Icon } from "@/components/icons";
import { cn } from "@/components/ui";
import type { ProfessionalType, Service } from "@/lib/types";

const TINTS: Record<ProfessionalType, string> = {
  nurse: "from-rose-50 to-rose-100/60",
  physiotherapist: "from-sky-50 to-sky-100/60",
  caretaker: "from-amber-50 to-amber-100/60",
  baby_care_specialist: "from-pink-50 to-pink-100/60",
  lab_technician: "from-violet-50 to-violet-100/60",
  doctor: "from-emerald-50 to-emerald-100/60",
};

/** The service's photo, or a soft tinted tile with its profession icon when there's none. */
export function ServiceImage({
  service,
  className,
  rounded = "rounded-xl",
}: {
  service: Pick<Service, "image_url" | "name" | "required_professional_type">;
  className?: string;
  rounded?: string;
}) {
  if (service.image_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- catalogue images live on any CDN the portal points at
      <img
        src={service.image_url}
        alt=""
        loading="lazy"
        decoding="async"
        className={cn("bg-slate-100 object-cover", rounded, className)}
      />
    );
  }
  return (
    <div
      className={cn("flex items-center justify-center bg-gradient-to-br", TINTS[service.required_professional_type], rounded, className)}
      aria-hidden="true"
    >
      <ProfessionIcon type={service.required_professional_type} className="bg-white/70" />
    </div>
  );
}

/** "★ 4.8 (120)" — or nothing when a service has no ratings yet. */
export function RatingPill({ avg, count, className }: { avg?: number | null; count?: number; className?: string }) {
  if (!avg || !count) return null;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-semibold text-slate-700", className)}>
      <Icon name="star" className="size-3.5 fill-amber-400 text-amber-400" />
      {avg.toFixed(1)}
      <span className="font-normal text-slate-500">({count.toLocaleString("en-IN")})</span>
    </span>
  );
}
