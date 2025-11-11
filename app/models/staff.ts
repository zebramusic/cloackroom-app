export interface StaffUser {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  isAuthorized: boolean; // whether the staff account is allowed to sign in and handle handovers
  authorizedEventId?: string; // staff is authorized to operate for this active event only
  createdAt: number;
}

export interface Session {
  token: string;
  // For backward compatibility we keep staffId; for admin sessions this also stores the admin's id
  staffId: string;
  // Distinguish which collection to look in when resolving the session
  userType?: "staff" | "admin";
  createdAt: number;
  expiresAt: number;
}

export interface PasswordResetToken {
  token: string;
  staffId: string;
  createdAt: number;
  expiresAt: number;
  used?: boolean;
}

export interface PasswordReset {
  token: string;
  staffId: string;
  createdAt: number;
  expiresAt: number;
  used?: boolean;
}
