"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useDocumentStore } from "@/store/document-store";
import { useAuthStore } from "@/store/auth-store";

export default function AuditLogPage() {
  const auditTrail = useDocumentStore((state) => state.auditTrail);
  const users = useAuthStore((state) => state.users);

  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState<string>("all");

  const filteredLogs = useMemo(() => {
    return auditTrail.filter((entry) => {
      const matchesEntity =
        entityFilter === "all" || entry.entityType === entityFilter;
      const matchesSearch =
        search.trim().length === 0 ||
        entry.summary.toLowerCase().includes(search.toLowerCase()) ||
        entry.action.toLowerCase().includes(search.toLowerCase());
      return matchesEntity && matchesSearch;
    });
  }, [auditTrail, entityFilter, search]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-indigo-300">
          Immutable Audit Trail
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-white">
          Monitor system-level activity
        </h1>
        <p className="text-sm text-slate-400">
          Every change is captured with timestamp, actor, and contextual
          metadata aligned to inspection expectations.
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-slate-950/70 p-4 shadow-lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="search"
              placeholder="Search action summaries"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-md border border-white/10 bg-slate-900 py-2 pl-9 pr-3 text-sm text-slate-100 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30"
            />
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>Entity</span>
            <select
              value={entityFilter}
              onChange={(event) => setEntityFilter(event.target.value)}
              className="rounded border border-white/10 bg-slate-900 px-3 py-2 uppercase tracking-[0.25em] outline-none transition focus:border-indigo-400"
            >
              <option value="all">All</option>
              <option value="Document">Document</option>
              <option value="DocumentType">Document Type</option>
              <option value="Workflow">Workflow</option>
              <option value="User">User</option>
              <option value="System">System</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-950/70 shadow-xl">
        <table className="min-w-full divide-y divide-white/10 text-sm text-slate-200">
          <thead className="bg-white/5 text-xs uppercase tracking-[0.3em] text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left">Timestamp</th>
              <th className="px-4 py-3 text-left">Actor</th>
              <th className="px-4 py-3 text-left">Action</th>
              <th className="px-4 py-3 text-left">Summary</th>
              <th className="px-4 py-3 text-left">Compliance</th>
              <th className="px-4 py-3 text-left">Metadata</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {filteredLogs.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-6 text-center text-sm text-slate-400"
                >
                  No audit entries match the current filters.
                </td>
              </tr>
            )}
            {filteredLogs.map((entry) => {
              const actor =
                users.find((user) => user.id === entry.actorUserId) ?? null;
              return (
                <tr key={entry.id} className="hover:bg-white/5">
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {format(parseISO(entry.timestamp), "PPpp")}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300">
                    {actor ? `${actor.name} (${actor.role})` : entry.actorUserId}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span
                      className={clsx(
                        "rounded-full border px-3 py-1 uppercase tracking-[0.25em]",
                        entry.entityType === "Document"
                          ? "border-indigo-400/60 text-indigo-200"
                          : "border-white/10 text-slate-300",
                      )}
                    >
                      {entry.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-200">{entry.summary}</td>
                  <td className="px-4 py-3 text-[11px] text-slate-400">
                    {entry.complianceRefs?.join(", ")}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {entry.metadata ? (
                      <pre className="max-h-32 overflow-auto rounded bg-slate-900/70 p-2 text-[11px]">
                        {JSON.stringify(entry.metadata, null, 2)}
                      </pre>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
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
