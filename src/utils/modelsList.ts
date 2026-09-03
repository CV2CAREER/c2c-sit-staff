import { JCTrigger } from '../models/v1/jctrigger.model';
import { Aggregator } from '../models/v1/aggregator.model';
import { Application } from '../models/v1/application.model';
import { ApplicationSummary } from '../models/v1/customer-summary.model';
import BlacklistedToken from '../models/v1/blacklistedToken.model';
import { CustomerService } from '../models/v1/customer-service.model';
import { Feature } from '../models/v1/feature.model';
import { InterviewPrepQuestionAnswer } from '../models/v1/interview-prep.model';
import { Location } from '../models/v1/location.model';
import OTPToken from '../models/v1/otpToken.model';
import { Partner } from '../models/v1/partner.model';
import { Plan } from '../models/v1/plan.model';
import { Profile } from '../models/v1/profile.model';
import { Referrer } from '../models/v1/referrer.model';
import { Resource } from '../models/v1/resources.model';
import { SalesConsultant } from '../models/v1/sales-consultant.model';
import { Session } from '../models/v1/session.model';
import { Upload } from '../models/v1/upload.model';
import { UploadRecycle } from '../models/v1/upload-recycle.model';
import { UserPermission } from '../models/v1/user-permissions.model';
import { User } from '../models/v1/user.model';
import { Credentials } from '../models/v1/credentials.model';
import { Schedule } from '../models/v1/schedule.model';
import { ClientAvailability } from '../models/v1/client-availability.model';
import { JobsiteCredential } from '../models/v1/jobsite-credential.model';
import { JobsiteCredentialAudit } from '../models/v1/jobsite-credential-audit.model';
import { InterviewPrepEvidence } from '../models/v1/interview-prep-evidence.model';
import { Message } from '../models/v1/message.model';
import { Chat } from '../models/v1/chat.model';
import { SubscriptionAllocation } from '../models/v1/subscription-allocation.model';
import { AdminControl } from '../models/v1/admin-control.model';
import { SystemConfig } from '../models/v1/system-config.model';
import { AuditTrail } from '../models/v1/audit-trail.model';
import { UnsubscribedUser } from '../models/v1/unsubscribed-user.model';
import { Promotion, PromotionLength } from '../models/v1/promotion.model';
import { Blog } from '../models/v1/blog.model';
import { TrainingTracker } from '../models/v1/training-tracker.model';
import { TrainingTrackerSession } from '../models/v1/training-tracker-session.model';
import { SalesOperation } from '../models/v1/sales-operation.model';
import { CRTracking } from '../models/v1/cr-tracking.model';
import { CRTrackingHistory } from '../models/v1/cr-tracking-history.model';
import { CROwner } from '../models/v1/cr/owner.model';
import { CRChange } from '../models/v1/cr/change.model';
import { CRSeverity } from '../models/v1/cr/severity.model';
import { CRFamily } from '../models/v1/cr/family.model';
import { CRStage } from '../models/v1/cr/stage.model';
import { CRType } from '../models/v1/cr/type.model';
import { CRPersona } from '../models/v1/cr/persona.model';
import { CRProvider } from '../models/v1/cr/provider.model';
import { CRNode } from '../models/v1/cr/node.model';
import { CREOT } from '../models/v1/cr-eot.model';
import { Setting } from '@/models/v1/settings.model';
import { Log } from '@/models/v1/log.model';
import { ViewAsRule } from '../models/v1/view-as-rule.model';
import { SupportConversation } from '../models/v1/chat-message.model';
import { SupportSession } from '../models/v1/support-session.model';
import { SlackMessage } from '../models/v1/slack-message.model';
import AuditLog from '@/models/v1/audit-log.model';
import PassKeyVault from '@/models/v1/passkey-vault.model';
import { UserPreferenceHistory } from '../models/v1/user-preference-history.model';
import { AccessLevel } from '../models/v1/access-level.model';
import { AccessRule } from '../models/v1/access-rule.model';
import { UserAccessLevel } from '../models/v1/user-access-level.model';
import { CommunicationTemplate } from '../models/v1/communication-template.model';
import { ClientContent } from '../models/v1/client-content.model';
import { CvRevamp } from '@/models/v1/cv-revamp.model';
import { VCSPrompt, VCS } from '../models/v1/keyword-population.model';
import { VCSPromptUsageLog } from '../models/v1/vcs-prompt-usage-log.model';
import { VCSPromptSimulationRun } from '../models/v1/vcs-prompt-simulation.model';
import { MissingInfoRequest } from '../models/v1/missing-info-request.model';
import { MissingInfoTemplate } from '../models/v1/missing-info-template.model';
import { MissingInfoTemplateField } from '../models/v1/missing-info-template-field.model';
import { MissingInfoResponse } from '../models/v1/missing-info-response.model';
import { ManualApplication } from '../models/v1/manual-application.model';
import { ClientSupportDocument } from '../models/v1/client-support-document.model';
import { EmailLog } from "../models/v1/email-log.model";
import { EmailTemplate } from "../models/v1/email-template.model";
import { InterviewPackProcess } from "../models/v1/interview-pack-process.model";
import { TourCount } from '../models/v1/tour-count.model';
import { CredentialsTour } from '../models/v1/credentials-tour.model';
import { CredentialsComment } from '../models/v1/credentials-comment.model';
import { ClientJourneyStep } from "../models/v1/client-journey-step.model";
import { AiVettingComparison } from '../models/v1/ai-vetting-comparison.model';
import { PreferenceQuestion } from '../models/v1/preference-question.model';
import { DropdownOption } from '../models/v1/dropdown-option.model';
import { JustCallEvent } from '../models/v1/justcall-event.model';
import { JustCallEventLog } from '../models/v1/justcall-event-log.model';
import { JustCallMessageEvent } from '../models/v1/justcall-message.model';
import { JustCallMessageEventLog } from '../models/v1/justcall-message-log.model';
import { JustCallWhatsAppMessage } from '../models/v1/justcall-whatsapp-message.model';
import { JustCallWhatsAppMessageLog } from '../models/v1/justcall-whatsapp-message-log.model';
import { JustCallSalesDialerCall } from '../models/v1/justcall-sales-dialer-call.model';
import { JustCallSalesDialerCallLog } from '../models/v1/justcall-sales-dialer-call-log.model';
import { JustCallContact } from '../models/v1/justcall-contact.model';
import { JustCallContactLog } from '../models/v1/justcall-contact-log.model';
import { JustCallAppointment } from '../models/v1/justcall-appointment.model';
import { JustCallAppointmentLog } from '../models/v1/justcall-appointment-log.model';
import { SendGridEvent } from '../models/v1/sendgrid-event.model';
import { SendGridEventLog } from '../models/v1/sendgrid-event-log.model';

