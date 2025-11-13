export interface HandoverReport {
  id: string; // handover_<timestamp>
  coatNumber: string; // the coat tag/number
  fullName: string;
  // Event tagging (optional) – associates this handover with an active event
  eventId?: string; // ID of the event active at creation
  eventName?: string; // denormalized for quick print (snapshot of name)
  phone?: string;
  phoneVerified?: boolean; // manually confirmed via phone call
  phoneVerifiedAt?: number; // epoch ms when verified
  phoneVerifiedBy?: string; // staff name who verified
  email?: string;
  staff?: string;
  notes?: string;
  photos?: string[]; // data URLs captured or uploaded
  createdAt: number; // epoch ms
  language?: 'ro' | 'en'; // chosen language for print (single-language mode)
  signedDoc?: string; // data URL of the signed paper handover (photo / scan)
  signedAt?: number; // epoch ms when signedDoc stored
  clothType?: string; // type of cloth (e.g. Jacket, Coat, Scarf)
  emailSentAt?: number; // epoch ms when confirmation email sent
  emailSentTo?: string; // email used for the confirmation message
}
