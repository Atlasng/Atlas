"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      if (error.message.toLowerCase().includes("confirm")) {
        router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
        return;
      }
      setError(error.message);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ice px-6 py-16">
      <div className="w-full max-w-md border border-line bg-paper p-8 md:p-10">
        <Link href="/" className="font-display text-2xl tracking-tightest text-navy">
          Atlas
        </Link>
        <h1 className="mt-6 font-display text-3xl tracking-tightest text-navy">
          Log in
        </h1>
        <p className="mt-2 font-body text-sm text-navy-soft">
          Welcome back. Enter your details below.
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

          <div>
            <label htmlFor="password" className="font-body text-sm font-medium text-navy">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="focus-ring mt-2 w-full border border-line bg-ice px-4 py-3 font-body text-sm text-navy placeholder:text-navy-soft/60"
              placeholder="Your password"
            />
          </div>

          {error && <p className="font-body text-sm text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="focus-ring w-full bg-blue px-5 py-3.5 font-body text-sm font-medium text-white transition-colors hover:bg-blue-dark disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="mt-6 text-center font-body text-sm text-navy-soft">
          Don't have an account?{" "}
          <Link href="/signup" className="text-blue hover:text-blue-dark">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
