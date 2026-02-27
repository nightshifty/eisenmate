import nacl from "tweetnacl";
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from "tweetnacl-util";

/**
 * Generates a random 32-byte shared secret, returned as a hex string.
 */
export function generateSecret(): string {
  const key = nacl.randomBytes(32);
  return encodeBase64(key);
}

/**
 * Converts a base64-encoded secret string to a Uint8Array key for NaCl secretbox.
 */
export function secretToKey(secret: string): Uint8Array {
  return decodeBase64(secret);
}

/**
 * Encrypts a plaintext string using NaCl secretbox (XSalsa20-Poly1305).
 * Returns a base64-encoded string containing nonce + ciphertext.
 */
export function encrypt(plaintext: string, key: Uint8Array): string {
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const messageBytes = decodeUTF8(plaintext);
  const encrypted = nacl.secretbox(messageBytes, nonce, key);
  if (!encrypted) {
    throw new Error("Encryption failed");
  }
  // Concatenate nonce + ciphertext
  const combined = new Uint8Array(nonce.length + encrypted.length);
  combined.set(nonce);
  combined.set(encrypted, nonce.length);
  return encodeBase64(combined);
}

/**
 * Decrypts a base64-encoded string (nonce + ciphertext) using NaCl secretbox.
 * Returns the original plaintext string.
 * Throws if decryption fails (wrong key or tampered data).
 */
export function decrypt(ciphertext: string, key: Uint8Array): string {
  const combined = decodeBase64(ciphertext);
  const nonce = combined.slice(0, nacl.secretbox.nonceLength);
  const encrypted = combined.slice(nacl.secretbox.nonceLength);
  const decrypted = nacl.secretbox.open(encrypted, nonce, key);
  if (!decrypted) {
    throw new Error("Decryption failed – wrong key or corrupted data");
  }
  return encodeUTF8(decrypted);
}

/**
 * Generates a short human-readable pairing PIN (6 digits).
 * This is NOT the encryption key – it's only used for display during pairing verification.
 */
export function generatePairingPin(): string {
  const bytes = nacl.randomBytes(4);
  const num = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
  return String(num % 1000000).padStart(6, "0");
}

/**
 * Generates a unique device ID (short, URL-safe).
 */
export function generateDeviceId(): string {
  const bytes = nacl.randomBytes(8);
  return encodeBase64(bytes).replace(/[+/=]/g, "").slice(0, 12);
}
