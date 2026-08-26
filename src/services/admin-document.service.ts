import { getServiceLogger } from "../utils/createLogger";
import ErrorHandler from "../utils/errorHandler";
import { Upload } from "../models/v1/upload.model";
import { CvDataPoints } from "../types/userdocument.types";
import axios from "axios";
import { User } from "../models/v1/user.model";
import { Profile } from "@/models/v1/profile.model";
import { getTextExtractor } from "office-text-extractor";
import { fileTypeFromBuffer } from "file-type";
import { queryDigitalOceanAI } from "../utils/digital-factory";
import { CV_VARIANT_REQUIRED_PROMPT } from "../constants/cv-variant-required-prompt";
import { VcsPromptUsageService } from "./vcs-prompt-usage.service";
import { sendMail } from "../config/sendGrid";
import { SlackService } from "./slack.service";
import {
  SlackChannel,
  SlackEventType,
  SlackNode,
  SlackProvider,
  SlackSeverity,
  UploadType,
  UploadStatus,
  UploadSource,
} from "../utils/enum";
import { getEnvironmentFromHost } from "../utils/slack-helpers";
import { Credentials } from "@/models/v1/credentials.model";
import { uploadBufferToStorage } from "../utils/fileUpload";
import { textToPdfBuffer, textToDocxBuffer } from "../utils/textDocumentGenerator";
import { htmlToPdfBuffer, htmlToDocxBuffer } from "../utils/htmlDocumentGenerator";
import { renderCvVariantHtmlToPdf, renderCvVariantHtmlToDocx } from "../utils/cvVariantHtmlRenderer";
import { progressValues } from "../utils/user-progress-processor";

const logger = getServiceLogger("document-service");

export interface ExtractCvDataPointsPayload {
  id: string;
  cvType?: string;
}

export interface CvExtractionResult {
  upload: Upload;
  cvDataPoints: CvDataPoints;
}

export interface RoleTitleRecommendationRow {
  role_title: string;
  classification: string;
  craft: string;
  industry: string;
  status: "Evidenced" | "Adjacent" | "Aspirational";
  portfolio_evidence: boolean;
  aspirational_case: "seniority_step" | "credential_only" | null;
  field_pivot: boolean;
  atomic_exception: boolean;
  exception_note: string | null;
  ai_career_resilience_rating: "High" | "Medium" | "Low";
  evidence_note: string;
}

export interface RoleTitleRecommendationResult {
  candidate_name: string;
  qa_flags: { type: string; description: string }[];
  roles: RoleTitleRecommendationRow[];
}

export class AdminDocumentService {


    /**
     * Split prompt into sections
     */
    private static splitPromptIntoSections(input: string) {
        const roleTitleIncrementMarker = "[/*Role title increment prompt*/]";
        const keywordsIncrementMarker = "[/*Keywords increment prompt*/]";
        const keywordsMarker = "[/*Keywords prompt*/]";

        const roleTitleIncrementIndex = input.indexOf(roleTitleIncrementMarker);
        const keywordsIncrementIndex = input.indexOf(keywordsIncrementMarker, roleTitleIncrementIndex);
        const keywordsIndex = input.indexOf(keywordsMarker);

        return {
        roleTitlePrompt: (keywordsIndex !== -1 ? input.substring(0, keywordsIndex) : input).trim(),
        keywordsPrompt: keywordsIndex !== -1 && roleTitleIncrementIndex !== -1
            ? input.substring(keywordsIndex + keywordsMarker.length, roleTitleIncrementIndex).trim()
            : "",
        roleTitleIncrementPrompt: roleTitleIncrementIndex !== -1 && keywordsIncrementIndex !== -1
            ? input.substring(roleTitleIncrementIndex + roleTitleIncrementMarker.length, keywordsIncrementIndex).trim()
            : "",
        keywordsIncrementPrompt: keywordsIncrementIndex !== -1
            ? input.substring(keywordsIncrementIndex + keywordsIncrementMarker.length).trim()
            : ""
        };
    }

    /**
    * Get active prompt configuration (with in-memory caching)
    */
    private static promptCache: {
        data: any;
        vcsId: string | null;
        promptId: string | null;
        version: string | null;
        timestamp: number;
    } | null = null;
    static async getActivePrompt(
        type: "keywords" | "roleTitles",
        increment: boolean,
        resumeText: string,
        existing?: string
    ): Promise<{ prompt: string; vcsId: string | null; promptId: string | null; version: string | null }> {
        // Cache prompts for 5 minutes
        if (!this.promptCache || Date.now() - this.promptCache.timestamp > 5 * 60 * 1000) {
            try {
                const { VCS, VCSPrompt } = await import('../models/v1/keyword-population.model');
                const foundVCS = await VCS.findOne({
                    where: {
                        active: true,
                        key: 'upload_role_titles_prompt'
                    }
                });
                if (foundVCS) {
                    const foundPrompt = await VCSPrompt.findByPk(foundVCS.activePromptId);
                    if (foundPrompt) {
                        this.promptCache = {
                            data: this.splitPromptIntoSections(foundPrompt.prompt),
                            vcsId: foundVCS.id,
                            promptId: foundPrompt.id,
                            version: foundPrompt.version,
                            timestamp: Date.now()
                        };
                    }
                }
            } catch (e) {
                logger.warn(`[getActivePrompt] Failed to load prompt from database, using default prompts`);
            }
        }

        // Use default prompts if cache still not available
        const defaultPrompts = {
            keywordsPrompt: "Extract relevant technical skills, technologies, and keywords from this resume. List each keyword on a separate line.",
            roleTitleIncrementPrompt: "Generate additional job titles and role variations suitable for this candidate. List each title on a separate line.",
            keywordsIncrementPrompt: "Extract additional keywords and skills not previously identified from this resume. List each keyword on a separate line.",
            roleTitlePrompt: "Generate appropriate job titles and role names that match this candidate's experience. List each title on a separate line."
        };

        const sections = this.promptCache?.data || defaultPrompts;
        let basePrompt = increment
        ? type === "keywords" ? sections.keywordsIncrementPrompt : sections.roleTitleIncrementPrompt
        : type === "keywords" ? sections.keywordsPrompt : sections.roleTitlePrompt;

        basePrompt = basePrompt.replace(/\{\{.*?\}\}/g, "");
        const existingContent = existing ? `\nPreviously generated ${type}: ${existing}` : "";

        return {
            prompt: `${basePrompt}\n\n${resumeText}${existingContent}`,
            vcsId: this.promptCache?.vcsId ?? null,
            promptId: this.promptCache?.promptId ?? null,
            version: this.promptCache?.version ?? null,
        };
    }

