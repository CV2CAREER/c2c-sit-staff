import { DiscoveryAdapter, DiscoveryJobDraft } from './discovery-adapter.interface';
import { getServiceLogger } from '../../../utils/createLogger';

const logger = getServiceLogger('sendgrid-inbound-adapter');

// Maps local-part of incoming address → aggregator slug
// e.g., "seek" in seek@alerts.cv2career.com
const LOCAL_PART_MAP: Record<string, { slug: string; name: string }> = {
  seek:        { slug: 'seek', name: 'SEEK' },
  indeed:      { slug: 'indeed', name: 'Indeed' },
  linkedin:    { slug: 'linkedin', name: 'LinkedIn' },
  careerone:   { slug: 'careerone', name: 'CareerOne' },
  jora:        { slug: 'jora', name: 'Jora' },
  monster:     { slug: 'monster', name: 'Monster' },
  reed:        { slug: 'reed', name: 'Reed' },
  nhsjobs:     { slug: 'nhsjobs', name: 'NHSJobs' },
  cvlibrary:   { slug: 'cvlibrary', name: 'CVLibrary' },
  jobserve:    { slug: 'jobserve', name: 'Jobserve' },
  adecco:      { slug: 'adecco', name: 'Adecco' },
};

export interface SendGridInboundAdapterConfig {
  parseDomain: string; // e.g., "alerts.cv2career.com"
}

export class SendGridInboundAdapter implements DiscoveryAdapter {
  private config: SendGridInboundAdapterConfig;
  private sourceSlug: string;

  constructor(config: SendGridInboundAdapterConfig, sourceSlug: string = 'email-alerts') {
    this.config = config;
    this.sourceSlug = sourceSlug;
  }

  async qualify(): Promise<{ permitted: boolean; reason: string }> {
    if (!this.config.parseDomain) {
      return { permitted: false, reason: 'Parse domain not configured (DISCOVERY_PARSE_DOMAIN)' };
    }
    return { permitted: true, reason: 'SendGrid Inbound Parse — real-time email ingestion. No polling needed.' };
  }

  async fetch(_keywords: string[], _location: string, _country?: string): Promise<DiscoveryJobDraft[]> {
    // This adapter doesn't poll — jobs arrive via webhook.
    // fetch() returns empty; actual ingestion is via handleInboundParse().
    logger.info('Inbound Parse adapter: fetch() is no-op — jobs arrive via webhook');
    return [];
  }

  parse(raw: unknown): DiscoveryJobDraft[] {
    if (!raw || typeof raw !== 'object') return [];
    const payload = raw as any;
    return this.extractJobsFromInboundPayload(payload);
  }

  async health(): Promise<{ ok: boolean; lastRunAt?: Date; error?: string }> {
    return { ok: true, lastRunAt: new Date() };
  }

  // ─── Inbound Parse payload processing ────────────────────────
  // Called by the webhook controller when SendGrid POSTs a parsed email.

  extractJobsFromInboundPayload(payload: any): DiscoveryJobDraft[] {
    const to = payload.to || '';
    const from = payload.from || '';
    const subject = payload.subject || '';
    const html = payload.html || '';
    const text = payload.text || '';

    // Identify source from the "to" address
    const aggregatorSlug = this.identifyFromToAddress(to);
    if (!aggregatorSlug) {
      logger.warn(`Could not identify aggregator from "to": ${to}`);
      return [];
    }

    logger.info(`Inbound email from "${from}" to "${to}" → source: ${aggregatorSlug}`);

    const jobs: DiscoveryJobDraft[] = [];

    // Strategy 1: Parse HTML for job links
    if (html) {
      const htmlJobs = this.extractFromHtml(html, aggregatorSlug);
      jobs.push(...htmlJobs);
    }

    // Strategy 2: Parse plain text
    if (jobs.length === 0 && text) {
      const textJobs = this.extractFromText(text, aggregatorSlug);
      jobs.push(...textJobs);
    }

    // Strategy 3: Subject line
    if (jobs.length === 0 && subject) {
      const subjectJob = this.extractFromSubject(subject, aggregatorSlug);
      if (subjectJob) jobs.push(subjectJob);
    }

    logger.info(`Extracted ${jobs.length} jobs from ${aggregatorSlug} email`);
    return jobs;
  }

  // ─── Source identification ────────────────────────────────────

  private identifyFromToAddress(to: string): string | null {
    // "to" can be a single address or a comma-separated list
    const addresses = to.split(',').map((a: string) => a.trim().toLowerCase());

    for (const addr of addresses) {
      // Extract local part: "seek@alerts.cv2career.com" → "seek"
      const localPart = addr.split('@')[0];
      if (localPart && LOCAL_PART_MAP[localPart]) {
        return LOCAL_PART_MAP[localPart].slug;
      }
    }
    return null;
  }

  // ─── HTML parsing ─────────────────────────────────────────────

  private extractFromHtml(html: string, aggregatorSlug: string): DiscoveryJobDraft[] {
    const jobs: DiscoveryJobDraft[] = [];
    let match: RegExpExecArray | null;

    // Pattern 1: Job title links
    const linkPattern = /<a[^>]*href=["']([^"']*(?:job|position|role|career|apply|viewjob|view-job)[^"']*)["'][^>]*>([^<]{5,100})<\/a>/gi;
    while ((match = linkPattern.exec(html)) !== null) {
      const url = match[1];
      const title = this.cleanHtml(match[2]);
      if (title.length > 4 && !this.isNoise(title)) {
        jobs.push({
          sourceJobId: this.extractJobId(url, aggregatorSlug),
          title,
          company: 'Unknown',
          location: 'Unknown',
          remoteFlag: false,
          description: title,
          applyUrl: url,
          sourceUrl: url,
        });
      }
    }

    // Pattern 2: Generic links with job-like titles
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
            applyUrl: url,
            sourceUrl: url,
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
          applyUrl: urlMatch[1],
          sourceUrl: urlMatch[1],
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

  // ─── Helpers ──────────────────────────────────────────────────

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

  private isNoise(text: string): boolean {
    const lower = text.toLowerCase();
    return lower.includes('unsubscribe') || lower.includes('preferences') ||
           lower.includes('view in browser') || lower.includes('privacy policy') ||
           lower.includes('terms of');
  }

  private looksLikeJobTitle(text: string): boolean {
    if (!text || text.length < 5 || text.length > 200) return false;
    if (this.isNoise(text)) return false;
    const jobKeywords = ['engineer', 'developer', 'manager', 'analyst', 'designer', 'coordinator',
      'officer', 'specialist', 'consultant', 'architect', 'administrator', 'director', 'lead',
      'supervisor', 'technician', 'operator', 'assistant', 'representative', 'executive',
      'scientist', 'accountant', 'nurse', 'teacher', 'therapist'];
    return jobKeywords.some(kw => text.toLowerCase().includes(kw)) || /^[A-Z]/.test(text);
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
    };

    const pattern = patterns[aggregatorSlug];
    if (pattern) {
      const match = url.match(pattern);
      if (match) return match[1];
    }

    const numMatch = url.match(/\/(\d{5,})(?:[?#/]|$)/);
    return numMatch ? numMatch[1] : `email-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }
}
