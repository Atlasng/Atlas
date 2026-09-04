"use client";

import { Suspense, useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function VerifyOtpForm() {
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "signup",
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push("/dashboard");
  }

  async function handleResend() {
    setResending(true);
    setError("");
    setMessage("");

    const { error } = await supabase.auth.resend({ type: "signup", email });

    setResending(false);

    if (error) {
      setError(error.message);
      return;
    }

    setMessage("A new code is on its way.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ice px-6 py-16">
      <div className="w-full max-w-md border border-line bg-paper p-8 md:p-10">
        <Link href="/" className="font-display text-2xl tracking-tightest text-navy">
          Atlas
        </Link>
        <h1 className="mt-6 font-display text-3xl tracking-tightest text-navy">
          Enter your code
        </h1>
        <p className="mt-2 font-body text-sm text-navy-soft">
          We sent a 6-digit code to{" "}
          <span className="text-navy">{email || "your email"}</span>.
        </p>

        <form onSubmit={handleVerify} className="mt-8 space-y-5">
          <div>
            <label htmlFor="code" className="font-body text-sm font-medium text-navy">
              Verification code
            </label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="focus-ring mt-2 w-full border border-line bg-ice px-4 py-3 text-center font-body text-lg tracking-[0.5em] text-navy placeholder:text-navy-soft/60"
              placeholder="000000"
            />
          </div>

          {error && <p className="font-body text-sm text-red-700">{error}</p>}
          {message && <p className="font-body text-sm text-blue">{message}</p>}

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="focus-ring w-full bg-blue px-5 py-3.5 font-body text-sm font-medium text-white transition-colors hover:bg-blue-dark disabled:opacity-60"
          >
            {loading ? "Verifying..." : "Verify and continue"}
          </button>
        </form>

        <p className="mt-6 text-center font-body text-sm text-navy-soft">
          Didn't get it?{" "}
          <button
            onClick={handleResend}
            disabled={resending || !email}
            className="focus-ring text-blue hover:text-blue-dark disabled:opacity-60"
          >
            {resending ? "Resending..." : "Resend code"}
          </button>
        </p>
      </div>
    </main>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={null}>
      <VerifyOtpForm />
    </Suspense>
  );
}
