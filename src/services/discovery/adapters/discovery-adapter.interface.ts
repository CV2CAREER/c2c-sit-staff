//~ export interface DiscoveryJobDraft {
//~   sourceJobId: string;
//~   title: string;
//~   company: string;
//~   location: string;
//~   remoteFlag: boolean;
//~   description: string;
//~   postedDate?: Date;
//~   salaryMin?: number;
//~   salaryMax?: number;
//~   currency?: string;
//~   employmentType?: string;
//~   applyUrl: string;
//~   sourceUrl: string;
//~ }

//~ export interface DiscoveryAdapter {
//~   qualify(): Promise<{ permitted: boolean; reason: string }>;
//~   fetch(keywords: string[], location: string, country?: string, signal?: AbortSignal): Promise<DiscoveryJobDraft[]>;
//~   parse(raw: unknown): DiscoveryJobDraft[];
//~   health(): Promise<{ ok: boolean; lastRunAt?: Date; error?: string }>;
//~ }
