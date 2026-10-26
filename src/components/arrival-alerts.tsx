"use client";

import Link from "next/link";
import { useState } from "react";

import { Icon, type IconName } from "@/components/icons";
import { cn } from "@/components/ui";

interface Tracked<T> {
  /** The poll result last diffed, so each new response is compared exactly once. */
  from?: T[];
  /** Ids of arrivals not yet seen or dismissed, newest first. */
  ids: string[];
}

/**
 * Items of a polled `list` that `arrived` since the previous poll, kept until dismissed or
 * gone from the list. The first response is the baseline (nothing has arrived on load).
 */
export function useArrivals<T extends { id: string }>(
  list: T[] | undefined,
  arrived: (item: T, before: T | undefined) => boolean,
): [T[], () => void] {
  const [tracked, setTracked] = useState<Tracked<T>>({ ids: [] });

  if (list && list !== tracked.from) {
    const before = new Map(tracked.from?.map((item) => [item.id, item]));
    const present = new Set(list.map((item) => item.id));
    const fresh = tracked.from ? list.filter((item) => arrived(item, before.get(item.id))).map((item) => item.id) : [];
    setTracked({ from: list, ids: [...new Set([...fresh, ...tracked.ids.filter((id) => present.has(id))])] });
  }

  const byId = new Map(list?.map((item) => [item.id, item]));
  return [tracked.ids.flatMap((id) => byId.get(id) ?? []), () => setTracked({ ...tracked, ids: [] })];
}

type Tone = "brand" | "green" | "red";

const TONES: Record<Tone, { border: string; icon: string; ping: string; dot: string; button: string }> = {
  brand: {
    border: "border-brand-200",
    icon: "bg-brand-50 text-brand-700",
    ping: "bg-brand-500",
    dot: "bg-brand-600",
    button: "bg-brand-600 hover:bg-brand-700",
  },
  green: {
    border: "border-emerald-200",
    icon: "bg-emerald-50 text-emerald-700",
    ping: "bg-emerald-500",
    dot: "bg-emerald-600",
    button: "bg-emerald-600 hover:bg-emerald-700",
  },
  red: {
    border: "border-red-200",
    icon: "bg-red-50 text-red-600",
    ping: "bg-red-500",
    dot: "bg-red-600",
    button: "bg-red-600 hover:bg-red-700",
  },
};

export function AlertCard({
  tone,
  icon,
  title,
  href,
  action,
  onDismiss,
  children,
}: {
  tone: Tone;
  icon: IconName;
  title: string;
  href: string;
  action: string;
  onDismiss: () => void;
  children: React.ReactNode;
}) {
  const classes = TONES[tone];
  return (
    <div className={cn("pointer-events-auto rounded-2xl border bg-white p-4 shadow-lg", classes.border)}>
      <div className="flex items-start gap-3">
        <span className={cn("relative flex size-10 shrink-0 items-center justify-center rounded-xl", classes.icon)}>
          <Icon name={icon} className="size-5" />
          <span className={cn("absolute -right-0.5 -top-0.5 size-2.5 animate-ping rounded-full", classes.ping)} />
          <span className={cn("absolute -right-0.5 -top-0.5 size-2.5 rounded-full", classes.dot)} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          {children}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-m-1 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <Icon name="x" className="size-4" />
        </button>
      </div>
      <Link
        href={href}
        onClick={onDismiss}
        className={cn(
          "mt-3 flex h-9 items-center justify-center rounded-xl text-sm font-semibold text-white",
          classes.button,
        )}
      >
        {action}
      </Link>
    </div>
  );
}

/** Stacks alert cards over the top-right of the page (full width on mobile). */
export function AlertStack({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 top-20 z-40 flex flex-col gap-3 sm:left-auto sm:right-6 sm:w-96"
    >
      {children}
    </div>
  );
}
