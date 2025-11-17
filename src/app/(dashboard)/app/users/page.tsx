"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/auth-store";
import { ROLE_LABELS, Role } from "@/types";
import { format, parseISO } from "date-fns";
import clsx from "clsx";

const schema = z.object({
  name: z
    .string()
    .min(1, "Name is required.")
    .min(3, "Provide full name."),
  email: z
    .string()
    .min(1, "Email is required.")
    .email("Provide a valid email."),
  password: z
    .string()
    .min(1, "Password is required.")
    .min(8, "Minimum 8 characters.")
    .regex(/[A-Z]/, "Must contain uppercase letter.")
    .regex(/[0-9]/, "Must contain number.")
    .regex(/[^A-Za-z0-9]/, "Must contain special character."),
  role: z.enum(["Admin", "Author", "Reviewer", "QA", "Approver", "Viewer"]),
  signature: z
    .string()
    .min(1, "Signature phrase is required.")
    .min(10, "Signature phrase must be at least 10 characters."),
});

type FormValues = z.infer<typeof schema>;

export default function UsersPage() {
  const users = useAuthStore((state) => state.users);
  const currentUser = useAuthStore((state) => state.currentUser);
  const registerUser = useAuthStore((state) => state.registerUser);
  const toggleUserState = useAuthStore((state) => state.toggleUserState);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      role: "Author",
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (!currentUser) {
      toast.error("Authentication required.");
      return;
    }
    try {
      await registerUser(values, currentUser.id);
      toast.success("User provisioned.");
      reset({ role: "Author" });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to provision user.",
      );
    }
  };

  const toggleStatus = (userId: string, enabled: boolean) => {
    toggleUserState(userId, enabled);
    toast.success(`User ${enabled ? "enabled" : "disabled"}.`);
  };

  const isAdmin = currentUser?.role === "Admin";

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-indigo-300">
          Access & Signatures
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-white">
          Manage user accounts and roles
        </h1>
        <p className="text-sm text-slate-400">
          Provision accounts aligned to GxP responsibilities and enforce 21 CFR
          Part 11 electronic signatures.
        </p>
      </div>

      {!isAdmin && (
        <div className="rounded-lg border border-amber-400/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Only administrators can provision users. Contact QA or system admin
          for updates.
        </div>
      )}

      {isAdmin && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 rounded-xl border border-white/10 bg-slate-950/70 p-6 shadow-lg"
        >
          <h2 className="text-sm font-semibold uppercase tracking-[0.35em] text-indigo-300">
            Provision New Account
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Full Name" error={errors.name?.message}>
              <input
                type="text"
                className="field-input"
                placeholder="Jane Doe"
                {...register("name")}
              />
            </Field>
            <Field label="Corporate Email" error={errors.email?.message}>
              <input
                type="email"
                className="field-input"
                placeholder="name@company.com"
                {...register("email")}
              />
            </Field>
            <Field label="Password" error={errors.password?.message}>
              <input
                type="password"
                className="field-input"
                placeholder="Complex password"
                {...register("password")}
              />
            </Field>
            <Field label="Role" error={errors.role?.message}>
              <select className="field-input" {...register("role")}>
                {(Object.keys(ROLE_LABELS) as Role[]).map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Signature Statement" error={errors.signature?.message}>
            <textarea
              rows={2}
              className="field-input"
              placeholder="I approve this document electronically with full accountability."
              {...register("signature")}
            />
          </Field>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-indigo-500 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-indigo-400 disabled:opacity-60"
          >
            {isSubmitting ? "Provisioning…" : "Create User"}
          </button>
        </form>
      )}

      <section className="rounded-xl border border-white/10 bg-slate-950/70 p-6 shadow-lg">
        <h2 className="text-sm font-semibold uppercase tracking-[0.35em] text-indigo-300">
          Registered Users ({users.length})
        </h2>
        <div className="mt-4 overflow-hidden rounded-lg border border-white/10">
          <table className="min-w-full divide-y divide-white/10 text-sm text-slate-200">
            <thead className="bg-white/5 text-xs uppercase tracking-[0.3em] text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Last Login</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Signature</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-white/5">
                  <td className="px-4 py-3 font-semibold text-white">
                    {user.name}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300">
                    {user.email}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300">
                    {ROLE_LABELS[user.role]}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {user.lastLoginAt
                      ? format(parseISO(user.lastLoginAt), "PPpp")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span
                      className={clsx(
                        "rounded-full border px-3 py-1 uppercase tracking-[0.25em]",
                        user.enabled
                          ? "border-emerald-400/60 text-emerald-200"
                          : "border-rose-400/60 text-rose-200",
                      )}
                    >
                      {user.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {user.signature ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isAdmin && currentUser?.id !== user.id && (
                      <button
                        onClick={() => toggleStatus(user.id, !user.enabled)}
                        className="rounded-md border border-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-slate-300 transition hover:border-indigo-400 hover:text-indigo-200"
                      >
                        {user.enabled ? "Disable" : "Enable"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2 text-sm">
      <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  );
}
