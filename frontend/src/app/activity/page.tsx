"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getActivity, ActivityItem } from "@/lib/api";

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  new_rex: {
    icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>,
    color: "bg-green-100 text-green-600",
  },
  comment: {
    icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" /></svg>,
    color: "bg-blue-100 text-blue-600",
  },
  vote: {
    icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" /></svg>,
    color: "bg-amber-100 text-amber-600",
  },
};

export default function ActivityPage() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getActivity().then(setItems).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" /></div>;
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Activity</h1>
      <p className="text-sm text-gray-500 mb-6">Recent events across the platform</p>

      <div className="space-y-0">
        {items.map((item, i) => {
          const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.new_rex;
          return (
            <div key={item.id} className="flex gap-3 py-3 border-b border-gray-100 last:border-0">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${config.color}`}>
                {config.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-gray-700">
                  <Link href={`/users/${item.actor_id}`} className="font-semibold text-gray-900 hover:text-brand-600">
                    {item.actor_name}
                  </Link>{" "}
                  {item.message}
                </p>
                {item.rex_title && (
                  <p className="text-[13px] text-brand-600 font-medium mt-0.5 truncate">
                    {item.rex_title}
                  </p>
                )}
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {new Date(item.created_at).toLocaleDateString()} &middot; {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        {items.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-12">No activity yet</p>
        )}
      </div>
    </div>
  );
}
