"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getUsers, getDepartments, UserOut, DepartmentOut } from "@/lib/api";

function PeopleContent() {
  const searchParams = useSearchParams();
  const deptFilter = searchParams.get("dept");

  const [users, setUsers] = useState<UserOut[]>([]);
  const [departments, setDepartments] = useState<DepartmentOut[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [u, d] = await Promise.all([
        getUsers(deptFilter ? Number(deptFilter) : undefined),
        getDepartments(),
      ]);
      setUsers(u);
      setDepartments(d);
    } catch { /* silent */ } finally { setLoading(false); }
  }, [deptFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const activeDept = departments.find((d) => d.id === Number(deptFilter));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          {activeDept ? activeDept.name : "People"}
        </h1>
        <p className="mt-1 text-gray-500">
          {activeDept ? activeDept.description : "Discover who knows what in the organization"}
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <Link href="/people" className={`rounded-full px-3 py-1 text-sm border transition-colors ${!deptFilter ? "bg-brand-600 text-white border-brand-600" : "border-gray-200 text-gray-600 hover:border-brand-500"}`}>
          All
        </Link>
        {departments.map((d) => (
          <Link key={d.id} href={`/people?dept=${d.id}`} className={`rounded-full px-3 py-1 text-sm border transition-colors ${Number(deptFilter) === d.id ? "bg-brand-600 text-white border-brand-600" : "border-gray-200 text-gray-600 hover:border-brand-500"}`}>
            {d.name} ({d.member_count})
          </Link>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((u) => (
            <Link key={u.id} href={`/users/${u.id}`} className="rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                  {(u.full_name || u.username).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{u.full_name || u.username}</p>
                  <p className="text-xs text-gray-500 truncate">{u.position}</p>
                </div>
              </div>
              {u.department && (
                <p className="mt-2 text-xs text-gray-400">{u.department.name}</p>
              )}
              {u.skills.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {u.skills.slice(0, 4).map((s) => (
                    <span key={s.id} className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">{s.name}</span>
                  ))}
                  {u.skills.length > 4 && <span className="text-[10px] text-gray-400">+{u.skills.length - 4}</span>}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PeoplePage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" /></div>}>
      <PeopleContent />
    </Suspense>
  );
}
