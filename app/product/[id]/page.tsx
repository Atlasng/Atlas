"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { buildWhatsAppLink } from "@/lib/whatsapp";

type Product = {
  id: string;
  shop_id: string;
  name: string;
  description: string | null;
  price: number;
  dropship_price: number;
  price_type: "fixed" | "negotiable";
  category: string;
  images: string[];
  sizes: string[] | null;
  colors: string[] | null;
  digital_file_path: string | null;
  shop_name: string | null;
};

type Comment = {
  id: string;
  comment: string;
  created_at: string;
  profiles: { full_name: string | null; avatar_url: string | null } | null;
};

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const id = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  // Fetched separately (and live) from shops.phone rather than trusting
  // a shop_phone value denormalized onto the product row — sellers edit
  // their WhatsApp number from Shop settings after products already
  // exist, and that edit should be reflected immediately here.
  const [shopPhone, setShopPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentError, setCommentError] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  const hasSizes = Boolean(product?.sizes && product.sizes.length > 0);
  const hasColors = Boolean(product?.colors && product.colors.length > 0);
  const isNegotiable = product?.price_type === "negotiable";

  function checkVariantsSelected(): boolean {
    setActionError("");
    if (hasSizes && !selectedSize) {
      setActionError("Select a size first.");
      return false;
    }
    if (hasColors && !selectedColor) {
      setActionError("Select a color first.");
      return false;
    }
    return true;
  }

  function handleChat() {
    if (!product) return;
    if (!checkVariantsSelected()) return;
    if (!shopPhone) {
      setActionError("This seller hasn't added a WhatsApp number yet.");
      return;
    }

    const variantBits = [selectedSize, selectedColor].filter(Boolean).join(", ");
    const priceNote = isNegotiable ? "asking price" : "price";
    const message = `Hi! I'm interested in "${product.name}"${
      variantBits ? ` (${variantBits})` : ""
    } listed at ${priceNote} ₦${product.price.toLocaleString()} on Atlas. Is it still available?`;

    window.open(buildWhatsAppLink(shopPhone, message), "_blank");
  }

  function handleDropship() {
    if (!product) return;
    if (!checkVariantsSelected()) return;
    if (!shopPhone) {
      setActionError("This seller hasn't added a WhatsApp number yet.");
      return;
    }

    const variantBits = [selectedSize, selectedColor].filter(Boolean).join(", ");
    const message = `Hi! I'd like to dropship "${product.name}"${
      variantBits ? ` (${variantBits})` : ""
    } at your dropshipping price of ₦${product.dropship_price.toLocaleString()} on Atlas. Can we talk?`;

    window.open(buildWhatsAppLink(shopPhone, message), "_blank");
  }

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("products")
        .select(
          "id, shop_id, name, description, price, dropship_price, price_type, category, images, sizes, colors, digital_file_path, shop_name"
        )
        .eq("id", id)
        .maybeSingle();

      const fetchedProduct = data as Product | null;

      if (fetchedProduct) {
        // Fetched as its own query (not embedded in the products select)
        // so this always reflects whatever the seller has saved most
        // recently in Shop settings, rather than a value copied onto the
        // product row at listing time.
        const { data: sellerShop } = await supabase
          .from("shops")
          .select("phone")
          .eq("id", fetchedProduct.shop_id)
          .maybeSingle();
        setShopPhone(sellerShop?.phone ?? null);

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          const { data: shop } = await supabase
            .from("shops")
            .select("id")
            .eq("user_id", session.user.id)
            .maybeSingle();

          // Just note ownership so we can show a small "manage" link — we
          // never force a redirect just because someone is browsing their
          // own listing on the marketplace. Editing only happens from the
          // "My products" list.
          if (shop && shop.id === fetchedProduct.shop_id) {
            setIsOwner(true);
          }
        }
      }

      setProduct(fetchedProduct);
      setLoading(false);

      const { data: commentData } = await supabase
        .from("product_comments")
        .select("id, comment, created_at, profiles(full_name, avatar_url)")
        .eq("product_id", id)
        .order("created_at", { ascending: false });
      setComments((commentData as unknown as Comment[]) ?? []);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handlePostComment() {
    setCommentError("");

    if (!commentText.trim()) {
      setCommentError("Write something first.");
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/login");
      return;
    }

    setPostingComment(true);

    const { error } = await supabase.from("product_comments").insert({
      product_id: id,
      user_id: session.user.id,
      comment: commentText.trim(),
    });

    setPostingComment(false);

    if (error) {
      setCommentError(error.message);
      return;
    }

    setCommentText("");
    const { data: commentData } = await supabase
      .from("product_comments")
      .select("id, comment, created_at, profiles(full_name, avatar_url)")
      .eq("product_id", id)
      .order("created_at", { ascending: false });
    setComments((commentData as unknown as Comment[]) ?? []);
  }

  function showPrev() {
    if (!product) return;
    setActiveIndex((i) => (i === 0 ? product.images.length - 1 : i - 1));
  }

  function showNext() {
    if (!product) return;
    setActiveIndex((i) => (i === product.images.length - 1 ? 0 : i + 1));
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ice">
        <p className="font-body text-sm text-navy-soft">Loading...</p>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ice px-6 text-center">
        <p className="font-body text-sm text-navy-soft">
          This product doesn't exist or has been removed.
        </p>
        <button
          onClick={() => router.push("/dashboard")}
          className="focus-ring bg-blue px-6 py-3 font-body text-sm font-medium text-white transition-colors hover:bg-blue-dark"
        >
          Back to marketplace
        </button>
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
          <div className="flex items-center gap-5">
            {isOwner && (
              <Link
                href={`/dashboard/shop/products/${id}/edit`}
                className="focus-ring font-body text-sm font-medium text-blue hover:text-blue-dark"
              >
                Edit this listing
              </Link>
            )}
            <Link
              href="/dashboard"
              className="focus-ring font-body text-sm font-medium text-navy-soft transition-colors hover:text-navy"
            >
              ← Back to marketplace
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-content grid-cols-1 gap-10 px-6 py-12 md:grid-cols-2 md:px-10">
        {/* Gallery */}
        <div>
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="focus-ring block w-full overflow-hidden border border-line bg-ice"
            aria-label="View full size image"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.images[activeIndex]}
              alt={product.name}
              className="aspect-square w-full object-cover"
            />
          </button>

          {product.images.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {product.images.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setActiveIndex(i)}
                  className={`focus-ring aspect-square overflow-hidden border ${
                    i === activeIndex ? "border-blue" : "border-line"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`${product.name} ${i + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <p className="font-body text-xs text-navy-soft">{product.category}</p>
          <h1 className="mt-1 font-display text-3xl tracking-tightest text-navy">
            {product.name}
          </h1>
          {product.shop_name && (
            <Link
              href={`/shop/${product.shop_id}`}
              className="mt-2 inline-block font-body text-sm text-navy-soft hover:text-blue"
            >
              Sold by{" "}
              <span className="font-bold uppercase underline">{product.shop_name}</span>
            </Link>
          )}
          <p className="mt-6 font-display text-2xl text-navy">
            {isNegotiable && (
              <span className="mr-2 font-body text-xs font-medium uppercase tracking-wide text-navy-soft">
                Asking price
              </span>
            )}
            ₦{product.price.toLocaleString()}
          </p>
          <p className="mt-1 font-body text-sm text-navy-soft">
            Dropshipping price: ₦{product.dropship_price.toLocaleString()}
          </p>

          {hasSizes && (
            <div className="mt-5">
              <p className="font-body text-sm text-navy-soft">Size</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {product.sizes!.map((size) => {
                  const active = selectedSize === size;
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => {
                        setSelectedSize(size);
                        setActionError("");
                      }}
                      aria-pressed={active}
                      className={`focus-ring min-w-[3rem] border px-4 py-2 font-body text-sm font-medium transition-colors ${
                        active
                          ? "border-blue bg-blue text-white"
                          : "border-line bg-ice text-navy hover:border-blue"
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {hasColors && (
            <div className="mt-5">
              <p className="font-body text-sm text-navy-soft">Color</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {product.colors!.map((color) => {
                  const active = selectedColor === color;
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => {
                        setSelectedColor(color);
                        setActionError("");
                      }}
                      aria-pressed={active}
                      className={`focus-ring border px-4 py-2 font-body text-sm font-medium transition-colors ${
                        active
                          ? "border-blue bg-blue text-white"
                          : "border-line bg-ice text-navy hover:border-blue"
                      }`}
                    >
                      {color}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {product.digital_file_path && (
            <p className="mt-3 font-body text-sm text-blue">
              📥 This listing includes a digital file — coordinate delivery
              with the seller over WhatsApp.
            </p>
          )}

          {product.description && (
            <p className="mt-6 max-w-md font-body text-sm leading-relaxed text-navy-soft">
              {product.description}
            </p>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleChat}
              className="focus-ring bg-[#25D366] px-7 py-3.5 font-body text-sm font-medium text-white transition-colors hover:bg-[#1DA851]"
            >
              Chat on WhatsApp
            </button>
            <button
              type="button"
              onClick={handleDropship}
              className="focus-ring border border-blue px-5 py-3.5 font-body text-sm font-medium text-blue transition-colors hover:bg-blue hover:text-white"
            >
              Dropship
            </button>
          </div>
          {actionError && (
            <p className="mt-3 font-body text-sm text-red-700">{actionError}</p>
          )}
        </div>
      </div>

      {/* Comments */}
      <div className="mx-auto max-w-content border-t border-line px-6 py-12 md:px-10">
        <h2 className="font-display text-2xl tracking-tightest text-navy">
          Comments
        </h2>

        <div className="mt-6 max-w-lg border border-line bg-ice p-5">
          <textarea
            rows={3}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Ask a question or leave a comment about this product"
            className="focus-ring w-full resize-none border border-line bg-paper px-4 py-3 font-body text-sm text-navy placeholder:text-navy-soft/60"
          />
          {commentError && (
            <p className="mt-2 font-body text-sm text-red-700">{commentError}</p>
          )}
          <button
            type="button"
            onClick={handlePostComment}
            disabled={postingComment}
            className="focus-ring mt-3 bg-blue px-5 py-2.5 font-body text-sm font-medium text-white transition-colors hover:bg-blue-dark disabled:opacity-60"
          >
            {postingComment ? "Posting..." : "Post comment"}
          </button>
        </div>

        <div className="mt-6 max-w-lg space-y-4">
          {comments.length === 0 ? (
            <p className="font-body text-sm text-navy-soft">
              No comments yet — be the first to ask something.
            </p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex gap-3 border border-line bg-paper p-4">
                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-line bg-ice">
                  {c.profiles?.avatar_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.profiles.avatar_url}
                      alt={c.profiles?.full_name || "Anonymous buyer"}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-body text-sm font-medium text-navy">
                    {c.profiles?.full_name || "Anonymous buyer"}
                  </p>
                  <p className="mt-1 font-body text-sm text-navy-soft">{c.comment}</p>
                  <p className="mt-2 font-body text-xs text-navy-soft">
                    {new Date(c.created_at).toLocaleDateString("en-NG", {
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

      {/* Lightbox */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/95 px-4">
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close"
            className="focus-ring absolute right-5 top-5 flex h-10 w-10 items-center justify-center text-2xl text-white"
          >
            ×
          </button>

          {product.images.length > 1 && (
            <button
              type="button"
              onClick={showPrev}
              aria-label="Previous image"
              className="focus-ring absolute left-3 flex h-10 w-10 items-center justify-center text-2xl text-white sm:left-6"
            >
              ‹
            </button>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.images[activeIndex]}
            alt={product.name}
            className="max-h-[85vh] max-w-full object-contain"
          />

          {product.images.length > 1 && (
            <button
              type="button"
              onClick={showNext}
              aria-label="Next image"
              className="focus-ring absolute right-3 flex h-10 w-10 items-center justify-center text-2xl text-white sm:right-6"
            >
              ›
            </button>
          )}

          {product.images.length > 1 && (
            <p className="absolute bottom-6 font-body text-sm text-white/70">
              {activeIndex + 1} / {product.images.length}
            </p>
          )}
        </div>
      )}
    </main>
  );
}
