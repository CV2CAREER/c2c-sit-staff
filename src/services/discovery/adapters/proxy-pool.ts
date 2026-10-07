//~ import { getServiceLogger } from '../../../utils/createLogger';

//~ const logger = getServiceLogger('discovery-proxy-pool');

//~ export interface ProxyEntry {
//~   /** e.g. "http://gate.smartproxy.com:7000" — no embedded credentials. */
//~   server: string;
//~   username?: string;
//~   password?: string;
//~ }

//~ /**
//~  * Parses DISCOVERY_PROXY_LIST — a comma-separated list of proxy endpoints in
//~  * whatever format the provider hands out. Supports the two shapes staff
//~  * providers (SmartProxy, IPRoyal, PacketStream) actually issue:
//~  *   - "host:port:username:password"      (SmartProxy / IPRoyal)
//~  *   - "username:password@host:port"      (PacketStream, or any standard proxy URL)
//~  *   - "http://username:password@host:port" (full URL, scheme optional)
//~  */
//~ const parseEntry = (raw: string): ProxyEntry | null => {
//~   const entry = raw.trim();
//~   if (!entry) return null;

//~   try {
//~     if (entry.includes('@')) {
//~       const withScheme = entry.includes('://') ? entry : `http://${entry}`;
//~       const url = new URL(withScheme);
//~       return {
//~         server: `${url.protocol}//${url.host}`,
//~         username: decodeURIComponent(url.username) || undefined,
//~         password: decodeURIComponent(url.password) || undefined,
//~       };
//~     }

//~     const parts = entry.split(':');
//~     if (parts.length === 4) {
//~       const [host, port, username, password] = parts;
//~       return { server: `http://${host}:${port}`, username, password };
//~     }
//~     if (parts.length === 2) {
//~       const [host, port] = parts;
//~       return { server: `http://${host}:${port}` };
//~     }
//~   } catch (error: any) {
//~     logger.warn(`Failed to parse proxy entry: ${error.message}`);
//~   }

//~   logger.warn(`Unrecognised proxy entry format (expected host:port:user:pass or user:pass@host:port): "${entry}"`);
//~   return null;
//~ };

//~ let cachedPool: ProxyEntry[] | null = null;
//~ let cursor = 0;

//~ const loadPool = (): ProxyEntry[] => {
//~   if (cachedPool) return cachedPool;
//~   const raw = process.env.DISCOVERY_PROXY_LIST || '';
//~   cachedPool = raw
//~     .split(',')
//~     .map(parseEntry)
//~     .filter((e): e is ProxyEntry => e !== null);

//~   if (cachedPool.length > 0) {
//~     logger.info(`Loaded ${cachedPool.length} proxy endpoint(s) for discovery scraping.`);
//~   }
//~   return cachedPool;
//~ };

//~ export const proxyPoolEnabled = (): boolean => loadPool().length > 0;

//~ /** Round-robins through the configured pool. Returns null if none configured. */
//~ export const getNextProxy = (): ProxyEntry | null => {
//~   const pool = loadPool();
//~   if (pool.length === 0) return null;
//~   const proxy = pool[cursor % pool.length];
//~   cursor++;
//~   return proxy;
//~ };

//~ /** Test-only: forces the pool to re-read DISCOVERY_PROXY_LIST on next call. */
//~ export const resetProxyPoolCache = (): void => {
//~   cachedPool = null;
//~   cursor = 0;
//~ };
