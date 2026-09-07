"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  images: string[];
};

export default function MyProductsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
        return;
      }

      const { data: shop } = await supabase
        .from("shops")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!shop) {
        router.replace("/dashboard/open-shop");
        return;
      }

      const { data } = await supabase
        .from("products")
        .select("id, name, category, price, images")
        .eq("shop_id", shop.id)
        .order("created_at", { ascending: false });

      setProducts(data ?? []);
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
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-content items-center justify-between px-6 py-5 md:px-10">
          <span className="font-display text-2xl tracking-tightest text-navy">
            Atlas
          </span>
          <Link
            href="/dashboard/shop"
            className="focus-ring font-body text-sm font-medium text-navy-soft transition-colors hover:text-navy"
          >
            ← Back to my shop
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-content px-6 py-12 md:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="font-display text-3xl tracking-tightest text-navy md:text-4xl">
            My products
          </h1>
          <Link
            href="/dashboard/shop/new"
            className="focus-ring bg-blue px-5 py-3 font-body text-sm font-medium text-white transition-colors hover:bg-blue-dark"
          >
            + List a product
          </Link>
        </div>

        {products.length === 0 ? (
          <p className="mt-10 font-body text-sm text-navy-soft">
            You haven't listed any products yet.
          </p>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <div key={product.id} className="border border-line bg-paper">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="h-40 w-full object-cover sm:h-48"
                />
                <div className="p-4">
                  <p className="font-body text-xs text-navy-soft">{product.category}</p>
                  <h3 className="mt-1 font-display text-base text-navy">{product.name}</h3>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-body text-sm font-medium text-navy">
                      ₦{product.price.toLocaleString()}
                    </span>
                    <Link
                      href={`/dashboard/shop/products/${product.id}/edit`}
                      className="focus-ring font-body text-sm font-medium text-blue hover:text-blue-dark"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
