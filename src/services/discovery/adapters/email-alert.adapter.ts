import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { DiscoveryAdapter, DiscoveryJobDraft } from './discovery-adapter.interface';
import { getServiceLogger } from '../../../utils/createLogger';

const logger = getServiceLogger('email-alert-adapter');

// Maps sender email patterns → aggregator slugs
const SOURCE_PATTERNS: Record<string, { slug: string; name: string }> = {
  'seek.com.au':      { slug: 'seek', name: 'SEEK' },
  'seek.com':         { slug: 'seek', name: 'SEEK' },
  'indeed.com':       { slug: 'indeed', name: 'Indeed' },
  'indeed.com.au':    { slug: 'indeed', name: 'Indeed' },
  'linkedin.com':     { slug: 'linkedin', name: 'LinkedIn' },
  'careerone.com.au': { slug: 'careerone', name: 'CareerOne' },
  'careerone.com':    { slug: 'careerone', name: 'CareerOne' },
  'jora.com':         { slug: 'jora', name: 'Jora' },
  'jora.com.au':      { slug: 'jora', name: 'Jora' },
  'monster.com.au':   { slug: 'monster', name: 'Monster' },
  'monster.com':      { slug: 'monster', name: 'Monster' },
  'reed.co.uk':       { slug: 'reed', name: 'Reed' },
  'reed.co':          { slug: 'reed', name: 'Reed' },
  'nhsjobs.nhs.uk':   { slug: 'nhsjobs', name: 'NHSJobs' },
  'nhs.uk':           { slug: 'nhsjobs', name: 'NHSJobs' },
  'cv-library.co.uk': { slug: 'cvlibrary', name: 'CVLibrary' },
  'cvlibrary.co.uk':  { slug: 'cvlibrary', name: 'CVLibrary' },
  'jobserve.com':     { slug: 'jobserve', name: 'Jobserve' },
  'adecco.com':       { slug: 'adecco', name: 'Adecco' },
  'adecco.com.au':    { slug: 'adecco', name: 'Adecco' },
  'adeccogroup.com':  { slug: 'adecco', name: 'Adecco' },
};

export interface EmailAlertAdapterConfig {
  imapHost: string;
  imapPort: number;
  imapUser: string;
  imapPass: string;
  imapSecure: boolean;
  targetSlug?: string;
  maxAge?: number; // hours, default 48
}

export class EmailAlertAdapter implements DiscoveryAdapter {
  private config: EmailAlertAdapterConfig;
  private sourceSlug: string;

  constructor(config: EmailAlertAdapterConfig, sourceSlug: string = 'email-alerts') {
    this.config = config;
    this.sourceSlug = sourceSlug;
  }

  private createClient(): ImapFlow {
    return new ImapFlow({
      host: this.config.imapHost,
      port: this.config.imapPort,
      secure: this.config.imapSecure,
      auth: { user: this.config.imapUser, pass: this.config.imapPass },
      logger: false,
      tls: { rejectUnauthorized: false },
    });
  }

  async qualify(): Promise<{ permitted: boolean; reason: string }> {
    if (!this.config.imapHost || !this.config.imapUser || !this.config.imapPass) {
      return { permitted: false, reason: 'IMAP credentials not configured (DISCOVERY_IMAP_HOST / DISCOVERY_IMAP_USER / DISCOVERY_IMAP_PASS)' };
    }
    return { permitted: true, reason: 'Email alerts are user-initiated subscriptions. IMAP access to a mailbox we own.' };
  }

