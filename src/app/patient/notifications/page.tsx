"use client";

import { NotificationsScreen } from "@/components/notifications";

export default function PatientNotificationsPage() {
  return <NotificationsScreen bookingHref={(id) => `/patient/bookings/${id}`} />;
}
