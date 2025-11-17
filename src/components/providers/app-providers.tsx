"use client";

import { ReactNode, useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";
import { useAuthStore } from "@/store/auth-store";
import { useDocumentStore } from "@/store/document-store";

export function AppProviders({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const hydrateStores = async () => {
      try {
        await Promise.all([
          useAuthStore.persist.rehydrate(),
          useDocumentStore.persist.rehydrate(),
        ]);
        if (cancelled) {
          return;
        }
        useAuthStore.getState().bootstrap();
        useDocumentStore.getState().bootstrap();
        setReady(true);
      } catch (error) {
        console.error("Failed to rehydrate stores", error);
      }
    };
    void hydrateStores();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="space-y-2 text-center">
          <p className="text-lg font-semibold tracking-wide">
            DocumentManagement secure workspace
          </p>
          <p className="text-sm text-slate-400">
            Loading encrypted configuration…
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          className: "border border-slate-700 bg-slate-900 text-slate-100",
        }}
      />
    </>
  );
}
