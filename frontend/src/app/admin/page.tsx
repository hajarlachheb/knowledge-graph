"use client";

import { useEffect, useState } from "react";
import { getAdminStats, getAdminUsers, toggleAdmin, getExportAllCsvUrl, AdminStats } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

interface AdminUser {
  id: number;
  username: string;
  email: string;
  full_name: string;
  position: string;
  is_admin: boolean;
  created_at: string;
  department: string | null;
}

export default function AdminPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getAdminStats(), getAdminUsers()])
      .then(([s, u]) => { setStats(s); setUsers(u as AdminUser[]); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleToggleAdmin = async (userId: number) => {
    try {
      const result = await toggleAdmin(userId);
      setUsers((prev) => prev.map((u) => u.id === result.id ? { ...u, is_admin: result.is_admin } : u));
    } catch { /* silent */ }
  };

  if (!user?.is_admin) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-500">Admin access required</p>
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" /></div>;
  }

  if (error) {
    return <div className="text-red-500 text-center py-20">{error}</div>;
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-sm text-gray-500 mt-0.5">Platform analytics and user management</p>
        </div>
        <a
          href={getExportAllCsvUrl()}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1.5"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Export all REX (CSV)
        </a>
      </div>

      {/* Stats Grid */}
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
            <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-3 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Department breakdown */}
      {stats && stats.departments.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Departments</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {stats.departments.map((d) => (
              <div key={d.name} className="rounded-xl border border-gray-200 bg-white p-3">
                <p className="text-sm font-medium text-gray-900">{d.name}</p>
                <p className="text-xs text-gray-500">{d.member_count} members</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Users Table */}
      <h2 className="text-lg font-semibold text-gray-900 mb-3">Users</h2>
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="px-4 py-2.5 text-left font-semibold text-gray-600">Name</th>
              <th className="px-4 py-2.5 text-left font-semibold text-gray-600">Email</th>
              <th className="px-4 py-2.5 text-left font-semibold text-gray-600">Department</th>
              <th className="px-4 py-2.5 text-left font-semibold text-gray-600">Role</th>
              <th className="px-4 py-2.5 text-left font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-2.5">
                  <p className="font-medium text-gray-900">{u.full_name}</p>
                  <p className="text-[11px] text-gray-400">{u.position}</p>
                </td>
                <td className="px-4 py-2.5 text-gray-600">{u.email}</td>
                <td className="px-4 py-2.5 text-gray-600">{u.department || "—"}</td>
                <td className="px-4 py-2.5">
                  {u.is_admin ? (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">Admin</span>
                  ) : (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">Member</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <button
                    onClick={() => handleToggleAdmin(u.id)}
                    className="text-[12px] text-brand-600 hover:underline"
                  >
                    {u.is_admin ? "Remove admin" : "Make admin"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
