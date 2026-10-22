import Image from "next/image";
import Link from "next/link";

import { Icon, type IconName } from "@/components/icons";
import { cn } from "@/components/ui";
import type { ProfessionalType } from "@/lib/types";

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2", className)} aria-label="Mendyr home">
      <Image src="/mendyr.png" alt="" width={36} height={36} priority className="size-9" />
      <span className="font-display text-xl font-bold tracking-tight text-slate-900">Mendyr</span>
    </Link>
  );
}

const PROFESSION_ICON: Record<ProfessionalType, IconName> = {
  nurse: "heart",
  physiotherapist: "activity",
  caretaker: "users",
  baby_care_specialist: "baby",
  lab_technician: "flask",
  doctor: "stethoscope",
};

const PROFESSION_COLORS: Record<ProfessionalType, string> = {
  nurse: "bg-rose-50 text-rose-600",
  physiotherapist: "bg-sky-50 text-sky-600",
  caretaker: "bg-amber-50 text-amber-600",
  baby_care_specialist: "bg-pink-50 text-pink-600",
  lab_technician: "bg-violet-50 text-violet-600",
  doctor: "bg-emerald-50 text-emerald-600",
};

export function ProfessionIcon({ type, className }: { type: ProfessionalType; className?: string }) {
  return (
    <span
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-xl",
        PROFESSION_COLORS[type],
        className,
      )}
    >
      <Icon name={PROFESSION_ICON[type]} className="size-5" />
    </span>
  );
}
