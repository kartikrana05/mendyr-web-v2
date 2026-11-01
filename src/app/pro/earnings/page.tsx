"use client";

import Link from "next/link";

import { Icon } from "@/components/icons";
import { Alert, Card, cn, EmptyState, ListSkeleton, PageHeader } from "@/components/ui";
import { doneAt, summariseEarnings } from "@/lib/earnings";
import { formatDate, formatINR, formatTime, istDateKey } from "@/lib/format";
import type { ProBooking } from "@/lib/types";

import { useMyBookings } from "../professional-context";

function Tile({ label, amount, count, highlight }: { label: string; amount: number; count: number; highlight?: boolean }) {
  return (
    <Card className={cn("p-5", highlight && "border-emerald-200 bg-emerald-50/60")}>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{formatINR(amount)}</p>
      <p className="mt-0.5 text-xs text-slate-500">
        {count} {count === 1 ? "visit" : "visits"}
      </p>
    </Card>
  );
}

export default function ProEarningsPage() {
  const { data, error, loading } = useMyBookings();
  const summary = summariseEarnings(data ?? []);

  // Group completed visits by India-time day, newest first.
  const days = new Map<string, ProBooking[]>();
  for (const booking of summary.completed) {
    const key = istDateKey(new Date(doneAt(booking)));
    days.set(key, [...(days.get(key) ?? []), booking]);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Earnings" subtitle="What you take home from completed visits, after Mendyr's commission." />
      {error && !data ? (
        <Alert tone="error">{error.message}</Alert>
      ) : loading ? (
        <ListSkeleton rows={3} />
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Tile label="Today" amount={summary.today} count={summary.todayCount} highlight />
            <Tile label="This week" amount={summary.week} count={summary.weekCount} />
            <Tile label="This month" amount={summary.month} count={summary.monthCount} />
          </div>

          <p className="flex items-start gap-2 text-sm text-slate-500">
            <Icon name="wallet" className="mt-0.5 size-4 shrink-0" />
            Patients pay after the visit, in cash or UPI. Earnings shown are from your last 100 visits.
          </p>

          {summary.completed.length === 0 ? (
            <EmptyState icon="rupee" title="No completed visits yet">
              Accept a request and complete the visit — your earnings show up here.
            </EmptyState>
          ) : (
            <section className="space-y-5">
              {[...days.entries()].map(([day, visits]) => (
                <div key={day}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <p className="font-semibold text-slate-700">{formatDate(doneAt(visits[0]))}</p>
                    <p className="font-semibold text-emerald-700">
                      {formatINR(visits.reduce((sum, v) => sum + v.earning_amount, 0))}
                    </p>
                  </div>
                  <Card className="divide-y divide-slate-100">
                    {visits.map((visit) => (
                      <Link
                        key={visit.id}
                        href={`/pro/bookings/${visit.id}`}
                        className="flex items-center justify-between gap-3 p-4 hover:bg-slate-50"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">{visit.service_name}</p>
                          <p className="text-xs text-slate-500">
                            {formatTime(doneAt(visit))} · {visit.booking_code}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold text-slate-900">{formatINR(visit.earning_amount)}</p>
                      </Link>
                    ))}
                  </Card>
                </div>
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
