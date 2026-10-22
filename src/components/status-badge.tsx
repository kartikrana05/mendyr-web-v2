import { Badge } from "@/components/ui";
import { STATUS } from "@/lib/constants";
import type { BookingStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: BookingStatus }) {
  const meta = STATUS[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}
