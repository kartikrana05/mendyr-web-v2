"use client";

import { NotificationsScreen } from "@/components/notifications";

export default function ProNotificationsPage() {
  return <NotificationsScreen bookingHref={(id) => `/pro/bookings/${id}`} />;
}
