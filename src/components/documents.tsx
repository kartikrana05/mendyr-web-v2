"use client";

import { useCallback, useState, useSyncExternalStore, type ReactNode } from "react";

import { Icon } from "@/components/icons";
import { Badge, buttonClasses, Chip, cn, Field, Input } from "@/components/ui";
import { api } from "@/lib/api";
import {
  ACCEPT_DOCUMENTS,
  formatBytes,
  isPdf,
  MEDICAL_DOCUMENT_TYPES,
  medicalDocumentLabel,
  uploadErrorMessage,
  uploadToStorage,
  type UploadStage,
} from "@/lib/documents";
import { formatDate } from "@/lib/format";
import { useT } from "@/lib/i18n";
import type { MedicalDocument, MedicalDocumentType } from "@/lib/types";

// ── Upload state ─────────────────────────────────────────────────────────

/**
 * Runs one upload: file checks → presigned PUT → `record(file_key)`. Tracks the stage for a
 * progress line and turns any failure into a friendly message.
 */
export function useUpload() {
  const t = useT();
  const [stage, setStage] = useState<UploadStage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async <T,>(basePath: string, file: File, record: (fileKey: string) => Promise<T>): Promise<T | null> => {
      setError(null);
      try {
        const fileKey = await uploadToStorage(basePath, file, setStage);
        return await record(fileKey);
      } catch (err) {
        setError(uploadErrorMessage(err, t));
        return null;
      } finally {
        setStage(null);
      }
    },
    [t],
  );

  return { stage, error, busy: stage !== null, run, clearError: () => setError(null) };
}

const STAGE_PCT: Record<UploadStage, number> = { preparing: 15, uploading: 60, saving: 90 };

/** "Uploading…" with a bar while busy; the error once it fails. Renders nothing otherwise. */
export function UploadStatus({ stage, error }: { stage: UploadStage | null; error: string | null }) {
  const t = useT();
  if (stage) {
    return (
      <div className="space-y-1.5" role="status" aria-live="polite">
        <p className="text-xs font-medium text-slate-600">{t(`docs.stage.${stage}`)}</p>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-brand-600 transition-[width] duration-500 ease-out"
            style={{ width: `${STAGE_PCT[stage]}%` }}
          />
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <p className="flex items-start gap-1.5 text-sm text-red-600" role="alert">
        <Icon name="alert" className="mt-0.5 size-4 shrink-0" /> {error}
      </p>
    );
  }
  return null;
}

// ── Picking a file ───────────────────────────────────────────────────────

function subscribePointer(onChange: () => void) {
  const query = window.matchMedia("(pointer: coarse)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** True on touch-first devices, where a "Take photo" shortcut to the camera makes sense. */
function useCoarsePointer(): boolean {
  return useSyncExternalStore(
    subscribePointer,
    () => window.matchMedia("(pointer: coarse)").matches,
    () => false,
  );
}

/**
 * "Choose file" (PDF or photo) plus, on phones, "Take photo" straight from the camera. They
 * are separate inputs because `capture` on a PDF-or-image input makes Android skip the file
 * picker, so a PDF could never be chosen. Labels, not scripted clicks — iOS opens them reliably.
 */
export function FilePicker({
  onFile,
  disabled,
  label,
  variant = "secondary",
  size = "sm",
}: {
  onFile: (file: File) => void;
  disabled?: boolean;
  label?: string;
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md";
}) {
  const t = useT();
  const coarse = useCoarsePointer();

  function picked(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // so picking the same file again still fires
    if (file) onFile(file);
  }

  const classes = (v: typeof variant | "ghost") =>
    cn(
      buttonClasses(v, size),
      "cursor-pointer has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand-600",
      disabled && "pointer-events-none opacity-60",
    );

  return (
    <span className="inline-flex flex-wrap gap-2">
      <label className={classes(variant)} aria-disabled={disabled}>
        <input type="file" accept={ACCEPT_DOCUMENTS} className="sr-only" disabled={disabled} onChange={picked} />
        <Icon name="upload" className="size-4" />
        {label ?? t("docs.choose")}
      </label>
      {coarse && (
        <label className={classes("ghost")} aria-disabled={disabled}>
          <input type="file" accept="image/*" capture="environment" className="sr-only" disabled={disabled} onChange={picked} />
          <Icon name="camera" className="size-4" />
          {t("docs.takePhoto")}
        </label>
      )}
    </span>
  );
}

// ── Viewing ──────────────────────────────────────────────────────────────

/** Opens a (short-lived) view URL in a new tab. Render it from freshly fetched data only. */
export function ViewLink({ href, label }: { href: string; label?: string }) {
  const t = useT();
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={buttonClasses("ghost", "sm")}>
      <Icon name="eye" className="size-4" />
      {label ?? t("docs.view")}
    </a>
  );
}

export function FileIcon({ contentType, tone = "slate" }: { contentType: string | null; tone?: "slate" | "brand" }) {
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-xl",
        tone === "brand" ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-500",
      )}
    >
      <Icon name={isPdf(contentType) ? "file" : "camera"} className="size-5" />
    </span>
  );
}

