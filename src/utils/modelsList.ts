import { JCTrigger } from "../models/v1/jctrigger.model";
import { Aggregator } from "../models/v1/aggregator.model";
import { Application } from "../models/v1/application.model";
import { ApplicationSummary } from "../models/v1/customer-summary.model";
import BlacklistedToken from "../models/v1/blacklistedToken.model";
import { CustomerService } from "../models/v1/customer-service.model";
import { Feature } from "../models/v1/feature.model";
import { InterviewPrepQuestionAnswer } from "../models/v1/interview-prep.model";
import { Location } from "../models/v1/location.model";
import OTPToken from "../models/v1/otpToken.model";
import { Partner } from "../models/v1/partner.model";
import { Plan } from "../models/v1/plan.model";
import { Profile } from "../models/v1/profile.model";
import { Referrer } from "../models/v1/referrer.model";
import { Resource } from "../models/v1/resources.model";
import { SalesConsultant } from "../models/v1/sales-consultant.model";
import { Session } from "../models/v1/session.model";
import { Upload } from "../models/v1/upload.model";
import { UploadRecycle } from "../models/v1/upload-recycle.model";
import { UserPermission } from "../models/v1/user-permissions.model";
import { User } from "../models/v1/user.model";
import { Credentials } from "../models/v1/credentials.model";
import { Schedule } from "../models/v1/schedule.model";
import { ClientAvailability } from "../models/v1/client-availability.model";
import { InterviewPrepEvidence } from "../models/v1/interview-prep-evidence.model";
import { Message } from "../models/v1/message.model";
import { Chat } from "../models/v1/chat.model";
import { SubscriptionAllocation } from "../models/v1/subscription-allocation.model";
import { AdminControl } from "../models/v1/admin-control.model";
import { SystemConfig } from "../models/v1/system-config.model";
import { AuditTrail } from "../models/v1/audit-trail.model";
import { UnsubscribedUser } from "../models/v1/unsubscribed-user.model";
import { Promotion, PromotionLength } from "../models/v1/promotion.model";


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
  InterviewPrepEvidence,
  Message,
  Chat,
  SubscriptionAllocation,
  AdminControl,
  SystemConfig,
  AuditTrail,
  UnsubscribedUser,
  Promotion,
  PromotionLength,
];