    /**
     * Send generation notification
     */
    static async sendGenerationNotification(user: User, type: string): Promise<void> {
        setImmediate(async () => {
        try {
            await sendMail({
            email: user.email,
            subject: `${type === "keywords" ? "Keywords" : "Role Titles"} Generated Successfully`,
            templateName: "content-generated.ejs",
            templateData: { name: user.firstName, type }
            });
            logger.info(`[SendGenerationNotification] Email sent to ${user.email}`);
        } catch (e) {
            logger.error(`Notification failed: ${e}`);
        }
        });
    }

    /**
     * Extract structured data from text using AI
     */
    private static async extractStructuredDataFromText(text: string): Promise<CvDataPoints> {
        logger.info(`[ExtractStructuredDataFromText] Extracting structured data from ${text.length} characters of text`);

        try {
        // Construct the prompt to extract structured CV data
        const prompt = `
            Extract structured data from this CV text. Analyze the content and extract the following information:
            
            1. Contact Information - email, phone, address, LinkedIn, etc.
            2. Professional Summary - career objective, summary statement
            3. Work Experience - job titles, companies, dates, descriptions
            4. Education - degrees, institutions, dates, honors
            5. Skills - technical and soft skills
            6. Achievements - awards, accomplishments, recognitions
            7. Certifications/Licenses - professional certifications
            8. Relevant Projects - significant projects with descriptions
            9. Languages - languages spoken
            10. Professional Associations/Volunteer Work - memberships, volunteer experience
            
            CV Content:
            ${text}
            
            Respond in very strict JSON format (no extra spaces or characters) with the following structure:
            
            {
            "cvType": "extracted",
            "contactInformation": "string",
            "professionalSummary": "string",
            "workExperience": [
                {
                "jobTitle": "string",
                "organization": "string", 
                "dates": "string",
                "description": "string"
                }
            ],
            "education": [
                {
                "degree": "string",
                "organization": "string",
                "description": "string",
                "dates": "string"
                }
            ],
            "skills": ["string"],
            "achievements": ["string"],
            "certificationsLicenses": [
                {
                "name": "string",
                "organization": "string",
                "dates": "string",
                "description": "string"
                }
            ],
            "relevantProjects": ["string"],
            "languages": ["string"],
            "professionalAssociationsVolunteerWork": [
                {
                "name": "string",
                "organization": "string",
                "dates": "string",
                "description": "string"
                }
            ]
            }
        `;

        // Use Digital Ocean AI to extract structured data
        const response = await queryDigitalOceanAI(prompt);
        
        // Parse the response
        const cleanResponse = response.replace(/```(?:json)?\s*|\s*```/gi, "").trim();
        const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
        
        if (!jsonMatch) {
            throw new Error("AI response does not contain valid JSON");
        }

        const jsonString = jsonMatch[0];
        const result: CvDataPoints = JSON.parse(jsonString);

        if (!result.cvType || !result.contactInformation) {
            throw new Error("Invalid AI response structure");
        }

        logger.info(`[ExtractStructuredDataFromText] Successfully extracted structured data`);
        return result;

        } catch (error) {
            logger.error(`[ExtractStructuredDataFromText] Failed to extract structured data: ${error}`);
            throw new ErrorHandler("Failed to extract structured CV data", 500);
        }
    }

    /**
     * Parse CV document and extract data points
     * Uses the same approach as the frontend implementation
     */
    private static async parseCvDocument(documentUrl: string): Promise<CvDataPoints> {
        logger.info(`[ParseCvDocument] Parsing document: ${documentUrl}`);

        try {
            // 1. Download the document from the URL
            const response = await axios.get(documentUrl, { responseType: 'arraybuffer' });
            const buffer = response.data;

            // 2. Determine file type
            const fileType = await fileTypeFromBuffer(buffer);
            logger.info(`[ParseCvDocument] File type detected: ${fileType?.mime}`);

            let textContent = '';

            // 3. Extract text content based on file type
            if (fileType?.mime === "application/x-cfb") {
                // Special handling for 'application/x-cfb' as per frontend implementation
                textContent = buffer.toString().replace(/[^\x20-\x7E]/g, "");
            } else {
                // Use office-text-extractor for other file types
                const extractor = getTextExtractor();
                textContent = await extractor.extractText({ input: documentUrl, type: "url" });
            }

            logger.info(`[ParseCvDocument] Extracted text content length: ${textContent.length}`);

            // 4. Use AI to extract structured data from the text
            const cvDataPoints = await this.extractStructuredDataFromText(textContent);

            logger.info(`[ParseCvDocument] Successfully parsed document and extracted data points`);
            return cvDataPoints;

            } catch (error) {
            logger.error(`[ParseCvDocument] Failed to parse document: ${error}`);
            throw new ErrorHandler("Failed to extract CV data points", 500);
        }
    }

