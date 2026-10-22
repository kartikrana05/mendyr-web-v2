"use client";

import { useState } from "react";

import { AddressForm, addressLine } from "@/components/address-form";
import { Icon } from "@/components/icons";
import { ProfileForm } from "@/components/profile-form";
import { useToast } from "@/components/toast";
import { Badge, Button, Card, PageHeader, SectionHeading } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import type { Address } from "@/lib/types";

export default function PatientAccountPage() {
  const toast = useToast();
  const addresses = useApi<Address[]>("/addresses");
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  async function makeDefault(address: Address) {
    setBusy(address.id);
    try {
      await api(`/addresses/${address.id}`, { method: "PATCH", body: { is_default: true } });
      await addresses.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function remove(address: Address) {
    if (!window.confirm(`Delete the "${address.label}" address?`)) return;
    setBusy(address.id);
    try {
      await api(`/addresses/${address.id}`, { method: "DELETE" });
      await addresses.reload();
      toast.success("Address deleted.");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  const list = addresses.data ?? [];
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader title="Account" />
      <ProfileForm />

      <section>
        <SectionHeading
          title="Saved addresses"
          action={
            !adding && (
              <Button size="sm" variant="secondary" icon="plus" onClick={() => setAdding(true)}>
                Add address
              </Button>
            )
          }
        />
        <div className="space-y-3">
          {adding && (
            <Card className="p-5">
              <AddressForm
                makeDefault={list.length === 0}
                onSaved={() => {
                  setAdding(false);
                  void addresses.reload();
                  toast.success("Address saved.");
                }}
                onCancel={() => setAdding(false)}
              />
            </Card>
          )}
          {list.map((address) => (
            <Card key={address.id} className="flex items-start gap-3 p-4">
              <Icon name="pin" className="mt-0.5 size-5 shrink-0 text-slate-400" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-semibold capitalize text-slate-900">
                  {address.label}
                  {address.is_default && <Badge tone="brand">Default</Badge>}
                </p>
                <p className="mt-0.5 text-sm text-slate-600">{addressLine(address)}</p>
                {address.contact_name && (
                  <p className="mt-0.5 text-xs text-slate-500">For {address.contact_name}</p>
                )}
                <div className="mt-2 flex gap-1">
                  {!address.is_default && (
                    <Button size="sm" variant="ghost" disabled={busy === address.id} onClick={() => makeDefault(address)}>
                      Make default
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="dangerGhost"
                    icon="trash"
                    disabled={busy === address.id}
                    onClick={() => remove(address)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          {addresses.data && list.length === 0 && !adding && (
            <p className="text-sm text-slate-500">No saved addresses yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
