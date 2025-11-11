/**
 * Variant structure for a product. Variants allow per-option stock and price adjustments.
 * priceDelta applies on top of the parent product price (can be negative). If omitted, 0.
 */
export interface ProductVariant {
  id: string; // unique within product (e.g. var_xxx)
  name: string; // display name (e.g. "Large", "Red")
  priceDelta?: number; // adjustment added to product base price
  stock?: number; // variant-specific stock; if omitted, fallback to product stock
  active?: boolean; // disabled variants are hidden publicly
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  photos: string[]; // data URLs or absolute/remote URLs
  mainPhotoIndex: number; // must be within [0, photos.length-1] if photos exist; default 0
  stock: number; // integer >= 0 (base stock fallback for variants)
  price?: number; // base price in smallest currency unit (e.g. cents) or plain number – business to decide
  sku?: string; // stock keeping unit identifier
  variants?: ProductVariant[]; // optional variant list
  active?: boolean; // whether visible on public pages
  archived?: boolean; // soft-deleted / hidden from all public listings even if active
  isFeatured?: boolean; // if true, appears in Featured Products section
  createdAt: number;
  updatedAt: number;
}
