"use client";
import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  photos: string[];
}

export default function PhotosGallery({ photos }: Props) {
  if (!photos || photos.length === 0) {
    return (
      <div className="rounded-xl border border-border p-4 bg-card">
        <h2 className="text-sm font-semibold mb-3 tracking-wide uppercase text-muted-foreground">
          Photos (0)
        </h2>
        <p className="text-sm text-muted-foreground italic">No photos</p>
      </div>
    );
  }
  return <Gallery photos={photos} />;
}

function Gallery({ photos }: { photos: string[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  const close = useCallback(() => {
    setOpenIndex(null);
    if (previouslyFocused.current) previouslyFocused.current.focus();
  }, []);

  const show = useCallback((idx: number) => {
    previouslyFocused.current = document.activeElement as HTMLElement;
    setOpenIndex(idx);
  }, []);

  // Keyboard navigation inside modal
  useEffect(() => {
    if (openIndex === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setOpenIndex((i) => (i === null ? null : (i + 1) % photos.length));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setOpenIndex((i) =>
          i === null ? null : (i - 1 + photos.length) % photos.length
        );
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIndex, photos.length, close]);

  useEffect(() => {
    if (openIndex === null) return;
    const root = dialogRef.current;
    if (!root) return;
    const first = root.querySelector<HTMLElement>("button, img");
    first?.focus();
    const originalOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = originalOverflow;
    };
  }, [openIndex]);

  return (
    <div className="rounded-xl border border-border p-4 bg-card flex-1 flex flex-col">
      <h2 className="text-sm font-semibold mb-3 tracking-wide uppercase text-muted-foreground">
        Photos ({photos.length})
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {photos.map((p, i) => (
          <li
            key={i}
            role="button"
            aria-label={`Open photo ${i + 1} of ${photos.length}`}
            tabIndex={0}
            onClick={() => show(i)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                show(i);
              }
            }}
            className="relative group border border-border rounded-lg overflow-hidden cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-accent/60"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p}
              alt={`Photo ${i + 1}`}
              loading="lazy"
              className="block w-full h-full object-cover aspect-[4/3] select-none"
              draggable={false}
            />
            <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 flex items-center justify-center text-[10px] text-white tracking-wide">
              VIEW
            </div>
          </li>
        ))}
      </ul>
      {openIndex !== null && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label={`Photo ${openIndex + 1} of ${photos.length}`}
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={close}
          />
          <div
            ref={dialogRef}
            className="relative max-w-[90vw] max-h-[90vh] flex flex-col gap-3"
          >
            <div className="flex items-center justify-between gap-4 text-white text-xs">
              <span className="font-medium tracking-wide">
                Photo {openIndex + 1} / {photos.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setOpenIndex((i) =>
                      i === null
                        ? null
                        : (i - 1 + photos.length) % photos.length
                    )
                  }
                  className="h-8 px-3 rounded-md bg-white/10 hover:bg-white/20 border border-white/20"
                  aria-label="Previous photo"
                >
                  ←
                </button>
                <button
                  onClick={() =>
                    setOpenIndex((i) =>
                      i === null ? null : (i + 1) % photos.length
                    )
                  }
                  className="h-8 px-3 rounded-md bg-white/10 hover:bg-white/20 border border-white/20"
                  aria-label="Next photo"
                >
                  →
                </button>
                <button
                  onClick={close}
                  className="h-8 px-3 rounded-md bg-white/10 hover:bg-white/20 border border-white/20"
                  aria-label="Close viewer"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="relative flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photos[openIndex]}
                alt={`Photo ${openIndex + 1}`}
                className="block max-h-[75vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
