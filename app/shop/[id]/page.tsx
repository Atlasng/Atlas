"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Shop = {
  id: string;
  shop_name: string;
  address: string | null;
  logo_url: string | null;
};

type Product = {
  id: string;
  name: string;
  price: number;
  images: string[];
};

type Review = {
  id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profiles: { full_name: string | null } | null;
};

function Stars({ value, size = "text-sm" }: { value: number; size?: string }) {
  return (
    <span className={`text-yellow-500 ${size}`} aria-label={`${value} out of 5 stars`}>
      {"★".repeat(Math.round(value))}
      <span className="text-line">{"★".repeat(5 - Math.round(value))}</span>
    </span>
  );
}

export default function ShopFrontPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const shopId = params.id as string;

  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const [userId, setUserId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followBusy, setFollowBusy] = useState(false);

  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  async function loadAll() {
    const { data: shopData } = await supabase
      .from("shops")
      .select("id, shop_name, address, logo_url")
      .eq("id", shopId)
      .maybeSingle();

    if (!shopData) {
      setLoading(false);
      return;
    }
    setShop(shopData);

    const [{ data: productData }, { data: reviewData }, { count: followCount }] =
      await Promise.all([
        supabase
          .from("products")
          .select("id, name, price, images")
          .eq("shop_id", shopId)
          .order("created_at", { ascending: false }),
        supabase
          .from("shop_reviews")
          .select("id, user_id, rating, comment, created_at, profiles(full_name)")
          .eq("shop_id", shopId)
          .order("created_at", { ascending: false }),
        supabase
          .from("shop_follows")
          .select("id", { count: "exact", head: true })
          .eq("shop_id", shopId),
      ]);

    setProducts(productData ?? []);
    setReviews((reviewData as Review[]) ?? []);
    setFollowerCount(followCount ?? 0);

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

      const mine = (reviewData as Review[] | null)?.find(
        (r) => r.user_id === session.user.id
      );
      if (mine) {
        setMyRating(mine.rating);
        setMyComment(mine.comment ?? "");
      }
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

  async function submitReview() {
    setReviewError("");

    if (!userId) {
      router.push("/login");
      return;
    }
    if (myRating < 1) {
      setReviewError("Pick a star rating first.");
      return;
    }

    setSubmittingReview(true);

    const { error } = await supabase.from("shop_reviews").upsert(
      {
        shop_id: shopId,
        user_id: userId,
        rating: myRating,
        comment: myComment.trim() || null,
      },
      { onConflict: "shop_id,user_id" }
    );

    setSubmittingReview(false);

    if (error) {
      setReviewError(error.message);
      return;
    }

    await loadAll();
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

  return (
    <main className="min-h-screen bg-paper">
      <header className="border-b border-line">
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
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-line bg-ice">
            {shop.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shop.logo_url} alt={shop.shop_name} className="h-full w-full object-cover" />
            )}
          </div>
          <div className="flex-1">
            <h1 className="font-display text-3xl tracking-tightest text-navy md:text-4xl">
              {shop.shop_name}
            </h1>
            {shop.address && (
              <p className="mt-1 font-body text-sm text-navy-soft">{shop.address}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {reviews.length > 0 ? (
                <span className="flex items-center gap-1.5 font-body text-sm text-navy">
                  <Stars value={avgRating} />
                  {avgRating.toFixed(1)} ({reviews.length} review{reviews.length === 1 ? "" : "s"})
                </span>
              ) : (
                <span className="font-body text-sm text-navy-soft">No reviews yet</span>
              )}
              <span className="font-body text-sm text-navy-soft">
                {followerCount} follower{followerCount === 1 ? "" : "s"}
              </span>
            </div>
          </div>
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
              <Link
                key={product.id}
                href={`/product/${product.id}`}
                className="block border border-line bg-paper transition-colors hover:border-blue"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="h-40 w-full object-cover sm:h-48"
                />
                <div className="p-4">
                  <h3 className="truncate font-display text-base text-navy">{product.name}</h3>
                  <p className="mt-1 font-body text-sm font-medium text-navy">
                    ₦{product.price.toLocaleString()}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Reviews */}
        <div className="mt-16 border-t border-line pt-10">
          <h2 className="font-display text-2xl tracking-tightest text-navy">
            Reviews
          </h2>

          {/* Write a review */}
          <div className="mt-6 border border-line bg-ice p-5">
            <p className="font-body text-sm font-medium text-navy">
              {myRating > 0 ? "Update your review" : "Write a review"}
            </p>
            <div className="mt-3 flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setMyRating(star)}
                  aria-label={`${star} star${star === 1 ? "" : "s"}`}
                  className="focus-ring text-2xl leading-none text-yellow-500"
                >
                  {star <= myRating ? "★" : <span className="text-line">★</span>}
                </button>
              ))}
            </div>
            <textarea
              rows={3}
              value={myComment}
              onChange={(e) => setMyComment(e.target.value)}
              placeholder="Share your experience with this shop (optional)"
              className="focus-ring mt-3 w-full resize-none border border-line bg-paper px-4 py-3 font-body text-sm text-navy placeholder:text-navy-soft/60"
            />
            {reviewError && (
              <p className="mt-2 font-body text-sm text-red-700">{reviewError}</p>
            )}
            <button
              type="button"
              onClick={submitReview}
              disabled={submittingReview}
              className="focus-ring mt-3 bg-blue px-5 py-2.5 font-body text-sm font-medium text-white transition-colors hover:bg-blue-dark disabled:opacity-60"
            >
              {submittingReview ? "Saving..." : "Submit review"}
            </button>
          </div>

          {/* Review list */}
          <div className="mt-6 space-y-4">
            {reviews.length === 0 ? (
              <p className="font-body text-sm text-navy-soft">
                No reviews yet — be the first to leave one.
              </p>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="border border-line bg-paper p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-body text-sm font-medium text-navy">
                      {review.profiles?.full_name || "Anonymous buyer"}
                    </p>
                    <Stars value={review.rating} />
                  </div>
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
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
