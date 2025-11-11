"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import type { ProductsPageContent } from "@/lib/productsContent";

interface State {
  loading: boolean;
  saving: boolean;
  error: string | null;
  content: ProductsPageContent | null;
  changed: Partial<ProductsPageContent>;
}

export default function DashboardContentPage() {
  const [state, setState] = useState<State>({
    loading: true,
    saving: false,
    error: null,
    content: null,
    changed: {},
  });

  // Fetch current content
  useEffect(() => {
    let cancelled = false;
    fetch("/api/content/products", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        setState((s) => ({ ...s, loading: false, content: json }));
      })
      .catch((e) => {
        if (cancelled) return;
        setState((s) => ({
          ...s,
          loading: false,
          error: e?.message || "Load failed",
        }));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function update<K extends keyof ProductsPageContent>(
    key: K,
    value: ProductsPageContent[K]
  ) {
    setState((s) => ({
      ...s,
      content: s.content ? { ...s.content, [key]: value } : s.content,
      changed: { ...s.changed, [key]: value },
    }));
  }

  async function save() {
    if (!Object.keys(state.changed).length) return;
    setState((s) => ({ ...s, saving: true, error: null }));
    try {
      const res = await fetch("/api/content/products", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(state.changed),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Save failed (${res.status})`);
      }
      const json = await res.json();
      setState((s) => ({ ...s, content: json, changed: {}, saving: false }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Save failed";
      setState((s) => ({ ...s, saving: false, error: msg }));
    }
  }

  const c = state.content;
  return (
    <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold">Products Page Content</h1>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="mt-3 flex items-center gap-2 text-xs">
        <a
          href="/dashboard/home"
          className="rounded-full border border-border px-3 py-1 hover:bg-muted"
        >
          Home CMS
        </a>
        <a
          href="/dashboard"
          className="rounded-full border border-border px-3 py-1 bg-accent text-accent-foreground"
        >
          Products CMS
        </a>
        <a
          href="/dashboard/products"
          className="rounded-full border border-border px-3 py-1 hover:bg-muted"
        >
          Products Admin
        </a>
        <a
          href="/private"
          className="rounded-full border border-border px-3 py-1 hover:bg-muted"
        >
          Operational
        </a>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Edit the marketing copy & hero image displayed on the public products
        page.
      </p>
      {state.loading && (
        <div className="mt-6 text-sm text-muted-foreground">
          Loading content…
        </div>
      )}
      {state.error && (
        <div className="mt-6 text-sm text-red-600">{state.error}</div>
      )}
      {!state.loading && c && (
        <div className="mt-6 space-y-8">
          {/* Hero Section */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold mb-4">Hero</h2>
            <Field label="Hero Title">
              <input
                value={c.heroTitle}
                onChange={(e) => update("heroTitle", e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Hero Title (RO)">
              <input
                value={c.heroTitleRo || ""}
                onChange={(e) => update("heroTitleRo", e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Hero Subtitle">
              <textarea
                value={c.heroSubtitle}
                onChange={(e) => update("heroSubtitle", e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                rows={2}
              />
            </Field>
            <Field label="Hero Subtitle (RO)">
              <textarea
                value={c.heroSubtitleRo || ""}
                onChange={(e) => update("heroSubtitleRo", e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                rows={2}
              />
            </Field>
            <Field label="Intro Paragraph">
              <textarea
                value={c.heroIntro}
                onChange={(e) => update("heroIntro", e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                rows={4}
              />
            </Field>
            <Field label="Intro Paragraph (RO)">
              <textarea
                value={c.heroIntroRo || ""}
                onChange={(e) => update("heroIntroRo", e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                rows={4}
              />
            </Field>
            <Field label="Hero Image (upload)">
              <div className="space-y-2">
                {c.heroImageUrl ? (
                  <div className="relative h-32 w-full overflow-hidden rounded-md border border-border">
                    <Image
                      src={c.heroImageUrl}
                      alt="Hero preview"
                      fill
                      sizes="(min-width: 640px) 400px, 100vw"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-32 w-full flex items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
                    No image uploaded
                  </div>
                )}
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const input =
                      (e.currentTarget.elements.namedItem(
                        "file"
                      ) as HTMLInputElement) || null;
                    const file = input?.files?.[0];
                    if (!file) return;
                    setState((s) => ({ ...s, saving: true, error: null }));
                    const fd = new FormData();
                    fd.append("file", file);
                    try {
                      const res = await fetch(
                        "/api/content/products/hero-upload",
                        { method: "POST", body: fd }
                      );
                      const json = await res.json();
                      if (!res.ok)
                        throw new Error(
                          json.error || `Upload failed (${res.status})`
                        );
                      update("heroImageUrl", json.url);
                      setState((s) => ({ ...s, saving: false }));
                      input.value = "";
                    } catch (err: unknown) {
                      const msg =
                        err instanceof Error ? err.message : "Upload failed";
                      setState((s) => ({ ...s, saving: false, error: msg }));
                    }
                  }}
                  className="flex items-center gap-3"
                >
                  <input
                    type="file"
                    name="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="text-xs"
                  />
                  <button
                    type="submit"
                    disabled={state.saving}
                    className="text-xs rounded-full border border-border px-3 py-1 hover:bg-muted disabled:opacity-40"
                  >
                    {state.saving ? "Uploading…" : "Upload"}
                  </button>
                  {c.heroImageUrl && (
                    <button
                      type="button"
                      onClick={() => update("heroImageUrl", "")}
                      className="text-xs rounded-full border border-border px-3 py-1 hover:bg-muted"
                    >
                      Remove
                    </button>
                  )}
                </form>
                <p className="text-[11px] text-muted-foreground">
                  PNG/JPG/WEBP up to 2MB. Upload replaces previous file.
                </p>
              </div>
            </Field>
          </section>
          {/* Headings Section */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold mb-4">Section Headings</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Featured Heading">
                <input
                  value={c.featuredHeading}
                  onChange={(e) => update("featuredHeading", e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Featured Heading (RO)">
                <input
                  value={c.featuredHeadingRo || ""}
                  onChange={(e) => update("featuredHeadingRo", e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Why Heading">
                <input
                  value={c.whyHeading}
                  onChange={(e) => update("whyHeading", e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Why Heading (RO)">
                <input
                  value={c.whyHeadingRo || ""}
                  onChange={(e) => update("whyHeadingRo", e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Testimonials Heading">
                <input
                  value={c.testimonialsHeading}
                  onChange={(e) =>
                    update("testimonialsHeading", e.target.value)
                  }
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Testimonials Heading (RO)">
                <input
                  value={c.testimonialsHeadingRo || ""}
                  onChange={(e) =>
                    update("testimonialsHeadingRo", e.target.value)
                  }
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </Field>
              <Field label="FAQ Heading">
                <input
                  value={c.faqHeading}
                  onChange={(e) => update("faqHeading", e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </Field>
              <Field label="FAQ Heading (RO)">
                <input
                  value={c.faqHeadingRo || ""}
                  onChange={(e) => update("faqHeadingRo", e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Values Heading">
                <input
                  value={c.valuesHeading}
                  onChange={(e) => update("valuesHeading", e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Values Heading (RO)">
                <input
                  value={c.valuesHeadingRo || ""}
                  onChange={(e) => update("valuesHeadingRo", e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </Field>
            </div>
          </section>
          {/* Values Paragraph */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold mb-4">Values Copy</h2>
            <Field label="Values Paragraph">
              <textarea
                value={c.valuesParagraph}
                onChange={(e) => update("valuesParagraph", e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                rows={4}
              />
            </Field>
            <Field label="Values Paragraph (RO)">
              <textarea
                value={c.valuesParagraphRo || ""}
                onChange={(e) => update("valuesParagraphRo", e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                rows={4}
              />
            </Field>
          </section>
          <div className="flex items-center gap-3 pt-2">
            <button
              disabled={!Object.keys(state.changed).length || state.saving}
              onClick={save}
              className="rounded-full bg-accent text-accent-foreground px-5 py-2 text-sm font-medium disabled:opacity-40"
            >
              {state.saving
                ? "Saving…"
                : Object.keys(state.changed).length
                ? "Save changes"
                : "Saved"}
            </button>
            {Object.keys(state.changed).length > 0 && !state.saving && (
              <button
                onClick={() =>
                  setState((s) => ({
                    ...s,
                    changed: {},
                    content: { ...(s.content as ProductsPageContent) },
                  }))
                }
                className="text-sm rounded-full border border-border px-4 py-2 hover:bg-muted"
              >
                Reset local edits
              </button>
            )}
            {state.content?.updatedAt && (
              <div className="text-xs text-muted-foreground">
                Last updated{" "}
                {new Date(state.content.updatedAt).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}
