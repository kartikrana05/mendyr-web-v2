import { istDateKey, MARKET_TZ } from "@/lib/format";
import type { ProBooking } from "@/lib/types";

export interface EarningsSummary {
  today: number;
  week: number;
  month: number;
  todayCount: number;
  weekCount: number;
  monthCount: number;
  completed: ProBooking[];
}

/** Monday of the India-time week containing `now`, as "YYYY-MM-DD". */
function weekStartKey(now: Date): string {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: MARKET_TZ, weekday: "short" }).format(now);
  const offset = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(weekday);
  return istDateKey(new Date(now.getTime() - Math.max(0, offset) * 86_400_000));
}

const doneAt = (b: ProBooking) => b.completed_at ?? b.scheduled_start_at;

/** Today / this week (from Monday) / this month, from the professional's completed visits. */
export function summariseEarnings(bookings: ProBooking[], now = new Date()): EarningsSummary {
  const today = istDateKey(now);
  const week = weekStartKey(now);
  const month = today.slice(0, 7);
  const completed = bookings
    .filter((b) => b.status === "completed")
    .sort((a, b) => doneAt(b).localeCompare(doneAt(a)));
  const sum = { today: 0, week: 0, month: 0, todayCount: 0, weekCount: 0, monthCount: 0 };
  for (const b of completed) {
    const key = istDateKey(new Date(doneAt(b)));
    if (key === today) {
      sum.today += b.earning_amount;
      sum.todayCount += 1;
    }
    if (key >= week && key <= today) {
      sum.week += b.earning_amount;
      sum.weekCount += 1;
    }
    if (key.startsWith(month)) {
      sum.month += b.earning_amount;
      sum.monthCount += 1;
    }
  }
  return { ...sum, completed };
}

export { doneAt };
