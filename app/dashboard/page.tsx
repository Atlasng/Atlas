"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useCart } from "@/lib/cart-context";
import type { User } from "@supabase/supabase-js";

type Product = {
  id: string;
  shop_id: string;
  name: string;
  category: string;
  price: number;
  price_type: "fixed" | "negotiable";
  images: string[];
  sizes: string[];
  colors: string[];
  shop_name: string | null;
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
  "Digital Products",
];

const SCROLL_STATE_KEY = "atlas-marketplace-state";

// All data-fetching lives here, in a component that does NOT call
// useSearchParams(). That hook forces this component's Suspense boundary
// to re-suspend/resume around search-param changes on Next 14, which can
// discard state in a component that both fetches data AND reads search
// params. Splitting them means the fetch only ever runs once, reliably,
// regardless of what the URL's query string is doing.
export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const { count: cartCount, refresh: refreshCart } = useCart();

  const [user, setUser] = useState<User | null>(null);
  const [hasShop, setHasShop] = useState(false);
  const [shopId, setShopId] = useState<string | null>(null);
  const [shopExpiresAt, setShopExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [addingProductId, setAddingProductId] = useState<string | null>(null);
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    supabase
      .from("products")
      .select("id, shop_id, name, category, price, price_type, images, sizes, colors, shop_name")
      .then(({ data }) => {
        if (!active) return;
        // Older rows (or anything inserted outside the app) may still have
        // null here even though the column is meant to always be an array —
        // coalesce so `.length` never throws while rendering the grid.
        const list = ((data as unknown as Product[]) ?? []).map((p) => ({
          ...p,
          sizes: p.sizes ?? [],
          colors: p.colors ?? [],
        }));
        for (let i = list.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [list[i], list[j]] = [list[j], list[i]];
        }
        setProducts(list);
        setProductsLoading(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    let active = true;

    async function loadUserAndShop() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!active) return;

      setUser(session?.user ?? null);

      if (session?.user) {
        const { data: shop } = await supabase
          .from("shops")
          .select("id, plan_expires_at")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (active) {
          setHasShop(Boolean(shop));
          setShopId(shop?.id ?? null);
          setShopExpiresAt(shop?.plan_expires_at ?? null);
        }
      } else {
        setHasShop(false);
        setShopId(null);
        setShopExpiresAt(null);
      }

      if (active) setLoading(false);
    }

    loadUserAndShop();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (!session) {
          setHasShop(false);
          setShopId(null);
          setShopExpiresAt(null);
        }
      }
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
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

  const daysLeft = shopExpiresAt
    ? Math.ceil((new Date(shopExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const isExpired = daysLeft !== null && daysLeft < 0;
  const expiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 5;

  const name =
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email ||
    "";

  return (
    <Suspense fallback={null}>
      <DashboardBody
        user={user}
        name={name}
        hasShop={hasShop}
        shopId={shopId}
        isExpired={isExpired}
        expiringSoon={expiringSoon}
        daysLeft={daysLeft}
        products={products}
        productsLoading={productsLoading}
        addingProductId={addingProductId}
        addedProductId={addedProductId}
        cartCount={cartCount}
        onLogout={handleLogout}
        onQuickAddToCart={handleQuickAddToCart}
      />
      {toast && <Toast message={toast} />}
    </Suspense>
  );
}

function DashboardBody({
  user,
  name,
  hasShop,
  shopId,
  isExpired,
  expiringSoon,
  daysLeft,
  products,
  productsLoading,
  addingProductId,
  addedProductId,
  cartCount,
  onLogout,
  onQuickAddToCart,
}: {
  user: User | null;
  name: string;
  hasShop: boolean;
  shopId: string | null;
  isExpired: boolean;
  expiringSoon: boolean;
  daysLeft: number | null;
  products: Product[];
  productsLoading: boolean;
  addingProductId: string | null;
  addedProductId: string | null;
  cartCount: number;
  onLogout: () => void;
  onQuickAddToCart: (product: Product) => void;
}) {
  const searchParams = useSearchParams();
  const restoredRef = useRef(false);

  const firstName = name.trim().split(/\s+/)[0]?.split("@")[0] ?? "";

  const categoryParam = searchParams.get("category");
  const initialCategory = categoryFilters.includes(categoryParam ?? "")
    ? (categoryParam as string)
    : "All";
  const initialSearch = searchParams.get("search") ?? "";

  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [searchTerm, setSearchTerm] = useState(initialSearch);

  // Restore filters + scroll position saved just before the user clicked
  // into a product, so coming back via the browser's back button (or the
  // product page's own back link) resumes exactly where they left off.
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    const saved = sessionStorage.getItem(SCROLL_STATE_KEY);
    if (!saved) return;

    try {
      const { category, search, scrollY } = JSON.parse(saved);
      if (typeof category === "string") setActiveCategory(category);
      if (typeof search === "string") setSearchTerm(search);
      if (typeof scrollY === "number") {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => window.scrollTo(0, scrollY));
        });
      }
    } catch {
      // ignore malformed saved state
    }
  }, []);

  function saveScrollState() {
    sessionStorage.setItem(
      SCROLL_STATE_KEY,
      JSON.stringify({
        category: activeCategory,
        search: searchTerm,
        scrollY: window.scrollY,
      })
    );
  }

  const visibleProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return products.filter((p) => {
      const matchesCategory =
        activeCategory === "All" || p.category === activeCategory;
      const matchesSearch = term === "" || p.name.toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [products, activeCategory, searchTerm]);

  return (
    <main className="min-h-screen bg-paper pb-20">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-line bg-paper">
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

            {user ? (
              <div className="flex shrink-0 items-center gap-3">
                {firstName && (
                  <span className="font-mono text-xl font-black uppercase tracking-tight text-navy">
                    @{firstName}
                  </span>
                )}
                <button
                  onClick={onLogout}
                  className="focus-ring shrink-0 font-body text-sm font-medium text-navy-soft transition-colors hover:text-navy"
                >
                  Log out
                </button>
              </div>
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
        {!user && (
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
                    {isExpired ? "Plan expired" : "Your shop is live"}
                  </p>
                  <h2 className="mt-1 font-display text-2xl text-white">
                    {isExpired
                      ? "Renew your plan to keep selling"
                      : "Manage your listings and orders"}
                  </h2>
                  {expiringSoon && !isExpired && (
                    <p className="mt-2 max-w-md font-body text-sm text-red-300">
                      Your plan expires in {daysLeft} day{daysLeft === 1 ? "" : "s"}.
                    </p>
                  )}
                </div>
                <Link
                  href={isExpired ? "/dashboard/plans" : `/shop/${shopId}`}
                  className="focus-ring whitespace-nowrap bg-blue px-6 py-3 text-center font-body text-sm font-medium text-white transition-colors hover:bg-blue-dark"
                >
                  {isExpired ? "Renew now" : "Go to my shop"}
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
              <a
                href="/dashboard/shop/new"
                className="focus-ring whitespace-nowrap border border-blue px-4 py-2 font-body text-sm font-medium text-blue transition-colors hover:bg-blue hover:text-white"
              >
                + List a product
              </a>
            )}
          </div>

          {/* Category filter — single scrollable row, sticks just below
              the header once you scroll past it */}
          <div className="sticky top-[73px] z-10 -mx-6 mt-6 overflow-x-auto bg-paper px-6 py-3 md:-mx-10 md:px-10">
            <div className="flex w-max gap-2.5">
              {categoryFilters.map((category) => {
                const isActive = category === activeCategory;
                return (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`focus-ring shrink-0 whitespace-nowrap border px-4 py-2 font-body text-sm transition-colors ${
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
          </div>

          {/* Product grid */}
          {productsLoading ? (
            <p className="mt-12 font-body text-sm text-navy-soft">Loading products...</p>
          ) : visibleProducts.length === 0 ? (
            <p className="mt-12 font-body text-sm text-navy-soft">
              No products listed yet. Check back soon.
            </p>
          ) : (
            <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {visibleProducts.map((product) => (
                <div
                  key={product.id}
                  className="group block border border-line bg-paper transition-colors hover:border-blue"
                >
                  <Link href={`/product/${product.id}`} onClick={saveScrollState}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="h-40 w-full object-cover sm:h-48"
                    />
                  </Link>
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-body text-xs text-navy-soft">
                        {product.category}
                      </p>
                      {product.shop_name && (
                        <Link
                          href={`/shop/${product.shop_id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="focus-ring shrink-0 truncate font-body text-xs font-bold uppercase text-navy-soft underline hover:text-blue"
                        >
                          {product.shop_name}
                        </Link>
                      )}
                    </div>
                    <Link href={`/product/${product.id}`} onClick={saveScrollState}>
                      <h3 className="mt-1 truncate font-display text-base text-navy hover:text-blue">
                        {product.name}
                      </h3>
                    </Link>
                    <p className="mt-2 font-body text-sm font-medium text-navy">
                      ₦{product.price.toLocaleString()}
                    </p>
                    <button
                      type="button"
                      onClick={() => onQuickAddToCart(product)}
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

      <BottomNav user={user} cartCount={cartCount} />
    </main>
  );
}

function BottomNav({
  user,
  cartCount,
}: {
  user: User | null;
  cartCount: number;
}) {
  const pathname = usePathname();

  const items = [
    {
      href: "/dashboard",
      label: "Home",
      isActive: pathname === "/dashboard",
      icon: (
        <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
          <path
            d="M2.5 8.5 9 3l6.5 5.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M4 7.5V15h10V7.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      href: "/cart",
      label: "Wishlist",
      isActive: pathname === "/cart",
      badge: cartCount > 0 ? (cartCount > 99 ? "99+" : cartCount) : null,
      icon: (
        <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
          <path
            d="M9 15.5s-6-3.7-6-8.2C3 4.8 4.8 3 7 3c1.2 0 2.3.6 3 1.5C10.7 3.6 11.8 3 13 3c2.2 0 4 1.8 4 4.3 0 4.5-6 8.2-6 8.2Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    ...(user
      ? [
          {
            href: "/dashboard/shop",
            label: "Account",
            isActive: pathname === "/dashboard/shop",
            badge: null as string | number | null,
            icon: (
              <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M3.5 15c0-3 2.5-5 5.5-5s5.5 2 5.5 5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            ),
          },
        ]
      : []),
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-content items-stretch justify-around">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-label={
              item.label === "Wishlist"
                ? `Wishlist, ${cartCount} item${cartCount === 1 ? "" : "s"}`
                : item.label
            }
            className={`focus-ring relative flex flex-1 flex-col items-center gap-1 py-2.5 font-body text-[11px] transition-colors ${
              item.isActive
                ? "text-blue"
                : "text-navy-soft hover:text-navy"
            }`}
          >
            <span className="relative">
              {item.icon}
              {item.badge && (
                <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center bg-blue px-1 font-body text-[10px] font-medium leading-none text-white">
                  {item.badge}
                </span>
              )}
            </span>
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
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
