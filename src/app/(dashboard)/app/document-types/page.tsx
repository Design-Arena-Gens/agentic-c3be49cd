"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { useDocumentStore } from "@/store/document-store";
import { useAuthStore } from "@/store/auth-store";
import { DOCUMENT_TYPE_OPTIONS } from "@/types";
import { format, parseISO } from "date-fns";

const schema = z.object({
  type: z.enum(DOCUMENT_TYPE_OPTIONS),
  description: z
    .string()
    .min(1, "Description is required.")
    .min(4, "Description must be meaningful."),
});

type FormValues = z.infer<typeof schema>;

export default function DocumentTypesPage() {
  const documentTypes = useDocumentStore((state) => state.documentTypes);
  const addDocumentType = useDocumentStore((state) => state.addDocumentType);
  const updateDocumentType = useDocumentStore(
    (state) => state.updateDocumentType,
  );
  const currentUser = useAuthStore((state) => state.currentUser);

  const [selectedType, setSelectedType] = useState<FormValues["type"] | "">("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    try {
      if (!currentUser) {
        throw new Error("Authentication required.");
      }
      addDocumentType(values, currentUser.id);
      toast.success("Document type created.");
      reset();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to create type.",
      );
    }
  };

  const toggleObsolete = (id: string, obsolete: boolean) => {
    if (!currentUser) return;
    updateDocumentType(id, { obsolete }, currentUser.id);
    toast.success(`Document type marked as ${obsolete ? "obsolete" : "active"}.`);
  };

  const filteredTypes =
    selectedType === ""
      ? documentTypes
      : documentTypes.filter((type) => type.type === selectedType);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-indigo-300">
          Document Families
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-white">
          Manage controlled document types
        </h1>
        <p className="text-sm text-slate-400">
          Maintain the taxonomy that drives numbering conventions and workflow
          classification.
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4 rounded-xl border border-white/10 bg-slate-950/70 p-6 shadow-lg shadow-black/30"
      >
        <h2 className="text-sm font-semibold uppercase tracking-[0.35em] text-indigo-300">
          Add Document Type
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              Type
            </label>
            <select className="field-input" {...register("type")}>
              <option value="">Select</option>
              {DOCUMENT_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {errors.type && (
              <p className="mt-1 text-xs text-rose-400">
                {errors.type.message}
              </p>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              Description
            </label>
            <input
              type="text"
              placeholder="Describe the scope and usage"
              className="field-input"
              {...register("description")}
            />
            {errors.description && (
              <p className="mt-1 text-xs text-rose-400">
                {errors.description.message}
              </p>
            )}
          </div>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-indigo-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-indigo-400 disabled:opacity-60"
        >
          {isSubmitting ? "Creating…" : "Add Type"}
        </button>
      </form>

      <section className="rounded-xl border border-white/10 bg-slate-950/70 p-6 shadow-lg shadow-black/30">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <h2 className="text-sm font-semibold uppercase tracking-[0.35em] text-indigo-300">
            Registered Types ({documentTypes.length})
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Filter</span>
            <select
              value={selectedType}
              onChange={(event) => setSelectedType(event.target.value as typeof selectedType)}
              className="rounded border border-white/10 bg-slate-900 px-3 py-2 text-xs uppercase tracking-[0.25em] outline-none transition focus:border-indigo-400"
            >
              <option value="">All</option>
              {DOCUMENT_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 overflow-hidden rounded-lg border border-white/10">
          <table className="min-w-full divide-y divide-white/10 text-sm text-slate-200">
            <thead className="bg-white/5 text-xs uppercase tracking-[0.3em] text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-left">Created</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredTypes.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-sm text-slate-400"
                  >
                    No document types match the current filter.
                  </td>
                </tr>
              )}
              {filteredTypes.map((type) => (
                <tr key={type.id} className="hover:bg-white/5">
                  <td className="px-4 py-3 font-semibold text-white">
                    {type.type}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {type.description}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {format(parseISO(type.createdAt), "PP")}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span
                      className={`rounded-full px-3 py-1 uppercase tracking-[0.25em] ${
                        type.obsolete
                          ? "border border-rose-400/60 text-rose-200"
                          : "border border-emerald-400/60 text-emerald-200"
                      }`}
                    >
                      {type.obsolete ? "Obsolete" : "Active"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => toggleObsolete(type.id, !type.obsolete)}
                      className="rounded-md border border-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-slate-300 transition hover:border-indigo-400 hover:text-indigo-200"
                    >
                      {type.obsolete ? "Reinstate" : "Retire"}
                    </button>
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
