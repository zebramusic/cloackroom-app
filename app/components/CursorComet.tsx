"use client";

import { useEffect, useRef } from "react";

const TRAIL_LENGTH = 6;
const DECAY_DELAY_MS = 60;
const DECAY_DURATION_MS = 220;

export default function CursorComet() {
  const dotRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const pointerRef = useRef({ x: -100, y: -100 });
  const trailRef = useRef(
    Array.from({ length: TRAIL_LENGTH }, () => ({ x: -100, y: -100 }))
  );
  const rafRef = useRef<number | null>(null);
  const lastMoveRef = useRef(0);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    if (prefersReducedMotion) {
      return;
    }

    function handlePointer(event: PointerEvent) {
      pointerRef.current.x = event.clientX;
      pointerRef.current.y = event.clientY;
      lastMoveRef.current = performance.now();
    }

    function handleLeave() {
      lastMoveRef.current = 0;
    }

    window.addEventListener("pointermove", handlePointer, { passive: true });
    window.addEventListener("pointerdown", handlePointer, { passive: true });
    window.addEventListener("pointerleave", handleLeave);
    window.addEventListener("blur", handleLeave);

    const animate = () => {
      const now = performance.now();
      const pointer = pointerRef.current;
      const trail = trailRef.current;

      trail[0].x += (pointer.x - trail[0].x) * 0.18;
      trail[0].y += (pointer.y - trail[0].y) * 0.18;

      for (let index = 1; index < trail.length; index += 1) {
        trail[index].x += (trail[index - 1].x - trail[index].x) * 0.3;
        trail[index].y += (trail[index - 1].y - trail[index].y) * 0.3;
      }

      let fade = 0;
      if (lastMoveRef.current) {
        const delta = now - lastMoveRef.current;
        if (delta <= DECAY_DELAY_MS) {
          fade = 1;
        } else {
          const progress = Math.min(
            1,
            (delta - DECAY_DELAY_MS) / Math.max(DECAY_DURATION_MS, 1)
          );
          fade = 1 - progress;
        }
      }

      for (let index = 0; index < trail.length; index += 1) {
        const dot = dotRefs.current[index];
        if (!dot) continue;
        const position = trail[index];
        const scale = 0.1 + (1 - index / trail.length) * 0.35;
        const opacity = fade * (1 - index / (trail.length * 1.5)) * 0.8;
        dot.style.transform = `translate3d(${position.x - 5}px, ${
          position.y - 5
        }px, 0) scale(${scale})`;
        dot.style.opacity = opacity.toFixed(3);
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("pointermove", handlePointer);
      window.removeEventListener("pointerdown", handlePointer);
      window.removeEventListener("pointerleave", handleLeave);
      window.removeEventListener("blur", handleLeave);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[2147483647] mix-blend-screen">
      {Array.from({ length: TRAIL_LENGTH }).map((_, index) => (
        <span
          key={index}
          ref={(node) => {
            dotRefs.current[index] = node;
          }}
          className="absolute h-[10px] w-[10px] rounded-full bg-blue-500/35 shadow-[0_0_14px_rgba(37,99,235,0.35)] blur-[1px] will-change-transform"
          style={{ opacity: 0 }}
        />
      ))}
    </div>
  );
}
