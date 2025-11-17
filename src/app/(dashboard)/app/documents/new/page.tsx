"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import toast from "react-hot-toast";
import clsx from "clsx";
import { useDocumentStore } from "@/store/document-store";
import { useAuthStore } from "@/store/auth-store";
import { DOCUMENT_CATEGORIES, DOCUMENT_SECURITY_OPTIONS } from "@/types";

const documentSchema = z.object({
  title: z
    .string()
    .min(1, "Document title is required.")
    .min(6, "Title must be at least 6 characters."),
  documentNumber: z
    .string()
    .min(1, "Document number is required.")
    .min(3, "Document number must be at least 3 characters."),
  version: z
    .string()
    .min(1, "Version is required.")
    .regex(/^[0-9]+(\.[0-9]+)*$/, "Versions must follow numeric notation."),
  documentTypeId: z.string().min(1, "Select a document type."),
  category: z.enum(DOCUMENT_CATEGORIES),
  security: z.enum(DOCUMENT_SECURITY_OPTIONS),
  dateCreated: z.string().min(1, "Select a date."),
  dateOfIssue: z.string().min(1, "Select a date."),
  effectiveFrom: z.string().min(1, "Select a date."),
  nextIssueDate: z.string().min(1, "Select a date."),
  issuedById: z.string().min(1, "Select an issuer."),
  summary: z
    .string()
    .min(1, "Provide a controlled change summary.")
    .min(10, "Summary must be detailed for audit traceability."),
  changeControlId: z.string().optional(),
  tags: z.string().optional(),
  riskClassification: z.enum(["Low", "Medium", "High"]),
  workflowTemplateId: z.string().optional(),
});

type DocumentFormValues = z.infer<typeof documentSchema>;

