"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type {
  EventLocationItem,
  FeatureCard,
  HomePageContent,
  PortfolioCard,
  TrustedByItem,
} from "@/lib/homeContent";

type FlashType = "success" | "error";

interface FlashMessage {
  id: number;
  type: FlashType;
  message: string;
}

type SectionKey =
  | "hero"
  | "sectionHeadings"
  | "featureCards"
  | "portfolioCards"
  | "eventsLocations";

const SECTION_FIELDS: Record<SectionKey, (keyof HomePageContent)[]> = {
  hero: [
    "heroBadge",
    "heroBadgeRo",
    "heroTitle",
    "heroTitleRo",
    "heroSubtitle",
    "heroSubtitleRo",
    "heroIntro",
    "heroIntroRo",
    "heroImageUrl",
  ],
  sectionHeadings: [
    "featuresHeading",
    "featuresHeadingRo",
    "portfolioHeading",
    "portfolioHeadingRo",
    "partnersHeading",
    "partnersHeadingRo",
    "eventsHeading",
    "eventsHeadingRo",
  ],
  featureCards: ["featureCards"],
  portfolioCards: ["portfolioCards"],
  eventsLocations: ["eventsLocations"],
};

const SECTION_LABELS: Record<SectionKey, string> = {
  hero: "Hero",
  sectionHeadings: "Section headings",
  featureCards: "Feature cards",
  portfolioCards: "Portfolio cards",
  eventsLocations: "Events & locations",
};

type CollapsibleKey = SectionKey | "trustedBy";

interface State {
  loading: boolean;
  savingSection: SectionKey | null;
  error: string | null;
  content: HomePageContent | null;
  initial: HomePageContent | null;
  changed: Partial<HomePageContent>;
  flash: FlashMessage | null;
}

