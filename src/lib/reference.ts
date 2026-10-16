import { randomBytes, randomInt } from "crypto";

// Unambiguous characters (no 0/O, 1/I/L).
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function bookingReference() {
  let s = "";
  for (let i = 0; i < 6; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return `WCB-${s}`;
}

export function accessToken() {
  return randomBytes(24).toString("base64url");
}
