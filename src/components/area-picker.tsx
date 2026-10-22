"use client";

import { useState } from "react";

import { Icon } from "@/components/icons";
import { currentPosition, locatePincode, reverseGeocode, type Coords } from "@/components/location";
import { Alert, Button, Chip, Field, Input } from "@/components/ui";
import { errorMessage } from "@/lib/api";

export const RADIUS_OPTIONS = [3, 5, 10, 15, 20, 30];

/** Where a professional works from: their device location, or a pincode they type. */
export function AreaPicker({ value, onChange }: { value: Coords | null; onChange: (coords: Coords) => void }) {
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [busy, setBusy] = useState<"gps" | "pincode" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function useMyLocation() {
    setError(null);
    setBusy("gps");
    try {
      const { latitude, longitude } = await currentPosition();
      const found = await reverseGeocode(latitude, longitude);
      onChange({ latitude, longitude, label: found?.label ?? "Your current location" });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function findPincode() {
    if (!/^[1-9]\d{5}$/.test(pincode.trim())) {
      setError("Enter a 6-digit pincode.");
      return;
    }
    setError(null);
    setBusy("pincode");
    try {
      const found = await locatePincode(pincode.trim(), city.trim() || undefined);
      onChange(found);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {error && <Alert tone="warning">{error}</Alert>}
      {value && (
        <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-900">
          <Icon name="pin" className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-semibold">{value.label}</p>
            {value.precision === "city" && (
              <p className="mt-0.5 text-emerald-800">
                We matched the city, not the exact pincode — use your current location for better
                matches.
              </p>
            )}
          </div>
        </div>
      )}
      <Button variant="outline" icon="locate" loading={busy === "gps"} onClick={useMyLocation}>
        Use my current location
      </Button>
      <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-slate-400">
        <span className="h-px flex-1 bg-slate-200" /> or enter a pincode <span className="h-px flex-1 bg-slate-200" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field label="Pincode" htmlFor="area-pincode">
          <Input
            id="area-pincode"
            inputMode="numeric"
            maxLength={6}
            value={pincode}
            onChange={(e) => setPincode(e.target.value)}
            placeholder="560038"
          />
        </Field>
        <Field label="City" htmlFor="area-city" optional>
          <Input id="area-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Bengaluru" />
        </Field>
        <Button variant="secondary" loading={busy === "pincode"} onClick={findPincode}>
          Find
        </Button>
      </div>
    </div>
  );
}

export function RadiusPicker({ value, onChange }: { value: number; onChange: (km: number) => void }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-slate-700">How far will you travel?</p>
      <div className="flex flex-wrap gap-2">
        {RADIUS_OPTIONS.map((km) => (
          <Chip key={km} selected={value === km} onClick={() => onChange(km)}>
            {km} km
          </Chip>
        ))}
      </div>
    </div>
  );
}
