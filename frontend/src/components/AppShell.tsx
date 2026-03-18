"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { SidebarProvider, useSidebar } from "@/lib/SidebarContext";
import { useMediaQuery } from "@/lib/useMediaQuery";
import Sidebar from "./Sidebar";
import { useEffect } from "react";

const PUBLIC_PATHS = ["/", "/login", "/register"];

function AppShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const { collapsed, setMobileOpen } = useSidebar();
  const isDesktop = useMediaQuery("(min-width: 768px)");

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

  const mainMarginLeft = isDesktop ? (collapsed ? 68 : 240) : 0;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50/50">
      <Sidebar />
      {/* Mobile: hamburger to open sidebar */}
      {!isDesktop && (
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="fixed top-4 left-4 z-30 flex h-10 w-10 items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-600 shadow-sm hover:bg-gray-50 md:hidden"
          aria-label="Open menu"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
      )}
      <main
        className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto pt-14 px-4 pb-4 sm:pt-6 sm:p-6 transition-[margin] duration-200"
        style={{ marginLeft: mainMarginLeft }}
      >
        {children}
      </main>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppShellInner>{children}</AppShellInner>
    </SidebarProvider>
  );
}
