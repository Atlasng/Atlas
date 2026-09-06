"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { PLAN_TIER, LEADS_ADDON_KOBO } from "@/lib/plans";

type PlanId = "starter" | "business" | "professional";

const LEADS_ADDON_NAIRA = LEADS_ADDON_KOBO / 100;

const plans: {
  id: PlanId;
  emoji: string;
  name: string;
  blurb: string;
  priceNaira: number;
  featured?: boolean;
  features: string[];
}[] = [
  {
    id: "starter",
    emoji: "🟢",
    name: "Starter",
    blurb: "For individuals and small businesses getting started.",
    priceNaira: 2500,
    features: [
      "Verified Seller profile",
      "Up to 20 active product listings",
      "Personal seller storefront",
      "Product photo uploads",
      "Product descriptions",
      "Order management",
      "Customer messaging",
      "Sales history",
      "Basic seller dashboard",
      "Access to Atlas marketplace",
      "Standard product visibility",
      "Buyer reviews & ratings",
      "Basic customer support",
    ],
  },
  {
    id: "business",
    emoji: "🔵",
    name: "Business",
    blurb: "For growing businesses that need more reach.",
    priceNaira: 5000,
    featured: true,
    features: [
      "Everything in Starter, plus:",
      "Up to 100 active product listings",
      "Enhanced seller storefront",
      "Business profile",
      "Sales analytics",
      "Product performance statistics",
      "Customer insights",
      "Inventory management",
      "Priority product placement",
      "Promotional tools",
      "Discount & coupon creation",
      "Seller badge",
      "Priority customer support",
      "Access to Atlas campaigns",
      "Ability to participate in promotional events",
    ],
  },
  {
    id: "professional",
    emoji: "🟣",
    name: "Professional",
    blurb: "For established businesses ready to scale.",
    priceNaira: 10000,
    features: [
      "Everything in Business, plus:",
      "Unlimited product listings",
      "Premium storefront",
      "Advanced sales analytics",
      "Advanced product analytics",
      "Revenue reports",
      "Customer analytics",
      "Inventory tools",
      "Bulk product upload",
      "Priority search placement",
      "Featured seller opportunities",
      "Advanced promotional tools",
      "Create special offers",
      "Create discount campaigns",
      "Priority support",
      "Early access to Atlas seller features",
      "Access to premium marketplace campaigns",
    ],
  },
];

const comparisonRows: [string, string, string, string][] = [
  ["Identity Verification", "✓", "✓", "✓"],
  ["Seller Storefront", "✓", "✓", "✓"],
  ["Product Listings", "20", "100", "Unlimited"],
  ["Order Management", "✓", "✓", "✓"],
  ["Sales Analytics", "Basic", "Advanced", "Advanced"],
  ["Inventory Tools", "Basic", "✓", "Advanced"],
  ["Coupons & Discounts", "—", "✓", "✓"],
  ["Promotional Tools", "—", "✓", "✓"],
  ["Priority Placement", "—", "✓", "✓"],
  ["Bulk Upload", "—", "—", "✓"],
  ["Premium Storefront", "—", "—", "✓"],
  ["Priority Support", "—", "✓", "✓"],
  ["Atlas Campaigns", "✓", "✓", "✓"],
];

