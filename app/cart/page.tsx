"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type CartItem = {
  id: string;
  quantity: number;
  products: {
    id: string;
    name: string;
    price: number;
    category: string;
    images: string[];
    shops: { shop_name: string } | null;
  } | null;
};

export default function CartPage() {
  const router = useRouter();
  const supabase = createClient();

  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState("");

  async function loadCart() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.replace("/login");
      return;
    }

    const { data } = await supabase
      .from("cart_items")
      .select(
        "id, quantity, products(id, name, price, category, images, shops(shop_name))"
      )
      .eq("user_id", session.user.id);

    setItems((data as unknown as CartItem[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function updateQuantity(itemId: string, quantity: number) {
    if (quantity < 1) return;
    await supabase.from("cart_items").update({ quantity }).eq("id", itemId);
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, quantity } : item))
    );
  }

  async function removeItem(itemId: string) {
    await supabase.from("cart_items").delete().eq("id", itemId);
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  }

  async function handleCheckout() {
    setError("");
    setCheckingOut(true);
    try {
      const res = await fetch("/api/checkout/initialize", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Could not start checkout.");
        setCheckingOut(false);
        return;
      }
      window.location.href = json.authorizationUrl;
    } catch {
      setError("Something went wrong starting checkout.");
      setCheckingOut(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ice">
        <p className="font-body text-sm text-navy-soft">Loading...</p>
      </main>
    );
  }

  const validItems = items.filter((item) => item.products !== null);
  const digitalItems = validItems.filter((item) => item.products!.category === "Digital Products");
  const physicalItems = validItems.filter((item) => item.products!.category !== "Digital Products");

  const total = validItems.reduce(
    (sum, item) => sum + item.products!.price * item.quantity,
    0
  );

  function renderItem(item: CartItem, isDigital: boolean) {
    const product = item.products!;
    return (
      <div key={item.id} className="flex gap-4 border border-line bg-paper p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.images[0]}
          alt={product.name}
          className="h-20 w-20 shrink-0 border border-line object-cover"
        />
        <div className="flex flex-1 flex-col justify-between">
          <div>
            <h3 className="font-display text-base text-navy">{product.name}</h3>
            {product.shops?.shop_name && (
              <p className="font-body text-xs text-navy-soft">
                Sold by {product.shops.shop_name}
              </p>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="font-body text-sm font-medium text-navy">
              ₦{product.price.toLocaleString()}
            </span>
            {isDigital ? (
              <span className="font-body text-xs text-navy-soft">Digital item</span>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="focus-ring h-7 w-7 border border-line font-body text-sm text-navy"
                >
                  −
                </button>
                <span className="w-6 text-center font-body text-sm text-navy">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="focus-ring h-7 w-7 border border-line font-body text-sm text-navy"
                >
                  +
                </button>
              </div>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => removeItem(item.id)}
          aria-label="Remove"
          className="focus-ring self-start font-body text-sm text-navy-soft transition-colors hover:text-red-700"
        >
          ×
        </button>
      </div>
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
            ← Continue shopping
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-12 md:px-10">
        <h1 className="font-display text-3xl tracking-tightest text-navy md:text-4xl">
          Your cart
        </h1>

        {validItems.length === 0 ? (
          <p className="mt-8 font-body text-sm text-navy-soft">
            Your cart is empty.{" "}
            <Link href="/dashboard" className="text-blue hover:text-blue-dark">
              Browse the marketplace
            </Link>
            .
          </p>
        ) : (
          <>
            {physicalItems.length > 0 && (
              <div className="mt-8">
                <h2 className="font-display text-lg text-navy">Physical products</h2>
                <div className="mt-4 space-y-3">
                  {physicalItems.map((item) => renderItem(item, false))}
                </div>
              </div>
            )}

            {digitalItems.length > 0 && (
              <div className="mt-8">
                <h2 className="font-display text-lg text-navy">Digital products</h2>
                <div className="mt-4 space-y-3">
                  {digitalItems.map((item) => renderItem(item, true))}
                </div>
              </div>
            )}

            <div className="mt-10 flex items-center justify-between border-t border-line pt-6">
              <span className="font-body text-sm text-navy-soft">Total</span>
              <span className="font-display text-2xl text-navy">
                ₦{total.toLocaleString()}
              </span>
            </div>

            {error && <p className="mt-4 font-body text-sm text-red-700">{error}</p>}

            <button
              onClick={handleCheckout}
              disabled={checkingOut}
              className="focus-ring mt-6 w-full bg-blue px-5 py-3.5 font-body text-sm font-medium text-white transition-colors hover:bg-blue-dark disabled:opacity-60"
            >
              {checkingOut ? "Redirecting to Paystack..." : "Checkout"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
