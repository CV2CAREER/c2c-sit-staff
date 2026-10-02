/**
 * Staff paste job links that the server then fetches. Without a guard that is
 * a server-side request forgery hole: a pasted http://169.254.169.254/… or
 * http://localhost:… would be fetched from inside our network. This rejects
 * non-web schemes, local hostnames and private / link-local IP literals.
 *
 * It does not resolve DNS, so a public name pointing at a private address is
 * not caught — enough to stop the obvious cases, not a full egress firewall.
 */
const PRIVATE_IPV4 = [
  /^10\./,
  /^127\./,
  /^0\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // carrier-grade NAT
];

export function isSafePublicUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host || host === "localhost" || host.endsWith(".localhost")) return false;
  if (host.endsWith(".local") || host.endsWith(".internal")) return false;
  if (PRIVATE_IPV4.some((pattern) => pattern.test(host))) return false;
  // IPv6 loopback, unique-local and link-local.
  if (host === "::1" || host === "::" || /^(fc|fd|fe80)/.test(host)) return false;

  return true;
}