  async fetch(_keywords: string[], _location: string, _country?: string): Promise<DiscoveryJobDraft[]> {
    const allJobs: DiscoveryJobDraft[] = [];
    const maxAgeMs = (this.config.maxAge || 48) * 60 * 60 * 1000;
    const cutoff = new Date(Date.now() - maxAgeMs);

    logger.info(`Connecting to IMAP: ${this.config.imapHost}:${this.config.imapPort} as ${this.config.imapUser}`);

    const client = this.createClient();

    try {
      await client.connect();
      logger.info('IMAP connected');

      const lock = await client.getMailboxLock('INBOX');
      try {
        // Fetch all messages — use source: true to get full RFC-822 content
        const searchCriteria: any = ['ALL'];

        const messages = client.fetch(searchCriteria, {
          source: true,
          envelope: true,
          uid: true,
        });

        let totalEmails = 0;
        let matchedEmails = 0;

        for await (const message of messages) {
          totalEmails++;
          try {
            // Filter by date
            if (message.envelope?.date && new Date(message.envelope.date) < cutoff) continue;

            // source is a Buffer containing the full RFC-822 message
            if (!message.source) continue;

            const rawEmail = message.source.toString();
            const parsed = await simpleParser(rawEmail);

            // Log sender for debugging
            const fromAddr = parsed.from?.text || 'unknown';
            const toAddr = parsed.to?.text || 'unknown';
            logger.info(`  Email ${totalEmails}: from="${fromAddr}" to="${toAddr}" subject="${parsed.subject || ''}"`);

            // Identify which aggregator sent this email
            const aggregatorSlug = this.identifySource(parsed);
            if (!aggregatorSlug) {
              logger.info(`    → No source match for domain`);
              continue;
            }
            matchedEmails++;

            // Filter to target aggregator
            if (this.config.targetSlug && aggregatorSlug !== this.config.targetSlug) {
              logger.info(`    → Matched ${aggregatorSlug}, but target is ${this.config.targetSlug} — skipping`);
              continue;
            }

            // Extract job listings from the email
            const jobs = this.extractJobsFromEmail(parsed, aggregatorSlug);
            logger.info(`    → Extracted ${jobs.length} jobs from ${aggregatorSlug}`);
            allJobs.push(...jobs);
          } catch (parseErr: any) {
            logger.warn(`Failed to parse email: ${parseErr.message}`);
          }
        }

        logger.info(`IMAP scan: ${totalEmails} total emails, ${matchedEmails} matched known sources`);
      } finally {
        lock.release();
      }

      await client.logout();
      logger.info(`IMAP fetch complete: ${allJobs.length} jobs from ${this.config.targetSlug || 'all sources'}`);
    } catch (error: any) {
      logger.error(`IMAP error: ${error.message}`);
      try { await client.logout(); } catch {}
      throw error;
    }

    return allJobs;
  }

  parse(raw: unknown): DiscoveryJobDraft[] {
    if (!raw || typeof raw !== 'object') return [];
    const parsed = raw as any;
    const slug = this.identifySource(parsed);
    if (!slug) return [];
    return this.extractJobsFromEmail(parsed, slug);
  }

