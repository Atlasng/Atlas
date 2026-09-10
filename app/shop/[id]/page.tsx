"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useCart } from "@/lib/cart-context";

type Shop = {
  id: string;
  user_id: string;
  shop_name: string;
  address: string | null;
  logo_url: string | null;
};

type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  images: string[];
  sizes: string[];
  colors: string[];
};

type RatingInfo = { avg: number; count: number };

type ProductReview = {
  id: string;
  user_id: string;
  product_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profiles: { full_name: string | null; avatar_url: string | null } | null;
  products: { name: string } | null;
};

function Avatar({ url, name, size = "h-9 w-9" }: { url: string | null | undefined; name: string; size?: string }) {
  return (
    <div className={`${size} shrink-0 overflow-hidden rounded-full border border-line bg-ice`}>
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={name} className="h-full w-full object-cover" />
      )}
    </div>
  );
}

function Stars({ value, size = "text-sm" }: { value: number; size?: string }) {
  // Renders a true proportional fill (e.g. 2.67 → ~53% of the way through
  // the third star) instead of rounding to the nearest whole star, so the
  // icons always agree with the decimal shown next to them.
  const percent = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <span
      className={`relative inline-block whitespace-nowrap leading-none ${size}`}
      aria-label={`${value} out of 5 stars`}
    >
      <span className="text-line">★★★★★</span>
      <span
        className="absolute inset-0 overflow-hidden text-yellow-500"
        style={{ width: `${percent}%` }}
      >
        ★★★★★
      </span>
    </span>
  );
}

