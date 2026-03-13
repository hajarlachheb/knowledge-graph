"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getTags, getDepartments, TagOut, DepartmentOut } from "@/lib/api";
import TagBadge from "@/components/TagBadge";

export default function ExplorePage() {
  const [tags, setTags] = useState<TagOut[]>([]);
  const [departments, setDepartments] = useState<DepartmentOut[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getTags(), getDepartments()])
      .then(([t, d]) => { setTags(t); setDepartments(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" /></div>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Explore</h1>
        <p className="mt-1 text-gray-500">Browse knowledge by topics and departments</p>
      </div>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Departments</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {departments.map((d) => (
            <Link key={d.id} href={`/people?dept=${d.id}`} className="rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow">
              <h3 className="font-semibold text-gray-900">{d.name}</h3>
              {d.description && <p className="mt-1 text-sm text-gray-500 line-clamp-2">{d.description}</p>}
              <p className="mt-2 text-xs text-gray-400">{d.member_count} member{d.member_count !== 1 ? "s" : ""}</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Knowledge Topics</h2>
        {tags.length === 0 ? (
          <p className="text-gray-500">No topics yet</p>
        ) : (
          <div className="flex flex-wrap gap-3">{tags.map((tag) => <TagBadge key={tag.id} tag={tag} showCount />)}</div>
        )}
      </section>
    </div>
  );
}
