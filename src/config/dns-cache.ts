// DNS resilience patch.
//
// The DigitalOcean managed-DB hostname resolves intermittently on some networks
// (router DNS), producing `getaddrinfo EAI_AGAIN` and killing connection
// attempts. Node does not cache `dns.lookup`, so every attempt re-queries.
//
// This module monkey-patches `dns.lookup` with a small TTL cache plus
// "serve-stale": if a fresh lookup fails but we previously resolved the host,
// we reuse the last good IP instead of throwing. This makes transient DNS blips
// (a few seconds/minutes) transparent to Sequelize/pg.
import dns from "dns";
import { getServiceLogger } from "../utils/createLogger";

const logger = getServiceLogger("dns-cache");

const TTL_MS = 5 * 60 * 1000; // refresh resolved addresses every 5 minutes

interface CacheEntry {
  address: string;
  family: number;
  expires: number;
}

const cache = new Map<string, CacheEntry>();

// Optional hard fallbacks for critical hosts when DNS is unavailable entirely,
// e.g. DNS_FALLBACK_HOSTS="db.example.com=1.2.3.4,other=5.6.7.8". Only used when
// a live lookup fails, so real DNS always wins once it recovers.
const fallback = new Map<string, { address: string; family: number }>();
for (const pair of (process.env.DNS_FALLBACK_HOSTS || "").split(",")) {
  const [host, ip] = pair.split("=").map((s) => (s || "").trim());
  if (host && ip) {
    fallback.set(host.toLowerCase(), { address: ip, family: ip.includes(":") ? 6 : 4 });
  }
}

const originalLookup = dns.lookup.bind(dns) as any;

function cacheKey(hostname: string, options: any): string {
  const family = typeof options?.family === "number" ? options.family : 0;
  return `${hostname}|${family}`;
}

function deliver(entry: CacheEntry, all: boolean, callback: any): void {
  if (all) {
    callback(null, [{ address: entry.address, family: entry.family }]);
  } else {
    callback(null, entry.address, entry.family);
  }
}

(dns as any).lookup = function patchedLookup(hostname: string, options: any, callback: any): void {
  if (typeof options === "function") {
    callback = options;
    options = {};
  } else if (typeof options === "number") {
    options = { family: options };
  }
  options = options || {};

  const all = !!options.all;
  const key = cacheKey(hostname, options);
  const cached = cache.get(key);

  if (cached && cached.expires > Date.now()) {
    return process.nextTick(() => deliver(cached, all, callback));
  }

  originalLookup(hostname, options, (err: any, address: any, family: number) => {
    if (err) {
      if (cached) {
        logger.warn(`DNS lookup failed for ${hostname} (${err.code || err.message}) — serving stale ${cached.address}`);
        return deliver(cached, all, callback);
      }
      const fb = fallback.get(hostname.toLowerCase());
      if (fb) {
        logger.warn(`DNS lookup failed for ${hostname} (${err.code || err.message}) — using fallback ${fb.address}`);
        const entry: CacheEntry = { ...fb, expires: Date.now() + TTL_MS };
        cache.set(key, entry);
        return deliver(entry, all, callback);
      }
      return callback(err);
    }

    const entry: CacheEntry = all
      ? { address: address[0].address, family: address[0].family, expires: Date.now() + TTL_MS }
      : { address, family, expires: Date.now() + TTL_MS };
    cache.set(key, entry);
    callback(null, address, family);
  });
};

// Prefer IPv4 — avoids intermittent AAAA (IPv6) resolution failures on some
// networks that surface as EAI_AGAIN even when the A record resolves fine.
try {
  (dns as any).setDefaultResultOrder?.("ipv4first");
} catch { /* older Node */ }

logger.info("DNS cache + serve-stale patch installed");
