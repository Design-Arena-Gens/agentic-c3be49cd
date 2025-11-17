"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { format, parseISO } from "date-fns";
import {
  ArrowPathIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";
import { useDocumentStore } from "@/store/document-store";
import { useAuthStore } from "@/store/auth-store";
import { Role, ROLE_LABELS } from "@/types";
import { COMPLIANCE_REFERENCES } from "@/lib/defaults";

const workflowSchema = z.object({
  name: z
    .string()
    .min(1, "Workflow name is required.")
    .min(5, "Provide a descriptive workflow name."),
  description: z
    .string()
    .min(1, "Description is required.")
    .min(10, "Description must outline workflow governance."),
  complianceScope: z.array(z.string()).min(1, "Select at least one reference."),
  isDefault: z.boolean().optional(),
});

type WorkflowFormValues = z.infer<typeof workflowSchema>;

interface StepDraft {
  id: string;
  label: string;
  description: string;
  role: Role;
  slaHours: number;
  requiresSignature: boolean;
  signatureMeaning: string;
}

const ROLE_OPTIONS: Role[] = ["Author", "Reviewer", "QA", "Approver"];

export default function WorkflowsPage() {
  const workflows = useDocumentStore((state) => state.workflows);
  const createWorkflow = useDocumentStore((state) => state.createWorkflow);
  const updateWorkflow = useDocumentStore((state) => state.updateWorkflow);
  const currentUser = useAuthStore((state) => state.currentUser);

  const [steps, setSteps] = useState<StepDraft[]>(() => [
    {
      id: crypto.randomUUID(),
      label: "Author Draft Review",
      description:
        "Author performs final draft assessment before formal review.",
      role: "Author",
      slaHours: 48,
      requiresSignature: true,
      signatureMeaning: "Author attests to compliance with applicable SOPs.",
    },
    {
      id: crypto.randomUUID(),
      label: "Independent Review",
      description:
        "Reviewer validates technical accuracy and regulatory compliance.",
      role: "Reviewer",
      slaHours: 72,
      requiresSignature: true,
      signatureMeaning:
        "Reviewer confirms document accuracy and readiness for QA review.",
    },
    {
      id: crypto.randomUUID(),
      label: "QA Approval",
      description:
        "QA ensures traceability, training impact and release readiness.",
      role: "QA",
      slaHours: 48,
      requiresSignature: true,
      signatureMeaning: "QA approves document for final release.",
    },
    {
      id: crypto.randomUUID(),
      label: "Final Release Approval",
      description:
        "Approver authorizes document for production environments.",
      role: "Approver",
      slaHours: 24,
      requiresSignature: true,
      signatureMeaning:
        "Approver authorizes distribution of the controlled record.",
    },
  ]);

  const [complianceScope, setComplianceScope] = useState<string[]>([
    ...COMPLIANCE_REFERENCES,
  ]);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<WorkflowFormValues>({
    resolver: zodResolver(workflowSchema),
    defaultValues: {
      complianceScope,
      isDefault: false,
    },
  });

  useEffect(() => {
    setValue("complianceScope", complianceScope, {
      shouldDirty: true,
      shouldTouch: false,
    });
  }, [complianceScope, setValue]);

  const onSubmit = async (values: WorkflowFormValues) => {
    if (!currentUser) {
      toast.error("Authentication required.");
      return;
    }
    if (steps.length === 0) {
      toast.error("Configure at least one workflow step.");
      return;
    }
    try {
      createWorkflow({
        name: values.name,
        description: values.description,
        steps: steps.map((step) => ({
          label: step.label,
          description: step.description,
          role: step.role,
          slaHours: step.slaHours,
          requiresSignature: step.requiresSignature,
          signatureMeaning: step.signatureMeaning,
        })),
        complianceScope: values.complianceScope,
        isDefault: values.isDefault,
        actorId: currentUser.id,
      });
      toast.success("Workflow created.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to create workflow.",
      );
    }
  };

  const toggleComplianceScope = (reference: string) => {
    setComplianceScope((prev) =>
      prev.includes(reference)
        ? prev.filter((item) => item !== reference)
        : [...prev, reference],
    );
  };

  const updateStep = (id: string, updates: Partial<StepDraft>) => {
    setSteps((prev) =>
      prev.map((step) => (step.id === id ? { ...step, ...updates } : step)),
    );
  };

  const addStep = () => {
    setSteps((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        label: `Custom Step ${prev.length + 1}`,
        description: "Describe objectives for this approval step.",
        role: "Approver",
        slaHours: 24,
        requiresSignature: true,
        signatureMeaning: "Approval recorded electronically.",
      },
    ]);
  };

  const removeStep = (id: string) => {
    setSteps((prev) => prev.filter((step) => step.id !== id));
  };

  const makeDefault = (workflowId: string) => {
    if (!currentUser) return;
    updateWorkflow({
      id: workflowId,
      actorId: currentUser.id,
      updates: { isDefault: true },
    });
    toast.success("Workflow marked as default.");
  };

  const sortedWorkflows = useMemo(
    () =>
      [...workflows].sort((a, b) =>
        a.isDefault === b.isDefault ? 0 : a.isDefault ? -1 : 1,
      ),
    [workflows],
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-indigo-300">
          Workflow Automation
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-white">
          Configure approval workflows
        </h1>
        <p className="text-sm text-slate-400">
          Tailor lifecycle steps to enforce segregation of duties, QA checks,
          and compliant sign-offs.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 rounded-xl border border-white/10 bg-slate-950/70 p-6 shadow-lg"
        >
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.35em] text-indigo-300">
            <ClipboardDocumentListIcon className="h-4 w-4" />
            Define Workflow
          </h2>
          <div className="space-y-3 text-sm">
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                Workflow Name
              </label>
              <input
                type="text"
                className="field-input"
                placeholder="e.g. Change Control Release"
                {...register("name")}
              />
              {errors.name && (
                <p className="mt-1 text-xs text-rose-400">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                Description
              </label>
              <textarea
                rows={3}
                className="field-input"
                placeholder="Outline the use case, triggers, and compliance focus."
                {...register("description")}
              />
              {errors.description && (
                <p className="mt-1 text-xs text-rose-400">
                  {errors.description.message}
                </p>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                Compliance Scope
              </label>
              <div className="mt-2 grid gap-2">
                {COMPLIANCE_REFERENCES.map((reference) => (
                  <label
                    key={reference}
                    className="flex items-center justify-between rounded border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200"
                  >
                    <span>{reference}</span>
                    <input
                      type="checkbox"
                      checked={complianceScope.includes(reference)}
                      onChange={() => toggleComplianceScope(reference)}
                      className="h-4 w-4"
                    />
                  </label>
                ))}
              </div>
              {errors.complianceScope && (
                <p className="mt-1 text-xs text-rose-400">
                  {errors.complianceScope.message}
                </p>
              )}
            </div>
            <label className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-400">
              <input type="checkbox" {...register("isDefault")} />
              Set as default workflow
            </label>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">
                Workflow Steps
              </h3>
              <button
                type="button"
                onClick={addStep}
                className="rounded-md border border-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-slate-300 transition hover:border-indigo-400 hover:text-indigo-200"
              >
                Add Step
              </button>
            </div>
            <div className="space-y-3">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className="rounded-lg border border-white/10 bg-white/5 p-4 text-xs text-slate-200"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold uppercase tracking-[0.3em]">
                      Step {index + 1}
                    </p>
                    {steps.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeStep(step.id)}
                        className="text-[11px] font-semibold uppercase tracking-[0.3em] text-rose-300 hover:text-rose-200"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="text-[11px] uppercase tracking-[0.3em] text-slate-400">
                        Label
                      </label>
                      <input
                        value={step.label}
                        onChange={(event) =>
                          updateStep(step.id, { label: event.target.value })
                        }
                        className="field-input"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] uppercase tracking-[0.3em] text-slate-400">
                        Role
                      </label>
                      <select
                        value={step.role}
                        onChange={(event) =>
                          updateStep(step.id, {
                            role: event.target.value as Role,
                          })
                        }
                        className="field-input"
                      >
                        {ROLE_OPTIONS.map((role) => (
                          <option key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] uppercase tracking-[0.3em] text-slate-400">
                        SLA (hours)
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={step.slaHours}
                        onChange={(event) =>
                          updateStep(step.id, {
                            slaHours: Number(event.target.value),
                          })
                        }
                        className="field-input"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] uppercase tracking-[0.3em] text-slate-400">
                        Requires Signature
                      </label>
                      <select
                        value={step.requiresSignature ? "yes" : "no"}
                        onChange={(event) =>
                          updateStep(step.id, {
                            requiresSignature: event.target.value === "yes",
                          })
                        }
                        className="field-input"
                      >
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="text-[11px] uppercase tracking-[0.3em] text-slate-400">
                      Description
                    </label>
                    <textarea
                      rows={2}
                      value={step.description}
                      onChange={(event) =>
                        updateStep(step.id, {
                          description: event.target.value,
                        })
                      }
                      className="field-input"
                    />
                  </div>
                  <div className="mt-3">
                    <label className="text-[11px] uppercase tracking-[0.3em] text-slate-400">
                      Signature Meaning
                    </label>
                    <textarea
                      rows={2}
                      value={step.signatureMeaning}
                      onChange={(event) =>
                        updateStep(step.id, {
                          signatureMeaning: event.target.value,
                        })
                      }
                      className="field-input"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-indigo-500 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-indigo-400 disabled:opacity-60"
          >
            {isSubmitting ? "Configuring…" : "Create Workflow"}
          </button>
        </form>

        <section className="space-y-4 rounded-xl border border-white/10 bg-slate-950/70 p-6 shadow-lg">
          <h2 className="text-sm font-semibold uppercase tracking-[0.35em] text-indigo-300">
            Registered Workflows ({workflows.length})
          </h2>
          <div className="space-y-4">
            {sortedWorkflows.map((workflow) => (
              <div
                key={workflow.id}
                className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-slate-200"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-white">
                      {workflow.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {workflow.description}
                    </p>
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    <p>
                      Created{" "}
                      {format(parseISO(workflow.createdAt), "PP")}
                    </p>
                    <p>{workflow.steps.length} step(s)</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-slate-400">
                  {workflow.isDefault && (
                    <span className="rounded border border-emerald-400/60 px-3 py-1 text-emerald-200">
                      Default
                    </span>
                  )}
                  {workflow.complianceScope.map((reference) => (
                    <span
                      key={reference}
                      className="rounded border border-white/10 px-3 py-1"
                    >
                      {reference}
                    </span>
                  ))}
                </div>
                <div className="mt-4 space-y-2">
                  {workflow.steps.map((step, index) => (
                    <div
                      key={step.id}
                      className="rounded border border-white/10 bg-slate-900/80 px-3 py-2 text-xs text-slate-300"
                    >
                      <p className="flex items-center justify-between">
                        <span className="font-semibold text-white">
                          Step {index + 1}: {step.label}
                        </span>
                        <span>{step.slaHours}h SLA</span>
                      </p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.3em] text-slate-500">
                        {ROLE_LABELS[step.role]} ·{" "}
                        {step.requiresSignature
                          ? "Signature required"
                          : "Signature optional"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {step.description}
                      </p>
                    </div>
                  ))}
                </div>
                {!workflow.isDefault && (
                  <button
                    onClick={() => makeDefault(workflow.id)}
                    className="mt-4 inline-flex items-center gap-2 rounded-md border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-300 transition hover:border-indigo-400 hover:text-indigo-200"
                  >
                    <ArrowPathIcon className="h-4 w-4" />
                    Set as default
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
