"use client";

import { Dialog, Transition } from "@headlessui/react";
import {
  ArrowLeftIcon,
  CheckBadgeIcon,
  ClockIcon,
  DocumentDuplicateIcon,
  ExclamationCircleIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { format, parseISO } from "date-fns";
import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useDocumentStore } from "@/store/document-store";
import { useAuthStore } from "@/store/auth-store";
import { ROLE_LABELS } from "@/types";

const STATUS_INDICATOR: Record<string, string> = {
  Draft: "bg-slate-800 text-slate-200 border-slate-600",
  "In Review": "bg-amber-500/20 text-amber-100 border-amber-300/60",
  "Pending Approval": "bg-indigo-500/20 text-indigo-100 border-indigo-300/60",
  "QA Verification": "bg-sky-500/20 text-sky-100 border-sky-300/60",
  Approved: "bg-emerald-500/20 text-emerald-100 border-emerald-400/60",
  Effective: "bg-emerald-600/30 text-emerald-50 border-emerald-400/70",
  Archived: "bg-slate-900 text-slate-400 border-slate-700",
};

interface PageProps {
  params: { id: string };
}

export default function DocumentDetailPage({ params }: PageProps) {
  const router = useRouter();
  const document = useDocumentStore((state) =>
    state.documents.find((doc) => doc.id === params.id),
  );
  const documentTypes = useDocumentStore((state) => state.documentTypes);
  const workflows = useDocumentStore((state) => state.workflows);
  const signatures = useDocumentStore((state) => state.signatures);
  const auditTrail = useDocumentStore((state) => state.auditTrail);

  const advanceWorkflow = useDocumentStore((state) => state.advanceWorkflow);
  const rejectWorkflow = useDocumentStore((state) => state.rejectWorkflow);
  const markEffective = useDocumentStore((state) => state.markEffective);
  const archiveDocument = useDocumentStore((state) => state.archiveDocument);

  const verifyPassword = useAuthStore((state) => state.verifyPassword);
  const updateSignature = useAuthStore((state) => state.updateSignature);
  const users = useAuthStore((state) => state.users);
  const currentUser = useAuthStore((state) => state.currentUser);

  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [signatureReason, setSignatureReason] = useState("");
  const [signatureEvidence, setSignatureEvidence] = useState("");
  const [signaturePassword, setSignaturePassword] = useState("");
  const [signatureNotes, setSignatureNotes] = useState("");
  const [updatingProfileSignature, setUpdatingProfileSignature] =
    useState(false);
  const [profileSignature, setProfileSignature] = useState(
    currentUser?.signature ?? "",
  );

  const template = useMemo(() => {
    if (!document) return null;
    return workflows.find((workflow) => workflow.id === document.workflow.templateId);
  }, [document, workflows]);

  const currentStep = useMemo(() => {
    if (!document || !template) return null;
    const index = Math.min(
      document.workflow.currentStepIndex,
      template.steps.length - 1,
    );
    return {
      definition: template.steps[index],
      instance: document.workflow.steps[index],
      index,
    };
  }, [document, template]);

  const docType = useMemo(() => {
    if (!document) return undefined;
    return documentTypes.find((type) => type.id === document.documentTypeId);
  }, [document, documentTypes]);

  const documentSignatures = useMemo(() => {
    if (!document) return [];
    return signatures
      .filter((signature) => signature.documentId === document.id)
      .map((signature) => ({
        signature,
        user: users.find((user) => user.id === signature.userId) ?? null,
        step:
          template?.steps.find((step) => step.id === signature.workflowStepId) ??
          null,
      }));
  }, [document, signatures, users, template]);

  const documentAudit = useMemo(() => {
    if (!document) return [];
    return auditTrail
      .filter((entry) => entry.entityId === document.id)
      .slice(0, 20);
  }, [auditTrail, document]);

  if (!document) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-300 transition hover:border-white/20"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back
        </button>
        <div className="rounded-xl border border-white/10 bg-slate-950/60 p-8 text-center text-slate-200">
          <p className="text-lg font-semibold">Document not found</p>
          <p className="mt-2 text-sm text-slate-400">
            The requested record is unavailable or has been archived.
          </p>
        </div>
      </div>
    );
  }

  const canAdvance =
    currentUser &&
    currentStep?.definition &&
    currentStep.instance?.status === "In Progress" &&
    currentStep.definition.role === currentUser.role &&
    document.workflow.status !== "Approved" &&
    document.workflow.status !== "Effective" &&
    document.workflow.status !== "Archived";

  const canReject =
    canAdvance ||
    (currentUser &&
      currentStep?.definition?.role === currentUser.role &&
      currentStep.instance?.status === "In Progress");

  const canMarkEffective =
    currentUser &&
    (currentUser.role === "QA" || currentUser.role === "Admin") &&
    document.workflow.status === "Approved";

  const canArchive =
    currentUser &&
    (currentUser.role === "QA" || currentUser.role === "Admin") &&
    document.workflow.status !== "Archived";

  const handleAdvance = () => {
    setSignatureReason("");
    setSignatureEvidence(
      currentUser?.signature ??
        `${currentUser?.name ?? ""} electronic approval`,
    );
    setSignaturePassword("");
    setSignatureNotes("");
    setSignatureModalOpen(true);
  };

  const submitSignature = async () => {
    if (!currentUser || !currentStep?.definition) {
      return;
    }
    try {
      const valid = await verifyPassword(currentUser.id, signaturePassword);
      if (!valid) {
        toast.error("Password verification failed.");
        return;
      }
      if (!signatureReason.trim()) {
        toast.error("Provide a reason/justification for the signature.");
        return;
      }
      if (!signatureEvidence.trim()) {
        toast.error("Signature evidence statement is required.");
        return;
      }
      advanceWorkflow({
        documentId: document.id,
        actorId: currentUser.id,
        actorRole: currentUser.role,
        notes: signatureNotes,
        reason: signatureReason,
        signatureMeaning:
          currentStep.definition.signatureMeaning ??
          "Electronic approval recorded",
        signatureEvidence: signatureEvidence,
      });
      toast.success("Workflow advanced with validated signature.");
      setSignatureModalOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to record electronic signature.",
      );
    }
  };

  const handleReject = () => {
    if (!currentUser || !currentStep?.definition) return;
    const reason = window.prompt(
      "Provide the justification for rejecting this step.",
    );
    if (!reason) return;
    try {
      rejectWorkflow(document.id, currentUser.id, currentUser.role, reason);
      toast.success("Workflow rejected and document returned to draft.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to reject workflow.",
      );
    }
  };

  const handleMarkEffective = () => {
    if (!currentUser) return;
    markEffective(document.id, currentUser.id);
    toast.success("Document moved to effective state.");
  };

  const handleArchive = () => {
    if (!currentUser) return;
    const confirmation = window.confirm(
      "Archive this document? It will remain in the audit trail but removed from active distribution.",
    );
    if (!confirmation) return;
    archiveDocument(document.id, currentUser.id);
    toast.success("Document archived.");
  };

  const updateSignatureProfile = () => {
    if (!currentUser) return;
    if (!profileSignature.trim()) {
      toast.error("Signature statement cannot be empty.");
      return;
    }
    setUpdatingProfileSignature(true);
    updateSignature(currentUser.id, profileSignature.trim());
    toast.success("Signature profile updated.");
    setUpdatingProfileSignature(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 transition hover:text-indigo-200"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to listing
        </button>
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={clsx(
              "rounded-full border px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em]",
              STATUS_INDICATOR[document.workflow.status] ??
                "bg-slate-800 border-slate-600 text-slate-200",
            )}
          >
            {document.workflow.status}
          </span>
          <span className="rounded-full border border-white/10 px-4 py-1 text-xs uppercase tracking-[0.3em] text-slate-300">
            {docType?.type ?? "Document"}
          </span>
          <span className="rounded-full border border-white/10 px-4 py-1 text-xs uppercase tracking-[0.3em] text-slate-300">
            {document.metadata.security} access
          </span>
        </div>
      </div>

      <section className="rounded-xl border border-white/10 bg-slate-950/70 p-6 shadow-lg shadow-black/30">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-indigo-300">
              Document Profile
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-white">
              {document.title}
            </h1>
            <p className="text-sm text-slate-400">
              {document.documentNumber} • Version {document.currentVersion}
            </p>
          </div>
          {currentUser && (
            <div className="flex flex-col gap-3 text-xs text-slate-300">
              <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                Electronic Signature Statement
              </label>
              <textarea
                rows={2}
                value={profileSignature}
                onChange={(event) => setProfileSignature(event.target.value)}
                className="w-72 rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-xs text-slate-100 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={updateSignatureProfile}
                  disabled={updatingProfileSignature}
                  className="rounded-md border border-white/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-300 transition hover:border-indigo-400 hover:text-indigo-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Save Signature
                </button>
                <p className="text-[11px] text-slate-500">
                  Used when executing electronic signatures.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-4 text-sm text-slate-300 md:grid-cols-2 lg:grid-cols-4">
          <MetadataItem label="Created" value={format(parseISO(document.metadata.dateCreated), "PP")} />
          <MetadataItem
            label="Created By"
            value={
              users.find((user) => user.id === document.metadata.createdById)
                ?.name ?? "Unknown"
            }
          />
          <MetadataItem
            label="Issued By"
            value={
              users.find((user) => user.id === document.metadata.issuedById)
                ? `${users.find((user) => user.id === document.metadata.issuedById)?.name} (${document.metadata.issuerRole})`
                : document.metadata.issuerRole
            }
          />
          <MetadataItem
            label="Effective From"
            value={format(parseISO(document.metadata.effectiveFrom), "PP")}
          />
          <MetadataItem
            label="Next Issue"
            value={format(parseISO(document.metadata.nextIssueDate), "PP")}
          />
          <MetadataItem
            label="Category"
            value={document.metadata.category}
          />
          <MetadataItem
            label="Security"
            value={document.metadata.security}
          />
          <MetadataItem
            label="Risk"
            value={document.riskClassification}
          />
        </div>
        {document.metadata.changeControlId && (
          <div className="mt-4 rounded border border-indigo-400/40 bg-indigo-500/10 px-4 py-3 text-xs text-indigo-100">
            <span className="font-semibold uppercase tracking-[0.3em]">
              Change Control ID:&nbsp;
            </span>
            {document.metadata.changeControlId}
          </div>
        )}
        {document.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {document.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.25em] text-slate-300"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-slate-950/70 p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.35em] text-indigo-300">
              <ClockIcon className="h-4 w-4" />
              Workflow Progress
            </h2>
            {template && (
              <p className="text-xs text-slate-400">{template.name}</p>
            )}
          </div>
          <div className="mt-5 space-y-3">
            {template?.steps.map((step, index) => {
              const instance = document.workflow.steps[index];
              return (
                <div
                  key={step.id}
                  className={clsx(
                    "rounded-lg border px-4 py-3 text-sm transition",
                    instance?.status === "Completed"
                      ? "border-emerald-400/40 bg-emerald-500/10"
                      : instance?.status === "Rejected"
                        ? "border-rose-400/40 bg-rose-500/10"
                        : instance?.status === "In Progress"
                          ? "border-indigo-400/40 bg-indigo-500/10"
                          : "border-white/10 bg-white/5",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">{step.label}</p>
                      <p className="text-xs text-slate-400">{step.description}</p>
                    </div>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-slate-300">
                      {instance?.status ?? "Pending"}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <span>Role: {ROLE_LABELS[step.role]}</span>
                    <span>SLA: {step.slaHours}h</span>
                    {instance?.actorUserId && (
                      <span>
                        Actor:{" "}
                        {
                          users.find((user) => user.id === instance.actorUserId)
                            ?.name
                        }
                      </span>
                    )}
                    {instance?.completedAt && (
                      <span>
                        Completed: {format(parseISO(instance.completedAt), "PPpp")}
                      </span>
                    )}
                  </div>
                  {index === currentStep?.index && (
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      {canAdvance && (
                        <button
                          onClick={handleAdvance}
                          className="inline-flex items-center gap-2 rounded-md bg-emerald-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-emerald-400"
                        >
                          <CheckBadgeIcon className="h-4 w-4" />
                          Sign & Advance
                        </button>
                      )}
                      {canReject && (
                        <button
                          onClick={handleReject}
                          className="inline-flex items-center gap-2 rounded-md border border-rose-400/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-rose-200 transition hover:border-rose-300 hover:text-rose-100"
                        >
                          <ExclamationCircleIcon className="h-4 w-4" />
                          Reject Step
                        </button>
                      )}
                      {canMarkEffective && (
                        <button
                          onClick={handleMarkEffective}
                          className="inline-flex items-center gap-2 rounded-md border border-sky-400/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-sky-200 transition hover:border-sky-300 hover:text-sky-100"
                        >
                          <ShieldCheckIcon className="h-4 w-4" />
                          Mark Effective
                        </button>
                      )}
                      {canArchive && (
                        <button
                          onClick={handleArchive}
                          className="inline-flex items-center gap-2 rounded-md border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-300 transition hover:border-white/20"
                        >
                          Archive
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-950/70 p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.35em] text-indigo-300">
              <DocumentDuplicateIcon className="h-4 w-4" />
              Version History
            </h2>
            <span className="text-xs text-slate-400">
              {document.versionHistory.length} revisions
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {document.versionHistory.map((version) => (
              <div
                key={version.id}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-3"
              >
                <div className="flex items-center justify-between text-sm text-white">
                  <span>Version {version.versionLabel}</span>
                  <span>{format(parseISO(version.createdAt), "PP")}</span>
                </div>
                <p className="mt-2 text-xs text-slate-300">
                  {version.summary}
                </p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.3em] text-slate-500">
                  Authored by{" "}
                  {
                    users.find((user) => user.id === version.createdById)
                      ?.name
                  }
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-slate-950/70 p-6 shadow-lg">
          <h2 className="text-sm font-semibold uppercase tracking-[0.35em] text-indigo-300">
            Electronic Signatures
          </h2>
          <div className="mt-4 space-y-3">
            {documentSignatures.length === 0 && (
              <p className="rounded border border-dashed border-white/10 px-4 py-6 text-center text-sm text-slate-400">
                No signatures recorded yet. Each workflow approval will be
                logged here with immutable timestamps.
              </p>
            )}
            {documentSignatures.map(({ signature, user, step }) => (
              <div
                key={signature.id}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{step?.label ?? "Workflow Step"}</p>
                  <p className="text-xs text-slate-400">
                    {format(parseISO(signature.signedAt), "PPpp")}
                  </p>
                </div>
                <p className="mt-1 text-xs uppercase tracking-[0.3em] text-slate-500">
                  {signature.meaning}
                </p>
                <p className="mt-2 text-xs text-slate-300">
                  <span className="font-semibold">{user?.name ?? "User"}</span> ·{" "}
                  {ROLE_LABELS[user?.role ?? "Viewer" as keyof typeof ROLE_LABELS]}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Evidence: {signature.evidence}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Reason: {signature.reason}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-950/70 p-6 shadow-lg">
          <h2 className="text-sm font-semibold uppercase tracking-[0.35em] text-indigo-300">
            Audit Trail
          </h2>
          <div className="mt-4 space-y-3 text-sm text-slate-200">
            {documentAudit.length === 0 && (
              <p className="rounded border border-dashed border-white/10 px-4 py-6 text-center text-sm text-slate-400">
                All document activities will materialize here in chronological
                order for inspection readiness.
              </p>
            )}
            {documentAudit.map((entry) => (
              <div
                key={entry.id}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-3"
              >
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  {entry.action} — {format(parseISO(entry.timestamp), "PPpp")}
                </p>
                <p className="mt-1 text-sm text-white">{entry.summary}</p>
                {entry.metadata && (
                  <pre className="mt-2 overflow-x-auto rounded bg-slate-900/60 p-3 text-[11px] text-slate-400">
                    {JSON.stringify(entry.metadata, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
          <Link
            href="/app/audit-log"
            className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300 hover:text-indigo-200"
          >
            View complete audit log
          </Link>
        </div>
      </section>

      <SignatureModal
        open={signatureModalOpen}
        onClose={() => setSignatureModalOpen(false)}
        reason={signatureReason}
        onReasonChange={setSignatureReason}
        evidence={signatureEvidence}
        onEvidenceChange={setSignatureEvidence}
        password={signaturePassword}
        onPasswordChange={setSignaturePassword}
        notes={signatureNotes}
        onNotesChange={setSignatureNotes}
        onSubmit={submitSignature}
        stepLabel={currentStep?.definition?.label ?? ""}
        signatureMeaning={
          currentStep?.definition?.signatureMeaning ??
          "Electronic approval recorded"
        }
      />
    </div>
  );
}

function MetadataItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 bg-white/5 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-sm text-white">{value}</p>
    </div>
  );
}

function SignatureModal({
  open,
  onClose,
  reason,
  onReasonChange,
  evidence,
  onEvidenceChange,
  password,
  onPasswordChange,
  notes,
  onNotesChange,
  onSubmit,
  stepLabel,
  signatureMeaning,
}: {
  open: boolean;
  onClose: () => void;
  reason: string;
  onReasonChange: (value: string) => void;
  evidence: string;
  onEvidenceChange: (value: string) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  onSubmit: () => void;
  stepLabel: string;
  signatureMeaning: string;
}) {
  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center px-4 py-8">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-xl rounded-xl border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-black/60">
                <Dialog.Title className="text-lg font-semibold text-white">
                  Execute Electronic Signature
                </Dialog.Title>
                <p className="mt-2 text-sm text-slate-400">
                  Step: {stepLabel} · Meaning: {signatureMeaning}
                </p>

                <div className="mt-6 space-y-4 text-sm text-slate-200">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                      Signature Evidence Statement
                    </label>
                    <input
                      type="text"
                      value={evidence}
                      onChange={(event) => onEvidenceChange(event.target.value)}
                      className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                      Reason & Justification
                    </label>
                    <textarea
                      rows={3}
                      value={reason}
                      onChange={(event) => onReasonChange(event.target.value)}
                      className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                      Optional Notes
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(event) => onNotesChange(event.target.value)}
                      className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                      Re-enter Password (21 CFR Part 11)
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => onPasswordChange(event.target.value)}
                      className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-500/30"
                    />
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-end gap-3 text-xs font-semibold uppercase tracking-[0.3em]">
                  <button
                    onClick={onClose}
                    className="rounded-md border border-white/10 px-4 py-2 text-slate-300 transition hover:border-white/20"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onSubmit}
                    className="rounded-md bg-emerald-500 px-5 py-2 text-white transition hover:bg-emerald-400"
                  >
                    Sign & Advance
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
