const ALPHABET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

/**
 * Content-addressed IDs: sharing the same poster twice returns the same link
 * and skips the KV write (free tier allows 1k writes/day).
 */
export async function gridId(json: string): Promise<string> {
  const hash = new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(json)),
  )
  return Array.from(hash.slice(0, 10), b => ALPHABET[b % 62]).join('')
}
