"use client";

import { Suspense, useEffect, useRef, useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  NIGERIAN_STATES,
  hasCompleteDeliveryPricing,
  type DeliveryPrices,
} from "@/lib/nigerian-states";

const MAX_LOGO_BYTES = 5 * 1024 * 1024; // 5MB

function ShopSettingsContent() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();
  const redirectedForDelivery = searchParams.get("reason") === "delivery-required";

  const [checking, setChecking] = useState(true);
  const [shopId, setShopId] = useState<string | null>(null);

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [address, setAddress] = useState("");
  const [prices, setPrices] = useState<DeliveryPrices>({});
  const [bulkPrice, setBulkPrice] = useState("");

  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace("/login");
        return;
      }

      const { data: shop } = await supabase
        .from("shops")
        .select("id, address, logo_url, delivery_prices")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!shop) {
        router.replace("/dashboard/open-shop");
        return;
      }

      setShopId(shop.id);
      setAddress(shop.address ?? "");
      setLogoUrl(shop.logo_url);
      setPrices((shop.delivery_prices as DeliveryPrices) ?? {});
      setChecking(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleLogoSelected(file: File | null) {
    setError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Profile picture must be an image.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setError("Profile picture is over 5MB.");
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  function updatePrice(state: string, value: string) {
    setPrices((prev) => {
      const next = { ...prev };
      if (value.trim() === "") {
        delete next[state];
      } else {
        const num = Number(value);
        if (!Number.isNaN(num)) next[state] = num;
      }
      return next;
    });
  }

  function applyBulkPrice() {
    const num = Number(bulkPrice);
    if (!bulkPrice || Number.isNaN(num) || num < 0) {
      setError("Enter a valid price to apply to every state.");
      return;
    }
    setError("");
    const next: DeliveryPrices = {};
    for (const state of NIGERIAN_STATES) next[state] = num;
    setPrices(next);
  }

  const deliveryComplete = hasCompleteDeliveryPricing(prices);
  const missingCount = NIGERIAN_STATES.filter(
    (s) => typeof prices[s] !== "number"
  ).length;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!shopId) return;

    if (!deliveryComplete) {
      setError(
        `Set a delivery price for every state before saving — ${missingCount} state${
          missingCount === 1 ? "" : "s"
        } still missing.`
      );
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      let newLogoUrl = logoUrl;
      if (logoFile) {
        const ext = logoFile.name.split(".").pop() || "jpg";
        const path = `${user.id}/logo-${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("shop-logos")
          .upload(path, logoFile, { contentType: logoFile.type });

        if (uploadError) {
          throw new Error(`Couldn't upload picture: ${uploadError.message}`);
        }

        const { data: publicUrlData } = supabase.storage
          .from("shop-logos")
          .getPublicUrl(path);
        newLogoUrl = publicUrlData.publicUrl;
      }

      const { error: updateError } = await supabase
        .from("shops")
        .update({
          address: address.trim() || null,
          logo_url: newLogoUrl,
          delivery_prices: prices,
        })
        .eq("id", shopId);

      if (updateError) throw new Error(updateError.message);

      setLogoUrl(newLogoUrl);
      setLogoFile(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ice">
        <p className="font-body text-sm text-navy-soft">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper">
      <header className="sticky top-0 z-20 border-b border-line bg-paper">
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

      <div className="mx-auto max-w-2xl px-6 py-16 md:px-10">
        <h1 className="font-display text-3xl tracking-tightest text-navy md:text-4xl">
          Shop settings
        </h1>
        <p className="mt-2 font-body text-sm text-navy-soft">
          Buyers see your address and delivery prices on your storefront.
          You need a complete delivery price list before you can list any
          products.
        </p>

        {redirectedForDelivery && (
          <div className="mt-6 border border-blue bg-ice px-4 py-3">
            <p className="font-body text-sm text-navy">
              Set a delivery price for every state to unlock product
              listing.
            </p>
          </div>
        )}

        {!deliveryComplete && (
          <div className="mt-6 border border-red-300 bg-red-50 px-4 py-3">
            <p className="font-body text-sm text-red-700">
              {missingCount} of {NIGERIAN_STATES.length} states still need a
              delivery price. You can't list products until every state has
              one.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-8">
          {/* Profile picture */}
          <div>
            <label className="font-body text-sm font-medium text-navy">
              Profile picture
            </label>
            <div className="mt-3 flex items-center gap-4">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-line bg-ice">
                {(logoPreview || logoUrl) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoPreview || logoUrl || ""}
                    alt="Shop profile"
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="focus-ring border border-blue px-4 py-2 font-body text-sm font-medium text-blue transition-colors hover:bg-blue hover:text-white"
              >
                {logoUrl || logoPreview ? "Change picture" : "Upload picture"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleLogoSelected(e.target.files?.[0] ?? null)}
                className="hidden"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label htmlFor="address" className="font-body text-sm font-medium text-navy">
              Shop address
            </label>
            <textarea
              id="address"
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street, area, city, state"
              className="focus-ring mt-2 w-full resize-none border border-line bg-ice px-4 py-3 font-body text-sm text-navy placeholder:text-navy-soft/60"
            />
          </div>

          {/* Delivery pricing */}
          <div>
            <label className="font-body text-sm font-medium text-navy">
              Delivery price by state (₦)
            </label>
            <p className="mt-1 font-body text-xs text-navy-soft">
              Set what you charge to deliver to each state. Enter 0 for
              anywhere delivery is free.
            </p>

            <div className="mt-3 flex gap-2">
              <input
                type="number"
                min="0"
                value={bulkPrice}
                onChange={(e) => setBulkPrice(e.target.value)}
                placeholder="Apply one price to all states"
                className="focus-ring flex-1 border border-line bg-ice px-4 py-2.5 font-body text-sm text-navy placeholder:text-navy-soft/60"
              />
              <button
                type="button"
                onClick={applyBulkPrice}
                className="focus-ring shrink-0 border border-blue px-4 py-2.5 font-body text-sm font-medium text-blue transition-colors hover:bg-blue hover:text-white"
              >
                Apply to all
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {NIGERIAN_STATES.map((state) => (
                <div key={state} className="flex items-center justify-between gap-3 border border-line bg-ice px-3 py-2">
                  <label htmlFor={`price-${state}`} className="font-body text-sm text-navy">
                    {state}
                  </label>
                  <input
                    id={`price-${state}`}
                    type="number"
                    min="0"
                    value={prices[state] ?? ""}
                    onChange={(e) => updatePrice(state, e.target.value)}
                    placeholder="₦"
                    className="focus-ring w-28 border border-line bg-paper px-2 py-1.5 text-right font-body text-sm text-navy placeholder:text-navy-soft/60"
                  />
                </div>
              ))}
            </div>
          </div>

          {error && <p className="font-body text-sm text-red-700">{error}</p>}
          {saved && <p className="font-body text-sm text-blue">✓ Saved.</p>}

          <button
            type="submit"
            disabled={saving}
            className="focus-ring w-full bg-blue px-5 py-3.5 font-body text-sm font-medium text-white transition-colors hover:bg-blue-dark disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save settings"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function ShopSettingsPage() {
  return (
    <Suspense fallback={null}>
      <ShopSettingsContent />
    </Suspense>
  );
}