  async health(): Promise<{ ok: boolean; lastRunAt?: Date; error?: string }> {
    const client = this.createClient();
    try {
      await client.connect();
      await client.logout();
      return { ok: true, lastRunAt: new Date() };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  }

  // ─── Internal helpers ────────────────────────────────────────

  private identifySource(parsed: any): string | null {
    const from = parsed.from;
    if (!from) return null;

    const addr = Array.isArray(from) ? from[0] : from;
    const email = addr?.address || '';
    const domain = email.split('@')[1]?.toLowerCase() || '';

    for (const [pattern, source] of Object.entries(SOURCE_PATTERNS)) {
      if (domain.includes(pattern) || domain === pattern) {
        return source.slug;
      }
    }
    return null;
  }

  private extractJobsFromEmail(parsed: any, aggregatorSlug: string): DiscoveryJobDraft[] {
    const jobs: DiscoveryJobDraft[] = [];
    const subject = parsed.subject || '';
    const htmlBody = parsed.html || '';
    const textBody = parsed.text || '';

    // Strategy 1: Parse HTML for job links and titles
    if (htmlBody) {
      const htmlJobs = this.extractFromHtml(htmlBody, aggregatorSlug);
      jobs.push(...htmlJobs);
    }

    // Strategy 2: Parse plain text for job links
    if (jobs.length === 0 && textBody) {
      const textJobs = this.extractFromText(textBody, aggregatorSlug);
      jobs.push(...textJobs);
    }

    // Strategy 3: Parse subject line
    if (jobs.length === 0 && subject) {
      const subjectJob = this.extractFromSubject(subject, aggregatorSlug);
      if (subjectJob) jobs.push(subjectJob);
    }

    return jobs;
  }

  private extractFromHtml(html: string, aggregatorSlug: string): DiscoveryJobDraft[] {
    const jobs: DiscoveryJobDraft[] = [];
    let match: RegExpExecArray | null;

    // Pattern 1: Job title links with href
    const linkPattern = /<a[^>]*href=["']([^"']*(?:job|position|role|career|apply)[^"']*)["'][^>]*>([^<]{5,100})<\/a>/gi;
    while ((match = linkPattern.exec(html)) !== null) {
      const url = match[1];
      const title = this.cleanHtml(match[2]);
      if (title.length > 4) {
        jobs.push({
          sourceJobId: this.extractJobId(url, aggregatorSlug),
          title,
          company: 'Unknown',
          location: 'Unknown',
          remoteFlag: false,
          description: title,
          applyUrl: this.normalizeUrl(url, aggregatorSlug),
          sourceUrl: this.normalizeUrl(url, aggregatorSlug),
        });
      }
    }

    // Pattern 2: Structured job cards
    const cardPattern = /(?:class|data-testid)=["'][^"']*(?:job|listing|card)[^"']*["'][^>]*>[\s\S]*?<a[^>]*href=["']([^"']+)["'][^>]*>([^<]+)<\/a>[\s\S]*?(?:class=["'][^"']*(?:company|employer|advertiser)[^"']*["'][^>]*>([^<]+)<\/)?/gi;
    while ((match = cardPattern.exec(html)) !== null) {
      const url = match[1];
      const title = this.cleanHtml(match[2]);
      const company = match[3] ? this.cleanHtml(match[3]) : 'Unknown';
      if (title.length > 4 && !jobs.some(j => j.title === title)) {
        jobs.push({
          sourceJobId: this.extractJobId(url, aggregatorSlug),
          title,
          company,
          location: 'Unknown',
          remoteFlag: false,
          description: title,
          applyUrl: this.normalizeUrl(url, aggregatorSlug),
          sourceUrl: this.normalizeUrl(url, aggregatorSlug),
        });
      }
    }

    // Pattern 3: Generic — extract all meaningful links
    if (jobs.length === 0) {
      const allLinks = /<a[^>]*href=["'](https?:\/\/[^"']+)["'][^>]*>([^<]{8,100})<\/a>/gi;
      while ((match = allLinks.exec(html)) !== null) {
        const url = match[1];
        const text = this.cleanHtml(match[2]);
        if (this.looksLikeJobTitle(text) && !url.includes('unsubscribe') && !url.includes('preferences')) {
          jobs.push({
            sourceJobId: this.extractJobId(url, aggregatorSlug),
            title: text,
            company: 'Unknown',
            location: 'Unknown',
            remoteFlag: false,
            description: text,
            applyUrl: this.normalizeUrl(url, aggregatorSlug),
            sourceUrl: this.normalizeUrl(url, aggregatorSlug),
          });
        }
      }
    }

    return jobs;
  }

  private extractFromText(text: string, aggregatorSlug: string): DiscoveryJobDraft[] {
    const jobs: DiscoveryJobDraft[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const urlMatch = line.match(/(https?:\/\/\S+)/);
      if (urlMatch && this.looksLikeJobTitle(line.replace(urlMatch[0], '').trim())) {
        const title = line.replace(urlMatch[0], '').trim();
        jobs.push({
          sourceJobId: this.extractJobId(urlMatch[1], aggregatorSlug),
          title: title.substring(0, 200),
          company: 'Unknown',
          location: 'Unknown',
          remoteFlag: false,
          description: title,
          applyUrl: this.normalizeUrl(urlMatch[1], aggregatorSlug),
          sourceUrl: this.normalizeUrl(urlMatch[1], aggregatorSlug),
        });
      }
    }
    return jobs;
  }

  private extractFromSubject(subject: string, _aggregatorSlug: string): DiscoveryJobDraft | null {
    const match = subject.match(/(?:new|latest|matching)\s+jobs?\s*[:–-]\s*(.+)/i);
    if (match) {
      const parts = match[1].split(/\s+(?:in|at|for|–|-)\s+/i);
      return {
        sourceJobId: `email-${Date.now()}`,
        title: (parts[0] || subject).substring(0, 200),
        company: 'Unknown',
        location: parts[1] || 'Unknown',
        remoteFlag: false,
        description: match[1],
        applyUrl: '',
        sourceUrl: '',
      };
    }
    return null;
  }

  private cleanHtml(text: string): string {
    return text
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizeUrl(url: string, _aggregatorSlug: string): string {
    try {
      new URL(url);
      return url;
    } catch {
      return url;
    }
  }

  private extractJobId(url: string, aggregatorSlug: string): string {
    const patterns: Record<string, RegExp> = {
      seek: /\/job\/(\d+)/,
      indeed: /\/viewjob\?.*jk=([a-f0-9]+)/i,
      linkedin: /\/jobs\/view\/(\d+)/,
      jora: /\/j\/(\d+)/,
      monster: /\/job\/(\d+)/,
      reed: /\/job\/(\d+)/,
      careerone: /\/job\/(\d+)/,
      adzuna: /\/(\d+)$/,
    };

    const pattern = patterns[aggregatorSlug];
    if (pattern) {
      const match = url.match(pattern);
      if (match) return match[1];
    }

    const numMatch = url.match(/\/(\d{5,})(?:[?#/]|$)/);
    return numMatch ? numMatch[1] : `email-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }

  private looksLikeJobTitle(text: string): boolean {
    if (!text || text.length < 5 || text.length > 200) return false;
    const lower = text.toLowerCase();
    if (lower.includes('unsubscribe') || lower.includes('preferences') || lower.includes('view in browser')) return false;
    if (lower.includes('privacy policy') || lower.includes('terms of')) return false;
    const jobKeywords = ['engineer', 'developer', 'manager', 'analyst', 'designer', 'coordinator', 'officer', 'specialist', 'consultant', 'architect', 'administrator', 'director', 'lead', 'supervisor', 'technician', 'operator', 'assistant', 'representative', 'executive', 'scientist', 'accountant', 'nurse', 'teacher', 'therapist'];
    return jobKeywords.some(kw => lower.includes(kw)) || /^[A-Z]/.test(text);
  }
}