    /**
     * Extract CV data points from an uploaded document
     */
    static async extractCvDataPoints(
        userId: string,
        payload: ExtractCvDataPointsPayload
    ): Promise<CvExtractionResult> {
        logger.info(`[ExtractCvDataPoints] User ${userId} extracting data points from upload ${payload.id}`);

        // Find the upload document
        const upload = await Upload.findOne({
        where: { id: payload.id, userId, type: "resume" },
        });

        if (!upload) {
        throw new ErrorHandler("Resume not found or does not belong to user", 404);
        }

        // Extract CV data points from the document
        if (!upload.document.url) {
        throw new ErrorHandler("Document URL is missing", 400);
        }
        const cvDataPoints = await this.parseCvDocument(upload.document.url);

        // Update the upload with extracted data points
        upload.cvDataPoints = cvDataPoints;
        await upload.save();

        logger.info(`[ExtractCvDataPoints] Successfully extracted data points from upload ${payload.id}`);
        return { upload, cvDataPoints };
    }

    /**
     * Generate content using AI and update user profile
     */
    static async generateContentAndUpdate(
        resumeText: string,
        type: "keywords" | "roleTitles",
        increment: boolean = false,
        userId?: string
    ): Promise<{ success: boolean; generated: string[] }> {
        logger.info(`[GenerateContentAndUpdate] Generating ${type} (increment: ${increment})`);

        try {
            // Get existing content for incremental generation
            let existingContent = undefined;
            let user: User | null = null;
            let profile: any = null;

            if (userId) {
                user = await User.findByPk(userId);
                if (user && user.profileId) {
                    profile = await Profile.findByPk(user.profileId);
                    if (profile) {
                        const field = type === "keywords" ? "keywords" : "titles";
                        existingContent = (profile as any)[field]?.join(', ') || undefined;
                    }
                }
            }

            // Get prompt and generate content with AI
            const { prompt, vcsId, promptId, version } = await this.getActivePrompt(type, increment, resumeText, existingContent);

            const startedAt = Date.now();
            let aiResponse: string;
            try {
                aiResponse = await queryDigitalOceanAI(prompt);
                VcsPromptUsageService.record({
                    key: 'upload_role_titles_prompt',
                    vcsId,
                    promptId,
                    version,
                    promptLength: prompt.length,
                    responseLength: aiResponse.length,
                    durationMs: Date.now() - startedAt,
                    success: true,
                });
            } catch (error: any) {
                VcsPromptUsageService.record({
                    key: 'upload_role_titles_prompt',
                    vcsId,
                    promptId,
                    version,
                    promptLength: prompt.length,
                    durationMs: Date.now() - startedAt,
                    success: false,
                    errorMessage: error?.message,
                });
                throw error;
            }

            // Parse generated items
            const generatedItems = aiResponse
                .split(/[\n,;|]/)
                .map(item => item.trim())
                .filter(item => item.length > 0 && !item.match(/^\d+\./) && !item.includes('```'));

            // Update profile if user is provided
            if (userId && user) {
                if (!profile) {
                    profile = await Profile.create({
                        [type === "keywords" ? "keywords" : "titles"]: generatedItems
                    });
                    user.profileId = profile.id;
                    await user.save();
                } else {
                    const field = type === "keywords" ? "keywords" : "titles";
                    const currentItems = (profile as any)[field] || [];
                    
                    await profile.update({
                        [field]: increment 
                            ? [...new Set([...currentItems, ...generatedItems])]
                            : generatedItems
                    });
                }
            }

            logger.info(`[GenerateContentAndUpdate] Successfully generated ${generatedItems.length} ${type}`);
            
            return {
                success: true,
                generated: generatedItems
            };

        } catch (error: any) {
            logger.error(`[GenerateContentAndUpdate] Failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Generate Keywords and/or Role Titles - Admin endpoint method
     */
    static async generateKeywords(
        targetUserId: string,
        uploadId: string,
        generateKeywords: boolean,
        generateRoleTitles: boolean,
        increment: boolean = false
    ): Promise<{ 
        success: boolean; 
        keywords?: string[];
        roleTitles?: string[];
    }> {
        logger.info(`[GenerateKeywords] Target user ${targetUserId} generating from upload ${uploadId} - keywords: ${generateKeywords}, roleTitles: ${generateRoleTitles}`);

        // First try the requested specific upload ID
        let upload;
        if (uploadId && uploadId !== targetUserId) {
            try {
                const user = await Credentials.findOne({ where: { id: uploadId } });

                upload = await Upload.findOne({
                    where: { userId: user?.clientId, type: "resume", isDefault: true, isDeleted: false },
                });
                logger.info(`[GenerateKeywords] Found requested upload ${uploadId} for user ${targetUserId}`);
                if (!upload) {
                    logger.warn(`[GenerateKeywords] Requested upload ${uploadId} for default CV not found for user ${targetUserId}`);

                    upload = await Upload.findOne({
                        where: { userId: uploadId, type: "resume", isDeleted: false },
                        order: [['createdAt', 'DESC']]
                    });
                }
            } catch (e) {
                logger.warn(`[GenerateKeywords] Requested upload ${uploadId} not found, falling back to default resume`);
            }
        }

        if (!upload) {
            throw new ErrorHandler("No resume upload found for the specified ID", 404);
        }
        
        // Robust document URL extraction
        const docMeta = Array.isArray(upload.document) ? upload.document[0] : upload.document;
        const fileUrl = docMeta?.url || docMeta?.fileUrl;

        if (!fileUrl) {
            throw new ErrorHandler("Could not find the document URL for this upload.", 400);
        }

        // Extract resume text ONCE for both types
        const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        const buffer = response.data;
        const fileType = await fileTypeFromBuffer(buffer);
        
        let resumeText = '';
        if (fileType?.mime === "application/x-cfb") {
            resumeText = buffer.toString().replace(/[^\x20-\x7E]/g, "");
        } else {
            const extractor = getTextExtractor();
            resumeText = await extractor.extractText({ input: fileUrl, type: "url" });
        }

        if (!resumeText) {
            throw new ErrorHandler("Failed to extract text from the resume.", 500);
        }

        const result: any = { success: true };

        // Generate Keywords if requested
        if (generateKeywords) {
            const keywordsResult = await this.generateContentAndUpdate(resumeText, "keywords", increment, uploadId);
            result.keywords = keywordsResult.generated;
        }

        // Generate Role Titles if requested
        if (generateRoleTitles) {
            const roleTitlesResult = await this.generateContentAndUpdate(resumeText, "roleTitles", increment, uploadId);
            result.roleTitles = roleTitlesResult.generated;
        }

        logger.info(`[GenerateKeywords] Successfully generated content for user ${uploadId}`);

        return result;
    }

    /**
     * Extract plain text from a resume document URL — shared by
     * generateCoverLetter below and InterviewPrepService (kept separate from
     * parseCvDocument/generateKeywords' inline copies to avoid touching
     * those paths). Not private so other services can reuse it.
     */
    static async extractResumeText(fileUrl: string): Promise<string> {
        const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        const buffer = response.data;
        const fileType = await fileTypeFromBuffer(buffer);

        let resumeText = '';
        if (fileType?.mime === "application/x-cfb") {
            resumeText = buffer.toString().replace(/[^\x20-\x7E]/g, "");
        } else {
            const extractor = getTextExtractor();
            resumeText = await extractor.extractText({ input: fileUrl, type: "url" });
        }

        if (!resumeText) {
            throw new ErrorHandler("Failed to extract text from the resume.", 500);
        }

        return resumeText;
    }

    /**
     * Builds the cover letter prompt from the `cover_letter_generation_prompt`
     * VCS entry (seeded separately from `upload_role_titles_prompt`, which is
     * keywords/role-title config), substituting {{CV_TEXT}} and
     * {{JOB_CONTEXT}} placeholders.
     */
    private static async getCoverLetterPrompt(
        cvText: string,
        jobContent: string,
        jobLink?: string,
    ): Promise<{ prompt: string; vcsId: string; promptId: string; version: string | null }> {
        const { VCS, VCSPrompt } = await import('../models/v1/keyword-population.model');
        const foundVCS = await VCS.findOne({
            where: { active: true, key: 'cover_letter_generation_prompt' },
        });
        const promptRow = foundVCS
            ? await VCSPrompt.findByPk(foundVCS.activePromptId)
            : null;

        if (!promptRow || !foundVCS) {
            throw new ErrorHandler("Cover letter prompt is not configured", 500);
        }

        // {{JOB_CONTEXT}} = JOB_AD_TEXT + "\n" + JOB_URL
        const jobContext = jobLink
            ? `${jobContent}\n${jobLink}`
            : jobContent;

        const prompt = promptRow.prompt
            .replace(/\{\{CV_TEXT\}\}/g, cvText)
            .replace(/\{\{JOB_CONTEXT\}\}/g, jobContext);

        return { prompt, vcsId: foundVCS.id, promptId: promptRow.id, version: promptRow.version };
    }

    /**
     * Generate a cover letter for a user's resume against a job link/description.
     * Returns the raw AI text — persistence (Firebase upload + Upload record)
     * is a separate follow-up step once the output format is decided.
     */
    static async generateCoverLetter(
        targetUserId: string,
        resumeUploadId: string,
        jobContent: string,
        jobLink?: string,
    ): Promise<string> {
        logger.info(`[GenerateCoverLetter] User ${targetUserId}, resume ${resumeUploadId}`);

        const upload = await Upload.findOne({
            where: { id: resumeUploadId, userId: targetUserId, type: "resume" },
        });
        if (!upload) {
            throw new ErrorHandler("Resume not found or does not belong to user", 404);
        }

        const docMeta = Array.isArray(upload.document) ? upload.document[0] : upload.document;
        const fileUrl = docMeta?.url;
        if (!fileUrl) {
            throw new ErrorHandler("Could not find the document URL for this resume.", 400);
        }

        const resumeText = await this.extractResumeText(fileUrl);
        const { prompt, vcsId, promptId, version } = await this.getCoverLetterPrompt(resumeText, jobContent, jobLink);

        const startedAt = Date.now();
        try {
            const coverLetter = await queryDigitalOceanAI(prompt);
            VcsPromptUsageService.record({
                key: 'cover_letter_generation_prompt',
                vcsId,
                promptId,
                version,
                promptLength: prompt.length,
                responseLength: coverLetter.length,
                durationMs: Date.now() - startedAt,
                success: true,
            });

            logger.info(`[GenerateCoverLetter] Successfully generated cover letter for user ${targetUserId}`);
            return coverLetter;
        } catch (error: any) {
            VcsPromptUsageService.record({
                key: 'cover_letter_generation_prompt',
                vcsId,
                promptId,
                version,
                promptLength: prompt.length,
                durationMs: Date.now() - startedAt,
                success: false,
                errorMessage: error?.message,
            });
            throw error;
        }
    }

    /**
     * Renders the (admin-reviewed) cover letter text into a PDF or DOCX file,
     * uploads it to Firebase, and records it as a `coverletter` Upload —
     * the follow-up persistence step to generateCoverLetter above.
     */
    static async saveCoverLetter(
        targetUserId: string,
        resumeUploadId: string,
        coverLetterText: string,
        format: "pdf" | "docx",
    ): Promise<{ upload: Upload; clientName: string }> {
        logger.info(`[SaveCoverLetter] User ${targetUserId}, format ${format}`);

        if (!coverLetterText?.trim()) {
            throw new ErrorHandler("Cover letter text is required", 400);
        }

        // Confirm the resume belongs to this user before attaching the
        // generated cover letter to their account.
        const resumeUpload = await Upload.findOne({
            where: { id: resumeUploadId, userId: targetUserId, type: "resume" },
        });
        if (!resumeUpload) {
            throw new ErrorHandler("Resume not found or does not belong to user", 404);
        }

        const user = await User.findByPk(targetUserId);
        const clientName = user
            ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || targetUserId
            : targetUserId;
        const filenameSlug = clientName
            .replace(/[^a-zA-Z0-9]+/g, "_")
            .replace(/^_|_$/g, "") || targetUserId;
        const dateStamp = new Date().toISOString().split("T")[0];

        const isPdf = format === "pdf";
        const buffer = isPdf
            ? await textToPdfBuffer(coverLetterText)
            : await textToDocxBuffer(coverLetterText);

        const mimeType = isPdf
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        const filename = `${filenameSlug}_Cover_Letter_${dateStamp}.${isPdf ? "pdf" : "docx"}`;

        const uploadResult = await uploadBufferToStorage(buffer, filename, {
            folder: `cover-letters/${targetUserId}`,
            mimeType,
        });

        const upload = await Upload.create({
            userId: targetUserId,
            type: UploadType.COVER_LETTER,
            document: {
                url: uploadResult.url,
                publicId: uploadResult.publicId,
                name: uploadResult.name,
                size: uploadResult.size,
                mimeType: uploadResult.mimeType,
            },
            status: UploadStatus.REVISED,
            source: UploadSource.ADMIN,
            // Admin-generated documents start inactive — the client can't
            // see it until a staff member reviews and activates it via
            // PATCH /uploads/:id/activate.
            isActive: false,
        });

        logger.info(`[SaveCoverLetter] Saved cover letter upload ${upload.id} for user ${targetUserId}`);
        return { upload, clientName };
    }

    /**
     * Renders the same file saveCoverLetter would produce, via the identical
     * render call — but skips the Firebase upload and Upload record, so
     * nothing here is visible to the client. Lets an admin download and
     * sanity-check the rendered file before deciding to save it for real.
     */
    static async previewCoverLetter(
        targetUserId: string,
        resumeUploadId: string,
        coverLetterText: string,
        format: "pdf" | "docx",
    ): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
        logger.info(`[PreviewCoverLetter] User ${targetUserId}, format ${format}`);

        if (!coverLetterText?.trim()) {
            throw new ErrorHandler("Cover letter text is required", 400);
        }

        const resumeUpload = await Upload.findOne({
            where: { id: resumeUploadId, userId: targetUserId, type: "resume" },
        });
        if (!resumeUpload) {
            throw new ErrorHandler("Resume not found or does not belong to user", 404);
        }

        const user = await User.findByPk(targetUserId);
        const clientName = user
            ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || targetUserId
            : targetUserId;
        const filenameSlug = clientName
            .replace(/[^a-zA-Z0-9]+/g, "_")
            .replace(/^_|_$/g, "") || targetUserId;
        const dateStamp = new Date().toISOString().split("T")[0];

        const isPdf = format === "pdf";
        const buffer = isPdf
            ? await textToPdfBuffer(coverLetterText)
            : await textToDocxBuffer(coverLetterText);

        const mimeType = isPdf
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        const filename = `${filenameSlug}_Cover_Letter_Preview_${dateStamp}.${isPdf ? "pdf" : "docx"}`;

        logger.info(`[PreviewCoverLetter] Rendered preview for user ${targetUserId} (not persisted)`);
        return { buffer, filename, mimeType };
    }

    /**
     * Builds the Role Title Recommendations prompt from the
     * `role_title_generation_prompt` VCS entry, substituting the {{CV_TEXT}}
     * placeholder.
     */
    private static async getRoleTitlePrompt(
        cvText: string,
    ): Promise<{ prompt: string; vcsId: string; promptId: string; version: string | null }> {
        const { VCS, VCSPrompt } = await import('../models/v1/keyword-population.model');
        const foundVCS = await VCS.findOne({
            where: { active: true, key: 'role_title_generation_prompt' },
        });
        const promptRow = foundVCS
            ? await VCSPrompt.findByPk(foundVCS.activePromptId)
            : null;

        if (!promptRow || !foundVCS) {
            throw new ErrorHandler("Role title prompt is not configured", 500);
        }

        const prompt = promptRow.prompt.replace(/\{\{CV_TEXT\}\}/g, cvText);
        return { prompt, vcsId: foundVCS.id, promptId: promptRow.id, version: promptRow.version };
    }

    /**
     * Generate Role Title Recommendations (RTR) for a user's resume.
     * Returns the parsed AI JSON — persistence into ClientSupportDocument is
     * a separate, explicit "save" step once the admin has reviewed it.
     */
    static async generateRoleTitleRecommendations(
        targetUserId: string,
        resumeUploadId: string,
    ): Promise<RoleTitleRecommendationResult> {
        logger.info(`[GenerateRoleTitleRecommendations] User ${targetUserId}, resume ${resumeUploadId}`);

        const upload = await Upload.findOne({
            where: { id: resumeUploadId, userId: targetUserId, type: "resume" },
        });
        if (!upload) {
            throw new ErrorHandler("Resume not found or does not belong to user", 404);
        }

        const docMeta = Array.isArray(upload.document) ? upload.document[0] : upload.document;
        const fileUrl = docMeta?.url;
        if (!fileUrl) {
            throw new ErrorHandler("Could not find the document URL for this resume.", 400);
        }

        const resumeText = await this.extractResumeText(fileUrl);
        const { prompt, vcsId, promptId, version } = await this.getRoleTitlePrompt(resumeText);

        const startedAt = Date.now();
        let aiResponse: string;
        try {
            aiResponse = await queryDigitalOceanAI(prompt);
            VcsPromptUsageService.record({
                key: 'role_title_generation_prompt',
                vcsId,
                promptId,
                version,
                promptLength: prompt.length,
                responseLength: aiResponse.length,
                durationMs: Date.now() - startedAt,
                success: true,
            });
        } catch (error: any) {
            VcsPromptUsageService.record({
                key: 'role_title_generation_prompt',
                vcsId,
                promptId,
                version,
                promptLength: prompt.length,
                durationMs: Date.now() - startedAt,
                success: false,
                errorMessage: error?.message,
            });
            throw error;
        }

        const cleanResponse = aiResponse.replace(/```(?:json)?\s*|\s*```/gi, "").trim();
        const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new ErrorHandler("AI response did not contain valid JSON", 500);
        }

        let result: RoleTitleRecommendationResult;
        try {
            result = JSON.parse(jsonMatch[0]);
        } catch {
            throw new ErrorHandler("Failed to parse AI-generated role titles", 500);
        }

        if (!Array.isArray(result.roles)) {
            throw new ErrorHandler("AI response is missing the 'roles' array", 500);
        }

        logger.info(`[GenerateRoleTitleRecommendations] Generated ${result.roles.length} role(s) for user ${targetUserId}`);
        return result;
    }

    /**
     * Builds the CV Variant prompt from the `cv_variant_generation_prompt`
     * VCS entry, substituting the {{CV_TEXT}} placeholder.
     */
    private static async getCvVariantPrompt(
        cvText: string,
    ): Promise<{ prompt: string; vcsId: string; promptId: string; version: string | null }> {
        const { VCS, VCSPrompt } = await import('../models/v1/keyword-population.model');
        const foundVCS = await VCS.findOne({
            where: { active: true, key: 'cv_variant_generation_prompt' },
        });
        const promptRow = foundVCS
            ? await VCSPrompt.findByPk(foundVCS.activePromptId)
            : null;

        if (!promptRow || !foundVCS) {
            throw new ErrorHandler("CV variant prompt is not configured", 500);
        }

        // The required JSON schema/rules (CV_VARIANT_REQUIRED_PROMPT) are
        // locked in code, not the owner-editable VCSPrompt row — the prompt's
        // non-technical owner only ever sees and edits `aiPromptSection`
        // (Admin > Prompts), a separate free-text box with no schema to
        // accidentally break. Inserted as its own labeled block right before
        // the actual CV text.
        const aiPromptSection = promptRow.aiPromptSection?.trim();
        const cvTextWithSection = aiPromptSection
            ? `## ADDITIONAL AI INSTRUCTIONS (owner-provided)\n${aiPromptSection}\n\n${cvText}`
            : cvText;

        const prompt = CV_VARIANT_REQUIRED_PROMPT.replace(/\{\{CV_TEXT\}\}/g, cvTextWithSection);
        return { prompt, vcsId: foundVCS.id, promptId: promptRow.id, version: promptRow.version };
    }

    /**
     * Generate a fully-designed CV Variant for a user's resume. The AI
     * authors a complete, self-styled HTML document (its own colors, layout,
     * fonts) — there's no JSON schema to parse or validate here, since the
     * HTML *is* the design, rendered as-is via cvVariantHtmlRenderer.ts.
     * Persistence is a separate, explicit "save" step once the admin has
     * reviewed the rendered result.
     */
    static async generateCvVariant(
        targetUserId: string,
        resumeUploadId: string,
    ): Promise<string> {
        logger.info(`[GenerateCvVariant] User ${targetUserId}, resume ${resumeUploadId}`);

        const upload = await Upload.findOne({
            where: { id: resumeUploadId, userId: targetUserId, type: "resume" },
        });
        if (!upload) {
            throw new ErrorHandler("Resume not found or does not belong to user", 404);
        }

        const docMeta = Array.isArray(upload.document) ? upload.document[0] : upload.document;
        const fileUrl = docMeta?.url;
        if (!fileUrl) {
            throw new ErrorHandler("Could not find the document URL for this resume.", 400);
        }

        const resumeText = await this.extractResumeText(fileUrl);
        const { prompt, vcsId, promptId, version } = await this.getCvVariantPrompt(resumeText);

        const startedAt = Date.now();
        let aiResponse: string;
        try {
            aiResponse = await queryDigitalOceanAI(prompt);
            VcsPromptUsageService.record({
                key: 'cv_variant_generation_prompt',
                vcsId,
                promptId,
                version,
                promptLength: prompt.length,
                responseLength: aiResponse.length,
                durationMs: Date.now() - startedAt,
                success: true,
            });
        } catch (error: any) {
            VcsPromptUsageService.record({
                key: 'cv_variant_generation_prompt',
                vcsId,
                promptId,
                version,
                promptLength: prompt.length,
                durationMs: Date.now() - startedAt,
                success: false,
                errorMessage: error?.message,
            });
            throw error;
        }

        // The model sometimes wraps its HTML in a Markdown code fence despite
        // being asked not to — strip that before validating/returning.
        const html = aiResponse.replace(/^```(?:html)?\s*|\s*```$/gi, "").trim();

        if (!html || !/<html[\s>]/i.test(html)) {
            logger.error(`[GenerateCvVariant] AI response doesn't look like an HTML document for user ${targetUserId}. Raw response (first 2000 chars): ${aiResponse.slice(0, 2000)}`);
            throw new ErrorHandler("AI did not return a usable CV variant", 500);
        }

        logger.info(`[GenerateCvVariant] Generated CV variant HTML for user ${targetUserId} (${html.length} chars)`);
        return html;
    }

    /**
     * Renders the AI-authored CV variant HTML (its own embedded design —
     * see cvVariantHtmlRenderer.ts) into a PDF or DOCX file, uploads it to
     * Firebase, and records it as a new `resume` Upload for the client — the
     * follow-up persistence step to generateCvVariant above. No admin
     * editing happens between generate and save (see the frontend review
     * gate) — a rich-text editor would strip the AI's custom styling the
     * moment it touched the content, so review is preview-only.
     */
    static async saveCvVariant(
        targetUserId: string,
        resumeUploadId: string,
        cvVariantHtml: string,
        format: "pdf" | "docx",
    ): Promise<{ upload: Upload; clientName: string }> {
        logger.info(`[SaveCvVariant] User ${targetUserId}, format ${format}`);

        if (!cvVariantHtml?.trim()) {
            throw new ErrorHandler("CV variant content is required", 400);
        }

        // Confirm the resume belongs to this user before attaching the
        // generated variant to their account.
        const resumeUpload = await Upload.findOne({
            where: { id: resumeUploadId, userId: targetUserId, type: "resume" },
        });
        if (!resumeUpload) {
            throw new ErrorHandler("Resume not found or does not belong to user", 404);
        }

        const user = await User.findByPk(targetUserId);
        const clientName = user
            ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || targetUserId
            : targetUserId;
        const filenameSlug = clientName
            .replace(/[^a-zA-Z0-9]+/g, "_")
            .replace(/^_|_$/g, "") || targetUserId;
        const dateStamp = new Date().toISOString().split("T")[0];

        const isPdf = format === "pdf";
        const buffer = isPdf
            ? await renderCvVariantHtmlToPdf(cvVariantHtml)
            : await renderCvVariantHtmlToDocx(cvVariantHtml);

        const mimeType = isPdf
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        const filename = `${filenameSlug}_CV_Variant_${dateStamp}.${isPdf ? "pdf" : "docx"}`;

        const uploadResult = await uploadBufferToStorage(buffer, filename, {
            folder: `cv-variants/${targetUserId}`,
            mimeType,
        });

        // New Resume upload for the client — not marked default, so it sits
        // alongside their existing resume until an admin promotes it.
        const upload = await Upload.create({
            userId: targetUserId,
            type: UploadType.RESUME,
            document: {
                url: uploadResult.url,
                publicId: uploadResult.publicId,
                name: uploadResult.name,
                size: uploadResult.size,
                mimeType: uploadResult.mimeType,
            },
            status: UploadStatus.REVISED,
            source: UploadSource.ADMIN,
            // Admin-generated documents start inactive — the client can't
            // see it until a staff member reviews and activates it via
            // PATCH /uploads/:id/activate.
            isActive: false,
        });

        // Advance the client's onboarding progress bar to the
        // "CV Variant Dispatch" milestone (the frontend stepper checks for
        // this exact progress string, not the milestone's display label).
        if (user) {
            await user.update({ progress: progressValues.CV_RESUME_UPLIFTED });
        }

        logger.info(`[SaveCvVariant] Saved CV variant upload ${upload.id} for user ${targetUserId}`);
        return { upload, clientName };
    }

    /**
     * Renders the same file saveCvVariant would produce, via the identical
     * render call — but skips the Firebase upload, Upload record, and
     * onboarding-progress advance, so nothing here is visible to the client.
     * Lets an admin download and sanity-check the rendered file before
     * deciding to save it for real.
     */
    static async previewCvVariant(
        targetUserId: string,
        resumeUploadId: string,
        cvVariantHtml: string,
        format: "pdf" | "docx",
    ): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
        logger.info(`[PreviewCvVariant] User ${targetUserId}, format ${format}`);

        if (!cvVariantHtml?.trim()) {
            throw new ErrorHandler("CV variant content is required", 400);
        }

        const resumeUpload = await Upload.findOne({
            where: { id: resumeUploadId, userId: targetUserId, type: "resume" },
        });
        if (!resumeUpload) {
            throw new ErrorHandler("Resume not found or does not belong to user", 404);
        }

        const user = await User.findByPk(targetUserId);
        const clientName = user
            ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || targetUserId
            : targetUserId;
        const filenameSlug = clientName
            .replace(/[^a-zA-Z0-9]+/g, "_")
            .replace(/^_|_$/g, "") || targetUserId;
        const dateStamp = new Date().toISOString().split("T")[0];

        const isPdf = format === "pdf";
        const buffer = isPdf
            ? await renderCvVariantHtmlToPdf(cvVariantHtml)
            : await renderCvVariantHtmlToDocx(cvVariantHtml);

        const mimeType = isPdf
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        const filename = `${filenameSlug}_CV_Variant_Preview_${dateStamp}.${isPdf ? "pdf" : "docx"}`;

        logger.info(`[PreviewCvVariant] Rendered preview for user ${targetUserId} (not persisted)`);
        return { buffer, filename, mimeType };
    }

    /**
     * Renders the (admin-reviewed/formatted) Interview Pack — rich-text HTML
     * combining all 4 stage results, built on the frontend — into a PDF or
     * DOCX file, uploads it to Firebase, and records it as an `otherDocs`
     * Upload for the client.
     */
    static async saveInterviewPack(
        targetUserId: string,
        resumeUploadId: string,
        interviewPackHtml: string,
        format: "pdf" | "docx",
    ): Promise<{ upload: Upload; clientName: string }> {
        logger.info(`[SaveInterviewPack] User ${targetUserId}, format ${format}`);

        if (!interviewPackHtml?.trim()) {
            throw new ErrorHandler("Interview pack content is required", 400);
        }

        const resumeUpload = await Upload.findOne({
            where: { id: resumeUploadId, userId: targetUserId, type: "resume" },
        });
        if (!resumeUpload) {
            throw new ErrorHandler("Resume not found or does not belong to user", 404);
        }

        const user = await User.findByPk(targetUserId);
        const clientName = user
            ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || targetUserId
            : targetUserId;
        const filenameSlug = clientName
            .replace(/[^a-zA-Z0-9]+/g, "_")
            .replace(/^_|_$/g, "") || targetUserId;
        const dateStamp = new Date().toISOString().split("T")[0];

        const isPdf = format === "pdf";
        const buffer = isPdf
            ? await htmlToPdfBuffer(interviewPackHtml)
            : await htmlToDocxBuffer(interviewPackHtml);

        const mimeType = isPdf
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        const filename = `${filenameSlug}_Interview_Pack_${dateStamp}.${isPdf ? "pdf" : "docx"}`;

        const uploadResult = await uploadBufferToStorage(buffer, filename, {
            folder: `interview-packs/${targetUserId}`,
            mimeType,
        });

        const upload = await Upload.create({
            userId: targetUserId,
            type: UploadType.OTHER_DOCS,
            document: {
                url: uploadResult.url,
                publicId: uploadResult.publicId,
                name: uploadResult.name,
                size: uploadResult.size,
                mimeType: uploadResult.mimeType,
            },
            status: UploadStatus.REVISED,
            source: UploadSource.ADMIN,
            // Admin-generated documents start inactive — the client can't
            // see it until a staff member reviews and activates it via
            // PATCH /uploads/:id/activate.
            isActive: false,
        });

        logger.info(`[SaveInterviewPack] Saved interview pack upload ${upload.id} for user ${targetUserId}`);
        return { upload, clientName };
    }

    /**
     * Renders the same file saveInterviewPack would produce, via the
     * identical render call — but skips the Firebase upload and Upload
     * record, so nothing here is visible to the client. Lets an admin
     * download and sanity-check the rendered file before deciding to save
     * it for real.
     */
    static async previewInterviewPack(
        targetUserId: string,
        resumeUploadId: string,
        interviewPackHtml: string,
        format: "pdf" | "docx",
    ): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
        logger.info(`[PreviewInterviewPack] User ${targetUserId}, format ${format}`);

        if (!interviewPackHtml?.trim()) {
            throw new ErrorHandler("Interview pack content is required", 400);
        }

        const resumeUpload = await Upload.findOne({
            where: { id: resumeUploadId, userId: targetUserId, type: "resume" },
        });
        if (!resumeUpload) {
            throw new ErrorHandler("Resume not found or does not belong to user", 404);
        }

        const user = await User.findByPk(targetUserId);
        const clientName = user
            ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || targetUserId
            : targetUserId;
        const filenameSlug = clientName
            .replace(/[^a-zA-Z0-9]+/g, "_")
            .replace(/^_|_$/g, "") || targetUserId;
        const dateStamp = new Date().toISOString().split("T")[0];

        const isPdf = format === "pdf";
        const buffer = isPdf
            ? await htmlToPdfBuffer(interviewPackHtml)
            : await htmlToDocxBuffer(interviewPackHtml);

        const mimeType = isPdf
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        const filename = `${filenameSlug}_Interview_Pack_Preview_${dateStamp}.${isPdf ? "pdf" : "docx"}`;

        logger.info(`[PreviewInterviewPack] Rendered preview for user ${targetUserId} (not persisted)`);
        return { buffer, filename, mimeType };
    }

}
