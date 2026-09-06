"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { firstLastNameMatch } from "@/lib/matchName";

type Bank = { name: string; code: string };
type Plan = "daily" | "monthly" | "yearly";

const shopCategories = [
  "Electronics",
  "Fashion",
  "Beauty",
  "Home & Living",
  "Groceries",
  "Sports",
  "Computers",
  "Automotive",
];

const plans: { id: Plan; label: string; price: string; note: string }[] = [
  { id: "daily", label: "Daily", price: "₦3,000", note: "per day" },
  { id: "monthly", label: "Monthly", price: "₦40,000", note: "per month" },
  { id: "yearly", label: "Yearly", price: "₦450,000", note: "per year" },
];

export default function OpenShopPage() {
  const router = useRouter();
  const supabase = createClient();

  const [checking, setChecking] = useState(true);
  const [step, setStep] = useState<1 | 2>(1);
  const [error, setError] = useState("");

  // Step 1 — profile + store
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");
  const [shopName, setShopName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(shopCategories[0]);
  const [checkingName, setCheckingName] = useState(false);
  const [nameAvailable, setNameAvailable] = useState<boolean | null>(null);
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [phoneAvailable, setPhoneAvailable] = useState<boolean | null>(null);

  // Step 2 — plan + bank match
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
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace("/login");
        return;
      }
      const { data: shop } = await supabase
        .from("shops")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (shop) {
        router.replace("/dashboard/shop");
        return;
      }

      const fullName = (session.user.user_metadata?.full_name as string) || "";
      const [first, ...rest] = fullName.trim().split(/\s+/);
      if (first) setFirstName(first);
      if (rest.length) setLastName(rest[rest.length - 1]);

      setChecking(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Automatically check store-name availability as the user types.
  useEffect(() => {
    const name = shopName.trim();
    if (!name) {
      setNameAvailable(null);
      setCheckingName(false);
      return;
    }
    setCheckingName(true);
    setNameAvailable(null);
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/shops/check-name?name=${encodeURIComponent(name)}`);
        const json = await res.json();
        setNameAvailable(res.ok ? json.available : null);
      } finally {
        setCheckingName(false);
      }
    }, 600);
    return () => clearTimeout(timeout);
  }, [shopName]);

  // Automatically check phone-number availability as the user types.
  useEffect(() => {
    const p = phone.trim();
    if (!p) {
      setPhoneAvailable(null);
      setCheckingPhone(false);
      return;
    }
    setCheckingPhone(true);
    setPhoneAvailable(null);
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/shops/check-phone?phone=${encodeURIComponent(p)}`);
        const json = await res.json();
        setPhoneAvailable(res.ok ? json.available : null);
      } finally {
        setCheckingPhone(false);
      }
    }, 600);
    return () => clearTimeout(timeout);
  }, [phone]);

  function handleProfileSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!firstName.trim() || !lastName.trim() || !dob || !gender || !phone.trim()) {
      setError("Fill in all required fields to continue.");
      return;
    }
    if (!shopName.trim()) {
      setError("Give your store a name.");
      return;
    }
    if (nameAvailable !== true) {
      setError("Check that your store name is available before continuing.");
      return;
    }
    if (checkingPhone) {
      setError("Still checking your phone number — wait a moment.");
      return;
    }
    if (phoneAvailable === false) {
      setError("That phone number is already linked to another shop.");
      return;
    }

    setStep(2);
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
      setNameMatches(firstLastNameMatch(firstName, middleName, lastName, json.accountName));
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
        body: JSON.stringify({
          plan,
          shopName,
          description,
          category,
          firstName,
          middleName,
          lastName,
          phone,
          dob,
          gender,
          accountName: resolvedName,
        }),
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

        <div className="mt-4 flex items-center gap-2">
          {[1, 2].map((n) => (
            <div key={n} className={`h-1.5 flex-1 ${n <= step ? "bg-blue" : "bg-line"}`} />
          ))}
        </div>

        {error && <p className="mt-4 font-body text-sm text-red-700">{error}</p>}

        {/* Step 1 — Profile + store */}
        {step === 1 && (
          <>
            <h1 className="mt-6 font-display text-3xl tracking-tightest text-navy md:text-4xl">
              Tell us about you and your store
            </h1>
            <p className="mt-2 font-body text-sm text-navy-soft">
              Your email stays the one you signed up with.
            </p>

            <form onSubmit={handleProfileSubmit} className="mt-8 space-y-5">
              <div className="border border-blue bg-ice px-4 py-3">
                <p className="font-body text-sm text-navy">
                  <strong>Important:</strong> the bank account you pay with
                  later must be registered under this exact name, in this
                  order — first name, then middle name (if any), then last
                  name. Enter your name below exactly as it appears on your
                  bank account.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="font-body text-sm font-medium text-navy">
                    First name
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="focus-ring mt-2 w-full border border-line bg-ice px-4 py-3 font-body text-sm text-navy"
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="font-body text-sm font-medium text-navy">
                    Last name
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="focus-ring mt-2 w-full border border-line bg-ice px-4 py-3 font-body text-sm text-navy"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="middleName" className="font-body text-sm font-medium text-navy">
                  Middle name <span className="text-navy-soft">(optional)</span>
                </label>
                <input
                  id="middleName"
                  type="text"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  className="focus-ring mt-2 w-full border border-line bg-ice px-4 py-3 font-body text-sm text-navy"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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
              </div>

              <div>
                <label htmlFor="phone" className="font-body text-sm font-medium text-navy">
                  Phone number
                </label>
                <input
                  id="phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="080..."
                  className="focus-ring mt-2 w-full border border-line bg-ice px-4 py-3 font-body text-sm text-navy"
                />
                {checkingPhone && (
                  <p className="mt-2 font-body text-sm text-navy-soft">Checking availability...</p>
                )}
                {!checkingPhone && phoneAvailable === true && (
                  <p className="mt-2 font-body text-sm text-blue">✓ This number is available.</p>
                )}
                {!checkingPhone && phoneAvailable === false && (
                  <p className="mt-2 font-body text-sm text-red-700">
                    That number is already linked to another shop.
                  </p>
                )}
              </div>

              <div className="border-t border-line pt-5">
                <label htmlFor="shopName" className="font-body text-sm font-medium text-navy">
                  Store name
                </label>
                <input
                  id="shopName"
                  type="text"
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="e.g. Amaka's Electronics"
                  className="focus-ring mt-2 w-full border border-line bg-ice px-4 py-3 font-body text-sm text-navy placeholder:text-navy-soft/60"
                />
                {checkingName && (
                  <p className="mt-2 font-body text-sm text-navy-soft">Checking availability...</p>
                )}
                {!checkingName && nameAvailable === true && (
                  <p className="mt-2 font-body text-sm text-blue">✓ This name is available.</p>
                )}
                {!checkingName && nameAvailable === false && (
                  <p className="mt-2 font-body text-sm text-red-700">
                    That name is already taken. Try another.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="description" className="font-body text-sm font-medium text-navy">
                  Store description
                </label>
                <textarea
                  id="description"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What do you sell?"
                  className="focus-ring mt-2 w-full resize-none border border-line bg-ice px-4 py-3 font-body text-sm text-navy placeholder:text-navy-soft/60"
                />
              </div>

              <div>
                <label htmlFor="category" className="font-body text-sm font-medium text-navy">
                  Primary category
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="focus-ring mt-2 w-full border border-line bg-ice px-4 py-3 font-body text-sm text-navy"
                >
                  {shopCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
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

        {/* Step 2 — Plan + bank match + pay */}
        {step === 2 && (
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
                  <p className={`font-body text-xs ${plan === p.id ? "text-white/75" : "text-navy-soft"}`}>
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
                  The name on the account you pay with must match your name (
                  {firstName} {lastName}).
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
                      onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                      className="focus-ring mt-2 w-full border border-line bg-ice px-4 py-3 font-body text-sm text-navy"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={resolvingAccount || !bankCode || accountNumber.length !== 10}
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
                      <>✓ {resolvedName} matches your name.</>
                    ) : (
                      <>
                        This account is registered to <strong>{resolvedName}</strong>,
                        which doesn't match {firstName} {lastName}. Use an account in
                        your own name.
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
