import { DiscoverySourceRegister } from '../models/v1/discovery-source-register.model';
import { getServiceLogger } from '../utils/createLogger';

const logger = getServiceLogger('seed-discovery-config');

const sources = [
  {
    name: 'Adzuna',
    slug: 'adzuna',
    route: 'api',
    permission_outcome: 'Permitted',
    evidence: 'Documented developer API with keyed access. Free tier: 25 req/min, 250/day, 2500/month.',
    api_key: process.env.ADZUNA_API_KEY || null,
    app_id: process.env.ADZUNA_APP_ID || null,
    cadence_minutes: 360,
    enabled: true,
    config: { country: 'au', results_per_page: 50, max_days_old: 1 },
  },
  {
    name: 'Jooble',
    slug: 'jooble',
    route: 'api',
    permission_outcome: 'Permitted',
    evidence: 'Partner API with keyed access. Aggregates jobs globally across ~40 countries by location.',
    api_key: process.env.JOOBLE_API_KEY || null,
    cadence_minutes: 360,
    enabled: true,
    config: { results_per_request: 20 },
  },
  {
    name: 'SEEK',
    slug: 'seek',
    route: 'page',
    permission_outcome: 'Deferred',
    evidence: 'Cloudflare blocks headless/datacenter scraping. Requires headed mode + saved login session or residential proxy.',
    cadence_minutes: 360,
    enabled: false,
  },
  {
    name: 'Glassdoor',
    slug: 'glassdoor',
    route: 'page',
    permission_outcome: 'Deferred',
    evidence: 'Cloudflare blocks headless/datacenter scraping. Requires headed mode + saved login session or residential proxy.',
    cadence_minutes: 360,
    enabled: false,
  },
  {
    name: 'Indeed',
    slug: 'indeed',
    route: 'email',
    permission_outcome: 'Permitted',
    evidence: 'Partner programme closed ~2021. Email alerts available.',
    cadence_minutes: 360,
    enabled: true,
  },
  {
    name: 'LinkedIn',
    slug: 'linkedin',
    route: 'page',
    permission_outcome: 'Permitted',
    evidence: 'Public guest API (jobs-guest) scraped over HTTP — no browser or login required.',
    cadence_minutes: 360,
    enabled: true,
  },
  {
    name: 'CareerOne',
    slug: 'careerone',
    route: 'email',
    permission_outcome: 'Permitted',
    evidence: 'Job alert emails available.',
    cadence_minutes: 360,
    enabled: true,
  },
  {
    name: 'Jora',
    slug: 'jora',
    route: 'page',
    permission_outcome: 'Permitted',
    evidence: 'Scraped via Playwright (au.jora.com).',
    cadence_minutes: 360,
    enabled: true,
  },
  {
    name: 'Monster',
    slug: 'monster',
    route: 'email',
    permission_outcome: 'Permitted',
    evidence: 'Job alert emails available.',
    cadence_minutes: 360,
    enabled: true,
  },
  {
    name: 'Reed',
    slug: 'reed',
    route: 'email',
    permission_outcome: 'Permitted',
    evidence: 'Job alert emails available.',
    cadence_minutes: 360,
    enabled: true,
  },
  {
    name: 'NHSJobs',
    slug: 'nhsjobs',
    route: 'email',
    permission_outcome: 'Permitted',
    evidence: 'Job alert emails available.',
    cadence_minutes: 360,
    enabled: true,
  },
  {
    name: 'CVLibrary',
    slug: 'cvlibrary',
    route: 'email',
    permission_outcome: 'Permitted',
    evidence: 'Job alert emails available.',
    cadence_minutes: 360,
    enabled: true,
  },
  {
    name: 'Jobserve',
    slug: 'jobserve',
    route: 'email',
    permission_outcome: 'Permitted',
    evidence: 'Job alert emails available.',
    cadence_minutes: 360,
    enabled: true,
  },
  {
    name: 'Adecco',
    slug: 'adecco',
    route: 'email',
    permission_outcome: 'Permitted',
    evidence: 'Job alert emails available.',
    cadence_minutes: 360,
    enabled: true,
  },
  {
    name: 'WorkforceAustralia',
    slug: 'workforceaustralia',
    route: 'page',
    permission_outcome: 'Deferred',
    evidence: 'Public listings. Verify robots.txt before enabling.',
    cadence_minutes: 360,
    enabled: true,
  },
  {
    name: 'EscapeCity',
    slug: 'escapecity',
    route: 'page',
    permission_outcome: 'Deferred',
    evidence: 'Public listings. Verify robots.txt before enabling.',
    cadence_minutes: 360,
    enabled: true,
  },
  {
    name: 'JobBank',
    slug: 'jobbank',
    route: 'page',
    permission_outcome: 'Deferred',
    evidence: 'Government listings. Verify robots.txt before enabling.',
    cadence_minutes: 360,
    enabled: true,
  },
  {
    name: 'MichaelPage',
    slug: 'michaelpage',
    route: 'page',
    permission_outcome: 'Deferred',
    evidence: 'Public listings. Verify robots.txt before enabling.',
    cadence_minutes: 360,
    enabled: true,
  },
  {
    name: 'Randstad',
    slug: 'randstad',
    route: 'page',
    permission_outcome: 'Deferred',
    evidence: 'Public listings. Verify robots.txt before enabling.',
    cadence_minutes: 360,
    enabled: true,
  },
];

export const seedDiscoverySourceRegister = async (): Promise<void> => {
  try {
    logger.info('Seeding discovery_source_register...');

    for (const source of sources) {
      const [record, created] = await DiscoverySourceRegister.findOrCreate({
        where: { slug: source.slug },
        defaults: source as any,
      });

      if (created) {
        logger.info(`  Created: ${source.name} (${source.route})`);
      } else {
        logger.info(`  Exists: ${source.name}`);
      }
    }

    // Migration step: flip Cloudflare-blocked boards to disabled on pre-existing
    // rows (findOrCreate above won't update them), and correct LinkedIn's route.
    await DiscoverySourceRegister.update(
      { enabled: false },
      { where: { slug: ['seek', 'glassdoor'] } }
    );
    await DiscoverySourceRegister.update(
      { route: 'page' },
      { where: { slug: 'linkedin' } }
    );

    logger.info(`Seeding complete. ${sources.length} sources processed.`);
  } catch (error: any) {
    logger.error('Failed to seed discovery_source_register:', error);
  }
};
