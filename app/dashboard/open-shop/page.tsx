"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { namesLikelyMatch } from "@/lib/matchName";

type Bank = { name: string; code: string };
type Plan = "daily" | "monthly" | "yearly";

const plans: { id: Plan; label: string; price: string; note: string }[] = [
  { id: "daily", label: "Daily", price: "₦3,000", note: "per day" },
  { id: "monthly", label: "Monthly", price: "₦40,000", note: "per month" },
  { id: "yearly", label: "Yearly", price: "₦450,000", note: "per year" },
];

export default function OpenShopPage() {
  const router = useRouter();
  const supabase = createClient();

  const [checking, setChecking] = useState(true);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [error, setError] = useState("");

  // Step 1 — profile
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");

  // Step 2 — NIN
  const [nin, setNin] = useState("");
  const [verifyingNin, setVerifyingNin] = useState(false);
  const [verifiedName, setVerifiedName] = useState("");

  // Step 3 — plan + bank match
  const [plan, setPlan] = useState<Plan | null>(null);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [resolvingAccount, setResolvingAccount] = useState(false);
  const [resolvedName, setResolvedName] = useState("");
  const [nameMatches, setNameMatches] = useState<boolean | null>(null);
  const [payingNow, setPayingNow] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/login");
        return;
      }
      if (session.user.user_metadata?.has_shop) {
        router.replace("/dashboard/shop");
        return;
      }
      setFullName((session.user.user_metadata?.full_name as string) || "");
      setChecking(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleProfileSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!fullName.trim() || !dob || !gender) {
      setError("Fill in all fields to continue.");
      return;
    }
    setStep(2);
  }

  async function handleVerifyNin(e: FormEvent) {
    e.preventDefault();
    setError("");
    setVerifyingNin(true);

    try {
      const res = await fetch("/api/verify-nin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nin, fullName }),
      });
      const json = await res.json();

      if (!res.ok || !json.verified) {
        setError(json.error || "Could not verify that NIN.");
        return;
      }

      setVerifiedName(json.verifiedName);
      setStep(3);
    } catch {
      setError("Something went wrong verifying your NIN.");
    } finally {
      setVerifyingNin(false);
    }
  }

  async function loadBanks() {
    if (banks.length > 0 || banksLoading) return;
    setBanksLoading(true);
    try {
      const res = await fetch("/api/paystack/banks");
      const json = await res.json();
      if (res.ok) setBanks(json.banks);
    } finally {
      setBanksLoading(false);
    }
  }

  async function handleResolveAccount(e: FormEvent) {
    e.preventDefault();
    setError("");
    setResolvedName("");
    setNameMatches(null);
    setResolvingAccount(true);

    try {
      const res = await fetch("/api/paystack/resolve-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountNumber, bankCode }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Could not verify that account.");
        return;
      }

      setResolvedName(json.accountName);
      setNameMatches(namesLikelyMatch(json.accountName, verifiedName));
    } catch {
      setError("Something went wrong checking that account.");
    } finally {
      setResolvingAccount(false);
    }
  }

  async function handlePayNow() {
    if (!plan) {
      setError("Choose a plan first.");
      return;
    }
    setError("");
    setPayingNow(true);

    try {
      const res = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, verifiedName, accountName: resolvedName }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Could not start payment.");
        setPayingNow(false);
        return;
      }

      window.location.href = json.authorizationUrl;
    } catch {
      setError("Something went wrong starting payment.");
      setPayingNow(false);
    }
  }

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ice">
        <p className="font-body text-sm text-navy-soft">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-content items-center justify-between px-6 py-5 md:px-10">
          <span className="font-display text-2xl tracking-tightest text-navy">
            Atlas
          </span>
          <Link
            href="/dashboard"
            className="focus-ring font-body text-sm font-medium text-navy-soft transition-colors hover:text-navy"
          >
            ← Back to dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-6 py-16 md:px-10">
        <p className="font-body text-sm font-medium text-blue">
          🏪 Open a shop on Atlas
        </p>

        {/* Step indicator */}
        <div className="mt-4 flex items-center gap-2">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`h-1.5 flex-1 ${
                n <= step ? "bg-blue" : "bg-line"
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="mt-4 font-body text-sm text-red-700">{error}</p>
        )}

        {/* Step 1 — Profile */}
        {step === 1 && (
          <>
            <h1 className="mt-6 font-display text-3xl tracking-tightest text-navy md:text-4xl">
              Tell us about you
            </h1>
            <p className="mt-2 font-body text-sm text-navy-soft">
              Your email stays the one you signed up with.
            </p>

            <form onSubmit={handleProfileSubmit} className="mt-8 space-y-5">
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
                  className="focus-ring mt-2 w-full border border-line bg-ice px-4 py-3 font-body text-sm text-navy"
                />
              </div>

              <div>
                <label htmlFor="dob" className="font-body text-sm font-medium text-navy">
                  Date of birth
                </label>
                <input
                  id="dob"
                  type="date"
                  required
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="focus-ring mt-2 w-full border border-line bg-ice px-4 py-3 font-body text-sm text-navy"
                />
              </div>

              <div>
                <label htmlFor="gender" className="font-body text-sm font-medium text-navy">
                  Gender
                </label>
                <select
                  id="gender"
                  required
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="focus-ring mt-2 w-full border border-line bg-ice px-4 py-3 font-body text-sm text-navy"
                >
                  <option value="">Select</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <button
                type="submit"
                className="focus-ring w-full bg-blue px-5 py-3.5 font-body text-sm font-medium text-white transition-colors hover:bg-blue-dark"
              >
                Continue
              </button>
            </form>
          </>
        )}

        {/* Step 2 — NIN */}
        {step === 2 && (
          <>
            <h1 className="mt-6 font-display text-3xl tracking-tightest text-navy md:text-4xl">
              Verify your NIN
            </h1>
            <p className="mt-2 font-body text-sm text-navy-soft">
              We use your National Identification Number to confirm who you
              are before you can sell on Atlas.
            </p>

            <form onSubmit={handleVerifyNin} className="mt-8 space-y-5">
              <div>
                <label htmlFor="nin" className="font-body text-sm font-medium text-navy">
                  NIN (11 digits)
                </label>
                <input
                  id="nin"
                  type="text"
                  inputMode="numeric"
                  required
                  maxLength={11}
                  value={nin}
                  onChange={(e) => setNin(e.target.value.replace(/\D/g, ""))}
                  className="focus-ring mt-2 w-full border border-line bg-ice px-4 py-3 font-body text-sm tracking-widest text-navy"
                  placeholder="12345678901"
                />
              </div>

              <button
                type="submit"
                disabled={verifyingNin || nin.length !== 11}
                className="focus-ring w-full bg-blue px-5 py-3.5 font-body text-sm font-medium text-white transition-colors hover:bg-blue-dark disabled:opacity-60"
              >
                {verifyingNin ? "Verifying..." : "Verify NIN"}
              </button>
            </form>
          </>
        )}

        {/* Step 3 — Plan + bank match + pay */}
        {step === 3 && (
          <>
            <h1 className="mt-6 font-display text-3xl tracking-tightest text-navy md:text-4xl">
              Choose a plan
            </h1>
            <p className="mt-2 font-body text-sm text-navy-soft">
              Pick how you'd like to pay for your Atlas storefront.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {plans.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlan(p.id)}
                  className={`border px-4 py-4 text-left transition-colors ${
                    plan === p.id
                      ? "border-blue bg-blue text-white"
                      : "border-line bg-ice text-navy hover:border-blue"
                  }`}
                >
                  <p className="font-body text-sm font-medium">{p.label}</p>
                  <p className="mt-1 font-display text-xl">{p.price}</p>
                  <p
                    className={`font-body text-xs ${
                      plan === p.id ? "text-white/75" : "text-navy-soft"
                    }`}
                  >
                    {p.note}
                  </p>
                </button>
              ))}
            </div>

            {plan && (
              <div className="mt-10 border-t border-line pt-8">
                <h2 className="font-display text-xl text-navy">
                  Confirm your bank account
                </h2>
                <p className="mt-2 font-body text-sm text-navy-soft">
                  The name on the account you pay with must match your
                  verified NIN name ({verifiedName}).
                </p>

                <form onSubmit={handleResolveAccount} className="mt-5 space-y-4">
                  <div>
                    <label htmlFor="bank" className="font-body text-sm font-medium text-navy">
                      Bank
                    </label>
                    <select
                      id="bank"
                      required
                      value={bankCode}
                      onFocus={loadBanks}
                      onChange={(e) => setBankCode(e.target.value)}
                      className="focus-ring mt-2 w-full border border-line bg-ice px-4 py-3 font-body text-sm text-navy"
                    >
                      <option value="">
                        {banksLoading ? "Loading banks..." : "Select your bank"}
                      </option>
                      {banks.map((b) => (
                        <option key={b.code} value={b.code}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="accountNumber" className="font-body text-sm font-medium text-navy">
                      Account number
                    </label>
                    <input
                      id="accountNumber"
                      type="text"
                      inputMode="numeric"
                      required
                      maxLength={10}
                      value={accountNumber}
                      onChange={(e) =>
                        setAccountNumber(e.target.value.replace(/\D/g, ""))
                      }
                      className="focus-ring mt-2 w-full border border-line bg-ice px-4 py-3 font-body text-sm text-navy"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={
                      resolvingAccount || !bankCode || accountNumber.length !== 10
                    }
                    className="focus-ring w-full border border-blue px-5 py-3 font-body text-sm font-medium text-blue transition-colors hover:bg-blue hover:text-white disabled:opacity-60"
                  >
                    {resolvingAccount ? "Checking account..." : "Confirm account"}
                  </button>
                </form>

                {resolvedName && nameMatches !== null && (
                  <div
                    className={`mt-4 border px-4 py-3 font-body text-sm ${
                      nameMatches
                        ? "border-blue bg-ice text-navy"
                        : "border-red-300 bg-red-50 text-red-700"
                    }`}
                  >
                    {nameMatches ? (
                      <>✓ {resolvedName} matches your verified name.</>
                    ) : (
                      <>
                        This account is registered to{" "}
                        <strong>{resolvedName}</strong>, which doesn't match
                        your verified NIN name. Use an account in your own
                        name.
                      </>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handlePayNow}
                  disabled={!nameMatches || payingNow}
                  className="focus-ring mt-6 w-full bg-blue px-5 py-3.5 font-body text-sm font-medium text-white transition-colors hover:bg-blue-dark disabled:opacity-60"
                >
                  {payingNow ? "Redirecting to Paystack..." : "Pay now"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
