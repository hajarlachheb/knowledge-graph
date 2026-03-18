"use client";

import { useEffect, useState } from "react";
import {
  getAdminStats, getAdminUsers, toggleAdmin, getExportAllCsvUrl, AdminStats,
  getAdminAnalytics, getAdminAuditLog, getContentHealth,
  getModerationQueue, approveRex, rejectRex,
  getRoles, createRole, assignRole, RoleOut,
  getImportTemplateUrl, importPreview, importExecute,
} from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

interface AdminUser {
  id: number; username: string; email: string; full_name: string;
  position: string; is_admin: boolean; created_at: string; department: string | null;
}

type Tab = "overview" | "analytics" | "moderation" | "roles" | "audit" | "import";

export default function AdminPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Analytics
  const [analytics, setAnalytics] = useState<Record<string, unknown> | null>(null);
  // Moderation
  const [modQueue, setModQueue] = useState<Array<Record<string, unknown>>>([]);
  // Roles
  const [roles, setRoles] = useState<RoleOut[]>([]);
  const [newRoleName, setNewRoleName] = useState("");
  // Audit
  const [auditLog, setAuditLog] = useState<Array<Record<string, unknown>>>([]);
  // Import
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreviewData, setImportPreviewData] = useState<unknown[] | null>(null);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);

  useEffect(() => {
    Promise.all([getAdminStats(), getAdminUsers()])
      .then(([s, u]) => { setStats(s); setUsers(u as AdminUser[]); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab === "analytics") getAdminAnalytics().then((d) => setAnalytics(d as Record<string, unknown>)).catch(() => {});
    if (tab === "moderation") getModerationQueue().then((d) => setModQueue(d as Array<Record<string, unknown>>)).catch(() => {});
    if (tab === "roles") getRoles().then(setRoles).catch(() => {});
    if (tab === "audit") getAdminAuditLog().then((d) => setAuditLog(d as Array<Record<string, unknown>>)).catch(() => {});
  }, [tab]);

  const handleToggleAdmin = async (userId: number) => {
    try {
      const result = await toggleAdmin(userId);
      setUsers((prev) => prev.map((u) => u.id === result.id ? { ...u, is_admin: result.is_admin } : u));
    } catch { /* silent */ }
  };

  if (!user?.is_admin) {
    return <div className="flex items-center justify-center py-20"><p className="text-gray-500 dark:text-gray-400">Admin access required</p></div>;
  }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" /></div>;
  }

  if (error) return <div className="text-red-500 dark:text-red-400 text-center py-20">{error}</div>;

  const TABS: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "analytics", label: "Analytics" },
    { id: "moderation", label: "Moderation" },
    { id: "roles", label: "Roles" },
    { id: "audit", label: "Audit Log" },
    { id: "import", label: "Import" },
  ];

  return (
    <div className="w-full min-w-0 overflow-x-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Panel</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Platform management</p>
        </div>
        <a href={getExportAllCsvUrl()} className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-1.5">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
          Export CSV
        </a>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${tab === t.id ? "text-brand-600 border-b-2 border-brand-600" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === "overview" && (
        <>
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
              {[
                { label: "Users", value: stats.total_users, color: "text-blue-600" },
                { label: "REX Sheets", value: stats.total_rex, color: "text-green-600" },
                { label: "Comments", value: stats.total_comments, color: "text-purple-600" },
                { label: "Votes", value: stats.total_votes, color: "text-amber-600" },
                { label: "Views", value: stats.total_views, color: "text-pink-600" },
                { label: "Departments", value: stats.total_departments, color: "text-indigo-600" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-center">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Users</h2>
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800">
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-600 dark:text-gray-300">Name</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-600 dark:text-gray-300">Email</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-600 dark:text-gray-300">Department</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-600 dark:text-gray-300">Role</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-600 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-2.5"><p className="font-medium text-gray-900 dark:text-white">{u.full_name}</p><p className="text-[11px] text-gray-400 dark:text-gray-300">{u.position}</p></td>
                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">{u.email}</td>
                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">{u.department || "—"}</td>
                    <td className="px-4 py-2.5">
                      {u.is_admin ? <span className="rounded-full bg-red-100 dark:bg-red-900/30 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:text-red-400">Admin</span>
                      : <span className="rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-[10px] font-semibold text-gray-500 dark:text-gray-400">Member</span>}
                    </td>
                    <td className="px-4 py-2.5"><button onClick={() => handleToggleAdmin(u.id)} className="text-[12px] text-brand-600 hover:underline">{u.is_admin ? "Remove admin" : "Make admin"}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Analytics */}
      {tab === "analytics" && analytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-center">
              <p className="text-3xl font-bold text-brand-600">{String(analytics.views_30d ?? 0)}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Views (30d)</p>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-center">
              <p className="text-3xl font-bold text-green-600">{String(analytics.rex_30d ?? 0)}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">New REX (30d)</p>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-center">
              <p className="text-3xl font-bold text-purple-600">{String(analytics.comments_30d ?? 0)}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Comments (30d)</p>
            </div>
          </div>
          {(analytics.top_queries as Array<{ query: string; count: number }>)?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Top Search Queries</h3>
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
                {(analytics.top_queries as Array<{ query: string; count: number }>).map((q, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                    <span className="text-sm text-gray-700 dark:text-gray-200">{q.query}</span>
                    <span className="text-xs font-semibold text-gray-400 dark:text-gray-300">{q.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Moderation */}
      {tab === "moderation" && (
        <div>
          {modQueue.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-12">No flagged REX sheets</p>
          ) : (
            <div className="space-y-3">
              {modQueue.map((item) => (
                <div key={String(item.rex_id)} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{String(item.title)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">by {String(item.author_name)} — {String(item.flagged_reason || "No reason")}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={async () => { await approveRex(Number(item.rex_id)); setModQueue((prev) => prev.filter((m) => m.rex_id !== item.rex_id)); }}
                      className="rounded-lg bg-green-500 px-3 py-1 text-xs text-white hover:bg-green-600">Approve</button>
                    <button onClick={async () => { await rejectRex(Number(item.rex_id)); setModQueue((prev) => prev.filter((m) => m.rex_id !== item.rex_id)); }}
                      className="rounded-lg bg-red-500 px-3 py-1 text-xs text-white hover:bg-red-600">Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Roles */}
      {tab === "roles" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} placeholder="New role name..."
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm flex-1 dark:text-white" />
            <button onClick={async () => { if (!newRoleName) return; await createRole({ name: newRoleName }); setNewRoleName(""); getRoles().then(setRoles).catch(() => {}); }}
              className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm text-white hover:bg-brand-700">Add Role</button>
          </div>
          <div className="space-y-2">
            {roles.map((r) => (
              <div key={r.id} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{r.name}</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">{r.permissions_json}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audit Log */}
      {tab === "audit" && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
          {auditLog.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-12">No audit events</p>
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800">
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-600 dark:text-gray-300">Time</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-600 dark:text-gray-300">User</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-600 dark:text-gray-300">Action</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-600 dark:text-gray-300">Entity</th>
                </tr>
              </thead>
              <tbody>
                {auditLog.map((log) => (
                  <tr key={String(log.id)} className="border-b border-gray-50 dark:border-gray-700">
                    <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">{String(log.created_at).slice(0, 16)}</td>
                    <td className="px-4 py-2.5 text-gray-700 dark:text-gray-200">{String(log.user_name || "—")}</td>
                    <td className="px-4 py-2.5"><span className="rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-[10px] font-semibold text-gray-600 dark:text-gray-300">{String(log.action)}</span></td>
                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">{String(log.entity_type)} #{String(log.entity_id || "—")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Import */}
      {tab === "import" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <a href={getImportTemplateUrl()} className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-sm text-brand-600 hover:bg-gray-50 dark:hover:bg-gray-700">Download CSV Template</a>
          </div>
          <div className="rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-6 text-center">
            <input type="file" accept=".csv,.xlsx" onChange={(e) => setImportFile(e.target.files?.[0] || null)} className="mb-3 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:file:bg-gray-700 dark:file:text-gray-200" />
            <div className="flex gap-2 justify-center">
              <button disabled={!importFile} onClick={async () => { if (!importFile) return; const d = await importPreview(importFile); setImportPreviewData(d); }}
                className="rounded-lg bg-gray-100 dark:bg-gray-700 px-4 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50">Preview</button>
              <button disabled={!importFile} onClick={async () => { if (!importFile) return; const r = await importExecute(importFile); setImportResult(r); }}
                className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm text-white hover:bg-brand-700 disabled:opacity-50">Import</button>
            </div>
          </div>
          {importResult && (
            <div className="rounded-xl bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 p-4 text-sm">
              <p className="font-semibold text-green-800 dark:text-green-200">Import complete: {importResult.created} created, {importResult.skipped} skipped</p>
              {importResult.errors.length > 0 && <ul className="mt-1 text-red-600 dark:text-red-400 text-xs">{importResult.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>}
            </div>
          )}
          {importPreviewData && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-sm max-h-64 overflow-y-auto">
              <p className="font-semibold mb-2 text-gray-900 dark:text-white">Preview ({importPreviewData.length} rows)</p>
              <pre className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{JSON.stringify(importPreviewData, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
