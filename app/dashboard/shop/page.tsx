"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type FollowedShop = {
  shop_id: string;
  shops: { shop_name: string; logo_url: string | null } | null;
};

type Follower = {
  user_id: string;
  profiles: { full_name: string | null; avatar_url: string | null } | null;
};

type Shop = {
  id: string;
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

export default function AccountPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [following, setFollowing] = useState<FollowedShop[]>([]);

  // Followers/following panel (opened by clicking the count labels)
  const [panel, setPanel] = useState<"followers" | "following" | null>(null);
  const [followers, setFollowers] = useState<Follower[] | null>(null);
  const [followersLoading, setFollowersLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      const [{ data: profile }, { data: shopData }, { data: followingData }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("id", session.user.id)
            .maybeSingle(),
          supabase
            .from("shops")
            .select("id, shop_name, plan, plan_expires_at")
            .eq("user_id", session.user.id)
            .maybeSingle(),
          supabase
            .from("shop_follows")
            .select("shop_id, shops(shop_name, logo_url)")
            .eq("user_id", session.user.id),
        ]);

      if (!shopData) {
        router.replace("/dashboard/open-shop");
        return;
      }

      if (new Date(shopData.plan_expires_at) < new Date()) {
        router.replace("/dashboard/plans");
        return;
      }

      setFullName(profile?.full_name ?? null);
      setAvatarUrl(profile?.avatar_url ?? null);
      setFollowing((followingData as unknown as FollowedShop[]) ?? []);
      setShop(shopData);

      const { count } = await supabase
        .from("shop_follows")
        .select("id", { count: "exact", head: true })
        .eq("shop_id", shopData.id);
      setFollowerCount(count ?? 0);

      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openPanel(which: "followers" | "following") {
    setPanel(which);

    if (which === "followers" && followers === null && shop) {
      setFollowersLoading(true);
      const { data } = await supabase
        .from("shop_follows")
        .select("user_id, profiles(full_name, avatar_url)")
        .eq("shop_id", shop.id);
      setFollowers((data as unknown as Follower[]) ?? []);
      setFollowersLoading(false);
    }
  }

  function closePanel() {
    setPanel(null);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ice">
        <p className="font-body text-sm text-navy-soft">Loading...</p>
      </main>
    );
  }

  if (!shop) {
    // Redirect to /dashboard/open-shop or /dashboard/plans is already in
    // flight (see load()); render nothing in the meantime.
    return null;
  }

  const daysLeft = Math.ceil(
    (new Date(shop.plan_expires_at).getTime() - Date.now()) /
      (1000 * 60 * 60 * 24)
  );
  const expiringSoon = daysLeft <= 5;

  return (
    <main className="min-h-screen bg-paper">
      {/*
        Header + quick-action bar live inside one sticky element so the
        "List a product / View my products / View my storefront" shortcuts
        stay pinned while scrolling, without having to hand-calculate a
        top offset for a second sticky block.
      */}
      <header className="sticky top-0 z-20 border-b border-line bg-paper">
        <div className="mx-auto flex max-w-content items-center justify-between px-6 py-5 md:px-10">
          <Link
            href="/dashboard"
            className="font-display text-2xl tracking-tightest text-navy"
          >
            Atlas
          </Link>
          <div className="flex items-center gap-5">
            <Link
              href="/dashboard/shop/settings"
              className="focus-ring font-body text-sm font-medium text-navy-soft transition-colors hover:text-navy"
            >
              Shop settings
            </Link>
            <Link
              href="/dashboard"
              className="focus-ring font-body text-sm font-medium text-navy-soft transition-colors hover:text-navy"
            >
              ← Back to marketplace
            </Link>
          </div>
        </div>

        <div className="border-t border-line bg-ice/60">
          <div className="mx-auto flex max-w-content flex-wrap items-center gap-2 px-6 py-2.5 md:px-10">
            {/*
              Plain <a>, not next/link, on purpose. This route is gated by
              middleware based on live delivery-pricing data. next/link's
              client-side router cache can replay a stale redirect from an
              earlier visit even after the underlying data changes — a real
              page load guarantees middleware re-runs against current data
              every time.
            */}
            <a
              href="/dashboard/shop/new"
              className="focus-ring bg-blue px-3 py-1.5 font-body text-xs font-medium text-white transition-colors hover:bg-blue-dark"
            >
              + List a product
            </a>
            <Link
              href="/dashboard/shop/products"
              className="focus-ring border border-blue px-3 py-1.5 font-body text-xs font-medium text-blue transition-colors hover:bg-blue hover:text-white"
            >
              View my products
            </Link>
            <Link
              href={`/shop/${shop.id}`}
              className="focus-ring border border-line px-3 py-1.5 font-body text-xs font-medium text-navy-soft transition-colors hover:border-blue hover:text-blue"
            >
              View my storefront
            </Link>
          </div>
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

        {/* Profile section */}
        <div className="flex flex-wrap items-center gap-5">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-line bg-ice">
            {avatarUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={fullName ?? "Your profile"}
                className="h-full w-full object-cover"
              />
            )}
          </div>
          <div className="flex-1">
            <h1 className="font-display text-2xl tracking-tightest text-navy md:text-3xl">
              {fullName || "Your account"}
            </h1>
            <div className="mt-2 flex flex-wrap gap-4">
              <button
                type="button"
                onClick={() => openPanel("followers")}
                className="focus-ring font-body text-sm text-navy-soft transition-colors hover:text-blue"
              >
                <span className="font-medium text-navy">{followerCount}</span>{" "}
                follower{followerCount === 1 ? "" : "s"}
              </button>
              <button
                type="button"
                onClick={() => openPanel("following")}
                className="focus-ring font-body text-sm text-navy-soft transition-colors hover:text-blue"
              >
                <span className="font-medium text-navy">
                  {following.length}
                </span>{" "}
                following
              </button>
            </div>
          </div>
          <Link
            href="/account/settings"
            className="focus-ring shrink-0 border border-blue px-5 py-2.5 font-body text-sm font-medium text-blue transition-colors hover:bg-blue hover:text-white"
          >
            Edit profile
          </Link>
        </div>

        <div className="mt-8 flex flex-wrap gap-4 border-t border-line pt-8">
          <Link
            href="/account/delivery"
            className="focus-ring border border-line px-5 py-2.5 font-body text-sm font-medium text-navy-soft transition-colors hover:border-blue hover:text-blue"
          >
            Delivery address
          </Link>
        </div>

        {/* Shop dashboard section */}
        <div className="mt-10 border-t border-line pt-8">
          <p className="font-body text-sm font-medium text-blue">
            {shop.plan[0].toUpperCase() + shop.plan.slice(1)} plan · renews{" "}
            {new Date(shop.plan_expires_at).toLocaleDateString("en-NG", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
          <h2 className="mt-1 font-display text-2xl tracking-tightest text-navy md:text-3xl">
            {shop.shop_name}
          </h2>

          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="border border-line bg-ice p-5">
                <p className="font-body text-xs text-navy-soft">
                  {stat.label}
                </p>
                <p className="mt-1 font-display text-2xl text-navy">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-10 max-w-md font-body text-sm text-navy-soft">
            Sales and traffic analytics will appear here once your listings
            start getting orders.
          </p>
        </div>
      </div>

      {/* Followers / following panel — opened via the count labels above */}
      {panel && (
        <div
          className="fixed inset-0 z-30 flex items-start justify-center bg-navy/40 px-6 py-16 md:py-24"
          onClick={closePanel}
        >
          <div
            className="w-full max-w-md border border-line bg-paper"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h3 className="font-display text-lg tracking-tightest text-navy">
                {panel === "followers" ? "Followers" : "Following"}
              </h3>
              <button
                type="button"
                onClick={closePanel}
                className="focus-ring font-body text-sm text-navy-soft transition-colors hover:text-navy"
              >
                Close
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-3">
              {panel === "following" &&
                (following.length === 0 ? (
                  <p className="p-3 font-body text-sm text-navy-soft">
                    You're not following any shops yet. Follow a shop from
                    its storefront page to see them here.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {following.map((f) => (
                      <Link
                        key={f.shop_id}
                        href={`/shop/${f.shop_id}`}
                        onClick={closePanel}
                        className="focus-ring flex items-center gap-3 border border-line bg-paper p-3 transition-colors hover:border-blue"
                      >
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-line bg-ice">
                          {f.shops?.logo_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={f.shops.logo_url}
                              alt={f.shops.shop_name}
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>
                        <span className="font-body text-sm font-medium text-navy">
                          {f.shops?.shop_name ?? "Unknown shop"}
                        </span>
                      </Link>
                    ))}
                  </div>
                ))}

              {panel === "followers" &&
                (followersLoading ? (
                  <p className="p-3 font-body text-sm text-navy-soft">
                    Loading...
                  </p>
                ) : !followers || followers.length === 0 ? (
                  <p className="p-3 font-body text-sm text-navy-soft">
                    No one is following your shop yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {followers.map((f) => (
                      <div
                        key={f.user_id}
                        className="flex items-center gap-3 border border-line bg-paper p-3"
                      >
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-line bg-ice">
                          {f.profiles?.avatar_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={f.profiles.avatar_url}
                              alt={f.profiles.full_name ?? "Follower"}
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>
                        <span className="font-body text-sm font-medium text-navy">
                          {f.profiles?.full_name ?? "Unknown user"}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
