export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  createdAt: number;
}
