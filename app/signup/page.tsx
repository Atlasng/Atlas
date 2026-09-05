"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
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
          Create your account
        </h1>
        <p className="mt-2 font-body text-sm text-navy-soft">
          We'll send a code to your email to confirm it's you.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="fullName" className="font-body text-sm font-medium text-navy">
              Full name
            </label>
            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="focus-ring mt-2 w-full border border-line bg-ice px-4 py-3 font-body text-sm text-navy placeholder:text-navy-soft/60"
              placeholder="Jane Doe"
            />
          </div>

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

          <div>
            <label htmlFor="password" className="font-body text-sm font-medium text-navy">
              Password
            </label>
            <div className="relative mt-2">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="focus-ring w-full border border-line bg-ice px-4 py-3 pr-11 font-body text-sm text-navy placeholder:text-navy-soft/60"
                placeholder="At least 6 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="focus-ring absolute inset-y-0 right-0 flex items-center px-3 text-navy-soft transition-colors hover:text-navy"
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M2 2l14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <path
                      d="M7.5 4.4A6.7 6.7 0 0 1 9 4.2c3.6 0 6.4 2.6 7.5 4.8-.5 1-1.3 2.1-2.3 3M5.1 5.9C3.5 7 2.4 8.3 1.5 9c1.1 2.2 3.9 4.8 7.5 4.8.9 0 1.8-.2 2.6-.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M7.4 7.4a2 2 0 0 0 2.9 2.9"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path
                      d="M1.5 9c1.1-2.2 3.9-4.8 7.5-4.8S15.4 6.8 16.5 9c-1.1 2.2-3.9 4.8-7.5 4.8S2.6 11.2 1.5 9Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                    <circle cx="9" cy="9" r="2.2" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <p className="font-body text-sm text-red-700">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="focus-ring w-full bg-blue px-5 py-3.5 font-body text-sm font-medium text-white transition-colors hover:bg-blue-dark disabled:opacity-60"
          >
            {loading ? "Sending code..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center font-body text-sm text-navy-soft">
          Already have an account?{" "}
          <Link href="/login" className="text-blue hover:text-blue-dark">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
