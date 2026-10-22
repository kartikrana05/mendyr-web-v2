"use client";

import { useState, type FormEvent } from "react";

import { useToast } from "@/components/toast";
import { Button, Card, Field, Input } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { isValidIndianMobile, toE164India } from "@/lib/format";
import type { User } from "@/lib/types";

/** Name, mobile and email — shared by the patient and professional account pages. */
export function ProfileForm() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user?.full_name ?? "");
  const [phone, setPhone] = useState(user?.phone_number.replace(/^\+91/, "") ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [errors, setErrors] = useState<{ name?: string; phone?: string; email?: string }>({});
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const found: typeof errors = {};
    if (name.trim().length < 2) found.name = "Please enter your full name.";
    if (!isValidIndianMobile(phone)) found.phone = "Enter a 10-digit mobile number.";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) found.email = "Enter a valid email address.";
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      const updated = await api<User>("/users/me", {
        method: "PATCH",
        body: { full_name: name.trim(), phone_number: toE164India(phone), email: email.trim() },
      });
      setUser(updated);
      toast.success("Profile saved.");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-5">
      <h2 className="mb-4 font-semibold text-slate-900">Your details</h2>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field label="Full name" htmlFor="profile-name" error={errors.name}>
          <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Mobile number" htmlFor="profile-phone" error={errors.phone}>
            <Input id="profile-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="Email" htmlFor="profile-email" error={errors.email}>
            <Input id="profile-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
        </div>
        <Button type="submit" loading={saving}>
          Save changes
        </Button>
      </form>
    </Card>
  );
}