export default function ShopFrontPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const shopId = params.id as string;
  const { refresh: refreshCart } = useCart();

  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [logoLightboxOpen, setLogoLightboxOpen] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followBusy, setFollowBusy] = useState(false);

  const [addingProductId, setAddingProductId] = useState<string | null>(null);
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Owner-only "My reviews" panel — lists every review left across all of
  // this shop's products.
  const [myReviewsOpen, setMyReviewsOpen] = useState(false);
  const [ownerReviews, setOwnerReviews] = useState<ProductReview[] | null>(null);
  const [ownerReviewsLoading, setOwnerReviewsLoading] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  async function loadAll() {
    const { data: shopData } = await supabase
      .from("shops")
      .select("id, user_id, shop_name, address, logo_url")
      .eq("id", shopId)
      .maybeSingle();

    if (!shopData) {
      setLoading(false);
      return;
    }
    setShop(shopData);

    const [{ data: productData }, { count: followCount }] = await Promise.all([
      supabase
        .from("products")
        .select("id, name, category, price, images, sizes, colors")
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false }),
      supabase
        .from("shop_follows")
        .select("id", { count: "exact", head: true })
        .eq("shop_id", shopId),
    ]);

    // Older rows (or anything inserted outside the app) may still have
    // null here even though the column is meant to always be an array —
    // coalesce so `.length` never throws while checking variants.
    const productList = ((productData as unknown as Product[]) ?? []).map((p) => ({
      ...p,
      sizes: p.sizes ?? [],
      colors: p.colors ?? [],
    }));
    setProducts(productList);
    setFollowerCount(followCount ?? 0);

    // Reviews are per-product, so pull them across every product this
    // shop owner has listed rather than a single shop-level review.
    const productIds = productList.map((p) => p.id);
    let reviewData: ProductReview[] = [];
    if (productIds.length > 0) {
      const { data } = await supabase
        .from("product_comments")
        .select(
          "id, user_id, product_id, rating, comment, created_at, profiles(full_name, avatar_url), products(name)"
        )
        .in("product_id", productIds)
        .order("created_at", { ascending: false });
      reviewData = (data as unknown as ProductReview[]) ?? [];
    }
    setReviews(reviewData);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      setUserId(session.user.id);

      const { data: followRow } = await supabase
        .from("shop_follows")
        .select("id")
        .eq("shop_id", shopId)
        .eq("user_id", session.user.id)
        .maybeSingle();
      setIsFollowing(Boolean(followRow));
    }

    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  async function toggleFollow() {
    if (!userId) {
      router.push("/login");
      return;
    }
    setFollowBusy(true);

    if (isFollowing) {
      await supabase
        .from("shop_follows")
        .delete()
        .eq("shop_id", shopId)
        .eq("user_id", userId);
      setIsFollowing(false);
      setFollowerCount((c) => Math.max(0, c - 1));
    } else {
      await supabase.from("shop_follows").insert({ shop_id: shopId, user_id: userId });
      setIsFollowing(true);
      setFollowerCount((c) => c + 1);
    }

    setFollowBusy(false);
  }

  async function openMyReviews() {
    setMyReviewsOpen(true);
    setOwnerReviewsLoading(true);

    // Fetched fresh (across every product in the shop) rather than
    // reusing the `reviews` state already on the page, so a review left
    // moments ago shows up immediately.
    const productIds = products.map((p) => p.id);
    let data: ProductReview[] = [];
    if (productIds.length > 0) {
      const res = await supabase
        .from("product_comments")
        .select(
          "id, user_id, product_id, rating, comment, created_at, profiles(full_name, avatar_url), products(name)"
        )
        .in("product_id", productIds)
        .order("created_at", { ascending: false });
      data = (res.data as unknown as ProductReview[]) ?? [];
    }

    setOwnerReviews(data);
    setOwnerReviewsLoading(false);
  }

  function closeMyReviews() {
    setMyReviewsOpen(false);
  }

  async function handleQuickAddToCart(product: Product) {
    if (product.sizes.length > 0) {
      setToast(`Select a size for "${product.name}" to add it to your wishlist.`);
      return;
    }
    if (product.colors.length > 0) {
      setToast(`Select a color for "${product.name}" to add it to your wishlist.`);
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/login");
      return;
    }

    setAddingProductId(product.id);

    const { data: existing } = await supabase
      .from("cart_items")
      .select("id, quantity")
      .eq("user_id", session.user.id)
      .eq("product_id", product.id)
      .eq("size", "")
      .maybeSingle();

    if (existing) {
      await supabase
        .from("cart_items")
        .update({ quantity: existing.quantity + 1 })
        .eq("id", existing.id);
    } else {
      await supabase.from("cart_items").insert({
        user_id: session.user.id,
        product_id: product.id,
        quantity: 1,
        size: "",
      });
    }

    await refreshCart();
    setAddingProductId(null);
    setAddedProductId(product.id);
    setTimeout(() => setAddedProductId(null), 1500);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ice">
        <p className="font-body text-sm text-navy-soft">Loading...</p>
      </main>
    );
  }

  if (!shop) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ice px-6 text-center">
        <p className="font-body text-sm text-navy-soft">This shop doesn't exist.</p>
        <Link
          href="/dashboard"
          className="focus-ring bg-blue px-6 py-3 font-body text-sm font-medium text-white transition-colors hover:bg-blue-dark"
        >
          Back to marketplace
        </Link>
      </main>
    );
  }

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  // Per-product ratings for the grid below, derived from the same
  // `reviews` fetch used for the shop-wide combined rating above — no
  // extra query needed since it already covers every product here.
  const productRatings: Record<string, RatingInfo> = {};
  for (const r of reviews) {
    const bucket = productRatings[r.product_id] ?? { avg: 0, count: 0 };
    const newCount = bucket.count + 1;
    productRatings[r.product_id] = {
      avg: (bucket.avg * bucket.count + r.rating) / newCount,
      count: newCount,
    };
  }

  const isOwner = Boolean(userId && shop.user_id === userId);

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

      <div className="mx-auto max-w-content px-6 py-12 md:px-10">
        {/* Shop header */}
        <div className="flex flex-wrap items-center gap-5">
          <button
            type="button"
            onClick={() => shop.logo_url && setLogoLightboxOpen(true)}
            disabled={!shop.logo_url}
            aria-label={shop.logo_url ? "View full profile picture" : undefined}
            className="focus-ring h-20 w-20 shrink-0 overflow-hidden rounded-full border border-line bg-ice disabled:cursor-default"
          >
            {shop.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shop.logo_url} alt={shop.shop_name} className="h-full w-full object-cover" />
            )}
          </button>
          <div>
            <h1 className="font-display text-3xl tracking-tightest text-navy md:text-4xl">
              {shop.shop_name}
            </h1>
            <p className="mt-1 font-body text-sm text-navy-soft">
              {followerCount} follower{followerCount === 1 ? "" : "s"}
            </p>
            {reviews.length > 0 ? (
              <span className="mt-1 flex items-center gap-1.5 font-body text-sm text-navy">
                <Stars value={avgRating} />
                {avgRating.toFixed(1)} ({reviews.length} review{reviews.length === 1 ? "" : "s"})
              </span>
            ) : (
              <p className="mt-1 font-body text-sm text-navy-soft">No reviews yet</p>
            )}
          </div>
        </div>

        {/*
          Address and the follow/reviews action live together in this
          one row so they hold a consistent, predictable position
          regardless of how long the shop name is or how the layout
          wraps on smaller screens.
        */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-y border-line py-4">
          <div className="flex flex-wrap items-center gap-3">
            {shop.address && (
              <span className="font-body text-sm text-navy-soft">{shop.address}</span>
            )}
          </div>

          {isOwner ? (
            <button
              type="button"
              onClick={openMyReviews}
              className="focus-ring shrink-0 border border-blue px-6 py-2.5 font-body text-sm font-medium text-blue transition-colors hover:bg-blue hover:text-white"
            >
              Reviews
            </button>
          ) : (
            <button
              type="button"
              onClick={toggleFollow}
              disabled={followBusy}
              className={`focus-ring shrink-0 px-6 py-2.5 font-body text-sm font-medium transition-colors disabled:opacity-60 ${
                isFollowing
                  ? "border border-blue text-blue hover:bg-blue hover:text-white"
                  : "bg-blue text-white hover:bg-blue-dark"
              }`}
            >
              {isFollowing ? "Following" : "Follow"}
            </button>
          )}
        </div>

        {/* Products */}
        <h2 className="mt-12 font-display text-2xl tracking-tightest text-navy">
          Products
        </h2>
        {products.length === 0 ? (
          <p className="mt-6 font-body text-sm text-navy-soft">
            This shop hasn't listed any products yet.
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <div
                key={product.id}
                className="block border border-line bg-paper transition-colors hover:border-blue"
              >
                <Link href={`/product/${product.id}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="h-40 w-full object-cover sm:h-48"
                  />
                </Link>
                <div className="p-4">
                  <p className="truncate font-body text-xs text-navy-soft">
                    {product.category}
                  </p>
                  <Link href={`/product/${product.id}`}>
                    <h3 className="mt-1 truncate font-display text-base text-navy hover:text-blue">
                      {product.name}
                    </h3>
                  </Link>
                  {productRatings[product.id] ? (
                    <span className="mt-1 flex items-center gap-1 font-body text-xs text-navy-soft">
                      <Stars value={productRatings[product.id].avg} size="text-xs" />
                      {productRatings[product.id].avg.toFixed(1)} (
                      {productRatings[product.id].count})
                    </span>
                  ) : (
                    <p className="mt-1 font-body text-xs text-navy-soft">No reviews yet</p>
                  )}
                  <p className="mt-2 font-body text-sm font-medium text-navy">
                    ₦{product.price.toLocaleString()}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleQuickAddToCart(product)}
                    disabled={addingProductId === product.id}
                    className="focus-ring mt-3 w-full bg-blue px-4 py-2.5 font-body text-sm font-medium text-white transition-colors hover:bg-blue-dark disabled:opacity-60"
                  >
                    {addingProductId === product.id
                      ? "Adding..."
                      : addedProductId === product.id
                      ? "✓ Added"
                      : "Wishlist"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Reviews */}
        <div className="mt-16 border-t border-line pt-10">
          <h2 className="font-display text-2xl tracking-tightest text-navy">
            Reviews
          </h2>

          {/* Review list */}
          <div className="mt-6 space-y-4">
            {reviews.length === 0 ? (
              <p className="font-body text-sm text-navy-soft">
                No reviews yet — be the first to leave one.
              </p>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="flex gap-3 border border-line bg-paper p-4">
                  <Avatar url={review.profiles?.avatar_url} name={review.profiles?.full_name || "Anonymous buyer"} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-body text-sm font-medium text-navy">
                        {review.profiles?.full_name || "Anonymous buyer"}
                      </p>
                      <Stars value={review.rating} />
                    </div>
                    {review.products?.name && (
                      <p className="mt-0.5 font-body text-xs text-navy-soft">
                        on {review.products.name}
                      </p>
                    )}
                    {review.comment && (
                      <p className="mt-2 font-body text-sm text-navy-soft">{review.comment}</p>
                    )}
                    <p className="mt-2 font-body text-xs text-navy-soft">
                      {new Date(review.created_at).toLocaleDateString("en-NG", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Profile picture lightbox */}
      {logoLightboxOpen && shop.logo_url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy/95 px-4"
          onClick={() => setLogoLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setLogoLightboxOpen(false)}
            aria-label="Close"
            className="focus-ring absolute right-5 top-5 flex h-10 w-10 items-center justify-center text-2xl text-white"
          >
            ×
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={shop.logo_url}
            alt={shop.shop_name}
            className="max-h-[85vh] max-w-full rounded-full object-contain"
          />
        </div>
      )}
      {/* My reviews panel — owner-only, lists every review left across all of this shop's products */}
      {myReviewsOpen && (
        <div
          className="fixed inset-0 z-30 flex items-start justify-center bg-navy/40 px-6 py-16 md:py-24"
          onClick={closeMyReviews}
        >
          <div
            className="w-full max-w-lg border border-line bg-paper"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h3 className="font-display text-lg tracking-tightest text-navy">
                Reviews
              </h3>
              <button
                type="button"
                onClick={closeMyReviews}
                className="focus-ring font-body text-sm text-navy-soft transition-colors hover:text-navy"
              >
                Close
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto p-3">
              {ownerReviewsLoading ? (
                <p className="p-3 font-body text-sm text-navy-soft">Loading...</p>
              ) : !ownerReviews || ownerReviews.length === 0 ? (
                <p className="p-3 font-body text-sm text-navy-soft">
                  No reviews yet — they'll show up here once buyers leave one.
                </p>
              ) : (
                <div className="space-y-3">
                  {ownerReviews.map((review) => (
                    <div key={review.id} className="flex gap-3 border border-line bg-paper p-4">
                      <Avatar
                        url={review.profiles?.avatar_url}
                        name={review.profiles?.full_name || "Anonymous buyer"}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-body text-sm font-medium text-navy">
                            {review.profiles?.full_name || "Anonymous buyer"}
                          </p>
                          <Stars value={review.rating} />
                        </div>
                        {review.products?.name && (
                          <p className="mt-0.5 font-body text-xs text-navy-soft">
                            on {review.products.name}
                          </p>
                        )}
                        {review.comment && (
                          <p className="mt-2 font-body text-sm text-navy-soft">{review.comment}</p>
                        )}
                        <p className="mt-2 font-body text-xs text-navy-soft">
                          {new Date(review.created_at).toLocaleDateString("en-NG", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {toast && <Toast message={toast} />}
    </main>
  );
}

function Toast({ message }: { message: string }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <div className="pointer-events-auto max-w-sm border border-line bg-navy px-5 py-3 text-center font-body text-sm text-white shadow-lg transition-opacity">
        {message}
      </div>
    </div>
  );
}
