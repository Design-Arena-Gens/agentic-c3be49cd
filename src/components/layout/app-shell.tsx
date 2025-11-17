"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  DocumentMagnifyingGlassIcon,
  DocumentPlusIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  Squares2X2Icon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import type { ReactNode } from "react";
import clsx from "clsx";
import { ROLE_LABELS, Role, User } from "@/types";
import { useAuthStore } from "@/store/auth-store";

interface NavigationItem {
  label: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  description: string;
  roles?: Role[];
}

const NAVIGATION: NavigationItem[] = [
  {
    label: "Dashboard",
    href: "/app",
    icon: Squares2X2Icon,
    description: "Lifecycle status, change control metrics, and KPIs.",
  },
  {
    label: "Documents",
    href: "/app/documents",
    icon: DocumentTextIcon,
    description: "Controlled document registry and lifecycle management.",
  },
  {
    label: "Document Types",
    href: "/app/document-types",
    icon: DocumentPlusIcon,
    description: "Manage controlled document families and templates.",
    roles: ["Admin", "QA"],
  },
  {
    label: "Workflows",
    href: "/app/workflows",
    icon: DocumentMagnifyingGlassIcon,
    description: "Configure approval pathways and lifecycle automation.",
    roles: ["Admin", "QA"],
  },
  {
    label: "Audit Log",
    href: "/app/audit-log",
    icon: ShieldCheckIcon,
    description: "Tamper-evident audit trail for inspections.",
  },
  {
    label: "User & Roles",
    href: "/app/users",
    icon: UsersIcon,
    description: "Provision accounts, assign roles, maintain signatures.",
    roles: ["Admin"],
  },
];

export function AppShell({ children, user }: { children: ReactNode; user: User }) {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);

  const filteredNavigation = NAVIGATION.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(user.role);
  });

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <aside className="hidden w-72 flex-col border-r border-white/10 bg-slate-950/90 px-6 py-8 shadow-2xl shadow-black/40 lg:flex">
        <div className="mb-10 space-y-3">
          <p className="text-xs uppercase tracking-[0.45em] text-indigo-400">
            DocumentManagement
          </p>
          <h1 className="text-xl font-semibold leading-tight text-white">
            GxP Document Control Suite
          </h1>
          <p className="text-xs text-slate-400">
            ISO 9001 • ICH Q7 • 21 CFR Part 11 • GMP Annex 11
          </p>
        </div>
        <nav className="flex-1 space-y-1">
          {filteredNavigation.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "group flex flex-col rounded-lg border border-transparent px-4 py-3 transition",
                  isActive
                    ? "border-indigo-400/60 bg-indigo-500/10"
                    : "hover:border-white/10 hover:bg-white/5",
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={clsx(
                      "grid h-10 w-10 place-items-center rounded-md border text-indigo-300",
                      isActive
                        ? "border-indigo-400 bg-indigo-500/20"
                        : "border-white/10 bg-white/5 group-hover:border-indigo-300/50",
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {item.label}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {item.description}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>
        <div className="mt-8 rounded-lg border border-white/10 bg-white/5 p-4 text-xs text-slate-300">
          <p className="font-semibold uppercase tracking-[0.35em] text-indigo-300">
            Validation Ready
          </p>
          <p className="mt-2 text-[11px] text-slate-400">
            Workflows, signatures and audit logs are validated for inspection
            readiness. All actions are immutable and time stamped in UTC.
          </p>
        </div>
      </aside>
      <div className="flex min-h-screen flex-1 flex-col bg-slate-900/70">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/80 backdrop-blur">
          <div className="flex items-center justify-between px-6 py-5">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-indigo-300">
                Controlled Environment
              </p>
              <p className="text-sm text-slate-400">
                Electronic records • Signature enforcement • Complete traceability
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-semibold text-white">{user.name}</p>
                <p className="text-xs text-slate-400">{ROLE_LABELS[user.role]}</p>
              </div>
              <button
                onClick={handleLogout}
                className="rounded-md border border-white/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-100 transition hover:border-rose-400/60 hover:bg-rose-500/20"
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
