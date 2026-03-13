"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getRexSheet, updateRexSheet, RexOut } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import LearningForm from "@/components/LearningForm";

export default function EditRexPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [rex, setRex] = useState<RexOut | null>(null);
  const [loading, setLoading] = useState(true);
  const id = Number(params.id);

  useEffect(() => { getRexSheet(id).then(setRex).catch(() => setRex(null)).finally(() => setLoading(false)); }, [id]);

  if (loading || authLoading) return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" /></div>;
  if (!rex) return <p className="text-center py-20 text-gray-500">REX sheet not found</p>;
  if (!user || user.id !== rex.author.id) { router.push(`/learnings/${id}`); return null; }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit REX Sheet</h1>
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <LearningForm
          initialTitle={rex.title}
          initialProblematic={rex.problematic}
          initialSolution={rex.solution}
          initialTags={rex.tags.map((t) => t.name)}
          initialCategory={rex.category}
          initialStatus={rex.status}
          submitLabel="Save changes"
          onSubmit={async (data) => { await updateRexSheet(id, data); router.push(`/learnings/${id}`); }}
        />
      </div>
    </div>
  );
}
