import type { Session, StaffUser } from "@/app/models/staff";
import type { AdminUser } from "@/app/models/admin";
import { getDb } from "@/lib/mongodb";
import bcrypt from "bcryptjs";

export const SESS_COOKIE = "cloack_session";
export const HOUR = 60 * 60 * 1000;
export const DAY = 24 * HOUR;

// Legacy SHA256 support (for previously created accounts) --------------------
export async function sha256(input: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(input));
  const arr = Array.from(new Uint8Array(buf));
  return arr.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// We prefix new bcrypt hashes so we can detect legacy hashes easily.
const BCRYPT_PREFIX = "bcrypt$";

export async function hashPassword(pw: string): Promise<string> {
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(pw, salt);
  return `${BCRYPT_PREFIX}${hash}`; // stored value e.g. bcrypt_$2a$...
}

export async function verifyPassword(inputPw: string, stored: string): Promise<boolean> {
  if (!stored) return false;
  if (stored.startsWith(BCRYPT_PREFIX)) {
    const real = stored.slice(BCRYPT_PREFIX.length);
    try {
      return bcrypt.compareSync(inputPw, real);
    } catch {
      return false;
    }
  }
  // Legacy fallback
  const legacy = await sha256(inputPw);
  return legacy === stored;
}

export function needsRehash(stored: string): boolean {
  return !stored.startsWith(BCRYPT_PREFIX);
}

export function generateToken(staffId: string) {
  return `${staffId}_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

export function generateResetToken(staffId: string) {
  return `reset_${generateToken(staffId)}`;
}

// Session / RBAC helper -------------------------------------------------------
export async function getSessionUser(token: string | undefined): Promise<
  | ({ type: "staff" } & StaffUser)
  | ({ type: "admin" } & AdminUser)
  | null
> {
  if (!token) return null;
  const db = await getDb();
  if (!db) return null;
  const sess = await db.collection<Session>("sessions").findOne({ token });
  if (!sess || sess.expiresAt < Date.now()) return null;
  if (sess.userType === "admin") {
    const admin = await db.collection<AdminUser>("admins").findOne({ id: sess.staffId });
    if (!admin) return null;
    return { ...admin, type: "admin" };
  }
  const staff = await db.collection<StaffUser>("staff").findOne({ id: sess.staffId });
  if (!staff) return null;
  return { ...staff, type: "staff" };
}

