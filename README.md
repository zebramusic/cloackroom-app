## Cloackroom App

Next.js 15 + App Router + TypeScript (strict) + Tailwind CSS v4.

### Scripts

```bash
npm run dev      # Start development (Turbopack)
npm run build    # Production build
npm run start    # Run production server
npm run lint     # ESLint (flat config)
```

### Structure

- `app/` – Route segments & server/client components
- `public/` – Static assets
- `lib/` – Shared helpers (DB, auth, content, etc.)
- No traditional `tailwind.config.js`; uses Tailwind v4 inline theme in `globals.css`.

### Products Page Content Editing

Marketing copy for the Products page is editable without code changes:

1. Visit `/dashboard` (admin only).
2. Modify Hero (title, subtitle, intro) and upload a hero banner image.
3. Adjust headings: Featured, Why, Testimonials, FAQ, Values.
4. Edit the Values paragraph.
5. Save changes – live immediately on `/products`.

#### Hero Image Upload

- Endpoint: `POST /api/content/products/hero-upload` (multipart/form-data `file` field).
- Accepted types: PNG, JPG/JPEG, WEBP.
- Max size: 2MB.
- Stored at: `public/uploads/products-hero.(ext)`; previous file is replaced.
- Resulting URL saved into page content and rendered on `/products`.

### Content Persistence

- MongoDB collection: `pageContent`, document `_id: "products"`.
- If DB is unavailable (`getDb()` returns null), defaults are used and edits are ephemeral.

### Adding More Editable Sections

Extend `ProductsPageContent` in `lib/productsContent.ts`, update defaults, then expose new fields in:

- API route: `app/api/content/products/route.ts` (PATCH accepts new keys).
- Dashboard form: `app/dashboard/page.tsx`.
- Products page: `app/products/page.tsx`.

### Development Notes

- Server Components by default; add `"use client"` only when needed (state/effects).
- Use `next/image` for optimized images on public pages.
- Theme tokens via CSS variables in `globals.css` – prefer utility classes like `bg-background`.
- Imports: use path alias `@/`.

### Deployment

Standard Next.js build & deploy. Ensure environment variables for MongoDB/session are configured in production. Static hero image uploads persist with filesystem storage; for multi-instance or serverless deployments, consider migrating uploads to object storage (S3, GCS) and adjusting the upload route accordingly.

