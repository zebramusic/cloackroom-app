import type { StaffUser, Session } from "@/app/models/staff";

export const SESS_COOKIE = "cloack_session";
export const HOUR = 60 * 60 * 1000;
export const DAY = 24 * HOUR;

export async function sha256(input: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(input));
  const arr = Array.from(new Uint8Array(buf));
  return arr.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashPassword(pw: string) {
  return sha256(pw);
}
export function generateToken(staffId: string) {
  return `${staffId}_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

export function generateResetToken(staffId: string) {
  return `reset_${generateToken(staffId)}`;
}
