"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/auth-store";
import { ROLE_LABELS } from "@/types";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required.")
    .email("Provide a valid email."),
  password: z
    .string()
    .min(1, "Password is required.")
    .min(6, "Password must be at least 6 characters."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const credentialHints = [
  {
    role: "Admin",
    email: "admin@documentmanagement.pharma",
    password: "Admin@123",
  },
  {
    role: "QA",
    email: "qa@documentmanagement.pharma",
    password: "QA@12345",
  },
  {
    role: "Author",
    email: "author@documentmanagement.pharma",
    password: "Author@123",
  },
  {
    role: "Reviewer",
    email: "reviewer@documentmanagement.pharma",
    password: "Reviewer@123",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((state) => state.login);
  const currentUser = useAuthStore((state) => state.currentUser);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    if (currentUser) {
      router.replace("/app");
    }
  }, [currentUser, router]);

  const onSubmit = async (values: LoginFormValues) => {
    try {
      setLoading(true);
      await login(values.email, values.password);
      toast.success("Authenticated successfully.");
      router.replace("/app");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to authenticate.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <div className="hidden flex-1 flex-col justify-between border-r border-white/10 bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 p-12 lg:flex">
        <div>
          <p className="text-sm uppercase tracking-[0.4em] text-indigo-300">
            Pharma Compliance Suite
          </p>
          <h1 className="mt-6 text-4xl font-semibold leading-tight">
            DocumentManagement Platform
          </h1>
          <p className="mt-4 text-sm text-slate-300">
            Built for regulated environments requiring 21 CFR Part 11 compliant
            electronic records, with comprehensive audit trails and automated
            approval workflows.
          </p>
        </div>
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.35em] text-indigo-300">
            Compliance Coverage
          </h2>
          <ul className="grid grid-cols-2 gap-3 text-sm text-slate-300">
            <li className="rounded border border-white/10 bg-white/5 px-3 py-2">
              21 CFR Part 11
            </li>
            <li className="rounded border border-white/10 bg-white/5 px-3 py-2">
              ISO 9001
            </li>
            <li className="rounded border border-white/10 bg-white/5 px-3 py-2">
              ICH Q7
            </li>
            <li className="rounded border border-white/10 bg-white/5 px-3 py-2">
              GMP Annex 11
            </li>
          </ul>
          <p className="text-xs text-slate-500">
            Access to this system is restricted. All activities are logged and
            monitored under QA governance.
          </p>
        </div>
      </div>
      <div className="flex min-h-screen w-full flex-1 items-center justify-center bg-slate-900 px-6 py-12 sm:px-12">
        <div className="w-full max-w-md rounded-xl border border-white/10 bg-slate-950/80 p-8 shadow-2xl shadow-slate-950/70">
          <div className="mb-8 space-y-2 text-center">
            <p className="text-xs uppercase tracking-[0.4em] text-indigo-400">
              Secure Sign-In
            </p>
            <h2 className="text-2xl font-semibold">
              Authenticate with electronic records
            </h2>
            <p className="text-sm text-slate-400">
              Multi-role access control and electronic signature enforcement.
            </p>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-xs font-medium uppercase tracking-widest text-slate-300"
              >
                Corporate Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="your.name@company.com"
                className="w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-indigo-400 focus:bg-slate-900/80 focus:ring-2 focus:ring-indigo-500/40"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-rose-400">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-xs font-medium uppercase tracking-widest text-slate-300"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                className="w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-indigo-400 focus:bg-slate-900/80 focus:ring-2 focus:ring-indigo-500/40"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-xs text-rose-400">
                  {errors.password.message}
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-indigo-500 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-indigo-500/70"
            >
              {loading ? "Verifying…" : "Sign In"}
            </button>
          </form>
          <div className="mt-8 rounded-md border border-white/10 bg-slate-900/60 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-indigo-300">
              Pre-provisioned Roles
            </p>
            <div className="space-y-2 text-xs text-slate-300">
              {credentialHints.map((entry) => (
                <div
                  key={entry.email}
                  className="flex items-center justify-between rounded bg-white/5 px-3 py-2"
                >
                  <div>
                    <p className="font-semibold text-indigo-200">
                      {ROLE_LABELS[entry.role as keyof typeof ROLE_LABELS]}
                    </p>
                    <p className="font-mono text-[11px] text-slate-400">
                      {entry.email}
                    </p>
                  </div>
                  <p className="font-mono text-[11px] text-slate-500">
                    {entry.password}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
