"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  images: string[];
  size: string | null;
  digital_file_path: string | null;
  shops: { shop_name: string } | null;
};

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const id = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    supabase
      .from("products")
      .select("id, name, description, price, category, images, size, digital_file_path, shops(shop_name)")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        setProduct(data as unknown as Product);
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
          {product.shops?.shop_name && (
            <p className="mt-2 font-body text-sm text-navy-soft">
              Sold by {product.shops.shop_name}
            </p>
          )}
          <p className="mt-6 font-display text-2xl text-navy">
            ₦{product.price.toLocaleString()}
          </p>

          {product.size && (
            <p className="mt-3 font-body text-sm text-navy">
              <span className="text-navy-soft">Size:</span> {product.size}
            </p>
          )}

          {product.digital_file_path && (
            <p className="mt-3 font-body text-sm text-blue">
              📥 Includes a downloadable file, unlocked after purchase.
            </p>
          )}

          {product.description && (
            <p className="mt-6 max-w-md font-body text-sm leading-relaxed text-navy-soft">
              {product.description}
            </p>
          )}

          <Link
            href="/cart"
            className="focus-ring mt-8 inline-block bg-blue px-7 py-3.5 font-body text-sm font-medium text-white transition-colors hover:bg-blue-dark"
          >
            Buy now
          </Link>
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
