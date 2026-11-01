"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { ShellSkeleton, StaffScreen } from "@/components/app-shell";
import { homeFor, isStaff, useAuth } from "@/lib/auth";

export default function StaffPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (!isStaff(user.role)) router.replace(homeFor(user.role));
  }, [loading, user, router]);

  if (user && isStaff(user.role)) return <StaffScreen />;
  return <ShellSkeleton />;
}
