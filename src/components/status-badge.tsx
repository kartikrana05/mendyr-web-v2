"use client";

import { Badge } from "@/components/ui";
import { STATUS } from "@/lib/constants";
import { useT } from "@/lib/i18n";
import type { BookingStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: BookingStatus }) {
  const t = useT();
  return <Badge tone={STATUS[status].tone}>{t(`badge.${status}`)}</Badge>;
}
