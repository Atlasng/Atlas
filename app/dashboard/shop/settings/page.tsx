"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MAX_LOGO_BYTES = 5 * 1024 * 1024; // 5MB

export default function ShopSettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [checking, setChecking] = useState(true);
  const [shopId, setShopId] = useState<string | null>(null);

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [shopName, setShopName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

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
        .select("id, shop_name, phone, email, address, logo_url")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!shop) {
        router.replace("/dashboard/open-shop");
        return;
      }

      setShopId(shop.id);
      setShopName(shop.shop_name ?? "");
      setPhone(shop.phone ?? "");
      setEmail(shop.email ?? "");
      setAddress(shop.address ?? "");
      setLogoUrl(shop.logo_url);
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!shopId) return;

    if (!shopName.trim()) {
      setError("Shop name can't be empty.");
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
          shop_name: shopName.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
          address: address.trim() || null,
          logo_url: newLogoUrl,
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
          Buyers see this information on your storefront.
        </p>

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

          {/* Shop name */}
          <div>
            <label htmlFor="shopName" className="font-body text-sm font-medium text-navy">
              Shop name
            </label>
            <input
              id="shopName"
              type="text"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="Your shop's name"
              className="focus-ring mt-2 w-full border border-line bg-ice px-4 py-3 font-body text-sm text-navy placeholder:text-navy-soft/60"
            />
          </div>

          {/* WhatsApp number */}
          <div>
            <label htmlFor="whatsapp" className="font-body text-sm font-medium text-navy">
              WhatsApp number
            </label>
            <input
              id="whatsapp"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +234 801 234 5678"
              className="focus-ring mt-2 w-full border border-line bg-ice px-4 py-3 font-body text-sm text-navy placeholder:text-navy-soft/60"
            />
          </div>

          {/* Email address */}
          <div>
            <label htmlFor="email" className="font-body text-sm font-medium text-navy">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="focus-ring mt-2 w-full border border-line bg-ice px-4 py-3 font-body text-sm text-navy placeholder:text-navy-soft/60"
            />
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
