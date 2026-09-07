"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MAX_IMAGES = 5;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB

const productCategories = [
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

type PickedImage = {
  file: File;
  previewUrl: string;
};

export default function NewProductPage() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [checking, setChecking] = useState(true);
  const [shopId, setShopId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState(productCategories[0]);
  const [images, setImages] = useState<PickedImage[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
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

      setShopId(shop.id);
      setChecking(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFilesSelected(fileList: FileList | null) {
    if (!fileList) return;
    setError("");

    const incoming = Array.from(fileList);
    const room = MAX_IMAGES - images.length;

    if (incoming.length > room) {
      setError(`You can only add ${MAX_IMAGES} images total.`);
    }

    const accepted: PickedImage[] = [];
    for (const file of incoming.slice(0, room)) {
      if (!file.type.startsWith("image/")) {
        setError(`${file.name} isn't an image.`);
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setError(`${file.name} is over 10MB.`);
        continue;
      }
      accepted.push({ file, previewUrl: URL.createObjectURL(file) });
    }

    setImages((prev) => [...prev, ...accepted]);

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeImage(index: number) {
    setImages((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[index].previewUrl);
      next.splice(index, 1);
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!shopId) return;
    if (!name.trim()) {
      setError("Give your product a name.");
      return;
    }
    const priceNumber = Number(price);
    if (!price || Number.isNaN(priceNumber) || priceNumber <= 0) {
      setError("Enter a valid price.");
      return;
    }
    if (images.length === 0) {
      setError("Add at least one photo.");
      return;
    }

    setSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      const imageUrls: string[] = [];

      for (let i = 0; i < images.length; i++) {
        setUploadStatus(`Uploading photo ${i + 1} of ${images.length}...`);
        const { file } = images[i];
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${user.id}/${Date.now()}-${i}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(path, file, { contentType: file.type });

        if (uploadError) {
          throw new Error(`Couldn't upload ${file.name}: ${uploadError.message}`);
        }

        const { data: publicUrlData } = supabase.storage
          .from("product-images")
          .getPublicUrl(path);

        imageUrls.push(publicUrlData.publicUrl);
      }

      setUploadStatus("Saving product...");

      const { error: insertError } = await supabase.from("products").insert({
        shop_id: shopId,
        name: name.trim(),
        description: description.trim() || null,
        price: priceNumber,
        category,
        images: imageUrls,
      });

      if (insertError) {
        throw new Error(insertError.message);
      }

      router.push("/dashboard/shop");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
      setUploadStatus("");
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

      <div className="mx-auto max-w-xl px-6 py-16 md:px-10">
        <h1 className="font-display text-3xl tracking-tightest text-navy md:text-4xl">
          List a product
        </h1>
        <p className="mt-2 font-body text-sm text-navy-soft">
          Up to {MAX_IMAGES} photos, 10MB max each.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="font-body text-sm font-medium text-navy">
              Photos ({images.length}/{MAX_IMAGES})
            </label>

            <div className="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-5">
              {images.map((img, i) => (
                <div key={img.previewUrl} className="group relative aspect-square border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.previewUrl}
                    alt={`Photo ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    aria-label="Remove photo"
                    className="focus-ring absolute right-1 top-1 flex h-6 w-6 items-center justify-center bg-navy/80 text-white"
                  >
                    ×
                  </button>
                </div>
              ))}

              {images.length < MAX_IMAGES && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="focus-ring flex aspect-square flex-col items-center justify-center gap-1 border border-dashed border-line bg-ice text-navy-soft transition-colors hover:border-blue hover:text-blue"
                >
                  <span className="text-2xl leading-none">+</span>
                  <span className="font-body text-xs">Add photo</span>
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFilesSelected(e.target.files)}
              className="hidden"
            />
          </div>

          <div>
            <label htmlFor="name" className="font-body text-sm font-medium text-navy">
              Product name
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="focus-ring mt-2 w-full border border-line bg-ice px-4 py-3 font-body text-sm text-navy"
            />
          </div>

          <div>
            <label htmlFor="description" className="font-body text-sm font-medium text-navy">
              Description
            </label>
            <textarea
              id="description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="focus-ring mt-2 w-full resize-none border border-line bg-ice px-4 py-3 font-body text-sm text-navy"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="price" className="font-body text-sm font-medium text-navy">
                Price (₦)
              </label>
              <input
                id="price"
                type="number"
                min="0"
                step="0.01"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="focus-ring mt-2 w-full border border-line bg-ice px-4 py-3 font-body text-sm text-navy"
              />
            </div>
            <div>
              <label htmlFor="category" className="font-body text-sm font-medium text-navy">
                Category
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="focus-ring mt-2 w-full border border-line bg-ice px-4 py-3 font-body text-sm text-navy"
              >
                {productCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="font-body text-sm text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="focus-ring w-full bg-blue px-5 py-3.5 font-body text-sm font-medium text-white transition-colors hover:bg-blue-dark disabled:opacity-60"
          >
            {submitting ? uploadStatus || "Saving..." : "List product"}
          </button>
        </form>
      </div>
    </main>
  );
}
