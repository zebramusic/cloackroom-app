export type UserType = 'admin' | 'staff';

export interface SessionUser {
  id: string;
  fullName: string;
  email?: string;
  type: UserType;
  isAuthorized?: boolean;
  authorizedEventId?: string;
}

export interface Event {
  id: string;
  name: string;
  startsAt: number;
  endsAt: number;
  createdAt: number;
  updatedAt?: number;
}

export interface HandoverReport {
  id: string;
  coatNumber: string;
  fullName: string;
  eventId?: string;
  eventName?: string;
  phone?: string;
  phoneVerified?: boolean;
  phoneVerifiedAt?: number;
  phoneVerifiedBy?: string;
  email?: string;
  staff?: string;
  notes?: string;
  photos?: string[];
  createdAt: number;
  language?: 'ro' | 'en';
  signedDoc?: string;
  signedAt?: number;
  clothType?: string;
}

export interface StaffListItem {
  id: string;
  fullName: string;
  email: string;
  isAuthorized?: boolean;
  authorizedEventId?: string;
  createdAt: number;
}

export interface AdminListItem {
  id: string;
  fullName: string;
  email: string;
  createdAt: number;
}

export interface HealthResponse {
  ok: boolean;
  error?: string;
  mongo: {
    connected: boolean;
    sampleCount?: number;
    error?: string;
  };
}
