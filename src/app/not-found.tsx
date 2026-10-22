import { Logo } from "@/components/brand";
import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <Logo />
      <h1 className="mt-4 text-2xl font-bold text-slate-900">Page not found</h1>
      <p className="text-slate-500">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
      <ButtonLink href="/">Go home</ButtonLink>
    </div>
  );
}
