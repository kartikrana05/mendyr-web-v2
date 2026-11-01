"use client";

import { ToastProvider } from "@/components/toast";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ConfigProvider } from "@/lib/config";
import { I18nProvider } from "@/lib/i18n";

/** The config bundle is per role: professionals get their own banners and copy. */
function RoleConfig({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return <ConfigProvider role={user?.role === "professional" ? "professional" : "patient"}>{children}</ConfigProvider>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <RoleConfig>
        <I18nProvider>
          <ToastProvider>{children}</ToastProvider>
        </I18nProvider>
      </RoleConfig>
    </AuthProvider>
  );
}
