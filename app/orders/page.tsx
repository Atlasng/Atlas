"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Order = {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
};

export default function OrdersPage() {
  const router = useRouter();
  const supabase = createClient();
  const [orders, setOrders] = useState<Order[]>([]);
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

      const { data } = await supabase
        .from("orders")
        .select("id, status, total_amount, created_at")
        .order("created_at", { ascending: false });

      setOrders(data ?? []);
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
        <h1 className="font-display text-3xl tracking-tightest text-navy md:text-4xl">
          My orders
        </h1>

        {orders.length === 0 ? (
          <p className="mt-8 font-body text-sm text-navy-soft">
            You haven't placed any orders yet.{" "}
            <Link href="/dashboard" className="text-blue hover:text-blue-dark">
              Browse the marketplace
            </Link>
            .
          </p>
        ) : (
          <div className="mt-8 space-y-3">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="focus-ring flex items-center justify-between border border-line bg-paper p-4 transition-colors hover:border-blue"
              >
                <div>
                  <p className="font-body text-sm text-navy">
                    Order #{order.id.slice(0, 8)}
                  </p>
                  <p className="font-body text-xs text-navy-soft">
                    {new Date(order.created_at).toLocaleDateString("en-NG", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                    {" · "}
                    <span
                      className={order.status === "paid" ? "text-blue" : "text-navy-soft"}
                    >
                      {order.status === "paid" ? "Paid" : "Pending"}
                    </span>
                  </p>
                </div>
                <span className="font-display text-lg text-navy">
                  ₦{order.total_amount.toLocaleString()}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
