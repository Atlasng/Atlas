"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type FollowedShop = {
  shop_id: string;
  shops: { shop_name: string; logo_url: string | null } | null;
};

export default function AccountPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [hasShop, setHasShop] = useState(false);
  const [shopId, setShopId] = useState<string | null>(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [following, setFollowing] = useState<FollowedShop[]>([]);

  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      const [{ data: profile }, { data: shop }, { data: followingData }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("id", session.user.id)
            .maybeSingle(),
          supabase
            .from("shops")
            .select("id")
            .eq("user_id", session.user.id)
            .maybeSingle(),
          supabase
            .from("shop_follows")
            .select("shop_id, shops(shop_name, logo_url)")
            .eq("user_id", session.user.id),
        ]);

      setFullName(profile?.full_name ?? null);
      setAvatarUrl(profile?.avatar_url ?? null);
      setFollowing((followingData as unknown as FollowedShop[]) ?? []);

      if (shop) {
        setHasShop(true);
        setShopId(shop.id);

        const { count } = await supabase
          .from("shop_follows")
          .select("id", { count: "exact", head: true })
          .eq("shop_id", shop.id);
        setFollowerCount(count ?? 0);
      }

      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ice">
        <p className="font-body text-sm text-navy-soft">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper">
      <header className="sticky top-0 z-20 border-b border-line bg-paper">
        <div className="mx-auto flex max-w-content items-center justify-between px-6 py-5 md:px-10">
          <Link href="/dashboard" className="font-display text-2xl tracking-tightest text-navy">
            Atlas
          </Link>
          <Link
            href="/dashboard"
            className="focus-ring font-body text-sm font-medium text-navy-soft transition-colors hover:text-navy"
          >
            ← Back to marketplace
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-12 md:px-10">
        <div className="flex flex-wrap items-center gap-5">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-line bg-ice">
            {avatarUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={fullName ?? "Your profile"} className="h-full w-full object-cover" />
            )}
          </div>
          <div className="flex-1">
            <h1 className="font-display text-2xl tracking-tightest text-navy md:text-3xl">
              {fullName || "Your account"}
            </h1>
            <div className="mt-2 flex flex-wrap gap-4">
              <span className="font-body text-sm text-navy-soft">
                <span className="font-medium text-navy">{followerCount}</span>{" "}
                follower{followerCount === 1 ? "" : "s"}
              </span>
              <span className="font-body text-sm text-navy-soft">
                <span className="font-medium text-navy">{following.length}</span>{" "}
                following
              </span>
            </div>
          </div>
          <Link
            href="/account/settings"
            className="focus-ring shrink-0 border border-blue px-5 py-2.5 font-body text-sm font-medium text-blue transition-colors hover:bg-blue hover:text-white"
          >
            Edit profile
          </Link>
        </div>

        {!hasShop && (
          <div className="mt-4 font-body text-xs text-navy-soft">
            You don't have a shop, so nobody can follow you yet.{" "}
            <Link href="/dashboard/open-shop" className="text-blue hover:text-blue-dark">
              Open a shop
            </Link>{" "}
            to start gaining followers.
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-4 border-t border-line pt-8">
          <Link
            href="/account/settings"
            className="focus-ring border border-line px-5 py-2.5 font-body text-sm font-medium text-navy-soft transition-colors hover:border-blue hover:text-blue"
          >
            Delivery address
          </Link>
        </div>

        {hasShop && shopId && (
          <div className="mt-8 flex flex-wrap gap-4 border-t border-line pt-8">
            <Link
              href="/dashboard/shop"
              className="focus-ring bg-blue px-5 py-2.5 font-body text-sm font-medium text-white transition-colors hover:bg-blue-dark"
            >
              Go to my shop
            </Link>
            <Link
              href={`/shop/${shopId}`}
              className="focus-ring border border-line px-5 py-2.5 font-body text-sm font-medium text-navy-soft transition-colors hover:border-blue hover:text-blue"
            >
              View my storefront
            </Link>
          </div>
        )}

        <div className="mt-10 border-t border-line pt-8">
          <h2 className="font-display text-xl tracking-tightest text-navy">
            Shops you follow
          </h2>
          {following.length === 0 ? (
            <p className="mt-4 font-body text-sm text-navy-soft">
              You're not following any shops yet. Follow a shop from its
              storefront page to see them here.
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {following.map((f) => (
                <Link
                  key={f.shop_id}
                  href={`/shop/${f.shop_id}`}
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
          )}
        </div>
      </div>
    </main>
  );
}
