## AI agent quickstart for this repo (cloackroom-app)

- Stack: Next.js 15 (App Router), React 19, TypeScript (strict), Tailwind CSS v4 via PostCSS. No custom server or API routes yet. File-based routing lives under `app/`.
- Primary workflows (package.json): `dev`/`build` use Turbopack; `start` runs the production server; `lint` runs ESLint flat config.
  - Run: npm run dev | build | start | lint

### Architecture and where things live

- Routing and shells
  - `app/layout.tsx`: Root layout. Imports `./globals.css`, registers fonts via `next/font/google` (Geist) and applies their `.variable` classes to `<body>`.
  - `app/page.tsx`: Home route (`/`). Server Component by default, uses `next/image` and Tailwind utilities.
- Styling
  - `app/globals.css`: Tailwind v4 with `@import "tailwindcss";`. Theme is driven by CSS variables (`--background`, `--foreground`) and an `@theme inline` block mapping tokens:
    - `--color-background`, `--color-foreground`, `--font-sans`, `--font-mono` → used by Tailwind utilities (e.g., `bg-background`, `text-foreground`, `font-sans`).
    - Dark mode via `@media (prefers-color-scheme: dark)` updates the variables.
- Assets: `public/*.svg` referenced by `/path.svg` and rendered via `<Image src="/..." />`.
- Config
  - `tsconfig.json`: strict, `paths` alias `@/* -> ./*`, `moduleResolution: bundler`, `jsx: preserve`. Prefer `@/...` imports for root-relative paths.
  - `eslint.config.mjs`: Flat config extending `next/core-web-vitals` + `next/typescript`; ignores common build artifacts.
  - `postcss.config.mjs`: Tailwind v4 via `@tailwindcss/postcss` plugin. No separate `tailwind.config` file (v4 style).
  - `next.config.ts`: currently default (no custom options).

### Conventions and gotchas (project-specific)

- Server Components by default in `app/`. Add `"use client"` only when a component needs state/effects/refs or browser APIs.
- Fonts: use `next/font` and pass `variable` class to a top element (as in `layout.tsx`). Map fonts to Tailwind tokens via `@theme inline` and use `font-sans`/`font-mono` utilities.
- Styling: use Tailwind utilities and the provided tokens (`bg-background`, `text-foreground`). Change theme by editing CSS vars in `globals.css` rather than hardcoding colors.
- Images: prefer `next/image` for assets in `public/`; provide `width`, `height`, and `alt`. With no `next.config.ts` image domains configured, keep images local unless you add `images.remotePatterns`.
- Imports: you can `import X from "@/app/..."` thanks to `paths` alias. Avoid long `../../..` chains.

### How to extend correctly

- New pages: create `app/<route>/page.tsx`. For nested routes, mirror folder structure. Provide optional SEO via `export const metadata: Metadata = { title: "..." }`.
- Route-level shell: add `app/<route>/layout.tsx` to scope layout and fonts to that subtree if needed.
- API routes (none yet): add under `app/api/<name>/route.ts` exporting HTTP verbs (`GET`, `POST`, ...) as async functions.

### Pointers to examples

- Fonts + tokens wiring: `app/layout.tsx` + `app/globals.css`.
- Tailwind + theming: `app/globals.css` (CSS vars + `@theme inline`).
- Image usage and links: `app/page.tsx`.
- Lint rules and ignores: `eslint.config.mjs`.

If anything here is unclear or you need additional conventions (e.g., testing setup, API patterns, or deployment details), call it out and I’ll refine this doc accordingly.