export default function HomeContentClient() {
  const [state, setState] = useState<State>({
    loading: true,
    savingSection: null,
    error: null,
    content: null,
    initial: null,
    changed: {},
    flash: null,
  });
  const heroFileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingHero, setUploadingHero] = useState(false);
  const flashTimerRef = useRef<number | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<
    Record<CollapsibleKey, boolean>
  >(() => ({
    hero: true,
    sectionHeadings: true,
    featureCards: true,
    portfolioCards: true,
    eventsLocations: true,
    trustedBy: true,
  }));

  useEffect(() => {
    let cancelled = false;
    fetch("/api/content/home", { cache: "no-store" })
      .then((r) => r.json())
      .then((json: HomePageContent) => {
        if (cancelled) return;
        const content = cloneContent(json);
        const initial = cloneContent(json);
        setState((s) => ({
          ...s,
          loading: false,
          content,
          initial,
        }));
      })
      .catch((e) => {
        if (cancelled) return;
        setState((s) => ({
          ...s,
          loading: false,
          error: e instanceof Error ? e.message : "Load failed",
        }));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) {
        window.clearTimeout(flashTimerRef.current);
      }
    };
  }, []);

  function pushFlash(type: FlashType, message: string) {
    const id = Date.now();
    setState((s) => ({ ...s, flash: { id, type, message } }));
    if (flashTimerRef.current) {
      window.clearTimeout(flashTimerRef.current);
    }
    flashTimerRef.current = window.setTimeout(() => {
      setState((s) => (s.flash?.id === id ? { ...s, flash: null } : s));
    }, 4000);
  }

  function toggleSection(section: CollapsibleKey) {
    setCollapsedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }

  function sectionHasChanges(section: SectionKey) {
    return SECTION_FIELDS[section].some((key) =>
      Object.prototype.hasOwnProperty.call(state.changed, key)
    );
  }

  function updateField<K extends keyof HomePageContent>(
    section: SectionKey,
    key: K,
    value: HomePageContent[K]
  ) {
    setState((s) => {
      if (!s.content) return s;
      const nextContent = { ...s.content, [key]: value };
      const nextChanged = { ...s.changed };
      const initialValue = s.initial ? s.initial[key] : undefined;
      if (valuesEqual(value, initialValue)) {
        delete nextChanged[key];
      } else {
        nextChanged[key] = value;
      }
      return {
        ...s,
        content: nextContent,
        changed: nextChanged,
      };
    });
  }

  function updateTrustedBy(items: TrustedByItem[]) {
    setState((s) => {
      if (!s.content) return s;
      const cloned = cloneValue(items);
      const nextContent: HomePageContent = {
        ...s.content,
        trustedBy: cloned,
      };
      const nextInitial = s.initial
        ? { ...s.initial, trustedBy: cloneValue(items) }
        : null;
      const nextChanged = { ...s.changed } as Partial<HomePageContent>;
      delete nextChanged.trustedBy;
      return {
        ...s,
        content: nextContent,
        initial: nextInitial,
        changed: nextChanged,
      };
    });
  }

  async function saveSection(section: SectionKey) {
    const keys = SECTION_FIELDS[section];
    const patch: Partial<HomePageContent> = {};
    const patchRecord = patch as Record<
      keyof HomePageContent,
      HomePageContent[keyof HomePageContent] | undefined
    >;
    const changedRecord = state.changed as Record<
      keyof HomePageContent,
      HomePageContent[keyof HomePageContent] | undefined
    >;
    keys.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(state.changed, key)) {
        patchRecord[key] = changedRecord[key];
      }
    });
    const patchKeys = Object.keys(patch) as (keyof HomePageContent)[];
    if (!patchKeys.length) return;
    setState((s) => ({ ...s, savingSection: section, error: null }));
    try {
      const res = await fetch("/api/content/home", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json) {
        const message =
          json && typeof json === "object" && "error" in json
            ? (json as { error?: string }).error
            : null;
        throw new Error(message || `Save failed (${res.status})`);
      }
      const payload = json as HomePageContent;
      setState((s) => {
        if (!s.content) {
          return {
            ...s,
            savingSection: null,
            content: cloneContent(payload),
            initial: cloneContent(payload),
            changed: {},
            error: null,
          };
        }
        const nextChanged = { ...s.changed };
        patchKeys.forEach((key) => {
          delete nextChanged[key];
        });
        const nextContent = { ...s.content };
        const nextInitial = s.initial ? { ...s.initial } : null;
        const contentRecord = nextContent as Record<
          keyof HomePageContent,
          HomePageContent[keyof HomePageContent]
        >;
        const initialRecord = nextInitial
          ? (nextInitial as Record<
              keyof HomePageContent,
              HomePageContent[keyof HomePageContent]
            >)
          : null;
        patchKeys.forEach((key) => {
          const serverValue = cloneValue(payload[key]);
          contentRecord[key] =
            serverValue as HomePageContent[keyof HomePageContent];
          if (initialRecord) {
            initialRecord[key] = cloneValue(
              payload[key]
            ) as HomePageContent[keyof HomePageContent];
          }
        });
        if (typeof payload.updatedAt === "number") {
          nextContent.updatedAt = payload.updatedAt;
          if (nextInitial) nextInitial.updatedAt = payload.updatedAt;
        }
        return {
          ...s,
          savingSection: null,
          content: nextContent,
          initial: nextInitial,
          changed: nextChanged,
          error: null,
        };
      });
      pushFlash("success", `${SECTION_LABELS[section]} saved.`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Save failed";
      setState((s) => ({ ...s, savingSection: null, error: msg }));
      pushFlash("error", msg);
    }
  }

  async function handleHeroUpload() {
    const file = heroFileInputRef.current?.files?.[0];
    if (!file) return;
    setUploadingHero(true);
    setState((s) => ({ ...s, error: null }));
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/content/home/hero-upload", {
        method: "POST",
        body: fd,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json || typeof json.url !== "string") {
        const message =
          json && typeof json === "object" && "error" in json
            ? (json as { error?: string }).error
            : null;
        throw new Error(message || `Upload failed (${res.status})`);
      }
      updateField("hero", "heroImageUrl", json.url);
      pushFlash(
        "success",
        "Hero image uploaded. Remember to save the hero section."
      );
      if (heroFileInputRef.current) {
        heroFileInputRef.current.value = "";
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      setState((s) => ({ ...s, error: msg }));
      pushFlash("error", msg);
    } finally {
      setUploadingHero(false);
    }
  }

  const c = state.content;
  return (
    <>
      {state.loading && (
        <div className="mt-6 text-sm text-muted-foreground">
          Loading content…
        </div>
      )}
      {state.error && (
        <div className="mt-6 text-sm text-red-600">{state.error}</div>
      )}
      {state.flash && (
        <div
          className={`mt-6 rounded-full border px-4 py-2 text-sm font-medium shadow-sm ${
            state.flash.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-red-500/30 bg-red-500/10 text-red-400"
          }`}
        >
          {state.flash.message}
        </div>
      )}
      {!state.loading && c && (
        <div className="mt-6 space-y-8">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void saveSection("hero");
            }}
            className="rounded-2xl border border-border bg-card p-5"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Hero</h2>
              <button
                type="button"
                onClick={() => toggleSection("hero")}
                className="inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground/80 transition hover:bg-muted"
                aria-expanded={!collapsedSections.hero}
              >
                {collapsedSections.hero ? "Expand" : "Collapse"}
              </button>
            </div>
            {!collapsedSections.hero && (
              <div className="mt-4 space-y-4">
                <Field label="Badge">
                  <input
                    value={c.heroBadge}
                    onChange={(e) =>
                      updateField("hero", "heroBadge", e.target.value)
                    }
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Badge (RO)">
                  <input
                    value={c.heroBadgeRo || ""}
                    onChange={(e) =>
                      updateField("hero", "heroBadgeRo", e.target.value)
                    }
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Title">
                  <textarea
                    value={c.heroTitle}
                    onChange={(e) =>
                      updateField("hero", "heroTitle", e.target.value)
                    }
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    rows={2}
                  />
                </Field>
                <Field label="Title (RO)">
                  <textarea
                    value={c.heroTitleRo || ""}
                    onChange={(e) =>
                      updateField("hero", "heroTitleRo", e.target.value)
                    }
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    rows={2}
                  />
                </Field>
                <Field label="Subtitle">
                  <textarea
                    value={c.heroSubtitle}
                    onChange={(e) =>
                      updateField("hero", "heroSubtitle", e.target.value)
                    }
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    rows={3}
                  />
                </Field>
                <Field label="Subtitle (RO)">
                  <textarea
                    value={c.heroSubtitleRo || ""}
                    onChange={(e) =>
                      updateField("hero", "heroSubtitleRo", e.target.value)
                    }
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    rows={3}
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
                      <div className="flex h-32 w-full items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
                        No image uploaded
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <input
                        ref={heroFileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        className="text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => void handleHeroUpload()}
                        disabled={
                          uploadingHero || state.savingSection === "hero"
                        }
                        className="text-xs rounded-full border border-border px-3 py-1 hover:bg-muted disabled:opacity-40"
                      >
                        {uploadingHero ? "Uploading…" : "Upload"}
                      </button>
                      {c.heroImageUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            updateField("hero", "heroImageUrl", "");
                            pushFlash(
                              "success",
                              "Hero image removed. Save the hero section to publish."
                            );
                          }}
                          className="text-xs rounded-full border border-border px-3 py-1 hover:bg-muted"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      PNG/JPG/WEBP up to 2MB. Upload replaces previous file.
                    </p>
                  </div>
                </Field>
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={
                      !sectionHasChanges("hero") ||
                      state.savingSection === "hero"
                    }
                    className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground disabled:opacity-40"
                  >
                    {state.savingSection === "hero" ? "Saving…" : "Save hero"}
                  </button>
                </div>
              </div>
            )}
          </form>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void saveSection("sectionHeadings");
            }}
            className="rounded-2xl border border-border bg-card p-5"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Section Headings</h2>
              <button
                type="button"
                onClick={() => toggleSection("sectionHeadings")}
                className="inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground/80 transition hover:bg-muted"
                aria-expanded={!collapsedSections.sectionHeadings}
              >
                {collapsedSections.sectionHeadings ? "Expand" : "Collapse"}
              </button>
            </div>
            {!collapsedSections.sectionHeadings && (
              <div className="mt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Features Heading">
                    <input
                      value={c.featuresHeading}
                      onChange={(e) =>
                        updateField(
                          "sectionHeadings",
                          "featuresHeading",
                          e.target.value
                        )
                      }
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    />
                  </Field>
                  <Field label="Features Heading (RO)">
                    <input
                      value={c.featuresHeadingRo || ""}
                      onChange={(e) =>
                        updateField(
                          "sectionHeadings",
                          "featuresHeadingRo",
                          e.target.value
                        )
                      }
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    />
                  </Field>
                  <Field label="Portfolio Heading">
                    <input
                      value={c.portfolioHeading}
                      onChange={(e) =>
                        updateField(
                          "sectionHeadings",
                          "portfolioHeading",
                          e.target.value
                        )
                      }
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    />
                  </Field>
                  <Field label="Portfolio Heading (RO)">
                    <input
                      value={c.portfolioHeadingRo || ""}
                      onChange={(e) =>
                        updateField(
                          "sectionHeadings",
                          "portfolioHeadingRo",
                          e.target.value
                        )
                      }
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    />
                  </Field>
                  <Field label="Partners Heading">
                    <input
                      value={c.partnersHeading}
                      onChange={(e) =>
                        updateField(
                          "sectionHeadings",
                          "partnersHeading",
                          e.target.value
                        )
                      }
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    />
                  </Field>
                  <Field label="Partners Heading (RO)">
                    <input
                      value={c.partnersHeadingRo || ""}
                      onChange={(e) =>
                        updateField(
                          "sectionHeadings",
                          "partnersHeadingRo",
                          e.target.value
                        )
                      }
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    />
                  </Field>
                  <Field label="Events & Locations Heading">
                    <input
                      value={c.eventsHeading}
                      onChange={(e) =>
                        updateField(
                          "sectionHeadings",
                          "eventsHeading",
                          e.target.value
                        )
                      }
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    />
                  </Field>
                  <Field label="Events & Locations Heading (RO)">
                    <input
                      value={c.eventsHeadingRo || ""}
                      onChange={(e) =>
                        updateField(
                          "sectionHeadings",
                          "eventsHeadingRo",
                          e.target.value
                        )
                      }
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    />
                  </Field>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={
                      !sectionHasChanges("sectionHeadings") ||
                      state.savingSection === "sectionHeadings"
                    }
                    className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground disabled:opacity-40"
                  >
                    {state.savingSection === "sectionHeadings"
                      ? "Saving…"
                      : "Save headings"}
                  </button>
                </div>
              </div>
            )}
          </form>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void saveSection("featureCards");
            }}
            className="rounded-2xl border border-border bg-card p-5"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Feature Cards</h2>
              <button
                type="button"
                onClick={() => toggleSection("featureCards")}
                className="inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground/80 transition hover:bg-muted"
                aria-expanded={!collapsedSections.featureCards}
              >
                {collapsedSections.featureCards ? "Expand" : "Collapse"}
              </button>
            </div>
            {!collapsedSections.featureCards && (
              <div className="mt-4 space-y-4">
                <p className="text-xs text-muted-foreground">
                  Update the tiles shown in the landing page features grid.
                </p>
                <FeatureCardsEditor
                  items={Array.isArray(c.featureCards) ? c.featureCards : []}
                  onChange={(items: FeatureCard[]) =>
                    updateField("featureCards", "featureCards", items)
                  }
                  onFlash={pushFlash}
                />
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={
                      !sectionHasChanges("featureCards") ||
                      state.savingSection === "featureCards"
                    }
                    className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground disabled:opacity-40"
                  >
                    {state.savingSection === "featureCards"
                      ? "Saving…"
                      : "Save feature cards"}
                  </button>
                </div>
              </div>
            )}
          </form>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void saveSection("portfolioCards");
            }}
            className="rounded-2xl border border-border bg-card p-5"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Portfolio Cards</h2>
              <button
                type="button"
                onClick={() => toggleSection("portfolioCards")}
                className="inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground/80 transition hover:bg-muted"
                aria-expanded={!collapsedSections.portfolioCards}
              >
                {collapsedSections.portfolioCards ? "Expand" : "Collapse"}
              </button>
            </div>
            {!collapsedSections.portfolioCards && (
              <div className="mt-4 space-y-4">
                <p className="text-xs text-muted-foreground">
                  Control the projects listed in the portfolio grid.
                </p>
                <PortfolioCardsEditor
                  items={
                    Array.isArray(c.portfolioCards) ? c.portfolioCards : []
                  }
                  onChange={(items: PortfolioCard[]) =>
                    updateField("portfolioCards", "portfolioCards", items)
                  }
                  onFlash={pushFlash}
                />
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={
                      !sectionHasChanges("portfolioCards") ||
                      state.savingSection === "portfolioCards"
                    }
                    className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground disabled:opacity-40"
                  >
                    {state.savingSection === "portfolioCards"
                      ? "Saving…"
                      : "Save portfolio cards"}
                  </button>
                </div>
              </div>
            )}
          </form>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void saveSection("eventsLocations");
            }}
            className="rounded-2xl border border-border bg-card p-5"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Events & Locations</h2>
              <button
                type="button"
                onClick={() => toggleSection("eventsLocations")}
                className="inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground/80 transition hover:bg-muted"
                aria-expanded={!collapsedSections.eventsLocations}
              >
                {collapsedSections.eventsLocations ? "Expand" : "Collapse"}
              </button>
            </div>
            {!collapsedSections.eventsLocations && (
              <div className="mt-4 space-y-4">
                <p className="text-xs text-muted-foreground">
                  Manage the text entries that appear under the Partners
                  section.
                </p>
                <EventsLocationsEditor
                  items={
                    Array.isArray(c.eventsLocations) ? c.eventsLocations : []
                  }
                  onChange={(items: EventLocationItem[]) =>
                    updateField("eventsLocations", "eventsLocations", items)
                  }
                  onFlash={pushFlash}
                />
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={
                      !sectionHasChanges("eventsLocations") ||
                      state.savingSection === "eventsLocations"
                    }
                    className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground disabled:opacity-40"
                  >
                    {state.savingSection === "eventsLocations"
                      ? "Saving…"
                      : "Save events & locations"}
                  </button>
                </div>
              </div>
            )}
          </form>

          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Trusted By Items</h2>
              <button
                type="button"
                onClick={() => toggleSection("trustedBy")}
                className="inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground/80 transition hover:bg-muted"
                aria-expanded={!collapsedSections.trustedBy}
              >
                {collapsedSections.trustedBy ? "Expand" : "Collapse"}
              </button>
            </div>
            {!collapsedSections.trustedBy && (
              <div className="mt-4 space-y-4">
                <p className="text-xs text-muted-foreground">
                  Manage the logos and text that appear in the &quot;Trusted by
                  teams&quot; strip under the hero.
                </p>
                <TrustedByEditor
                  items={(c.trustedBy as TrustedByItem[]) || []}
                  onChange={updateTrustedBy}
                  onFlash={pushFlash}
                />
                <p className="text-xs text-muted-foreground">
                  Item edits save automatically when you add, update, or remove
                  entries.
                </p>
              </div>
            )}
          </section>
          {state.initial?.updatedAt && (
            <div className="text-xs text-muted-foreground">
              Last updated {new Date(state.initial.updatedAt).toLocaleString()}
            </div>
          )}
        </div>
      )}
    </>
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

