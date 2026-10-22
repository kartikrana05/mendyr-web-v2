"use client";

import { useState, type FormEvent } from "react";

import { Icon } from "@/components/icons";
import {
  currentPosition,
  locatePincode,
  matchState,
  reverseGeocode,
  type Coords,
} from "@/components/location";
import { Alert, Button, Chip, Field, Input, Select, Textarea } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { INDIAN_STATES } from "@/lib/constants";
import { isValidIndianMobile, toE164India } from "@/lib/format";
import type { Address } from "@/lib/types";

const LABELS = ["home", "parents", "work", "other"];

export function addressLine(address: Address): string {
  return [address.line1, address.line2, address.landmark, `${address.city} ${address.pincode}`]
    .filter(Boolean)
    .join(", ");
}

type Values = {
  label: string;
  line1: string;
  line2: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  contact_name: string;
  contact_phone: string;
  instructions: string;
};

const EMPTY: Values = {
  label: "home",
  line1: "",
  line2: "",
  landmark: "",
  city: "",
  state: "",
  pincode: "",
  contact_name: "",
  contact_phone: "",
  instructions: "",
};

/**
 * New-address form. Matching needs coordinates, which nobody knows — so they come from
 * "Use my current location" (precise) or, failing that, from the pincode when saving.
 */
export function AddressForm({
  onSaved,
  onCancel,
  makeDefault = false,
}: {
  onSaved: (address: Address) => void;
  onCancel?: () => void;
  makeDefault?: boolean;
}) {
  const [values, setValues] = useState<Values>(EMPTY);
  const [forSomeoneElse, setForSomeoneElse] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set =
    (field: keyof Values) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setValues((v) => ({ ...v, [field]: e.target.value }));

  async function useMyLocation() {
    setFormError(null);
    setLocating(true);
    try {
      const { latitude, longitude } = await currentPosition();
      const found = await reverseGeocode(latitude, longitude);
      setCoords({ latitude, longitude, label: found?.label ?? "Your current location" });
      if (found) {
        setValues((v) => ({
          ...v,
          line2: v.line2 || found.area || "",
          city: v.city || found.city || "",
          state: v.state || matchState(found.state),
          pincode: v.pincode || found.pincode || "",
        }));
      }
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setLocating(false);
    }
  }

  function validate(): boolean {
    const found: Partial<Record<keyof Values, string>> = {};
    if (!values.line1.trim()) found.line1 = "Enter the house/flat number and building.";
    if (!values.city.trim()) found.city = "Enter the city.";
    if (!values.state) found.state = "Choose the state.";
    if (!/^[1-9]\d{5}$/.test(values.pincode.trim())) found.pincode = "Enter a 6-digit pincode.";
    if (forSomeoneElse) {
      if (!values.contact_name.trim()) found.contact_name = "Who should the professional ask for?";
      if (!isValidIndianMobile(values.contact_phone)) found.contact_phone = "Enter a 10-digit mobile number.";
    }
    setErrors(found);
    return Object.keys(found).length === 0;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!validate()) return;
    setFormError(null);
    setSaving(true);
    try {
      const location =
        coords ?? (await locatePincode(values.pincode.trim(), values.city.trim(), values.state));
      const address = await api<Address>("/addresses", {
        method: "POST",
        body: {
          label: values.label,
          line1: values.line1.trim(),
          line2: values.line2.trim() || null,
          landmark: values.landmark.trim() || null,
          city: values.city.trim(),
          state: values.state,
          pincode: values.pincode.trim(),
          location: { latitude: location.latitude, longitude: location.longitude },
          is_default: makeDefault,
          contact_name: forSomeoneElse ? values.contact_name.trim() : null,
          contact_phone: forSomeoneElse ? toE164India(values.contact_phone) : null,
          instructions_for_professional: values.instructions.trim() || null,
        },
      });
      onSaved(address);
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {formError && <Alert tone="warning">{formError}</Alert>}

      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-brand-50 p-3">
        <Button variant="outline" size="sm" icon="locate" loading={locating} onClick={useMyLocation}>
          Use my current location
        </Button>
        <p className="text-sm text-brand-900">
          {coords ? (
            <span className="inline-flex items-center gap-1">
              <Icon name="pin" className="size-4" /> {coords.label}
            </span>
          ) : (
            "Or fill in the address — we'll find it from the pincode."
          )}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {LABELS.map((label) => (
          <Chip key={label} selected={values.label === label} onClick={() => setValues((v) => ({ ...v, label }))}>
            {label[0].toUpperCase() + label.slice(1)}
          </Chip>
        ))}
      </div>

      <Field label="House / flat no., building" htmlFor="line1" error={errors.line1}>
        <Input id="line1" value={values.line1} onChange={set("line1")} placeholder="e.g. Flat 402, Sunrise Apartments" />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Area / locality" htmlFor="line2" optional>
          <Input id="line2" value={values.line2} onChange={set("line2")} placeholder="e.g. Indiranagar" />
        </Field>
        <Field label="Landmark" htmlFor="landmark" optional>
          <Input id="landmark" value={values.landmark} onChange={set("landmark")} placeholder="e.g. Near metro station" />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="City" htmlFor="city" error={errors.city}>
          <Input id="city" value={values.city} onChange={set("city")} />
        </Field>
        <Field label="State" htmlFor="state" error={errors.state}>
          <Select id="state" value={values.state} onChange={set("state")}>
            <option value="">Select</option>
            {INDIAN_STATES.map((state) => (
              <option key={state}>{state}</option>
            ))}
          </Select>
        </Field>
        <Field label="Pincode" htmlFor="pincode" error={errors.pincode}>
          <Input
            id="pincode"
            inputMode="numeric"
            maxLength={6}
            value={values.pincode}
            onChange={set("pincode")}
          />
        </Field>
      </div>

      <label className="flex items-center gap-2.5 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={forSomeoneElse}
          onChange={(e) => setForSomeoneElse(e.target.checked)}
          className="size-4 rounded border-slate-300 accent-brand-600"
        />
        Care is for someone else at this address (e.g. a parent)
      </label>
      {forSomeoneElse && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Their name" htmlFor="contact_name" error={errors.contact_name}>
            <Input id="contact_name" value={values.contact_name} onChange={set("contact_name")} />
          </Field>
          <Field label="Their mobile number" htmlFor="contact_phone" error={errors.contact_phone}>
            <Input
              id="contact_phone"
              type="tel"
              inputMode="numeric"
              value={values.contact_phone}
              onChange={set("contact_phone")}
            />
          </Field>
        </div>
      )}

      <Field label="Directions for the professional" htmlFor="instructions" optional>
        <Textarea
          id="instructions"
          rows={2}
          value={values.instructions}
          onChange={set("instructions")}
          placeholder="e.g. Ring the bell twice; parking available inside the gate"
        />
      </Field>

      <div className="flex gap-3">
        <Button type="submit" loading={saving}>
          Save address
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