export default function NewDocumentPage() {
  const router = useRouter();
  const createDocument = useDocumentStore((state) => state.createDocument);
  const documentTypes = useDocumentStore((state) => state.documentTypes);
  const workflows = useDocumentStore((state) => state.workflows);
  const users = useAuthStore((state) => state.users);
  const currentUser = useAuthStore((state) => state.currentUser);

  const defaultDates = useMemo(() => {
    const today = new Date();
    const nextYear = new Date(today);
    nextYear.setFullYear(today.getFullYear() + 1);
    return {
      today: format(today, "yyyy-MM-dd"),
      nextIssue: format(nextYear, "yyyy-MM-dd"),
    };
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DocumentFormValues>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      dateCreated: defaultDates.today,
      dateOfIssue: defaultDates.today,
      effectiveFrom: defaultDates.today,
      nextIssueDate: defaultDates.nextIssue,
      security: "Internal",
      category: "Quality Management",
      riskClassification: "Medium",
      issuedById:
        users.find((user) => user.role === "QA")?.id ??
        users.find((user) => user.role === "Approver")?.id ??
        users[0]?.id,
      workflowTemplateId: workflows[0]?.id,
    },
  });

  const onSubmit = async (values: DocumentFormValues) => {
    try {
      if (!currentUser) {
        throw new Error("Authentication required.");
      }

      const issuer = users.find((user) => user.id === values.issuedById);
      if (!issuer) {
        throw new Error("Selected issuer not found.");
      }

      const tags = values.tags
        ? Array.from(
            new Set(
              values.tags
                .split(",")
                .map((tag) => tag.trim())
                .filter(Boolean),
            ),
          )
        : [];

      const document = createDocument({
        title: values.title,
        documentNumber: values.documentNumber,
        version: values.version,
        documentTypeId: values.documentTypeId,
        category: values.category,
        security: values.security,
        createdById: currentUser.id,
        issuedById: issuer.id,
        issuerRole: issuer.role,
        dateCreated: values.dateCreated,
        dateOfIssue: values.dateOfIssue,
        effectiveFrom: values.effectiveFrom,
        nextIssueDate: values.nextIssueDate,
        summary: values.summary,
        changeControlId: values.changeControlId,
        tags,
        riskClassification: values.riskClassification,
        workflowTemplateId: values.workflowTemplateId,
      });

      toast.success("Document created. Workflow initiated.");
      router.replace(`/app/documents/${document.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to create the document.",
      );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-indigo-300">
          New Controlled Document
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-white">
          Author and route a compliant record
        </h1>
        <p className="text-sm text-slate-400">
          Complete the metadata required for GMP-controlled documents. All
          fields drive audit trails and workflow routing.
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-8 rounded-xl border border-white/10 bg-slate-950/70 p-6 shadow-xl shadow-black/40"
      >
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.35em] text-indigo-300">
            Core Metadata
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Document Title" error={errors.title?.message}>
              <input
                type="text"
                placeholder="e.g. GMP Cleaning Procedure"
                className="field-input"
                {...register("title")}
              />
            </Field>
            <Field
              label="Document Number"
              error={errors.documentNumber?.message}
            >
              <input
                type="text"
                placeholder="DOC-PR-001"
                className="field-input"
                {...register("documentNumber")}
              />
            </Field>
            <Field label="Version" error={errors.version?.message}>
              <input
                type="text"
                placeholder="1.0"
                className="field-input"
                {...register("version")}
              />
            </Field>
            <Field
              label="Document Type"
              error={errors.documentTypeId?.message}
            >
              <select className="field-input" {...register("documentTypeId")}>
                <option value="">Select type</option>
                {documentTypes.map((docType) => (
                  <option key={docType.id} value={docType.id}>
                    {docType.type} — {docType.description}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.35em] text-indigo-300">
            Lifecycle Dates & Stewardship
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Date Created" error={errors.dateCreated?.message}>
              <input type="date" className="field-input" {...register("dateCreated")} />
            </Field>
            <Field label="Date of Issue" error={errors.dateOfIssue?.message}>
              <input type="date" className="field-input" {...register("dateOfIssue")} />
            </Field>
            <Field
              label="Effective From"
              error={errors.effectiveFrom?.message}
            >
              <input type="date" className="field-input" {...register("effectiveFrom")} />
            </Field>
            <Field
              label="Date of Next Issue"
              error={errors.nextIssueDate?.message}
            >
              <input type="date" className="field-input" {...register("nextIssueDate")} />
            </Field>
            <Field label="Issued By" error={errors.issuedById?.message}>
              <select className="field-input" {...register("issuedById")}>
                <option value="">Select issuer</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} · {user.role}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Issuer Role">
              <input
                readOnly
                value={
                  users.find((user) => user.id === watch("issuedById"))?.role ??
                  "Select issuer"
                }
                className="field-input"
              />
            </Field>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.35em] text-indigo-300">
            Classification & Security
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Document Category" error={errors.category?.message}>
              <select className="field-input" {...register("category")}>
                <option value="">Select category</option>
                {DOCUMENT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Security Level" error={errors.security?.message}>
              <select className="field-input" {...register("security")}>
                <option value="">Select security class</option>
                {DOCUMENT_SECURITY_OPTIONS.map((security) => (
                  <option key={security} value={security}>
                    {security}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Risk Classification" error={errors.riskClassification?.message}>
              <div className="flex gap-3 rounded border border-white/10 bg-white/5 px-4 py-3">
                {(["Low", "Medium", "High"] as const).map((risk) => (
                  <label
                    key={risk}
                    className={clsx(
                      "flex flex-1 cursor-pointer items-center justify-between rounded border px-3 py-2 text-xs font-semibold uppercase tracking-[0.25em]",
                      watch("riskClassification") === risk
                        ? "border-indigo-400 bg-indigo-500/20 text-indigo-100"
                        : "border-white/10 bg-slate-900 text-slate-300",
                    )}
                  >
                    <span>{risk}</span>
                    <input
                      type="radio"
                      value={risk}
                      className="hidden"
                      {...register("riskClassification")}
                    />
                  </label>
                ))}
              </div>
            </Field>
            <Field label="Change Control ID (optional)">
              <input
                type="text"
                placeholder="CC-2024-00045"
                className="field-input"
                {...register("changeControlId")}
              />
            </Field>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.35em] text-indigo-300">
            Workflow & Context
          </h2>
          <div className="space-y-3">
            <Field label="Workflow Template">
              <select className="field-input" {...register("workflowTemplateId")}>
                {workflows.map((workflow) => (
                  <option key={workflow.id} value={workflow.id}>
                    {workflow.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Change Summary" error={errors.summary?.message}>
              <textarea
                rows={4}
                placeholder="Describe the purpose of the controlled document, regulatory drivers, and downstream impact."
                className="field-input"
                {...register("summary")}
              />
            </Field>
            <Field label="Tags">
              <input
                type="text"
                placeholder="separate, by, comma"
                className="field-input"
                {...register("tags")}
              />
              <p className="text-[11px] text-slate-500">
                Tags assist in retrieval during audits. Example: validation,
                cleaning, SOP.
              </p>
            </Field>
          </div>
        </section>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-md border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-300 transition hover:border-white/20"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-indigo-500 px-6 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-indigo-500/70"
          >
            {isSubmitting ? "Creating…" : "Create & Launch Workflow"}
          </button>
        </div>
      </form>
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
