"use client";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import Image from "next/image";
import type { Product, ProductVariant } from "@/app/models/product";
import { useToast } from "@/app/private/toast/ToastContext";

export default function AdminProductsPage() {
  const { push } = useToast();
  // Search / list state
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [hasMore, setHasMore] = useState(false);

  // Form + helpers
  const [useUploadStub, setUseUploadStub] = useState(false);
  const dragFrom = useRef<number | null>(null);

  function defaultForm() {
    return {
      id: undefined as string | undefined,
      name: "",
      description: "",
      stock: 0,
      price: undefined as number | undefined,
      sku: "",
      active: true,
      archived: false,
      isFeatured: false,
      photos: [] as string[],
      mainPhotoIndex: 0,
      variants: [] as ProductVariant[],
    };
  }

  const [form, setForm] = useState<{
    id?: string;
    name: string;
    description?: string;
    stock: number;
    price?: number;
    sku?: string;
    active: boolean;
    archived: boolean;
    isFeatured: boolean;
    photos: string[];
    mainPhotoIndex: number;
    variants: ProductVariant[];
  }>(defaultForm());

  const load = useCallback(
    async (newPage = page) => {
      setLoading(true);
      try {
        const usp = new URLSearchParams();
        if (q) usp.set("q", q);
        usp.set("all", "1");
        usp.set("page", String(newPage));
        usp.set("limit", String(limit));
        const res = await fetch(`/api/products?${usp.toString()}`, {
          cache: "no-store",
        });
        const json = (await res.json()) as {
          items?: Product[];
          page?: number;
          hasMore?: boolean;
        };
        setItems(Array.isArray(json.items) ? json.items : []);
        setPage(json.page || newPage);
        setHasMore(json.hasMore === true);
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Failed to load products";
        push({ message, variant: "error" });
      } finally {
        setLoading(false);
      }
    },
    [push, q, limit, page]
  );

  // Auth gate (simple client-side check)
  useEffect(() => {
    void fetch("/api/auth/me", { cache: "no-store", credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        if (j?.user?.type !== "admin")
          window.location.href = "/private/handover";
      })
      .catch(() => (window.location.href = "/private/handover"));
  }, []);

  // Initial load
  useEffect(() => {
    void load();
  }, [load]);

  const editing = Boolean(form.id);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (submitting) return; // guard double submit
    setSubmitting(true);
    const payload = { ...form };
    try {
      const res = await fetch("/api/products", {
        method: editing ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        const message = j.error || "Operation failed";
        setError(message);
        push({ message, variant: "error" });
        setSubmitting(false);
        return;
      }
      setForm(defaultForm());
      await load();
      push({
        message: editing ? "Product updated" : "Product created",
        variant: "success",
      });
    } catch {
      const message = "Network error while saving";
      setError(message);
      push({ message, variant: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  function edit(p: Product) {
    setForm({
      id: p.id,
      name: p.name,
      description: p.description || "",
      stock: p.stock,
      price: p.price,
      sku: p.sku || "",
      active: p.active !== false,
      archived: p.archived === true,
      isFeatured: p.isFeatured === true,
      photos: p.photos || [],
      mainPhotoIndex:
        typeof p.mainPhotoIndex === "number" ? p.mainPhotoIndex : 0,
      variants: p.variants ? [...p.variants] : [],
    });
  }

  async function remove(id: string) {
    if (!confirm("Delete this product?")) return;
    try {
      const res = await fetch(`/api/products?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        const message = j.error || "Failed to delete product";
        push({ message, variant: "error" });
        return;
      }
      await load();
      push({ message: "Product deleted", variant: "success" });
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Network error while deleting";
      push({ message, variant: "error" });
    }
  }

  const filtered = useMemo(() => items, [items]);

  function addVariant() {
    setForm((f) => ({
      ...f,
      variants: [
        ...f.variants,
        {
          id: `var_${Math.random().toString(36).slice(2, 8)}`,
          name: "",
          active: true,
        },
      ],
    }));
  }

  function updateVariant(id: string, patch: Partial<ProductVariant>) {
    setForm((f) => ({
      ...f,
      variants: f.variants.map((v) => (v.id === id ? { ...v, ...patch } : v)),
    }));
  }

  function removeVariant(id: string) {
    setForm((f) => ({ ...f, variants: f.variants.filter((v) => v.id !== id) }));
  }

  function reorderPhoto(from: number, to: number) {
    if (from === to) return;
    setForm((f) => {
      const photos = [...f.photos];
      const [m] = photos.splice(from, 1);
      photos.splice(to, 0, m);
      let mainPhotoIndex = f.mainPhotoIndex;
      if (from === f.mainPhotoIndex) mainPhotoIndex = to;
      else if (from < f.mainPhotoIndex && to >= f.mainPhotoIndex)
        mainPhotoIndex -= 1;
      else if (from > f.mainPhotoIndex && to <= f.mainPhotoIndex)
        mainPhotoIndex += 1;
      if (mainPhotoIndex < 0) mainPhotoIndex = 0;
      if (mainPhotoIndex >= photos.length) mainPhotoIndex = photos.length - 1;
      return { ...f, photos, mainPhotoIndex };
    });
  }

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-bold">Products</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Create, edit, and manage store products.
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4 md:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void load(1);
              }}
              placeholder="Search by name or description"
              className="rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-accent w-full max-w-xs"
            />
            <button
              onClick={() => void load(1)}
              className="text-sm rounded-full border border-border px-3 py-1 hover:bg-muted"
            >
              Search
            </button>
          </div>
          <div className="mt-3 grid gap-3">
            {loading && (
              <div className="text-sm text-muted-foreground">Loading…</div>
            )}
            {!loading && filtered.length === 0 ? (
              <div className="text-sm text-muted-foreground">No products.</div>
            ) : (
              filtered.map((p) => {
                const mainSrc = p.photos[p.mainPhotoIndex || 0];
                return (
                  <div
                    key={p.id}
                    className="rounded-xl border border-border bg-background p-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {mainSrc ? (
                        <div className="relative h-14 w-14 rounded-md overflow-hidden border border-border bg-muted/40 flex-none">
                          <Image
                            src={mainSrc}
                            alt="thumb"
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-14 w-14 rounded-md border border-border bg-muted/20 flex items-center justify-center text-xs text-muted-foreground flex-none">
                          No photo
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-medium truncate flex items-center gap-2">
                          {p.name}
                          {p.archived ? (
                            <span className="text-[10px] rounded-full bg-red-600/10 text-red-600 px-2 py-0.5 uppercase tracking-wide">
                              Archived
                            </span>
                          ) : p.active === false ? (
                            <span className="text-[10px] rounded-full bg-yellow-600/10 text-yellow-700 px-2 py-0.5 uppercase tracking-wide">
                              Hidden
                            </span>
                          ) : p.isFeatured ? (
                            <span className="text-[10px] rounded-full bg-emerald-600/10 text-emerald-700 px-2 py-0.5 uppercase tracking-wide">
                              Featured
                            </span>
                          ) : null}
                        </div>
                        <div className="text-xs text-muted-foreground truncate max-w-[40ch]">
                          {p.description || ""}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 flex gap-2">
                          <span>Stock: {p.stock}</span>
                          {typeof p.price === "number" && (
                            <span>Price: {p.price}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => edit(p)}
                        className="text-xs rounded-full border border-border px-3 py-1 hover:bg-muted"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => void remove(p.id)}
                        className="text-xs rounded-full border border-border px-3 py-1 hover:bg-muted"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })
            )}
            <div className="flex items-center justify-between mt-4">
              <div className="text-xs text-muted-foreground">
                Page {page} {hasMore ? "(more)" : "(end)"}
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => page > 1 && void load(page - 1)}
                  className="text-xs rounded-full border border-border px-3 py-1 disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  disabled={!hasMore}
                  onClick={() => hasMore && void load(page + 1)}
                  className="text-xs rounded-full border border-border px-3 py-1 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-base font-semibold">
            {editing ? "Edit" : "Create"} Product
          </h2>
          <form onSubmit={submit} className="mt-3 grid gap-3">
            <div>
              <label className="block text-sm font-medium">Name</label>
              <input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Description</label>
              <textarea
                value={form.description || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                rows={4}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium">Stock</label>
                <input
                  type="number"
                  min={0}
                  value={form.stock}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      stock: Math.max(
                        0,
                        Math.floor(Number(e.target.value) || 0)
                      ),
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Base Price</label>
                <input
                  type="number"
                  min={0}
                  value={typeof form.price === "number" ? form.price : ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      price:
                        e.target.value === ""
                          ? undefined
                          : Math.max(0, Number(e.target.value)),
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium">SKU</label>
                <input
                  value={form.sku || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sku: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
                />
              </div>
              <div className="flex flex-col justify-end">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-2">
                  <label className="flex items-center gap-2 text-sm whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, active: e.target.checked }))
                      }
                    />
                    <span>Active</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={form.archived}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, archived: e.target.checked }))
                      }
                    />
                    <span>Archived</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={form.isFeatured}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, isFeatured: e.target.checked }))
                      }
                    />
                    <span>Featured</span>
                  </label>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium">Photos</label>
              <div className="mt-1 grid grid-cols-3 gap-2">
                {(form.photos || []).map((src, i) => (
                  <div
                    key={i}
                    draggable
                    onDragStart={() => {
                      dragFrom.current = i;
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                    }}
                    onDrop={() => {
                      if (dragFrom.current !== null) {
                        reorderPhoto(dragFrom.current, i);
                        dragFrom.current = null;
                      }
                    }}
                    className={`relative h-24 rounded-md overflow-hidden border ${
                      i === form.mainPhotoIndex
                        ? "border-accent"
                        : "border-border"
                    }`}
                  >
                    <Image
                      src={src}
                      alt={`photo-${i}`}
                      fill
                      sizes="120px"
                      className="object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 p-1 flex items-center justify-between gap-1 bg-black/40">
                      <button
                        type="button"
                        onClick={() =>
                          setForm((f) => ({ ...f, mainPhotoIndex: i }))
                        }
                        className={`text-[10px] rounded-full px-2 py-0.5 ${
                          i === form.mainPhotoIndex
                            ? "bg-accent text-accent-foreground"
                            : "bg-white/80"
                        }`}
                        title="Set as main"
                      >
                        {i === form.mainPhotoIndex ? "Main" : "Make main"}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            photos: f.photos.filter((_, idx) => idx !== i),
                            mainPhotoIndex:
                              f.mainPhotoIndex === i
                                ? 0
                                : f.mainPhotoIndex > i
                                ? f.mainPhotoIndex - 1
                                : f.mainPhotoIndex,
                          }))
                        }
                        className="text-[10px] rounded-full px-2 py-0.5 bg-white/80"
                        title="Remove"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
                <label className="h-24 rounded-md border border-dashed border-border bg-muted/20 flex items-center justify-center text-xs text-muted-foreground cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        if (typeof reader.result === "string") {
                          if (useUploadStub) {
                            // Simulate remote object storage URL
                            const fakeUrl = `https://object.example/${Date.now()}_${Math.random()
                              .toString(36)
                              .slice(2, 8)}.jpg`;
                            setForm((f) => ({
                              ...f,
                              photos: [...f.photos, fakeUrl],
                            }));
                          } else {
                            setForm((f) => ({
                              ...f,
                              photos: [
                                ...(f.photos || []),
                                reader.result as string,
                              ],
                            }));
                          }
                        }
                      };
                      reader.readAsDataURL(file);
                      e.currentTarget.value = "";
                    }}
                  />
                  + Add photo
                </label>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useUploadStub}
                    onChange={(e) => setUseUploadStub(e.target.checked)}
                  />
                  <span>Use upload stub (simulate remote URLs)</span>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium">Variants</label>
              <div className="mt-1 space-y-2">
                {form.variants.map((v) => (
                  <div
                    key={v.id}
                    className="rounded-md border border-border p-2 flex flex-col gap-2"
                  >
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        placeholder="Name"
                        value={v.name}
                        onChange={(e) =>
                          updateVariant(v.id, { name: e.target.value })
                        }
                        className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                      />
                      <input
                        type="number"
                        placeholder="Price Δ"
                        value={
                          typeof v.priceDelta === "number" ? v.priceDelta : ""
                        }
                        onChange={(e) =>
                          updateVariant(v.id, {
                            priceDelta:
                              e.target.value === ""
                                ? undefined
                                : Number(e.target.value),
                          })
                        }
                        className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                      />
                      <input
                        type="number"
                        placeholder="Stock"
                        value={typeof v.stock === "number" ? v.stock : ""}
                        onChange={(e) =>
                          updateVariant(v.id, {
                            stock:
                              e.target.value === ""
                                ? undefined
                                : Math.max(0, Number(e.target.value)),
                          })
                        }
                        className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1 text-[11px]">
                        <input
                          type="checkbox"
                          checked={v.active !== false}
                          onChange={(e) =>
                            updateVariant(v.id, { active: e.target.checked })
                          }
                        />
                        <span>Active</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => removeVariant(v.id)}
                        className="text-[11px] rounded-full border border-border px-2 py-0.5 hover:bg-muted"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addVariant}
                  className="text-xs rounded-full border border-border px-3 py-1 hover:bg-muted"
                >
                  + Add Variant
                </button>
              </div>
            </div>
            {error ? <div className="text-sm text-red-600">{error}</div> : null}
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-full bg-accent text-accent-foreground px-4 py-2 text-sm font-medium shadow disabled:opacity-50"
              >
                {submitting
                  ? editing
                    ? "Saving…"
                    : "Creating…"
                  : editing
                  ? "Save"
                  : "Create"}
              </button>
              {editing ? (
                <button
                  type="button"
                  onClick={() => setForm(defaultForm())}
                  className="text-sm rounded-full border border-border px-3 py-1 hover:bg-muted"
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
