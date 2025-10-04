export interface HandoverReport {
  id: string; // handover_<timestamp>
  coatNumber: string; // the coat tag/number
  fullName: string;
  phone?: string;
  email?: string;
  staff?: string;
  notes?: string;
  photos?: string[]; // data URLs captured or uploaded
  createdAt: number; // epoch ms
}