interface EventsLocationsEditorProps {
  items: EventLocationItem[];
  onChange: (items: EventLocationItem[]) => void;
  onFlash?: (type: FlashType, message: string) => void;
}

function EventsLocationsEditor({
  items,
  onChange,
  onFlash,
}: EventsLocationsEditorProps) {
  const [local, setLocal] = useState<EventLocationItem[]>(items);
  const shouldSync = useRef(false);

  useEffect(() => {
    shouldSync.current = false;
    setLocal(items);
  }, [items]);

  useEffect(() => {
    if (!shouldSync.current) return;
    shouldSync.current = false;
    onChange(local);
  }, [local, onChange]);

  function updateItem(id: string, patch: Partial<EventLocationItem>) {
    shouldSync.current = true;
    setLocal((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry))
    );
  }

  function removeItem(id: string) {
    shouldSync.current = true;
    setLocal((prev) => prev.filter((entry) => entry.id !== id));
    onFlash?.("success", "Entry removed. Save the events section to publish.");
  }

  function addItem() {
    const newItem: EventLocationItem = {
      id: generateId("event"),
      labelEn: "",
    };
    shouldSync.current = true;
    setLocal((prev) => [...prev, newItem]);
    onFlash?.("success", "Entry added. Save the events section to publish.");
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={addItem}
          className="rounded-full border border-border px-4 py-1.5 text-xs font-medium hover:bg-muted"
        >
          Add entry
        </button>
      </div>
      {local.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No entries yet. Add the first event or location.
        </p>
      ) : (
        <ul className="space-y-3">
          {local.map((entry, index) => (
            <li
              key={entry.id}
              className="space-y-3 rounded-xl border border-border bg-background p-4"
            >
              <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-muted-foreground">
                <span className="font-semibold">Item {index + 1}</span>
                <button
                  type="button"
                  onClick={() => removeItem(entry.id)}
                  className="rounded-full border border-border px-3 py-1 text-[10px] font-medium hover:bg-red-500/10 hover:text-red-600"
                >
                  Remove
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-xs font-medium sm:col-span-2">
                  <span>Text (EN)</span>
                  <input
                    value={entry.labelEn}
                    onChange={(e) =>
                      updateItem(entry.id, { labelEn: e.target.value })
                    }
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                </label>
                <label className="grid gap-1 text-xs font-medium sm:col-span-2">
                  <span>Text (RO)</span>
                  <input
                    value={entry.labelRo || ""}
                    onChange={(e) =>
                      updateItem(entry.id, { labelRo: e.target.value })
                    }
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                </label>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface TBEditorProps {
  items: TrustedByItem[];
  onChange: (items: TrustedByItem[]) => void;
  onFlash?: (type: FlashType, message: string) => void;
}

function TrustedByEditor({ items, onChange, onFlash }: TBEditorProps) {
  const [local, setLocal] = useState<TrustedByItem[]>(items);
  useEffect(() => {
    setLocal(items);
  }, [items]);

  function updateItem(id: string, patch: Partial<TrustedByItem>) {
    setLocal((prev) => {
      const next = prev.map((it) => (it.id === id ? { ...it, ...patch } : it));
      onChange(next);
      return next;
    });
  }
  function remove(id: string) {
    const next = local.filter((i) => i.id !== id);
    setLocal(next);
    onChange(next);
    onFlash?.("success", "Partner removed.");
  }

  async function uploadNew(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const file = (form.elements.namedItem("file") as HTMLInputElement | null)
      ?.files?.[0];
    if (!file) return;
    try {
      const res = await fetch("/api/content/home/trusted-upload", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok)
        throw new Error(json.error || `Upload failed (${res.status})`);
      const next = [...local, json];
      setLocal(next);
      onChange(next);
      form.reset();
      onFlash?.("success", "Partner added.");
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Upload failed";
      alert(message);
      onFlash?.("error", message);
    }
  }

  async function replaceImage(id: string, file: File | null) {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("id", id);
    try {
      const res = await fetch("/api/content/home/trusted-upload", {
        method: "PUT",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok)
        throw new Error(json.error || `Replace failed (${res.status})`);
      updateItem(id, { imageUrl: json.imageUrl || json.imageUrl });
      onFlash?.("success", "Partner image updated.");
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Replace failed";
      alert(message);
      onFlash?.("error", message);
    }
  }

  async function saveText(id: string, patch: Partial<TrustedByItem>) {
    try {
      const res = await fetch("/api/content/home/trusted-upload", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Save failed (${res.status})`);
      updateItem(id, json);
      onFlash?.("success", "Partner updated.");
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Save failed";
      alert(message);
      onFlash?.("error", message);
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={uploadNew}
        className="grid gap-3 rounded-xl border border-border p-4"
      >
        <h3 className="text-sm font-semibold">Add New Item</h3>
        <input
          type="text"
          name="nameEn"
          placeholder="Name (EN) *"
          required
          className="rounded-md border border-border bg-background px-3 py-2 text-xs"
        />
        <input
          type="text"
          name="nameRo"
          placeholder="Name (RO)"
          className="rounded-md border border-border bg-background px-3 py-2 text-xs"
        />
        <input
          type="text"
          name="blurbEn"
          placeholder="Blurb (EN)"
          className="rounded-md border border-border bg-background px-3 py-2 text-xs"
        />
        <input
          type="text"
          name="blurbRo"
          placeholder="Blurb (RO)"
          className="rounded-md border border-border bg-background px-3 py-2 text-xs"
        />
        <input
          type="file"
          name="file"
          accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
          className="text-xs"
          required
        />
        <button
          type="submit"
          className="justify-self-start rounded-full border border-border px-4 py-1.5 text-xs font-medium hover:bg-muted"
        >
          Upload & Add
        </button>
        <p className="text-[10px] text-muted-foreground">
          PNG/JPG/WEBP/SVG up to 1.5MB.
        </p>
      </form>
      {local.length === 0 && (
        <div className="text-xs text-muted-foreground">No items added yet.</div>
      )}
      <ul className="space-y-4">
        {local.map((it) => (
          <li
            key={it.id}
            className="rounded-xl border border-border p-4 grid gap-3"
          >
            <div className="flex items-center gap-3">
              {it.imageUrl ? (
                <div className="relative h-14 w-14 overflow-hidden rounded-md border border-border">
                  <Image
                    src={it.imageUrl}
                    alt={it.nameEn || "Trusted brand"}
                    fill
                    sizes="56px"
                    className="object-contain"
                  />
                </div>
              ) : (
                <div className="h-14 w-14 flex items-center justify-center rounded-md border border-dashed text-[10px] text-muted-foreground">
                  No image
                </div>
              )}
              <div className="flex-1">
                <input
                  defaultValue={it.nameEn}
                  onBlur={(e) =>
                    e.target.value !== it.nameEn &&
                    saveText(it.id, { nameEn: e.target.value })
                  }
                  className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs font-medium"
                />
                <input
                  defaultValue={it.nameRo || ""}
                  placeholder="Name (RO)"
                  onBlur={(e) =>
                    e.target.value !== (it.nameRo || "") &&
                    saveText(it.id, { nameRo: e.target.value })
                  }
                  className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
                />
              </div>
              <div className="flex flex-col items-end gap-2">
                <label className="text-[10px] font-medium">
                  Replace image
                  <input
                    type="file"
                    className="block text-[10px] mt-1"
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                    onChange={(e) =>
                      replaceImage(it.id, e.target.files?.[0] || null)
                    }
                  />
                </label>
                <button
                  type="button"
                  onClick={() => remove(it.id)}
                  className="text-[10px] rounded-full border border-border px-2 py-1 hover:bg-red-500/10 hover:text-red-600"
                >
                  Remove
                </button>
              </div>
            </div>
            <div className="grid gap-2">
              <input
                defaultValue={it.blurbEn || ""}
                placeholder="Blurb (EN)"
                onBlur={(e) =>
                  e.target.value !== (it.blurbEn || "") &&
                  saveText(it.id, { blurbEn: e.target.value })
                }
                className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
              />
              <input
                defaultValue={it.blurbRo || ""}
                placeholder="Blurb (RO)"
                onBlur={(e) =>
                  e.target.value !== (it.blurbRo || "") &&
                  saveText(it.id, { blurbRo: e.target.value })
                }
                className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function cloneContent(content: HomePageContent): HomePageContent {
  return cloneValue(content);
}

function cloneValue<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object" || a === null || b === null) return false;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

interface FeatureCardsEditorProps {
  items: FeatureCard[];
  onChange: (items: FeatureCard[]) => void;
  onFlash?: (type: FlashType, message: string) => void;
}

function FeatureCardsEditor({
  items,
  onChange,
  onFlash,
}: FeatureCardsEditorProps) {
  const [local, setLocal] = useState<FeatureCard[]>(items);

  useEffect(() => {
    setLocal(items);
  }, [items]);

  function updateCard(id: string, patch: Partial<FeatureCard>) {
    const next = local.map((card) =>
      card.id === id ? { ...card, ...patch } : card
    );
    setLocal(next);
    onChange(next);
  }

  function removeCard(id: string) {
    const next = local.filter((card) => card.id !== id);
    setLocal(next);
    onChange(next);
    onFlash?.(
      "success",
      "Feature card removed. Save the feature cards section to publish."
    );
  }

  function addCard() {
    const newCard: FeatureCard = {
      id: generateId("feature"),
      icon: "✨",
      titleEn: "",
      descriptionEn: "",
    };
    const next = [...local, newCard];
    setLocal(next);
    onChange(next);
    onFlash?.(
      "success",
      "Feature card added. Save the feature cards section to publish."
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={addCard}
          className="rounded-full border border-border px-4 py-1.5 text-xs font-medium hover:bg-muted"
        >
          Add feature card
        </button>
      </div>
      {local.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No cards configured yet. Add a feature card to get started.
        </p>
      ) : (
        <ul className="space-y-4">
          {local.map((card, index) => (
            <li
              key={card.id}
              className="space-y-3 rounded-xl border border-border bg-background p-4 shadow-sm"
            >
              <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-muted-foreground">
                <span className="font-semibold">Card {index + 1}</span>
                <button
                  type="button"
                  onClick={() => removeCard(card.id)}
                  className="rounded-full border border-border px-3 py-1 text-[10px] font-medium hover:bg-red-500/10 hover:text-red-600"
                >
                  Remove
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-xs font-medium">
                  <span>Icon</span>
                  <input
                    value={card.icon}
                    onChange={(e) =>
                      updateCard(card.id, { icon: e.target.value })
                    }
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                </label>
                <label className="grid gap-1 text-xs font-medium">
                  <span>Title (EN)</span>
                  <input
                    value={card.titleEn}
                    onChange={(e) =>
                      updateCard(card.id, { titleEn: e.target.value })
                    }
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                </label>
                <label className="grid gap-1 text-xs font-medium">
                  <span>Title (RO)</span>
                  <input
                    value={card.titleRo || ""}
                    onChange={(e) =>
                      updateCard(card.id, { titleRo: e.target.value })
                    }
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                </label>
                <label className="grid gap-1 text-xs font-medium sm:col-span-2">
                  <span>Description (EN)</span>
                  <textarea
                    value={card.descriptionEn}
                    onChange={(e) =>
                      updateCard(card.id, { descriptionEn: e.target.value })
                    }
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    rows={3}
                  />
                </label>
                <label className="grid gap-1 text-xs font-medium sm:col-span-2">
                  <span>Description (RO)</span>
                  <textarea
                    value={card.descriptionRo || ""}
                    onChange={(e) =>
                      updateCard(card.id, { descriptionRo: e.target.value })
                    }
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    rows={3}
                  />
                </label>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface PortfolioCardsEditorProps {
  items: PortfolioCard[];
  onChange: (items: PortfolioCard[]) => void;
  onFlash?: (type: FlashType, message: string) => void;
}

function PortfolioCardsEditor({
  items,
  onChange,
  onFlash,
}: PortfolioCardsEditorProps) {
  const [local, setLocal] = useState<PortfolioCard[]>(items);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  useEffect(() => {
    setLocal(items);
  }, [items]);

  function updateCard(id: string, patch: Partial<PortfolioCard>) {
    const next = local.map((card) =>
      card.id === id ? { ...card, ...patch } : card
    );
    setLocal(next);
    onChange(next);
  }

  function removeCard(id: string) {
    const next = local.filter((card) => card.id !== id);
    setLocal(next);
    onChange(next);
    onFlash?.(
      "success",
      "Portfolio card removed. Save the portfolio section to publish."
    );
  }

  function addCard() {
    const newCard: PortfolioCard = {
      id: generateId("portfolio"),
      titleEn: "",
      tagEn: "",
      descriptionEn: "",
    };
    const next = [...local, newCard];
    setLocal(next);
    onChange(next);
    onFlash?.(
      "success",
      "Portfolio card added. Save the portfolio section to publish."
    );
  }

  async function uploadImage(
    card: PortfolioCard,
    file: File,
    reset: () => void
  ) {
    setUploadingId(card.id);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("id", card.id);
      const res = await fetch("/api/content/home/portfolio-upload", {
        method: "POST",
        body: fd,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json || typeof json.url !== "string") {
        const message =
          json && typeof json === "object" && "error" in json
            ? (json as { error?: string }).error
            : null;
        throw new Error(message || `Upload failed (${res.status})`);
      }
      updateCard(card.id, { imageUrl: json.url });
      onFlash?.(
        "success",
        "Image uploaded. Save the portfolio section to publish."
      );
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Upload failed";
      alert(message);
      onFlash?.("error", message);
    } finally {
      setUploadingId(null);
      reset();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={addCard}
          className="rounded-full border border-border px-4 py-1.5 text-xs font-medium hover:bg-muted"
        >
          Add portfolio card
        </button>
      </div>
      {local.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No portfolio entries yet. Add a card to highlight a project.
        </p>
      ) : (
        <ul className="space-y-4">
          {local.map((card, index) => (
            <li
              key={card.id}
              className="space-y-3 rounded-xl border border-border bg-background p-4 shadow-sm"
            >
              <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-muted-foreground">
                <span className="font-semibold">Project {index + 1}</span>
                <button
                  type="button"
                  onClick={() => removeCard(card.id)}
                  className="rounded-full border border-border px-3 py-1 text-[10px] font-medium hover:bg-red-500/10 hover:text-red-600"
                >
                  Remove
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2 sm:col-span-2">
                  <span className="text-xs font-medium">Image</span>
                  {card.imageUrl ? (
                    <div className="relative h-36 w-full max-w-sm overflow-hidden rounded-md border border-border">
                      <Image
                        src={card.imageUrl}
                        alt={card.titleEn || card.titleRo || "Portfolio card"}
                        fill
                        sizes="(min-width: 640px) 320px, 100vw"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-36 w-full max-w-sm items-center justify-center rounded-md border border-dashed border-border text-[11px] text-muted-foreground">
                      No image uploaded
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <label className="rounded-full border border-border px-3 py-1 font-medium hover:bg-muted">
                      <span className="cursor-pointer">
                        {uploadingId === card.id ? "Uploading…" : "Choose file"}
                      </span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                        className="hidden"
                        disabled={uploadingId === card.id}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          void uploadImage(card, file, () => {
                            e.target.value = "";
                          });
                        }}
                      />
                    </label>
                    {card.imageUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          updateCard(card.id, { imageUrl: undefined });
                          onFlash?.(
                            "success",
                            "Image removed. Save the portfolio section to publish."
                          );
                        }}
                        className="rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-red-500/10 hover:text-red-600"
                      >
                        Remove image
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    PNG/JPG/WEBP/SVG up to 2.5MB. Save the section to apply
                    changes.
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function generateId(prefix: string): string {
  const random =
    globalThis.crypto?.randomUUID?.() ??
    Math.random().toString(36).slice(2, 10);
  return `${prefix}-${random}`;
}
