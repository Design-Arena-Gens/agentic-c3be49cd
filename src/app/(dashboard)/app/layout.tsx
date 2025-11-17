"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { useAuthStore } from "@/store/auth-store";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.currentUser);
  const bootstrapped = useAuthStore((state) => state.bootstrapped);

  useEffect(() => {
    if (bootstrapped && !currentUser) {
      router.replace("/login");
    }
  }, [bootstrapped, currentUser, router]);

  if (!currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="space-y-2 text-center">
          <p className="text-sm font-semibold tracking-[0.35em] text-indigo-400">
            Validating session…
          </p>
          <p className="text-xs text-slate-400">
            Rehydrating electronic records and verifying signature state.
          </p>
        </div>
      </div>
    );
  }

  return <AppShell user={currentUser}>{children}</AppShell>;
}
