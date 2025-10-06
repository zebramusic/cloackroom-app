export interface HandoverReport {
  id: string; // handover_<timestamp>
  coatNumber: string; // the coat tag/number
  fullName: string;
  phone?: string;
  phoneVerified?: boolean; // true if phone number was OTP verified at creation time
  email?: string;
  staff?: string;
  notes?: string;
  photos?: string[]; // data URLs captured or uploaded
  createdAt: number; // epoch ms
  language?: 'ro' | 'en'; // chosen language for print (single-language mode)
  signedDoc?: string; // data URL of the signed paper handover (photo / scan)
  signedAt?: number; // epoch ms when signedDoc stored
}
