"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5MB

export default function AccountSettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [checking, setChecking] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace("/login");
        return;
      }

      setUserId(session.user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, delivery_address")
        .eq("id", session.user.id)
        .maybeSingle();

      setFullName(profile?.full_name ?? "");
      setDeliveryAddress(profile?.delivery_address ?? "");
      setAvatarUrl(profile?.avatar_url ?? null);
      setChecking(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleAvatarSelected(file: File | null) {
    setError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Profile picture must be an image.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError("Profile picture is over 5MB.");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!userId) return;
    if (!fullName.trim()) {
      setError("Enter your name.");
      return;
    }

    setSaving(true);

    try {
      let newAvatarUrl = avatarUrl;
      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop() || "jpg";
        const path = `${userId}/avatar-${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, { contentType: avatarFile.type });

        if (uploadError) {
          throw new Error(`Couldn't upload picture: ${uploadError.message}`);
        }

        const { data: publicUrlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(path);
        newAvatarUrl = publicUrlData.publicUrl;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          avatar_url: newAvatarUrl,
          delivery_address: deliveryAddress.trim() || null,
        })
        .eq("id", userId);

      if (updateError) throw new Error(updateError.message);

      setAvatarUrl(newAvatarUrl);
      setAvatarFile(null);
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
          <Link href="/dashboard" className="font-display text-2xl tracking-tightest text-navy">
            Atlas
          </Link>
          <Link
            href="/account"
            className="focus-ring font-body text-sm font-medium text-navy-soft transition-colors hover:text-navy"
          >
            ← Back to my account
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-6 py-16 md:px-10">
        <h1 className="font-display text-3xl tracking-tightest text-navy md:text-4xl">
          Account settings
        </h1>
        <p className="mt-2 font-body text-sm text-navy-soft">
          This is your personal profile — separate from any shop you run.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label className="font-body text-sm font-medium text-navy">
              Profile picture
            </label>
            <div className="mt-3 flex items-center gap-4">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-line bg-ice">
                {(avatarPreview || avatarUrl) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarPreview || avatarUrl || ""}
                    alt="Your profile"
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="focus-ring border border-blue px-4 py-2 font-body text-sm font-medium text-blue transition-colors hover:bg-blue hover:text-white"
              >
                {avatarUrl || avatarPreview ? "Change picture" : "Upload picture"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleAvatarSelected(e.target.files?.[0] ?? null)}
                className="hidden"
              />
            </div>
          </div>

          <div>
            <label htmlFor="fullName" className="font-body text-sm font-medium text-navy">
              Full name
            </label>
            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="focus-ring mt-2 w-full border border-line bg-ice px-4 py-3 font-body text-sm text-navy"
            />
            <p className="mt-1 font-body text-xs text-navy-soft">
              This is the name shown on your reviews and comments.
            </p>
          </div>

          <div>
            <label htmlFor="deliveryAddress" className="font-body text-sm font-medium text-navy">
              Delivery address
            </label>
            <textarea
              id="deliveryAddress"
              rows={3}
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="Street, area, city, state"
              className="focus-ring mt-2 w-full resize-none border border-line bg-ice px-4 py-3 font-body text-sm text-navy placeholder:text-navy-soft/60"
            />
            <p className="mt-1 font-body text-xs text-navy-soft">
              Shared with a seller over WhatsApp when you reach out about a
              product, so they know where to deliver.
            </p>
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
