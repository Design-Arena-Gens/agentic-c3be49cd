"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  differenceInCalendarDays,
  format,
  isBefore,
  parseISO,
} from "date-fns";
import {
  ArrowRightCircleIcon,
  ClockIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { useDocumentStore } from "@/store/document-store";
import { useAuthStore } from "@/store/auth-store";

const STATUS_COLORS: Record<string, string> = {
  Draft: "bg-slate-800 border-slate-700 text-slate-200",
  "In Review": "bg-amber-500/20 border-amber-400/40 text-amber-200",
  "Pending Approval": "bg-indigo-500/20 border-indigo-400/50 text-indigo-200",
  "QA Verification": "bg-sky-500/20 border-sky-400/50 text-sky-200",
  Approved: "bg-emerald-500/20 border-emerald-400/50 text-emerald-200",
  Effective: "bg-emerald-500/30 border-emerald-400/60 text-emerald-50",
  Archived: "bg-slate-900 border-slate-700 text-slate-500",
};

export default function DashboardPage() {
  const documents = useDocumentStore((state) => state.documents);
  const auditTrail = useDocumentStore((state) => state.auditTrail);
  const workflows = useDocumentStore((state) => state.workflows);
  const currentUser = useAuthStore((state) => state.currentUser);

  const metrics = useMemo(() => {
    const total = documents.length;
    const byStatus = documents.reduce<Record<string, number>>((acc, doc) => {
      const status = doc.workflow.status;
      acc[status] = (acc[status] ?? 0) + 1;
      return acc;
    }, {});

    const dueSoon = documents
      .filter((doc) => {
        const nextIssue = parseISO(doc.metadata.nextIssueDate);
        const days = differenceInCalendarDays(nextIssue, new Date());
        return days <= 60 && days >= 0;
      })
      .sort((a, b) =>
        parseISO(a.metadata.nextIssueDate).getTime() -
        parseISO(b.metadata.nextIssueDate).getTime(),
      )
      .slice(0, 5);

    return { total, byStatus, dueSoon };
  }, [documents]);

  type RoleTask = {
    documentId: string;
    title: string;
    number: string;
    version: string;
    stepLabel: string;
    slaHours: number;
    effectiveFrom: string;
    nextIssueDate: string;
  };

  const roleTasks = useMemo<RoleTask[]>(() => {
    if (!currentUser) return [];
    const tasks: Array<RoleTask | null> = documents.map((doc) => {
      const instance = doc.workflow;
      const template = workflows.find(
        (wf) => wf.id === instance.templateId,
      );
      if (!template) return null;
      const stepIndex = Math.min(
        instance.currentStepIndex,
        template.steps.length - 1,
      );
      const step = template.steps[stepIndex];
      if (!step) return null;
      const instanceStep = instance.steps[stepIndex];
      if (
        step.role !== currentUser.role ||
        instanceStep.status !== "In Progress"
      ) {
        return null;
      }
      return {
        documentId: doc.id,
        title: doc.title,
        number: doc.documentNumber,
        version: doc.currentVersion,
        stepLabel: step.label,
        slaHours: step.slaHours,
        effectiveFrom: doc.metadata.effectiveFrom,
        nextIssueDate: doc.metadata.nextIssueDate,
      };
    });
    return tasks.filter((task): task is RoleTask => task !== null);
  }, [documents, workflows, currentUser]);

  const recentAudit = auditTrail.slice(0, 5);

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-white/10 bg-slate-950/60 p-6 shadow-lg shadow-black/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-indigo-300">
              Controlled Document Dashboard
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-white">
              Real-time lifecycle oversight
            </h2>
            <p className="text-sm text-slate-400">
              Monitor approvals, renewals, and compliance activities across the
              DocumentManagement platform.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm text-slate-200 lg:grid-cols-4">
            <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                Total Documents
              </p>
              <p className="mt-2 text-2xl font-semibold text-indigo-300">
                {metrics.total}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                Approved
              </p>
              <p className="mt-2 text-2xl font-semibold text-emerald-300">
                {metrics.byStatus["Approved"] ?? 0}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                In Workflow
              </p>
              <p className="mt-2 text-2xl font-semibold text-amber-300">
                {(metrics.byStatus["Draft"] ?? 0) +
                  (metrics.byStatus["In Review"] ?? 0) +
                  (metrics.byStatus["Pending Approval"] ?? 0)}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                Effective
              </p>
              <p className="mt-2 text-2xl font-semibold text-sky-300">
                {metrics.byStatus["Effective"] ?? 0}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-slate-950/70 p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-[0.35em] text-indigo-300">
              Workflow Load
            </h3>
            <Link
              href="/app/documents"
              className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300 hover:text-indigo-200"
            >
              Manage
              <ArrowRightCircleIcon className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(metrics.byStatus).map(([status, count]) => (
              <div
                key={status}
                className={`rounded-lg border px-4 py-3 text-sm font-medium ${
                  STATUS_COLORS[status] ?? "bg-slate-800 border-slate-700"
                }`}
              >
                <p className="uppercase tracking-[0.28em] text-[11px]">
                  {status}
                </p>
                <p className="mt-2 text-2xl text-white">{count}</p>
              </div>
            ))}
            {!Object.keys(metrics.byStatus).length && (
              <p className="rounded border border-dashed border-white/10 px-4 py-6 text-center text-sm text-slate-400">
                No controlled documents created yet. Author a document to engage
                the approval workflow.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-950/70 p-6">
          <h3 className="text-sm font-semibold uppercase tracking-[0.35em] text-indigo-300">
            Upcoming Issuances
          </h3>
          <div className="mt-4 space-y-3">
            {metrics.dueSoon.length === 0 && (
              <p className="rounded border border-dashed border-white/10 px-4 py-6 text-center text-sm text-slate-400">
                No upcoming re-issues within the next 60 days.
              </p>
            )}
            {metrics.dueSoon.map((doc) => {
              const daysLeft = differenceInCalendarDays(
                parseISO(doc.metadata.nextIssueDate),
                new Date(),
              );
              const overdue = isBefore(
                parseISO(doc.metadata.nextIssueDate),
                new Date(),
              );
              return (
                <div
                  key={doc.id}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-3"
                >
                  <p className="text-sm font-semibold text-white">{doc.title}</p>
                  <p className="text-xs text-slate-400">
                    {doc.documentNumber} · Next Issue{" "}
                    {format(parseISO(doc.metadata.nextIssueDate), "PP")}
                  </p>
                  <p
                    className={`mt-2 text-xs uppercase tracking-[0.28em] ${
                      overdue ? "text-rose-300" : "text-amber-200"
                    }`}
                  >
                    {overdue
                      ? "Overdue"
                      : `${daysLeft} days until re-issue required`}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-slate-950/70 p-6">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.35em] text-indigo-300">
              <ClockIcon className="h-4 w-4" />
              Assigned Actions
            </h3>
            <span className="text-xs text-slate-400">
              {roleTasks.length} open task(s)
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {roleTasks.length === 0 && (
              <p className="rounded border border-dashed border-white/10 px-4 py-6 text-center text-sm text-slate-400">
                No workflow activities currently assigned to your role.
              </p>
            )}
            {roleTasks.map((task) => (
              <div
                key={task.documentId}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {task.title} · {task.version}
                    </p>
                    <p className="text-xs text-slate-400">{task.number}</p>
                  </div>
                  <Link
                    href={`/app/documents/${task.documentId}`}
                    className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300 hover:text-indigo-200"
                  >
                    Open
                  </Link>
                </div>
                <p className="mt-2 text-xs uppercase tracking-[0.3em] text-slate-400">
                  Pending Step: {task.stepLabel}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-950/70 p-6">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.35em] text-indigo-300">
              <ShieldCheckIcon className="h-4 w-4" />
              Audit Highlights
            </h3>
            <Link
              href="/app/audit-log"
              className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300 hover:text-indigo-200"
            >
              Review Log
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {recentAudit.length === 0 && (
              <p className="rounded border border-dashed border-white/10 px-4 py-6 text-center text-sm text-slate-400">
                No audit activity recorded yet. All actions will appear here
                chronologically.
              </p>
            )}
            {recentAudit.map((entry) => (
              <div
                key={entry.id}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-3"
              >
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  {format(parseISO(entry.timestamp), "PPpp")}
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {entry.summary}
                </p>
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
                  {entry.action}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
