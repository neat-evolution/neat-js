/**
 * Ambient type declarations for the Web Crypto API.
 *
 * `crypto.getRandomValues` is available in all modern browsers and Node.js 19+.
 * We declare only what we use rather than pulling in the full "dom" lib.
 */
declare const crypto: {
  getRandomValues<T extends ArrayBufferView>(array: T): T
}
