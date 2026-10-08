//~ import { Request, Response } from 'express';
//~ import catchAsyncError from '../../utils/catchAsyncError';
//~ import { SendGridInboundAdapter } from '../../services/discovery/adapters/sendgrid-inbound.adapter';
//~ import { normaliseJob, validateDraft } from '../../services/discovery/discovery-normalise.service';
//~ import { DiscoveryJob } from '../../models/v1/discovery-job.model';
//~ import { DiscoverySourceRegister } from '../../models/v1/discovery-source-register.model';
//~ import { DISCOVERY_PARSE_DOMAIN } from '../../config/env';
//~ import { getServiceLogger } from '../../utils/createLogger';

//~ const logger = getServiceLogger('sendgrid-inbound-parse');

//~ // POST /api/v1/sendgridWebhook/inbound-parse
//~ // SendGrid Inbound Parse sends a multipart/form-data POST with fields:
//~ //   to, from, subject, text, html, envelope (JSON string), headers, etc.
//~ export const handleInboundParse = catchAsyncError(async (req: Request, res: Response) => {
//~   try {
//~     const { to, from, subject, text, html, envelope } = req.body;

//~     if (!to || !from) {
//~       logger.warn('Inbound Parse webhook received with missing to/from');
//~       res.status(200).send('ok'); // Always 200 — SendGrid retries on non-2xx
//~       return;
//~     }

//~     logger.info(`Inbound Parse: from=${from} to=${to} subject=${subject}`);

//~     // Identify source aggregator from the "to" address
//~     const adapter = new SendGridInboundAdapter({ parseDomain: DISCOVERY_PARSE_DOMAIN });

//~     // Parse the inbound payload
//~     const payload = { to, from, subject, text, html, envelope };
//~     const jobs = adapter.parse(payload);

//~     if (jobs.length === 0) {
//~       logger.info('No jobs extracted from inbound email');
//~       res.status(200).send('ok');
//~       return;
//~     }

//~     // Determine which source these jobs belong to
//~     const toAddresses = to.split(',').map((a: string) => a.trim().toLowerCase());
//~     let sourceSlug = 'unknown';
//~     const LOCAL_PART_MAP: Record<string, string> = {
//~       seek: 'seek', indeed: 'indeed', linkedin: 'linkedin', careerone: 'careerone',
//~       jora: 'jora', monster: 'monster', reed: 'reed', nhsjobs: 'nhsjobs',
//~       cvlibrary: 'cvlibrary', jobserve: 'jobserve', adecco: 'adecco',
//~     };
//~     for (const addr of toAddresses) {
//~       const localPart = addr.split('@')[0];
//~       if (localPart && LOCAL_PART_MAP[localPart]) {
//~         sourceSlug = LOCAL_PART_MAP[localPart];
//~         break;
//~       }
//~     }

//~     // Find the source record
//~     const source = await DiscoverySourceRegister.findOne({ where: { slug: sourceSlug } });
//~     if (!source) {
//~       logger.warn(`Source not found for slug: ${sourceSlug}`);
//~       res.status(200).send('ok');
//~       return;
//~     }

//~     // Process each job
//~     let fetchedCount = 0;
//~     let dedupCount = 0;

//~     for (const draft of jobs) {
//~       const validation = validateDraft(draft);
//~       if (!validation.valid) {
//~         logger.info(`  Skipping invalid draft: ${validation.reason}`);
//~         continue;
//~       }

//~       const normalised = normaliseJob(draft);

//~       // Dedup check
//~       const existing = await DiscoveryJob.findOne({
//~         where: { fingerprint_hash: normalised.fingerprint },
//~       });

//~       if (existing) {
//~         dedupCount++;
//~         continue;
//~       }

//~       await DiscoveryJob.create({
//~         source_id: source.id,
//~         source_job_id: draft.sourceJobId,
//~         title: draft.title,
//~         title_normalised: normalised.titleNormalised,
//~         company: draft.company,
//~         company_normalised: normalised.companyNormalised,
//~         location: draft.location,
//~         location_normalised: normalised.locationNormalised,
//~         remote_flag: draft.remoteFlag,
//~         description: draft.description,
//~         posted_date: draft.postedDate,
//~         salary_min: draft.salaryMin,
//~         salary_max: draft.salaryMax,
//~         currency: draft.currency,
//~         employment_type: draft.employmentType,
//~         apply_url: draft.applyUrl,
//~         source_url: draft.sourceUrl,
//~         fingerprint_hash: normalised.fingerprint,
//~         retrieved_at: new Date(),
//~       } as any);

//~       fetchedCount++;
//~       logger.info(`  Saved: ${draft.title} @ ${draft.company}`);
//~     }

//~     // Update source last_fetched_at
//~     source.last_fetched_at = new Date();
//~     await source.save();

//~     logger.info(`Inbound Parse complete: ${fetchedCount} saved, ${dedupCount} deduped from ${sourceSlug}`);

//~     // Always return 200 to SendGrid
//~     res.status(200).send('ok');
//~   } catch (error: any) {
//~     logger.error(`Inbound Parse error: ${error.message}`);
//~     // Still return 200 — don't want SendGrid to retry indefinitely
//~     res.status(200).send('ok');
//~   }
//~ });
