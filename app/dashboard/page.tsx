"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

type Product = {
  id: string;
  name: string;
  category: string;
  price: string;
  image: string;
};

const categoryFilters = [
  "All",
  "Electronics",
  "Fashion",
  "Beauty",
  "Home & Living",
  "Groceries",
  "Sports",
  "Computers",
  "Automotive",
];

const products: Product[] = [];

function DashboardContent() {
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();

  const categoryParam = searchParams.get("category");
  const initialCategory = categoryFilters.includes(categoryParam ?? "")
    ? (categoryParam as string)
    : "All";
  const initialSearch = searchParams.get("search") ?? "";

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [searchTerm, setSearchTerm] = useState(initialSearch);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [router, supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const hasShop = Boolean(user?.user_metadata?.has_shop);

  const visibleProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return products.filter((p) => {
      const matchesCategory =
        activeCategory === "All" || p.category === activeCategory;
      const matchesSearch =
        term === "" || p.name.toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchTerm]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ice">
        <p className="font-body text-sm text-navy-soft">Loading...</p>
      </main>
    );
  }

  const name =
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email ||
    "";

  return (
    <main className="min-h-screen bg-paper">
      {/* Header */}
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-content flex-wrap items-center justify-between gap-4 px-6 py-5 md:px-10">
          <span className="font-display text-2xl tracking-tightest text-navy">
            Atlas
          </span>

          <div className="flex flex-1 items-center justify-end gap-4 md:gap-5">
            <div className="relative w-full max-w-[220px] sm:max-w-xs">
              <svg
                width="16"
                height="16"
                viewBox="0 0 18 18"
                fill="none"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-navy-soft"
              >
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
                <line x1="12.5" y1="12.5" x2="17" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products"
                aria-label="Search products"
                className="focus-ring w-full border border-line bg-ice py-2 pl-9 pr-3 font-body text-sm text-navy placeholder:text-navy-soft/60"
              />
            </div>

            <Link
              href="/cart"
              aria-label="Cart, 0 items"
              className="focus-ring shrink-0 text-navy-soft transition-colors hover:text-navy"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                  d="M2 5h2l1.2 8.4a1.5 1.5 0 0 0 1.5 1.3h6.6a1.5 1.5 0 0 0 1.5-1.3L16 6H5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="7.5" cy="16.5" r="1" fill="currentColor" />
                <circle cx="13.5" cy="16.5" r="1" fill="currentColor" />
              </svg>
            </Link>

            {user ? (
              <button
                onClick={handleLogout}
                className="focus-ring shrink-0 font-body text-sm font-medium text-navy-soft transition-colors hover:text-navy"
              >
                Log out
              </button>
            ) : (
              <div className="flex shrink-0 items-center gap-3">
                <Link
                  href="/login"
                  className="focus-ring whitespace-nowrap border border-blue px-4 py-2 font-body text-sm font-medium text-blue transition-colors hover:bg-blue hover:text-white"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="focus-ring whitespace-nowrap bg-blue px-4 py-2 font-body text-sm font-medium text-white transition-colors hover:bg-blue-dark"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-content px-6 pb-12 pt-6 md:px-10">
        {user ? (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-ice text-navy-soft">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="6.2" r="3.2" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M2.8 15.5c.9-3 3.4-4.8 6.2-4.8s5.3 1.8 6.2 4.8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <span className="font-display text-2xl tracking-tightest text-navy md:text-3xl">
              {name}
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-4">
            <p className="font-body text-sm text-navy-soft">
              Log in or create an account to open a shop and manage orders.
            </p>
            <div className="flex gap-3">
              <Link
                href="/login"
                className="focus-ring border border-blue px-4 py-2 font-body text-sm font-medium text-blue transition-colors hover:bg-blue hover:text-white"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="focus-ring bg-blue px-4 py-2 font-body text-sm font-medium text-white transition-colors hover:bg-blue-dark"
              >
                Sign up
              </Link>
            </div>
          </div>
        )}

        {/* Seller CTA */}
        {user && (
          <>
            {hasShop ? (
              <div className="mt-8 flex flex-col justify-between gap-6 border border-line bg-navy p-8 sm:flex-row sm:items-center">
                <div>
                  <p className="font-body text-sm font-medium text-blue-light">
                    Your shop is live
                  </p>
                  <h2 className="mt-1 font-display text-2xl text-white">
                    Manage your listings and orders
                  </h2>
                </div>
                <Link
                  href="/dashboard/shop"
                  className="focus-ring whitespace-nowrap bg-blue px-6 py-3 text-center font-body text-sm font-medium text-white transition-colors hover:bg-blue-dark"
                >
                  Go to my shop
                </Link>
              </div>
            ) : (
              <div className="mt-8 flex flex-col justify-between gap-6 border border-line bg-navy p-8 sm:flex-row sm:items-center">
                <div>
                  <p className="font-body text-sm font-medium text-blue-light">
                    Sell on Atlas
                  </p>
                  <h2 className="mt-1 font-display text-2xl text-white">
                    Open a shop and start listing products
                  </h2>
                  <p className="mt-2 max-w-md font-body text-sm text-white/70">
                    Set up your storefront in minutes and reach every buyer
                    browsing the marketplace below.
                  </p>
                </div>
                <Link
                  href="/dashboard/open-shop"
                  className="focus-ring whitespace-nowrap bg-blue px-6 py-3 text-center font-body text-sm font-medium text-white transition-colors hover:bg-blue-dark"
                >
                  Open a shop on Atlas
                </Link>
              </div>
            )}
          </>
        )}

        {/* Marketplace */}
        <div className="mt-16">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-display text-2xl tracking-tightest text-navy">
              Browse the marketplace
            </h2>
            {hasShop && (
              <Link
                href="/dashboard/shop/new"
                className="focus-ring whitespace-nowrap border border-blue px-4 py-2 font-body text-sm font-medium text-blue transition-colors hover:bg-blue hover:text-white"
              >
                + List a product
              </Link>
            )}
          </div>

          {/* Category filter */}
          <div className="mt-6 flex flex-wrap gap-2.5">
            {categoryFilters.map((category) => {
              const isActive = category === activeCategory;
              return (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`focus-ring whitespace-nowrap border px-4 py-2 font-body text-sm transition-colors ${
                    isActive
                      ? "border-blue bg-blue text-white"
                      : "border-line bg-paper text-navy-soft hover:border-blue hover:text-blue"
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>

          {/* Product grid */}
          {visibleProducts.length === 0 ? (
            <p className="mt-12 font-body text-sm text-navy-soft">
              No products listed yet. Check back soon.
            </p>
          ) : (
            <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {visibleProducts.map((product) => (
                <div
                  key={product.id}
                  className="group border border-line bg-paper transition-colors hover:border-blue"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-40 w-full object-cover sm:h-48"
                  />
                  <div className="p-4">
                    <p className="font-body text-xs text-navy-soft">
                      {product.category}
                    </p>
                    <h3 className="mt-1 font-display text-base text-navy">
                      {product.name}
                    </h3>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="font-body text-sm font-medium text-navy">
                        {product.price}
                      </span>
                      <Link
                        href={`/product/${product.id}`}
                        className="focus-ring font-body text-sm font-medium text-blue hover:text-blue-dark"
                      >
                        Buy now
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer links */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-8 border-t border-line pt-8">
          <Link
            href="/about"
            className="focus-ring font-body text-sm text-navy-soft transition-colors hover:text-navy"
          >
            About us
          </Link>
          <Link
            href="/contact"
            className="focus-ring font-body text-sm text-navy-soft transition-colors hover:text-navy"
          >
            Contact us
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardContent />
    </Suspense>
  );
}
