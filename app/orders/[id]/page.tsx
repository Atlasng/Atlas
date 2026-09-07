"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type OrderItem = {
  id: string;
  product_name: string;
  price: number;
  quantity: number;
  is_digital: boolean;
};

type Order = {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
};

export default function OrderPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const id = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
        return;
      }

      const { data: orderData } = await supabase
        .from("orders")
        .select("id, status, total_amount, created_at")
        .eq("id", id)
        .maybeSingle();

      if (!orderData) {
        setLoading(false);
        return;
      }

      const { data: itemsData } = await supabase
        .from("order_items")
        .select("id, product_name, price, quantity, is_digital")
        .eq("order_id", id);

      setOrder(orderData);
      setItems(itemsData ?? []);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleDownload(orderItemId: string) {
    setError("");
    setDownloadingId(orderItemId);
    try {
      const res = await fetch(`/api/orders/download?orderItemId=${orderItemId}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Could not generate download link.");
        return;
      }
      window.open(json.url, "_blank");
    } finally {
      setDownloadingId(null);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ice">
        <p className="font-body text-sm text-navy-soft">Loading...</p>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ice px-6 text-center">
        <p className="font-body text-sm text-navy-soft">Order not found.</p>
        <Link
          href="/dashboard"
          className="focus-ring bg-blue px-6 py-3 font-body text-sm font-medium text-white transition-colors hover:bg-blue-dark"
        >
          Back to marketplace
        </Link>
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

      <div className="mx-auto max-w-2xl px-6 py-12 md:px-10">
        <p className="font-body text-sm font-medium text-blue">
          {order.status === "paid" ? "✓ Payment confirmed" : "Payment pending"}
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-tightest text-navy md:text-4xl">
          Order summary
        </h1>
        <p className="mt-2 font-body text-sm text-navy-soft">
          Placed {new Date(order.created_at).toLocaleDateString("en-NG", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>

        {error && <p className="mt-4 font-body text-sm text-red-700">{error}</p>}

        <div className="mt-8 space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between border border-line bg-paper p-4"
            >
              <div>
                <p className="font-body text-sm text-navy">{item.product_name}</p>
                <p className="font-body text-xs text-navy-soft">
                  Qty {item.quantity} · ₦{item.price.toLocaleString()} each
                </p>
              </div>
              {item.is_digital && order.status === "paid" && (
                <button
                  onClick={() => handleDownload(item.id)}
                  disabled={downloadingId === item.id}
                  className="focus-ring whitespace-nowrap border border-blue px-4 py-2 font-body text-sm font-medium text-blue transition-colors hover:bg-blue hover:text-white disabled:opacity-60"
                >
                  {downloadingId === item.id ? "Preparing..." : "Download"}
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-line pt-6">
          <span className="font-body text-sm text-navy-soft">Total</span>
          <span className="font-display text-2xl text-navy">
            ₦{order.total_amount.toLocaleString()}
          </span>
        </div>
      </div>
    </main>
  );
}
