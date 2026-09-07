"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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

type NewImage = { file: File; previewUrl: string };

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const id = params.id as string;

  const [checking, setChecking] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState(productCategories[0]);
  const [size, setSize] = useState("");
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<NewImage[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const isFashion = category === "Fashion";
  const totalImageCount = existingImages.length + newImages.length;

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

      const { data: product } = await supabase
        .from("products")
        .select("name, description, price, category, images, size, shop_id")
        .eq("id", id)
        .maybeSingle();

      if (!product || product.shop_id !== shop.id) {
        setNotFound(true);
        setChecking(false);
        return;
      }

      setName(product.name);
      setDescription(product.description ?? "");
      setPrice(String(product.price));
      setCategory(product.category);
      setSize(product.size ?? "");
      setExistingImages(product.images ?? []);
      setChecking(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function handleFilesSelected(fileList: FileList | null) {
    if (!fileList) return;
    setError("");

    const incoming = Array.from(fileList);
    const room = MAX_IMAGES - totalImageCount;

    if (incoming.length > room) {
      setError(`You can only have ${MAX_IMAGES} images total.`);
    }

    const accepted: NewImage[] = [];
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

    setNewImages((prev) => [...prev, ...accepted]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeExisting(index: number) {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  }

  function removeNew(index: number) {
    setNewImages((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[index].previewUrl);
      next.splice(index, 1);
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);

    if (!name.trim()) {
      setError("Give your product a name.");
      return;
    }
    const priceNumber = Number(price);
    if (!price || Number.isNaN(priceNumber) || priceNumber <= 0) {
      setError("Enter a valid price.");
      return;
    }
    if (totalImageCount === 0) {
      setError("Keep at least one photo.");
      return;
    }
    if (isFashion && !size.trim()) {
      setError("Enter a size.");
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

      const uploadedUrls: string[] = [];
      for (let i = 0; i < newImages.length; i++) {
        const { file } = newImages[i];
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

        uploadedUrls.push(publicUrlData.publicUrl);
      }

      const { error: updateError } = await supabase
        .from("products")
        .update({
          name: name.trim(),
          description: description.trim() || null,
          price: priceNumber,
          category,
          size: isFashion ? size.trim() : null,
          images: [...existingImages, ...uploadedUrls],
        })
        .eq("id", id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      setNewImages([]);
      setExistingImages([...existingImages, ...uploadedUrls]);
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
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

  if (notFound) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ice px-6 text-center">
        <p className="font-body text-sm text-navy-soft">
          Product not found, or it doesn't belong to your shop.
        </p>
        <Link
          href="/dashboard/shop/products"
          className="focus-ring bg-blue px-6 py-3 font-body text-sm font-medium text-white transition-colors hover:bg-blue-dark"
        >
          Back to my products
        </Link>
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
            href="/dashboard/shop/products"
            className="focus-ring font-body text-sm font-medium text-navy-soft transition-colors hover:text-navy"
          >
            ← Back to my products
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-6 py-16 md:px-10">
        <h1 className="font-display text-3xl tracking-tightest text-navy md:text-4xl">
          Edit product
        </h1>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="font-body text-sm font-medium text-navy">
              Photos ({totalImageCount}/{MAX_IMAGES})
            </label>

            <div className="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-5">
              {existingImages.map((src, i) => (
                <div key={src} className="group relative aspect-square border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeExisting(i)}
                    aria-label="Remove photo"
                    className="focus-ring absolute right-1 top-1 flex h-6 w-6 items-center justify-center bg-navy/80 text-white"
                  >
                    ×
                  </button>
                </div>
              ))}
              {newImages.map((img, i) => (
                <div key={img.previewUrl} className="group relative aspect-square border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.previewUrl}
                    alt={`New photo ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeNew(i)}
                    aria-label="Remove photo"
                    className="focus-ring absolute right-1 top-1 flex h-6 w-6 items-center justify-center bg-navy/80 text-white"
                  >
                    ×
                  </button>
                </div>
              ))}

              {totalImageCount < MAX_IMAGES && (
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

          {isFashion && (
            <div>
              <label htmlFor="size" className="font-body text-sm font-medium text-navy">
                Size
              </label>
              <input
                id="size"
                type="text"
                required
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="e.g. M, 42, or One size"
                className="focus-ring mt-2 w-full border border-line bg-ice px-4 py-3 font-body text-sm text-navy placeholder:text-navy-soft/60"
              />
            </div>
          )}

          {error && <p className="font-body text-sm text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="focus-ring w-full bg-blue px-5 py-3.5 font-body text-sm font-medium text-white transition-colors hover:bg-blue-dark disabled:opacity-60"
          >
            {saving ? "Saving..." : saved ? "✓ Saved" : "Save changes"}
          </button>
        </form>
      </div>
    </main>
  );
}
