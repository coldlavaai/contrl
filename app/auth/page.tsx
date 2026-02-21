"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

type Tab = "signin" | "signup";

export default function AuthPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (tab === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/app");
        router.refresh();
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/app`,
          },
        });
        if (error) throw error;
        setSuccess("Check your email to confirm your account.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="text-3xl font-black text-white tracking-tight">Contrl</span>
          </div>
          <p className="text-sm text-gray-500">
            Statistical Process Control for operational teams
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#141414] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl">
          {/* Tabs */}
          <div className="flex border-b border-white/[0.06]">
            {(["signin", "signup"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTab(t);
                  setError(null);
                  setSuccess(null);
                }}
                className={`flex-1 py-3.5 text-sm font-medium transition-colors ${
                  tab === t
                    ? "text-white border-b-2 border-indigo-500"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {t === "signin" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs text-gray-500 mb-1.5 font-medium">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500/60 focus:bg-white/[0.07] transition-colors"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs text-gray-500 mb-1.5 font-medium">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder={tab === "signup" ? "At least 6 characters" : "••••••••"}
                className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500/60 focus:bg-white/[0.07] transition-colors"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="text-xs text-red-400 bg-red-950/30 border border-red-500/20 rounded-lg px-3 py-2.5">
                {error}
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-500/20 rounded-lg px-3 py-2.5">
                {success}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  {tab === "signin" ? "Signing in…" : "Creating account…"}
                </>
              ) : (
                tab === "signin" ? "Sign In" : "Create Account"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-700 mt-6">
          Contrl · SPC Analytics Platform
        </p>
      </div>
    </div>
  );
}
