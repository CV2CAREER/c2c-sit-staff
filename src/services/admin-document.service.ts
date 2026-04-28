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
import { sendMail } from "../config/sendGrid";
import { SlackService } from "./slack.service";
import {
  SlackChannel,
  SlackEventType,
  SlackNode,
  SlackProvider,
  SlackSeverity,
} from "../utils/enum";
import { getEnvironmentFromHost } from "../utils/slack-helpers";
import path from "path";

const logger = getServiceLogger("document-service");
const mailDirectory = path.resolve(__dirname, "../views/emails");

export interface ExtractCvDataPointsPayload {
  id: string;
  cvType?: string;
}

export interface CvExtractionResult {
  upload: Upload;
  cvDataPoints: CvDataPoints;
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
    private static promptCache: { data: any; timestamp: number } | null = null;
    static async getActivePrompt(
        type: "keywords" | "roleTitles",
        increment: boolean,
        resumeText: string,
        existing?: string
    ): Promise<string> {
        // Cache prompts for 5 minutes
        if (!this.promptCache || Date.now() - this.promptCache.timestamp > 5 * 60 * 1000) {
            try {
                const { VCS, VCSPrompt } = await import('../models/v1/keyword-population.model');
                const foundVCS = await VCS.findOne({ where: { active: true } });
                if (foundVCS) {
                    const foundPrompt = await VCSPrompt.findByPk(foundVCS.activePromptId);
                    if (foundPrompt) {
                        this.promptCache = {
                            data: this.splitPromptIntoSections(foundPrompt.prompt),
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
        
        return `${basePrompt}\n\n${resumeText}${existingContent}`;
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
            templateDir: mailDirectory,
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
            const prompt = await this.getActivePrompt(type, increment, resumeText, existingContent);
            const aiResponse = await queryDigitalOceanAI(prompt);

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
                upload = await Upload.findOne({
                    where: { userId: uploadId, type: "resume", isDefault: true, isDeleted: false },
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

}
