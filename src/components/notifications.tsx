"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useState } from "react";

import { Icon } from "@/components/icons";
import { useToast } from "@/components/toast";
import { Alert, Button, cn, EmptyState, ListSkeleton } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { usePollMs } from "@/lib/config";
import { timeAgo } from "@/lib/format";
import { useApi } from "@/lib/hooks";
import { useT } from "@/lib/i18n";
import type { AppNotification, NotificationInbox } from "@/lib/types";

const PAGE = 30;

interface InboxState {
  unread: number;
  reload: () => Promise<void>;
}

const InboxContext = createContext<InboxState>({ unread: 0, reload: async () => undefined });

/** Polls the unread count for the bell; wrap the signed-in area with it. */
export function InboxProvider({ children }: { children: (unread: number) => React.ReactNode }) {
  const inbox = useApi<NotificationInbox>("/notifications?limit=1", { pollMs: usePollMs("lists") });
  const unread = inbox.data?.unread_count ?? 0;
  return <InboxContext.Provider value={{ unread, reload: inbox.reload }}>{children(unread)}</InboxContext.Provider>;
}

function bookingIdOf(item: AppNotification): string | null {
  const id = item.data?.booking_id;
  return typeof id === "string" ? id : null;
}

/** The inbox: newest first, tap to open the booking it's about, page back for older ones. */
export function NotificationsScreen({ bookingHref }: { bookingHref: (id: string) => string }) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const bell = useContext(InboxContext);
  const first = useApi<NotificationInbox>(`/notifications?limit=${PAGE}`, { pollMs: usePollMs("lists") });
  const [older, setOlder] = useState<AppNotification[]>([]);
  const [exhausted, setExhausted] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [markingAll, setMarkingAll] = useState(false);

  const items = [...(first.data?.items ?? []), ...older.filter((o) => !first.data?.items.some((f) => f.id === o.id))];
  const isRead = (item: AppNotification) => item.read_at !== null || readIds.has(item.id);
  const anyUnread = items.some((item) => !isRead(item));
  const hasMore = !exhausted && (first.data?.items.length ?? 0) >= PAGE;

  async function loadMore() {
    const last = items[items.length - 1];
    if (!last) return;
    setLoadingMore(true);
    try {
      const page = await api<NotificationInbox>(`/notifications?limit=${PAGE}&before=${encodeURIComponent(last.created_at)}`);
      setOlder((current) => [...current, ...page.items]);
      if (page.items.length < PAGE) setExhausted(true);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoadingMore(false);
    }
  }

  async function markAll() {
    setMarkingAll(true);
    try {
      await api("/notifications/read-all", { method: "POST" });
      setReadIds(new Set(items.map((item) => item.id)));
      await Promise.all([first.reload(), bell.reload()]);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setMarkingAll(false);
    }
  }

  function open(item: AppNotification) {
    if (!isRead(item)) {
      setReadIds((current) => new Set(current).add(item.id));
      void api(`/notifications/${item.id}/read`, { method: "POST" })
        .then(() => bell.reload())
        .catch(() => undefined);
    }
    const bookingId = bookingIdOf(item);
    if (bookingId) router.push(bookingHref(bookingId));
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t("notifications.title")}</h1>
        {anyUnread && (
          <Button size="sm" variant="ghost" icon="check" loading={markingAll} onClick={markAll}>
            {t("notifications.markAll")}
          </Button>
        )}
      </div>

      {first.error && !first.data ? (
        <Alert tone="error">{first.error.message}</Alert>
      ) : !first.data ? (
        <ListSkeleton rows={5} />
      ) : items.length === 0 ? (
        <EmptyState icon="bell" title={t("notifications.empty")}>
          {t("notifications.emptyBody")}
        </EmptyState>
      ) : (
        <div className="overflow-hidden rounded-(--radius-card) border border-slate-200/80 bg-white">
          <ul className="divide-y divide-slate-100">
            {items.map((item) => {
              const unread = !isRead(item);
              const linked = bookingIdOf(item) !== null;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => open(item)}
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50",
                      unread && "bg-brand-50/50",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full",
                        unread ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-500",
                      )}
                    >
                      <Icon name={linked ? "calendar" : "bell"} className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-3">
                        <span className={cn("text-sm text-slate-900", unread ? "font-semibold" : "font-medium")}>
                          {item.title ?? "Mendyr"}
                        </span>
                        <span className="shrink-0 text-xs text-slate-400">{timeAgo(item.created_at)}</span>
                      </span>
                      <span className="mt-0.5 block text-sm text-slate-600">{item.body}</span>
                    </span>
                    {unread && <span className="mt-2 size-2 shrink-0 rounded-full bg-brand-600" aria-label="Unread" />}
                  </button>
                </li>
              );
            })}
          </ul>
          {hasMore && (
            <div className="border-t border-slate-100 p-3 text-center">
              <Button size="sm" variant="ghost" loading={loadingMore} onClick={loadMore}>
                {t("notifications.loadMore")}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
