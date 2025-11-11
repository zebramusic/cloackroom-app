"use client";

import { useEffect } from "react";

function encodeSvg(svg: string) {
  return encodeURIComponent(svg)
    .replace(/%0A/g, "")
    .replace(/%20/g, " ")
    .replace(/%3D/g, "=")
    .replace(/%3A/g, ":")
    .replace(/%2F/g, "/");
}

const SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'>
  <path d='M16 2 L21.5 6.2 24 14 21 30 H11 L8 14 10.5 6.2 Z' fill='#13315c' stroke='#0b1d33' stroke-width='1.5' stroke-linejoin='round'/>
  <path d='M12.4 8.2 L16 11 19.6 8.2 20.7 12.5 19 28 H13 L11.3 12.5 Z' fill='#1d4f91'/>
  <path d='M16 11 L16 20' stroke='#0b1d33' stroke-width='1.3' stroke-linecap='round'/>
  <circle cx='16' cy='6.2' r='2.2' fill='#1d4f91' stroke='#0b1d33' stroke-width='1.3'/>
</svg>`;

const CURSOR_URL = `data:image/svg+xml,${encodeSvg(SVG)}`;

export default function CoatCursor() {
  useEffect(() => {
    const style = document.createElement("style");
    style.setAttribute("data-coat-cursor", "true");
    const base = `url("${CURSOR_URL}") 8 4, auto`;
    const interactive = `url("${CURSOR_URL}") 8 4, pointer`;
    style.textContent = `
      body { cursor: ${base}; }
      a, button, [role="button"], input[type="button"], input[type="submit"], input[type="reset"], label { cursor: ${interactive}; }
      input[type="text"], input[type="email"], input[type="password"], textarea { cursor: text; }
    `;
    document.head.appendChild(style);
    return () => {
      style.remove();
    };
  }, []);

  return null;
}
