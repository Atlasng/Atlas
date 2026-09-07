"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Shop = {
  shop_name: string;
  plan: string;
  plan_expires_at: string;
};

const stats = [
  { label: "Total revenue", value: "₦0" },
  { label: "Orders", value: "0" },
  { label: "Active listings", value: "0" },
  { label: "Shop views", value: "0" },
];

export default function ShopDashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace("/login");
        return;
      }

      const { data } = await supabase
        .from("shops")
        .select("shop_name, plan, plan_expires_at")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!data) {
        router.replace("/dashboard/open-shop");
        return;
      }

      if (new Date(data.plan_expires_at) < new Date()) {
        router.replace("/dashboard/plans");
        return;
      }

      setShop(data);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading || !shop) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ice">
        <p className="font-body text-sm text-navy-soft">Loading...</p>
      </main>
    );
  }

  const daysLeft = Math.ceil(
    (new Date(shop.plan_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  const expiringSoon = daysLeft <= 5;

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
            ← Back to marketplace
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-content px-6 py-12 md:px-10">
        {expiringSoon && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border border-red-300 bg-red-50 px-4 py-3">
            <p className="font-body text-sm text-red-700">
              Your plan expires in {daysLeft} day{daysLeft === 1 ? "" : "s"}.
              Renew now to keep your shop active.
            </p>
            <Link
              href="/dashboard/plans"
              className="focus-ring whitespace-nowrap bg-red-700 px-4 py-2 font-body text-sm font-medium text-white transition-colors hover:bg-red-800"
            >
              Renew now
            </Link>
          </div>
        )}

        <p className="font-body text-sm font-medium text-blue">
          {shop.plan[0].toUpperCase() + shop.plan.slice(1)} plan · renews{" "}
          {new Date(shop.plan_expires_at).toLocaleDateString("en-NG", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-tightest text-navy md:text-4xl">
          {shop.shop_name}
        </h1>

        <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="border border-line bg-ice p-5">
              <p className="font-body text-xs text-navy-soft">{stat.label}</p>
              <p className="mt-1 font-display text-2xl text-navy">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/dashboard/shop/new"
            className="focus-ring bg-blue px-6 py-3 font-body text-sm font-medium text-white transition-colors hover:bg-blue-dark"
          >
            + List a product
          </Link>
          <Link
            href="/dashboard/shop/products"
            className="focus-ring border border-blue px-6 py-3 font-body text-sm font-medium text-blue transition-colors hover:bg-blue hover:text-white"
          >
            View my products
          </Link>
        </div>

        <p className="mt-16 max-w-md font-body text-sm text-navy-soft">
          Sales and traffic analytics will appear here once your listings
          start getting orders.
        </p>
      </div>
    </main>
  );
}
