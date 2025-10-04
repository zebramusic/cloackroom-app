export interface LostClaim {
  id: string; // generated client-side (e.g., timestamp or nanoid)
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  photos: string[]; // data URLs (base64) for now
  createdAt: number;
  resolved?: boolean;
  resolvedAt?: number;
}
