"use client";

import Link from "next/link";
import { useState } from "react";

import { FileIcon, FilePicker, UploadStatus, useUpload, ViewLink } from "@/components/documents";
import { ConfirmDialog } from "@/components/modal";
import { useToast } from "@/components/toast";
import { Alert, Badge, Button, Card, ListSkeleton, PageHeader, SectionHeading } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { useConfig } from "@/lib/config";
import { currentDocument, KYC_PATH, PRO_DOCUMENT_TYPES, proDocumentLabel, VIEW_URL_REFRESH_MS } from "@/lib/documents";
import { formatDate } from "@/lib/format";
import { useApi } from "@/lib/hooks";
import { useT } from "@/lib/i18n";
import type { ProDocumentType, ProfessionalDocument } from "@/lib/types";

import { useProfessional } from "../professional-context";

type TypeStatus = "missing" | ProfessionalDocument["verification_status"];

const STATUS_TONE = {
  missing: "gray",
  pending: "amber",
  in_review: "amber",
  approved: "green",
  rejected: "red",
} as const;

function DocumentTypeRow({
  type,
  doc,
  required,
  onChanged,
  onDelete,
}: {
  type: ProDocumentType;
  doc: ProfessionalDocument | null;
  required: boolean;
  onChanged: () => Promise<void>;
  onDelete: (doc: ProfessionalDocument) => void;
}) {
  const t = useT();
  const toast = useToast();
  const upload = useUpload();
  const status: TypeStatus = doc?.verification_status ?? "missing";
  const approved = status === "approved";

  async function send(file: File) {
    const saved = await upload.run(KYC_PATH, file, (fileKey) =>
      api<ProfessionalDocument>(KYC_PATH, { method: "POST", body: { document_type: type, file_key: fileKey } }),
    );
    if (saved) {
      toast.success(t("docs.uploaded"));
      await onChanged();
    }
  }

  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <FileIcon contentType={doc?.content_type ?? "application/pdf"} tone={doc ? "brand" : "slate"} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
            {proDocumentLabel(type, t)}
            {required && status === "missing" && <Badge tone="brand">{t("kyc.required")}</Badge>}
            <Badge tone={STATUS_TONE[status]}>{t(`kyc.status.${status}`)}</Badge>
          </p>
          {doc && (
            <p className="mt-0.5 text-xs text-slate-500">{t("docs.uploadedOn", { date: formatDate(doc.created_at) })}</p>
          )}
          {status === "rejected" && doc?.rejection_reason && (
            <p className="mt-1.5 rounded-lg bg-red-50 px-2.5 py-1.5 text-sm text-red-800">
              {t("kyc.reason", { reason: doc.rejection_reason })}
            </p>
          )}
          {!approved && (
            <div className="mt-2">
              <UploadStatus stage={upload.stage} error={upload.error} />
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1 sm:justify-end">
        {doc && <ViewLink href={doc.view_url} />}
        {doc && !approved && (
          <Button size="sm" variant="dangerGhost" icon="trash" disabled={upload.busy} onClick={() => onDelete(doc)}>
            {t("docs.delete")}
          </Button>
        )}
        {!approved && (
          <FilePicker
            onFile={send}
            disabled={upload.busy}
            label={doc ? t("docs.reupload") : t("docs.upload")}
            variant={status === "rejected" || status === "missing" ? "primary" : "outline"}
          />
        )}
      </div>
    </div>
  );
}

export default function ProDocumentsPage() {
  const t = useT();
  const toast = useToast();
  const { profile } = useProfessional();
  const required = useConfig("pro.settings").required_documents;
  // View links expire within minutes — keep the list fresh while the page is open.
  const docs = useApi<ProfessionalDocument[]>(KYC_PATH, { pollMs: VIEW_URL_REFRESH_MS });
  const [deleting, setDeleting] = useState<ProfessionalDocument | null>(null);
  const [removing, setRemoving] = useState(false);

  const list = docs.data ?? [];
  const requiredTypes = PRO_DOCUMENT_TYPES.filter((type) => required.includes(type));
  // Types the portal requires that this build doesn't know yet still get a row.
  const unknownRequired = required.filter((type) => !PRO_DOCUMENT_TYPES.includes(type as ProDocumentType));
  const optionalTypes = PRO_DOCUMENT_TYPES.filter((type) => !required.includes(type));
  const allRequiredIn = required.every((type) => currentDocument(list, type));

  async function remove(doc: ProfessionalDocument) {
    setRemoving(true);
    try {
      await api(`${KYC_PATH}/${doc.id}`, { method: "DELETE" });
      await docs.reload();
      toast.success(t("docs.deleted"));
      setDeleting(null);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setRemoving(false);
    }
  }

  const row = (type: string, isRequired: boolean) => (
    <DocumentTypeRow
      key={type}
      type={type as ProDocumentType}
      doc={currentDocument(list, type)}
      required={isRequired}
      onChanged={docs.reload}
      onDelete={setDeleting}
    />
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/pro/profile" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800">
        ← {t("nav.profile")}
      </Link>
      <PageHeader title={t("kyc.title")} subtitle={t("kyc.subtitle")} />

      {docs.error && !docs.data && <Alert tone="error">{docs.error.message}</Alert>}

      {docs.loading ? (
        <ListSkeleton rows={3} />
      ) : (
        docs.data && (
          <>
            {allRequiredIn && profile.verification_status !== "approved" && (
              <Alert tone="success">{t("kyc.allDone")}</Alert>
            )}
            <section>
              <SectionHeading title={t("kyc.requiredHeading")} />
              <Card className="divide-y divide-slate-100">
                {[...requiredTypes, ...unknownRequired].map((type) => row(type, true))}
              </Card>
            </section>
            {optionalTypes.length > 0 && (
              <section>
                <SectionHeading title={t("kyc.optionalHeading")} />
                <Card className="divide-y divide-slate-100">{optionalTypes.map((type) => row(type, false))}</Card>
              </section>
            )}
            <p className="text-xs text-slate-500">
              {t("docs.hint")} {t("kyc.approvedNote")}
            </p>
          </>
        )
      )}

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove(deleting)}
        loading={removing}
        title={t("docs.deleteTitle")}
        description={deleting ? `${proDocumentLabel(deleting.document_type, t)} — ${t("docs.deleteBody")}` : undefined}
        confirmLabel={t("docs.delete")}
        cancelLabel={t("docs.keep")}
        tone="danger"
      />
    </div>
  );
}
