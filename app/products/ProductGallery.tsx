"use client";
import Image from "next/image";
import { useState, useCallback, useEffect } from "react";

interface ProductGalleryProps {
  photos: string[];
  initialIndex?: number;
  name: string;
}

export default function ProductGallery({
  photos,
  initialIndex = 0,
  name,
}: ProductGalleryProps) {
  const validPhotos = Array.isArray(photos) ? photos.filter(Boolean) : [];
  const [index, setIndex] = useState(() => {
    if (initialIndex < 0 || initialIndex >= validPhotos.length) return 0;
    return initialIndex;
  });

  // Keep index in range if photos change dynamically
  useEffect(() => {
    if (index >= validPhotos.length) setIndex(0);
  }, [validPhotos.length, index]);

  const select = useCallback((i: number) => {
    setIndex(i);
  }, []);

  if (validPhotos.length === 0) {
    return (
      <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden border border-border bg-muted flex items-center justify-center text-xs text-muted-foreground">
        No photos
      </div>
    );
  }

  const mainSrc = validPhotos[index];

  return (
    <div>
      <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden border border-border bg-muted">
        <Image
          src={mainSrc}
          alt={name}
          fill
          sizes="(max-width: 1024px) 100vw, (max-width: 1536px) 50vw, 1200px"
          className="object-cover transition-opacity"
          priority
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/40 via-background/0 to-transparent" />
      </div>
      {validPhotos.length > 1 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {validPhotos.map((src, i) => (
            <button
              key={i}
              type="button"
              data-skip-confirm="true"
              onClick={() => select(i)}
              aria-label={`Show photo ${i + 1}`}
              className={`group relative h-16 w-24 rounded-md overflow-hidden border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                i === index
                  ? "border-accent"
                  : "border-border hover:border-accent/60"
              }`}
            >
              <Image
                src={src}
                alt={`${name} thumbnail ${i + 1}`}
                fill
                sizes="120px"
                className="object-cover group-hover:scale-105 transition-transform"
              />
              {i === index ? (
                <span className="absolute inset-x-0 bottom-0 text-[10px] bg-black/50 text-white px-1 py-0.5 text-center">
                  Main
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
