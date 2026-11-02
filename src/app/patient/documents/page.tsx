"use client";

import Link from "next/link";
import { useState } from "react";

import { MedicalDocumentRow, MedicalUploadForm } from "@/components/documents";
import { Icon } from "@/components/icons";
import { ConfirmDialog } from "@/components/modal";
import { useToast } from "@/components/toast";
import { Alert, Button, ButtonLink, Card, EmptyState, ListSkeleton, PageHeader, SectionHeading } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { useFeature } from "@/lib/config";
import { medicalDocumentLabel, VIEW_URL_REFRESH_MS } from "@/lib/documents";
import { useApi } from "@/lib/hooks";
import { useT } from "@/lib/i18n";
import type { MedicalDocument } from "@/lib/types";

export default function PatientDocumentsPage() {
  const t = useT();
  const toast = useToast();
  const enabled = useFeature("prescription_upload");
  // View links expire within minutes — keep the list fresh while the page is open.
  const docs = useApi<MedicalDocument[]>(enabled ? "/medical-documents" : null, { pollMs: VIEW_URL_REFRESH_MS });
  const [deleting, setDeleting] = useState<MedicalDocument | null>(null);
  const [removing, setRemoving] = useState(false);

  if (!enabled) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title={t("mdocs.title")} />
        <EmptyState
          icon="file"
          title={t("mdocs.unavailable")}
          action={
            <ButtonLink href="/patient/account" variant="outline">
              {t("common.back")}
            </ButtonLink>
          }
        />
      </div>
    );
  }

  async function remove(doc: MedicalDocument) {
    setRemoving(true);
    try {
      await api(`/medical-documents/${doc.id}`, { method: "DELETE" });
      if (docs.data) docs.mutate(docs.data.filter((d) => d.id !== doc.id));
      toast.success(t("docs.deleted"));
      setDeleting(null);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setRemoving(false);
    }
  }

  const list = docs.data ?? [];
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/patient/account" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800">
        <Icon name="chevronLeft" className="size-4" /> {t("nav.account")}
      </Link>
      <PageHeader title={t("mdocs.title")} subtitle={t("mdocs.subtitle")} />

      <Card className="p-5">
        <h2 className="mb-4 font-semibold text-slate-900">{t("mdocs.add")}</h2>
        <MedicalUploadForm
          onUploaded={(doc) => {
            docs.mutate([doc, ...list]);
            toast.success(t("docs.uploaded"));
          }}
        />
      </Card>

      <section>
        <SectionHeading title={t("mdocs.title")} />
        {docs.error && !docs.data && <Alert tone="error">{docs.error.message}</Alert>}
        {docs.loading ? (
          <ListSkeleton rows={2} />
        ) : list.length === 0 ? (
          docs.data && (
            <EmptyState icon="file" title={t("mdocs.empty")}>
              {t("mdocs.emptyBody")}
            </EmptyState>
          )
        ) : (
          <Card className="divide-y divide-slate-100 px-4">
            {list.map((doc) => (
              <MedicalDocumentRow
                key={doc.id}
                doc={doc}
                meta={
                  doc.booking_id && (
                    <Link href={`/patient/bookings/${doc.booking_id}`} className="font-medium text-brand-700 hover:underline">
                      · {t("mdocs.attached")}
                    </Link>
                  )
                }
              >
                <Button size="sm" variant="dangerGhost" icon="trash" onClick={() => setDeleting(doc)} aria-label={t("docs.delete")}>
                  <span className="hidden sm:inline">{t("docs.delete")}</span>
                </Button>
              </MedicalDocumentRow>
            ))}
          </Card>
        )}
      </section>

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove(deleting)}
        loading={removing}
        title={t("docs.deleteTitle")}
        description={
          deleting ? `${deleting.title || medicalDocumentLabel(deleting.document_type, t)} — ${t("docs.deleteBody")}` : undefined
        }
        confirmLabel={t("docs.delete")}
        cancelLabel={t("docs.keep")}
        tone="danger"
      />
    </div>
  );
}
