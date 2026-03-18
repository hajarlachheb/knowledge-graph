"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { createRexSheet } from "@/lib/api";
import LearningForm from "@/components/LearningForm";

export default function NewRexPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  if (!loading && !user) { router.push("/login"); return null; }

  return (
    <div className="w-full max-w-2xl min-w-0 mx-auto px-1 lg:max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">New REX Sheet</h1>
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
        <LearningForm
          submitLabel="Publish REX"
          onSubmit={async (data) => {
            const rex = await createRexSheet(data);
            if (data.status === "draft") {
              router.push("/dashboard");
            } else {
              router.push(`/learnings/${rex.id}`);
            }
          }}
        />
      </div>
    </div>
  );
}
