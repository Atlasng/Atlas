"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type WishlistItem = {
  id: string;
  products: {
    id: string;
    name: string;
    price: number;
    category: string;
    images: string[];
    shop_name: string | null;
  } | null;
};

export default function WishlistPage() {
  const router = useRouter();
  const supabase = createClient();

  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadWishlist() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.replace("/login");
      return;
    }

    const { data } = await supabase
      .from("cart_items")
      .select("id, products(id, name, price, category, images, shop_name)")
      .eq("user_id", session.user.id);

    setItems((data as unknown as WishlistItem[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadWishlist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function removeItem(itemId: string) {
    // Optimistic remove — the item disappears immediately, and the
    // delete fires in the background rather than blocking the UI on it.
    setItems((prev) => prev.filter((item) => item.id !== itemId));
    await supabase.from("cart_items").delete().eq("id", itemId);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ice">
        <p className="font-body text-sm text-navy-soft">Loading...</p>
      </main>
    );
  }

  const validItems = items.filter((item) => item.products !== null);

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
            ← Continue shopping
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-content px-6 py-12 md:px-10">
        <h1 className="font-display text-3xl tracking-tightest text-navy md:text-4xl">
          Your wishlist
        </h1>

        {validItems.length === 0 ? (
          <p className="mt-8 font-body text-sm text-navy-soft">
            Your wishlist is empty.{" "}
            <Link href="/dashboard" className="text-blue hover:text-blue-dark">
              Browse the marketplace
            </Link>
            .
          </p>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {validItems.map((item) => {
              const product = item.products!;
              return (
                <div
                  key={item.id}
                  className="group relative block border border-line bg-paper transition-colors hover:border-blue"
                >
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    aria-label="Remove from wishlist"
                    className="focus-ring absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center bg-paper/90 font-body text-sm text-navy-soft transition-colors hover:text-red-700"
                  >
                    ×
                  </button>
                  <Link href={`/product/${product.id}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="h-40 w-full object-cover sm:h-48"
                    />
                    <div className="p-4">
                      <p className="truncate font-body text-xs text-navy-soft">
                        {product.category}
                      </p>
                      {product.shop_name && (
                        <p className="truncate font-body text-xs text-navy-soft">
                          Sold by {product.shop_name}
                        </p>
                      )}
                      <h3 className="mt-1 truncate font-display text-base text-navy group-hover:text-blue">
                        {product.name}
                      </h3>
                      <p className="mt-2 font-body text-sm font-medium text-navy">
                        ₦{product.price.toLocaleString()}
                      </p>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
