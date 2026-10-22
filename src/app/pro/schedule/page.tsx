"use client";

import { useState } from "react";

import { useToast } from "@/components/toast";
import { Alert, Button, Card, PageHeader, PageSpinner } from "@/components/ui";
import { normalizeSlots, slotsAreValid, WeeklySchedule } from "@/components/weekly-schedule";
import { api, errorMessage } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import type { AvailabilitySlot } from "@/lib/types";

function ScheduleEditor({ initial, onSaved }: { initial: AvailabilitySlot[]; onSaved: () => void }) {
  const toast = useToast();
  const [slots, setSlots] = useState(initial);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(slots) !== JSON.stringify(initial);
  const valid = slotsAreValid(slots);

  async function save() {
    setSaving(true);
    try {
      await api("/professionals/me/availability/slots", { method: "PUT", body: slots });
      toast.success("Timings saved.");
      onSaved();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      <WeeklySchedule slots={slots} onChange={setSlots} />
      {slots.length === 0 && (
        <Alert tone="info" className="mt-5">
          No timings set — you&apos;ll see requests for any time of day.
        </Alert>
      )}
      <div className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-5">
        <Button onClick={save} loading={saving} disabled={!dirty || !valid}>
          Save timings
        </Button>
        {dirty && (
          <Button variant="ghost" onClick={() => setSlots(initial)}>
            Discard changes
          </Button>
        )}
      </div>
    </Card>
  );
}

export default function SchedulePage() {
  const { data, error, reload } = useApi<AvailabilitySlot[]>("/professionals/me/availability/slots");
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Your timings"
        subtitle="When you're free to take home visits. You'll only see requests that start in these hours."
      />
      {error ? (
        <Alert tone="error">{error.message}</Alert>
      ) : !data ? (
        <PageSpinner />
      ) : (
        // Keyed on the saved schedule so the editor resets to it after each save.
        <ScheduleEditor key={JSON.stringify(data)} initial={normalizeSlots(data)} onSaved={reload} />
      )}
    </div>
  );
}
