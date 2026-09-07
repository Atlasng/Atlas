"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function CheckoutCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference");

  const [status, setStatus] = useState<"checking" | "success" | "error">("checking");
  const [error, setError] = useState("");
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!reference) {
      setStatus("error");
      setError("Missing payment reference.");
      return;
    }

    fetch(`/api/checkout/verify?reference=${encodeURIComponent(reference)}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) {
          setStatus("error");
          setError(json.error || "Payment could not be confirmed.");
          return;
        }
        setOrderId(json.orderId);
        setStatus("success");
        setTimeout(() => router.replace(`/orders/${json.orderId}`), 1200);
      })
      .catch(() => {
        setStatus("error");
        setError("Something went wrong confirming your payment.");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-ice px-6">
      <div className="w-full max-w-md border border-line bg-paper p-8 text-center md:p-10">
        <span className="font-display text-2xl tracking-tightest text-navy">Atlas</span>

        {status === "checking" && (
          <p className="mt-6 font-body text-sm text-navy-soft">Confirming your payment...</p>
        )}

        {status === "success" && (
          <>
            <p className="mt-6 font-body text-sm text-navy">Payment confirmed.</p>
            <p className="mt-1 font-body text-sm text-navy-soft">Taking you to your order...</p>
          </>
        )}

        {status === "error" && (
          <>
            <p className="mt-6 font-body text-sm text-red-700">{error}</p>
            <Link
              href="/cart"
              className="focus-ring mt-6 inline-block bg-blue px-6 py-3 font-body text-sm font-medium text-white transition-colors hover:bg-blue-dark"
            >
              Back to cart
            </Link>
          </>
        )}
      </div>
    </main>
  );
}

export default function CheckoutCallbackPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutCallbackContent />
    </Suspense>
  );
}
