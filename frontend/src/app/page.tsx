"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import KnowlediaLogo from "@/components/KnowlediaLogo";

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { setToken } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await login(email, password);
      setToken(res.access_token);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-800 text-white flex-col justify-between p-12">
        <div>
          <KnowlediaLogo size="lg" variant="light" />
          <p className="mt-1 text-brand-200 text-sm">Corporate Knowledge Management</p>
        </div>

        <div className="space-y-8">
          <h1 className="text-4xl font-bold leading-tight">
            Your company&apos;s knowledge,<br />accessible to everyone.
          </h1>
          <div className="space-y-4 text-brand-100">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs font-bold">1</span>
              <div><p className="font-medium text-white">Share REX Sheets</p><p className="text-sm">Document problems you solved — so no one faces them alone again.</p></div>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs font-bold">2</span>
              <div><p className="font-medium text-white">Find who knows what</p><p className="text-sm">Skills mapping and knowledge graph across all departments.</p></div>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs font-bold">3</span>
              <div><p className="font-medium text-white">Ask Knowledia</p><p className="text-sm">AI-powered search — ask in plain language, get answers from your colleagues&apos; experience.</p></div>
            </div>
          </div>
        </div>

        <p className="text-sm text-brand-300">Trusted by teams who refuse to lose institutional knowledge.</p>
      </div>

      {/* Right — login form */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center justify-center mb-8">
            <KnowlediaLogo size="md" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h2>
          <p className="text-sm text-gray-500 mb-6">Sign in to your knowledge hub</p>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none"
                placeholder="you@company.com" />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none"
                placeholder="Enter your password" />
            </div>
            <button type="submit" disabled={submitting}
              className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 transition-colors">
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-500">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-brand-600 hover:underline font-medium">Sign up</Link>
          </p>

          <div className="mt-8 rounded-lg bg-gray-50 p-3 text-xs text-gray-500">
            <p className="font-medium text-gray-600 mb-1">Demo accounts:</p>
            <p>n.fontaine@company.com · j.martinez@company.com · p.moreau@company.com</p>
            <p>Password: <code className="text-brand-600">password</code></p>
          </div>
        </div>
      </div>
    </div>
  );
}
