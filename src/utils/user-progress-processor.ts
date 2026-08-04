import { User } from "../models/v1/user.model";
import { Upload } from "../models/v1/upload.model";
import { getServiceLogger } from "./createLogger";
import { fieldEncryption } from "./field-encryption";

const logger = getServiceLogger("user-progress-processor");

export const progressValues = {
    // Milestone 0 - Frontend: Email Verification
    EMAIL_VERIFIED: 'Email Verified',
    // Milestone 1 - Frontend: Document Accepted
    DOCUMENTS_ACCEPTED: 'Documents Accepted',
    DOCUMENTS_DECLINED: 'Documents Declined',
    CV_RESUME_UPLIFTED: 'CV/Resume Uplifted',
    // Milestone 2 - Frontend: Preference Update
    PREFERENCE_UPDATED: 'Preference Updated',
    // Milestone 3 - Frontend: Service Selection
    PLAN_SELECTED: 'Plan Selected',
    SERVICE_SELECTED: 'Service Selection',
    // Milestone 4 - Frontend: Payment Confirmation
    PAYMENT_CONFIRMED: 'Payment Confirmed',
    LOGIN_CREDENTIALS_VERIFIED: 'Login Credentials Verified',
    // Milestone 5 - Frontend: Social Follow Verification
    SOCIAL_FOLLOW_VERIFIED: 'Social Follow Verification',
    // Milestone 6 - Frontend: Jobsite Verification
    JOBSITE_VERIFIED: 'Jobsite Verification',
    // Milestone 7 - Frontend: CV Variant Dispatch
    CV_VARIANT_DISPATCHED: 'CV Variant Dispatch',
    // Milestone 8 - Frontend: Sample Results Review
    SAMPLE_RESULTS_DISPATCHED: 'Sample Results Dispatched',
    SAMPLE_RESULTS_ACCEPTED: 'Sample Results Accepted',
    SAMPLE_RESULTS_REVIEWED: 'Sample Results Review',
    // Milestone 9 - Frontend: Preparatory Session
    PREPARATORY_SESSION_ACCEPTED: 'Preparatory Session Accepted',
    PREPARATORY_SESSION_DECLINED: 'Preparatory Session Declined',
    PREPARATORY_SESSION_COMPLETED: 'Preparatory Session',
    // Milestone 10 - Frontend: Job Applications
    APPLICATION_COMMENCED: 'Application Commenced',
    APPLICATION_HOLD: 'Application Hold',
    APPLICATION_EXPIRED: 'Application Expired',
    JOB_APPLICATIONS_STARTED: 'Job Applications',
    // Pre-11th milestone: Offer Notification
    OFFER_NOTIFICATION_RECEIVED: 'Offer Notification Received',
    // Milestone 11 - Frontend: Campaign Ended
    CAMPAIGN_ENDED: 'Campaign Ended',
};

/**
 * Represents a valid Progress type.
 * @typedef {'Email Verified'|
 *           'Documents Accepted'|
 *           'Documents Declined'|
 *           'CV/Resume Uplifted'|
 *           'Preference Updated'|
 *           'Plan Selected'|
 *           'Service Selection'|
 *           'Payment Confirmed'|
 *           'Login Credentials Verified'|
 *           'Social Follow Verification'|
 *           'Jobsite Verification'|
 *           'CV Variant Dispatch'|
 *           'Sample Results Dispatched'|
 *           'Sample Results Accepted'|
 *           'Sample Results Review'|
 *           'Preparatory Session Accepted'|
 *           'Preparatory Session Declined'|
 *           'Preparatory Session'|
 *           'Application Commenced'|
 *           'Application Hold'|
 *           'Application Expired'|
 *           'Job Applications'|
 *           'Offer Notification Received'|
 *           'Campaign Ended'} Progress
 */
export type Progress = typeof progressValues[keyof typeof progressValues];

export class UserProgressProcessor {
    /**
     * Verifies the Email of a given user along with it's progress.
     * @async
     * @function
     * @param {string} email - The email to be verified.
     * @returns {Promise<Object|null>} - A Promise that resolves to the updated user object if successful, or null if the user with the specified email is not found.
     */
    verifyEmail = async (email: string) => {
        const id = await fieldEncryption.findUserByEmail(email);
        const user = id ? await User.findByPk(id) : null;
        
        if (!user) {
            return null;
        }

        await user.update({
            progress: progressValues.EMAIL_VERIFIED,
            isEmailVerified: true
        });

        return user;
    };

    verifyRevisedDoc = async (userId: string, docToupdate: any) => {
        const doc = await Upload.findOne({ where: { userId } });

        if (!doc) {
            return null;
        }

        await doc.update({
            ...docToupdate,
            progress: progressValues.CV_RESUME_UPLIFTED
        });

        return doc;
    }

    /**
     * Checks if a given value is a valid Progress type.
     * @param {string} user_id - The id of the user that progress wants to change.
     * @param {Progress} progress - The progress value to process.
     * @returns {Promise<Object|null>} - A Promise that resolves to the updated user object if successful, or null if the user with the specified email is not found.
     */
    updateUserProgress = async (user_id: string, progress: string) => {
        const progress_valid = Object.values(progressValues).includes(progress);
        // check if user has submitted a doc before
        const userUploads = await Upload.findAll({ 
            where: { 
                userId: user_id, 
                type: 'resume' 
            } 
        });

        if (userUploads.length > 1) {
            return;
        }

        if (!progress_valid) throw new Error('Invalid Progress');

        const user = await User.findByPk(user_id);
        
        if (!user) {
            return null;
        }

        await user.update({ progress });
        
        return user;
    };
}

export default UserProgressProcessor;