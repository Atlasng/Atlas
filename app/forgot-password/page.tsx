"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSent(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ice px-6 py-16">
      <div className="w-full max-w-md border border-line bg-paper p-8 md:p-10">
        <Link
          href="/"
          aria-label="Back to homepage"
          className="focus-ring flex items-center gap-2 font-display text-2xl tracking-tightest text-navy"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M11 3.5 5.5 9l5.5 5.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Atlas
        </Link>
        <h1 className="mt-6 font-display text-3xl tracking-tightest text-navy">
          Reset your password
        </h1>

        {sent ? (
          <p className="mt-4 font-body text-sm text-navy-soft">
            If an account exists for <span className="text-navy">{email}</span>,
            a reset link is on its way. Check your inbox and follow the link
            to choose a new password.
          </p>
        ) : (
          <>
            <p className="mt-2 font-body text-sm text-navy-soft">
              Enter your email and we'll send you a link to reset it.
            </p>
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label htmlFor="email" className="font-body text-sm font-medium text-navy">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="focus-ring mt-2 w-full border border-line bg-ice px-4 py-3 font-body text-sm text-navy placeholder:text-navy-soft/60"
                  placeholder="you@example.com"
                />
              </div>

              {error && <p className="font-body text-sm text-red-700">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="focus-ring w-full bg-blue px-5 py-3.5 font-body text-sm font-medium text-white transition-colors hover:bg-blue-dark disabled:opacity-60"
              >
                {loading ? "Sending link..." : "Send reset link"}
              </button>
            </form>
          </>
        )}

        <p className="mt-6 text-center font-body text-sm text-navy-soft">
          Remembered it?{" "}
          <Link href="/login" className="text-blue hover:text-blue-dark">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
