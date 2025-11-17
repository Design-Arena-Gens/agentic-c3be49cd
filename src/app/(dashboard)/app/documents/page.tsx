"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRightIcon,
  DocumentPlusIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { format, parseISO } from "date-fns";
import clsx from "clsx";
import { useDocumentStore } from "@/store/document-store";
import { DOCUMENT_SECURITY_OPTIONS } from "@/types";

const STATUS_BADGES: Record<string, string> = {
  Draft: "bg-slate-800 text-slate-200 border-slate-700",
  "In Review": "bg-amber-500/10 text-amber-200 border-amber-300/40",
  "Pending Approval": "bg-indigo-500/10 text-indigo-200 border-indigo-300/40",
  "QA Verification": "bg-sky-500/10 text-sky-200 border-sky-300/40",
  Approved: "bg-emerald-500/10 text-emerald-100 border-emerald-300/50",
  Effective: "bg-emerald-600/20 text-emerald-100 border-emerald-400/60",
  Archived: "bg-slate-900 text-slate-400 border-slate-700",
};

export default function DocumentsPage() {
  const documents = useDocumentStore((state) => state.documents);
  const documentTypes = useDocumentStore((state) => state.documentTypes);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [securityFilter, setSecurityFilter] = useState<string>("all");

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch =
        doc.title.toLowerCase().includes(search.toLowerCase()) ||
        doc.documentNumber.toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || doc.workflow.status === statusFilter;
      const matchesSecurity =
        securityFilter === "all" ||
        doc.metadata.security.toLowerCase() === securityFilter.toLowerCase();
      return matchesSearch && matchesStatus && matchesSecurity;
    });
  }, [documents, search, statusFilter, securityFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-indigo-300">
            Controlled Documents
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-white">
            Lifecycle and issuance management
          </h1>
          <p className="text-sm text-slate-400">
            Maintain digital control of GMP documentation with full auditability.
          </p>
        </div>
        <Link
          href="/app/documents/new"
          className="flex items-center gap-2 rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-indigo-400"
        >
          <DocumentPlusIcon className="h-5 w-5" />
          New Document
        </Link>
      </div>

      <div className="rounded-xl border border-white/10 bg-slate-950/70 p-4 shadow-lg shadow-black/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="search"
              placeholder="Search by title or document number"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-md border border-white/10 bg-slate-900 py-2 pl-9 pr-3 text-sm text-slate-100 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
            <span className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-400">
              <FunnelIcon className="h-4 w-4" /> Filters
            </span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded border border-white/10 bg-slate-900 px-3 py-2 text-xs uppercase tracking-[0.25em] outline-none transition focus:border-indigo-400"
            >
              <option value="all">All Statuses</option>
              {Object.keys(STATUS_BADGES).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <select
              value={securityFilter}
              onChange={(event) => setSecurityFilter(event.target.value)}
              className="rounded border border-white/10 bg-slate-900 px-3 py-2 text-xs uppercase tracking-[0.25em] outline-none transition focus:border-indigo-400"
            >
              <option value="all">All Security Levels</option>
              {DOCUMENT_SECURITY_OPTIONS.map((security) => (
                <option key={security} value={security}>
                  {security}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-950/70 shadow-lg shadow-black/30">
        <table className="min-w-full divide-y divide-white/10 text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-[0.35em] text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-300">
                Document
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-300">
                Type
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-300">
                Security
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-300">
                Workflow Status
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-300">
                Effective From
              </th>
              <th className="px-4 py-3 text-right font-semibold text-slate-300">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-slate-200">
            {filteredDocuments.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-sm text-slate-400"
                >
                  No documents found with the selected filters.
                </td>
              </tr>
            )}
            {filteredDocuments.map((doc) => {
              const docType = documentTypes.find(
                (type) => type.id === doc.documentTypeId,
              );
              return (
                <tr key={doc.id} className="hover:bg-white/5">
                  <td className="px-4 py-4">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {doc.title}
                      </p>
                      <p className="text-xs font-mono uppercase tracking-[0.3em] text-slate-400">
                        {doc.documentNumber} · v{doc.currentVersion}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="rounded border border-white/10 bg-white/5 px-2 py-1 text-xs uppercase tracking-[0.25em] text-slate-300">
                      {docType?.type ?? "Unknown"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="rounded border border-white/10 bg-white/5 px-2 py-1 text-xs uppercase tracking-[0.25em] text-slate-300">
                      {doc.metadata.security}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={clsx(
                        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.3em]",
                        STATUS_BADGES[doc.workflow.status] ??
                          "bg-slate-800 border-slate-700 text-slate-300",
                      )}
                    >
                      {doc.workflow.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-xs text-slate-300">
                    {format(parseISO(doc.metadata.effectiveFrom), "PP")}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Link
                      href={`/app/documents/${doc.id}`}
                      className="inline-flex items-center gap-2 rounded-md border border-indigo-400/40 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-indigo-200 transition hover:border-indigo-300 hover:text-indigo-100"
                    >
                      View
                      <ArrowRightIcon className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