export const modelList = [
  User,
  Credentials,
  UserPermission,
  Profile,
  OTPToken,
  Plan,
  Feature,
  Location,
  Aggregator,
  Application,
  ManualApplication,
  ApplicationSummary,
  CustomerService,
  InterviewPrepQuestionAnswer,
  Partner,
  Referrer,
  Resource,
  SalesConsultant,
  Session,
  Upload,
  UploadRecycle,
  JCTrigger,
  BlacklistedToken,
  Schedule,
  ClientAvailability,
  JobsiteCredential,
  JobsiteCredentialAudit,
  InterviewPrepEvidence,
  Message,
  Chat,
  AdminControl,
  SystemConfig,
  AuditTrail,
  UnsubscribedUser,
  Promotion,
  PromotionLength,
  Blog,
  TrainingTracker,
  TrainingTrackerSession,
  SalesOperation,
  CROwner,
  CRChange,
  CRSeverity,
  CRFamily,
  CRStage,
  CRType,
  CRPersona,
  CRProvider,
  CRNode,
  CRTracking,
  CRTrackingHistory,
  CREOT,
  SlackMessage,
  Setting,
  Log,
  ViewAsRule,
  SupportConversation,
  SupportSession,
  AccessLevel,
  AccessRule,
  UserAccessLevel,
  CommunicationTemplate,
  ClientContent,
  AuditLog,
  PassKeyVault,
  SubscriptionAllocation,
  UserPreferenceHistory,
  CvRevamp,
  VCSPrompt,
  VCS,
  VCSPromptUsageLog,
  VCSPromptSimulationRun,
  MissingInfoRequest,
  MissingInfoTemplate,
  MissingInfoTemplateField,
  MissingInfoResponse,
  ClientSupportDocument,
  EmailLog,
  EmailTemplate,
  InterviewPackProcess,
  TourCount,
  CredentialsTour,
  CredentialsComment,
  ClientJourneyStep,
  AiVettingComparison,
  PreferenceQuestion,
  DropdownOption,
  JustCallEvent,
  JustCallEventLog,
  JustCallMessageEvent,
  JustCallMessageEventLog,
  JustCallWhatsAppMessage,
  JustCallWhatsAppMessageLog,
  JustCallSalesDialerCall,
  JustCallSalesDialerCallLog,
  JustCallContact,
  JustCallContactLog,
  JustCallAppointment,
  JustCallAppointmentLog,
  SendGridEvent,
  SendGridEventLog,
];
