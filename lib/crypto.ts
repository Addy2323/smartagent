import crypto from "crypto"

const SALT = "smartagent_enclave_salt_98457"

/**
 * Computes a secure SHA-256 hash of a string appended with a cryptographic salt.
 */
export function hashString(value: string): string {
  return crypto.createHash("sha256").update(value + SALT).digest("hex")
}

/**
 * Verifies if a raw string matches a stored SHA-256 hash.
 */
export function verifyHash(value: string, hash: string): boolean {
  return hashString(value) === hash
}
