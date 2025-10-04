export interface Client {
  id: string; // document number or internal id
  firstname: string;
  lastname: string;
  // Optional fields if parsed from ID/MRZ
  birthDate?: string; // YYYY-MM-DD
  expiryDate?: string; // YYYY-MM-DD
  nationality?: string;
  gender?: string; // M/F/X
  // Checkout state
  returned?: boolean;
  returnedAt?: number;
}
