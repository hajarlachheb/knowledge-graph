"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import Sidebar from "./Sidebar";
import { useEffect } from "react";

const PUBLIC_PATHS = ["/", "/login", "/register"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isPublicPage = PUBLIC_PATHS.includes(pathname);

  useEffect(() => {
    if (loading) return;
    if (!user && !isPublicPage) {
      router.replace("/");
    }
    if (user && isPublicPage) {
      router.replace("/dashboard");
    }
  }, [user, loading, isPublicPage, router, pathname]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (isPublicPage) {
    return <>{children}</>;
  }

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50/50">
      <Sidebar />
      <main className="flex-1 ml-60 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