function PlansContent() {
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();

  const firstName = searchParams.get("firstName") || "";
  const middleName = searchParams.get("middleName") || "";
  const lastName = searchParams.get("lastName") || "";
  const phone = searchParams.get("phone") || "";
  const dob = searchParams.get("dob") || "";
  const gender = searchParams.get("gender") || "";
  const shopName = searchParams.get("shopName") || "";
  const description = searchParams.get("description") || "";
  const category = searchParams.get("category") || "";
  const accountName = searchParams.get("accountName") || "";

  const [checking, setChecking] = useState(true);
  const [currentPlan, setCurrentPlan] = useState<PlanId | null>(null);
  const isRenewal = currentPlan !== null;

  const [payingPlan, setPayingPlan] = useState<PlanId | null>(null);
  const [error, setError] = useState("");
  const [leadsAddon, setLeadsAddon] = useState<Record<PlanId, boolean>>({
    starter: false,
    business: false,
    professional: false,
  });

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace("/login");
        return;
      }

      const { data: shop } = await supabase
        .from("shops")
        .select("plan")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (shop) {
        // Renewal — no onboarding details needed, just enforce no downgrade.
        setCurrentPlan(shop.plan as PlanId);
        setChecking(false);
        return;
      }

      // New shop — must have arrived here from the open-shop wizard.
      if (!accountName || !shopName || !firstName || !lastName) {
        router.replace("/dashboard/open-shop");
        return;
      }

      setChecking(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleChoosePlan(plan: PlanId) {
    setError("");

    if (currentPlan && PLAN_TIER[plan] < PLAN_TIER[currentPlan]) {
      setError("You can't select a lower plan than your current plan.");
      return;
    }

    setPayingPlan(plan);

    try {
      const res = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          leadsAddon: leadsAddon[plan],
          shopName,
          description,
          category,
          firstName,
          middleName,
          lastName,
          phone,
          dob,
          gender,
          accountName,
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Could not start payment.");
        setPayingPlan(null);
        return;
      }

      window.location.href = json.authorizationUrl;
    } catch {
      setError("Something went wrong starting payment.");
      setPayingPlan(null);
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
            href={isRenewal ? "/dashboard/shop" : "/dashboard/open-shop"}
            className="focus-ring font-body text-sm font-medium text-navy-soft transition-colors hover:text-navy"
          >
            ← Back
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-content px-6 py-16 md:px-10">
        {isRenewal ? (
          <div className="mb-8 inline-flex items-center gap-2 border border-blue bg-ice px-4 py-2 font-body text-sm text-navy">
            Your plan expired — renew to keep selling on Atlas.
          </div>
        ) : (
          accountName && (
            <div className="mb-8 inline-flex items-center gap-2 border border-blue bg-ice px-4 py-2 font-body text-sm text-navy">
              ✓ Verified as {accountName}
            </div>
          )
        )}

        <h1 className="font-display text-4xl tracking-tightest text-navy md:text-5xl">
          {isRenewal ? "Renew Your Atlas Seller Plan" : "Choose Your Atlas Seller Plan"}
        </h1>
        <p className="mt-3 max-w-xl font-body text-base text-navy-soft">
          {isRenewal
            ? "Pick the same plan or upgrade — you can't drop to a lower plan than the one you already have."
            : "Start small. Grow bigger. Reach more customers. Choose the plan that fits your business — your sales will always be sent to the account you just verified."}
        </p>

        {error && <p className="mt-4 font-body text-sm text-red-700">{error}</p>}

        {/* Plan cards */}
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col border p-6 ${
                plan.featured ? "border-blue bg-navy text-white" : "border-line bg-paper text-navy"
              }`}
            >
              {plan.featured && (
                <span className="absolute -top-3 left-6 bg-blue px-3 py-1 font-body text-xs font-medium text-white">
                  ⭐ Most Popular
                </span>
              )}
              <p className="font-body text-sm font-medium">
                {plan.emoji} {plan.name.toUpperCase()}
              </p>
              <p
                className={`mt-2 font-body text-sm ${
                  plan.featured ? "text-white/75" : "text-navy-soft"
                }`}
              >
                {plan.blurb}
              </p>
              <p className="mt-4 font-display text-2xl">
                ₦{(plan.priceNaira + (leadsAddon[plan.id] ? LEADS_ADDON_NAIRA : 0)).toLocaleString()}
                <span
                  className={`ml-1 font-body text-sm font-normal ${
                    plan.featured ? "text-white/60" : "text-navy-soft"
                  }`}
                >
                  / month
                </span>
              </p>

              <button
                type="button"
                role="switch"
                aria-checked={leadsAddon[plan.id]}
                onClick={() =>
                  setLeadsAddon((prev) => ({ ...prev, [plan.id]: !prev[plan.id] }))
                }
                className={`focus-ring mt-4 flex items-center gap-3 border px-3 py-2.5 text-left transition-colors ${
                  plan.featured
                    ? "border-white/30 bg-white/5"
                    : "border-line bg-ice"
                }`}
              >
                <span
                  className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                    leadsAddon[plan.id] ? "bg-blue" : plan.featured ? "bg-white/25" : "bg-line"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                      leadsAddon[plan.id] ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </span>
                <span
                  className={`font-body text-xs leading-snug ${
                    plan.featured ? "text-white/85" : "text-navy"
                  }`}
                >
                  Allow Atlas to show your shop and bring up to 300 leads
                  <span className={plan.featured ? "text-white/60" : "text-navy-soft"}>
                    {" "}
                    (+₦{LEADS_ADDON_NAIRA.toLocaleString()})
                  </span>
                </span>
              </button>

              <ul
                className={`mt-6 flex-1 space-y-2 font-body text-sm ${
                  plan.featured ? "text-white/85" : "text-navy-soft"
                }`}
              >
                {plan.features.map((feature) => (
                  <li key={feature}>
                    {feature.startsWith("Everything in") ? (
                      <span className="font-medium">{feature}</span>
                    ) : (
                      <>✓ {feature}</>
                    )}
                  </li>
                ))}
              </ul>

              {isRenewal && PLAN_TIER[plan.id] < PLAN_TIER[currentPlan!] ? (
                <p className="mt-8 border border-line bg-ice px-4 py-3 text-center font-body text-sm text-navy-soft">
                  Not available — your current plan is higher
                </p>
              ) : (
                <button
                  onClick={() => handleChoosePlan(plan.id)}
                  disabled={payingPlan !== null}
                  className={`focus-ring mt-8 px-5 py-3.5 font-body text-sm font-medium transition-colors disabled:opacity-60 ${
                    plan.featured
                      ? "bg-blue text-white hover:bg-blue-dark"
                      : "border border-blue text-blue hover:bg-blue hover:text-white"
                  }`}
                >
                  {payingPlan === plan.id
                    ? "Redirecting to Paystack..."
                    : isRenewal && plan.id === currentPlan
                    ? `Renew ${plan.name}`
                    : `Choose ${plan.name}`}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Comparison table */}
        <div className="mt-20">
          <h2 className="font-display text-2xl tracking-tightest text-navy">
            Compare Plans
          </h2>
          <div className="mt-6 overflow-x-auto border border-line">
            <table className="w-full min-w-[560px] border-collapse font-body text-sm">
              <thead>
                <tr className="border-b border-line bg-ice text-left text-navy">
                  <th className="px-4 py-3 font-medium">Feature</th>
                  <th className="px-4 py-3 font-medium">Starter</th>
                  <th className="px-4 py-3 font-medium">Business</th>
                  <th className="px-4 py-3 font-medium">Professional</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row[0]} className="border-b border-line text-navy-soft">
                    <td className="px-4 py-3 text-navy">{row[0]}</td>
                    <td className="px-4 py-3">{row[1]}</td>
                    <td className="px-4 py-3">{row[2]}</td>
                    <td className="px-4 py-3">{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Verification reminder */}
        <div className="mt-20 border-t border-line pt-12">
          <p className="font-body text-sm font-medium text-blue">
            🛡️ Every Seller Starts With Verification
          </p>
          <p className="mt-2 max-w-xl font-body text-sm text-navy-soft">
            No matter which plan you choose, every seller is verified before
            they can sell on Atlas — that's how we build a marketplace
            buyers can shop with confidence in. Submit your information →
            Verification → Approval → Start Selling. If a buyer reports a
            seller, our team can review the complaint and investigate where
            appropriate.
          </p>
        </div>
      </div>
    </main>
  );
}

export default function PlansPage() {
  return (
    <Suspense fallback={null}>
      <PlansContent />
    </Suspense>
  );
}