/** One medical document: what it is, when it was added, View — and any extra actions. */
export function MedicalDocumentRow({
  doc,
  children,
  meta,
}: {
  doc: MedicalDocument;
  children?: ReactNode;
  meta?: ReactNode;
}) {
  const t = useT();
  const typeLabel = medicalDocumentLabel(doc.document_type, t);
  return (
    <div className="flex flex-wrap items-center gap-3 py-3">
      <FileIcon contentType={doc.content_type} tone="brand" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{doc.title || typeLabel}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
          {doc.title && <Badge tone="teal">{typeLabel}</Badge>}
          <span>{t("docs.uploadedOn", { date: formatDate(doc.created_at) })}</span>
          <span>· {formatBytes(doc.size_bytes)}</span>
          {meta}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <ViewLink href={doc.view_url} />
        {children}
      </div>
    </div>
  );
}

// ── Adding a medical document ────────────────────────────────────────────

/**
 * Type, optional title and a file — uploads and records a medical document (attached to
 * `bookingId` when given) and hands the new record back.
 */
export function MedicalUploadForm({
  bookingId,
  defaultType = "prescription",
  onUploaded,
}: {
  bookingId?: string;
  defaultType?: MedicalDocumentType;
  onUploaded: (doc: MedicalDocument) => void;
}) {
  const t = useT();
  const upload = useUpload();
  const [type, setType] = useState<MedicalDocumentType>(defaultType);
  const [title, setTitle] = useState("");

  async function send(file: File) {
    const doc = await upload.run("/medical-documents", file, (fileKey) =>
      api<MedicalDocument>("/medical-documents", {
        method: "POST",
        body: { document_type: type, file_key: fileKey, title: title.trim() || null, booking_id: bookingId ?? null },
      }),
    );
    if (doc) {
      setTitle("");
      onUploaded(doc);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">{t("mdocs.type")}</p>
        <div className="flex flex-wrap gap-2">
          {MEDICAL_DOCUMENT_TYPES.map((option) => (
            <Chip key={option} selected={type === option} onClick={() => setType(option)}>
              {medicalDocumentLabel(option, t)}
            </Chip>
          ))}
        </div>
      </div>
      <Field label={t("mdocs.titleLabel")} htmlFor={`doc-title-${bookingId ?? "new"}`} optional>
        <Input
          id={`doc-title-${bookingId ?? "new"}`}
          value={title}
          maxLength={150}
          placeholder={t("mdocs.titlePlaceholder")}
          onChange={(e) => setTitle(e.target.value)}
        />
      </Field>
      <div className="space-y-2">
        <FilePicker onFile={send} disabled={upload.busy} variant="primary" size="md" />
        <p className="text-xs text-slate-500">{t("docs.hint")}</p>
        <UploadStatus stage={upload.stage} error={upload.error} />
      </div>
    </div>
  );
}

/** Tick boxes over the patient's saved documents — for attaching some to a booking. */
export function DocumentChooser({
  docs,
  selected,
  onToggle,
  max = 10,
}: {
  docs: MedicalDocument[];
  selected: string[];
  onToggle: (id: string) => void;
  max?: number;
}) {
  const t = useT();
  return (
    <div className="space-y-2">
      {docs.map((doc) => {
        const on = selected.includes(doc.id);
        const typeLabel = medicalDocumentLabel(doc.document_type, t);
        return (
          <label
            key={doc.id}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition",
              on ? "border-brand-500 bg-brand-50/60 ring-1 ring-brand-500" : "border-slate-200 hover:border-slate-300",
            )}
          >
            <input
              type="checkbox"
              checked={on}
              disabled={!on && selected.length >= max}
              onChange={() => onToggle(doc.id)}
              className="size-4 shrink-0 accent-brand-600"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-slate-900">{doc.title || typeLabel}</span>
              <span className="block text-xs text-slate-500">
                {doc.title ? `${typeLabel} · ` : ""}
                {t("docs.uploadedOn", { date: formatDate(doc.created_at) })}
              </span>
            </span>
            <a
              href={doc.view_url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-sm font-semibold text-brand-700 hover:underline"
            >
              {t("docs.view")}
            </a>
          </label>
        );
      })}
    </div>
  );
}
