"use client";

import { Icon } from "@/components/icons";
import { Button, Select, Switch } from "@/components/ui";
import { DAYS } from "@/lib/constants";
import { clockLabel } from "@/lib/format";
import type { AvailabilitySlot } from "@/lib/types";

const TIMES = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  return `${String(h).padStart(2, "0")}:${i % 2 ? "30" : "00"}`;
});
const END_TIMES = [...TIMES.slice(1), "23:59"];

const range = (days: number[], start_time: string, end_time: string): AvailabilitySlot[] =>
  days.map((day_of_week) => ({ day_of_week, start_time, end_time }));

export const PRESETS: { label: string; slots: AvailabilitySlot[] }[] = [
  { label: "Weekday evenings", slots: range([0, 1, 2, 3, 4], "18:00", "22:00") },
  { label: "Weekends", slots: range([5, 6], "09:00", "18:00") },
  { label: "Mornings", slots: range([0, 1, 2, 3, 4, 5, 6], "07:00", "11:00") },
  { label: "Full days", slots: range([0, 1, 2, 3, 4, 5, 6], "08:00", "20:00") },
];

/** "09:00:00" (API) -> "09:00" (form). */
export function normalizeSlots(slots: AvailabilitySlot[]): AvailabilitySlot[] {
  return slots.map((s) => ({ ...s, start_time: s.start_time.slice(0, 5), end_time: s.end_time.slice(0, 5) }));
}

export function slotsAreValid(slots: AvailabilitySlot[]): boolean {
  return slots.every((s) => s.end_time > s.start_time);
}

/** Weekly working hours: a row per day, each with one or more time ranges. */
export function WeeklySchedule({
  slots,
  onChange,
}: {
  slots: AvailabilitySlot[];
  onChange: (slots: AvailabilitySlot[]) => void;
}) {
  const update = (index: number, patch: Partial<AvailabilitySlot>) =>
    onChange(slots.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)));
  const remove = (index: number) => onChange(slots.filter((_, i) => i !== index));
  const add = (day: number) => onChange([...slots, { day_of_week: day, start_time: "09:00", end_time: "17:00" }]);
  const clearDay = (day: number) => onChange(slots.filter((s) => s.day_of_week !== day));

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">Quick start</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <Button key={preset.label} size="sm" variant="secondary" onClick={() => onChange(preset.slots)}>
              {preset.label}
            </Button>
          ))}
          {slots.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => onChange([])}>
              Clear all
            </Button>
          )}
        </div>
      </div>

      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
        {DAYS.map((dayName, day) => {
          const daySlots = slots
            .map((slot, index) => ({ slot, index }))
            .filter(({ slot }) => slot.day_of_week === day);
          const on = daySlots.length > 0;
          return (
            <div key={dayName} className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-start">
              <div className="flex w-36 shrink-0 items-center gap-3">
                <Switch
                  checked={on}
                  label={`Available on ${dayName}`}
                  onChange={(checked) => (checked ? add(day) : clearDay(day))}
                />
                <span className={on ? "text-sm font-medium text-slate-900" : "text-sm text-slate-400"}>
                  {dayName}
                </span>
              </div>
              <div className="flex-1 space-y-2">
                {!on && <p className="pt-1 text-sm text-slate-400">Not available</p>}
                {daySlots.map(({ slot, index }) => (
                  <div key={index} className="flex items-center gap-2">
                    <Select
                      aria-label={`${dayName} from`}
                      size="sm"
                      value={slot.start_time}
                      onChange={(e) => update(index, { start_time: e.target.value })}
                    >
                      {TIMES.map((t) => (
                        <option key={t} value={t}>
                          {clockLabel(t)}
                        </option>
                      ))}
                    </Select>
                    <span className="text-sm text-slate-400">to</span>
                    <Select
                      aria-label={`${dayName} until`}
                      size="sm"
                      value={slot.end_time}
                      onChange={(e) => update(index, { end_time: e.target.value })}
                    >
                      {END_TIMES.map((t) => (
                        <option key={t} value={t}>
                          {clockLabel(t)}
                        </option>
                      ))}
                    </Select>
                    <button
                      type="button"
                      aria-label="Remove these hours"
                      onClick={() => remove(index)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                      <Icon name="x" className="size-4" />
                    </button>
                    {slot.end_time <= slot.start_time && (
                      <span className="text-xs text-red-600">End must be after start</span>
                    )}
                  </div>
                ))}
                {on && (
                  <button
                    type="button"
                    onClick={() => add(day)}
                    className="text-sm font-medium text-brand-700 hover:underline"
                  >
                    + Add more hours
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-slate-500">
        Times are India time (IST). A night shift past midnight is two ranges — e.g. Monday 8 pm to
        midnight, and Tuesday 12 am to 8 am.
      </p>
    </div>
  );
}
