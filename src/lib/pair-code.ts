import { randomInt } from "node:crypto";
import type { Breakdown } from "@/lib/matching";

// Без похожих символов (0/O, 1/I), чтобы код было легко продиктовать в кадре.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 6;
export const CODE_TTL_MS = 24 * 60 * 60 * 1000;

export type PairCheck = {
  code: string;
  creator_id: string;
  partner_id: string | null;
  score: number | null;
  breakdown: Breakdown | null;
  explanation: string | null;
  created_at: string;
};

export function generateCode(): string {
  return Array.from({ length: CODE_LENGTH }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
}

export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isValidCodeFormat(code: string): boolean {
  return code.length === CODE_LENGTH && [...code].every((c) => ALPHABET.includes(c));
}

export function expiresAt(check: Pick<PairCheck, "created_at">): Date {
  return new Date(new Date(check.created_at).getTime() + CODE_TTL_MS);
}

export function isExpired(check: Pick<PairCheck, "created_at">): boolean {
  return expiresAt(check).getTime() < Date.now();
}
