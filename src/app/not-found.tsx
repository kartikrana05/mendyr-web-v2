import { Logo } from "@/components/brand";
import { Icon } from "@/components/icons";
import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <Logo />
      <span className="mt-6 flex size-12 items-center justify-center rounded-full bg-brand-50 text-brand-700">
        <Icon name="pin" className="size-6" />
      </span>
      <h1 className="text-2xl font-bold text-slate-900">We couldn&apos;t find that page</h1>
      <p className="max-w-sm text-slate-500">
        The link may be old or mistyped. Head back home, or look through our services.
      </p>
      <div className="mt-2 flex gap-3">
        <ButtonLink href="/">Go home</ButtonLink>
        <ButtonLink href="/services" variant="outline">
          Browse services
        </ButtonLink>
      </div>
    </div>
  );
}
