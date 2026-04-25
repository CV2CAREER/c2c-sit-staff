interface Document {
  url: string;
  name: string;
  size: number;
  mimeType: string;
  publicId: string;
}

interface CvDataPoints {
  cvType: string;
  skills: string[];
  education: any[];
  languages: string[];
  achievements: any[];
  workExperience: any[];
  relevantProjects: any[];
  contactInformation: string;
  professionalSummary: string;
  certificationsLicenses: any[];
  professionalAssociationsVolunteerWork: any[];
}

interface CvDataPoint {
  id: string;
  userId: string;
  type: string;
  status: string;
  document: Document;
  isDeleted: boolean;
  source: string;
  cvDataPoints: CvDataPoints | null;
  cvJobTitles: string[];
  keywords: string[];
  isDefault: boolean;
  approvedAt: string | null;
  approvedBy: string | null;
  rejectedAt: string | null;
  rejectedBy: string | null;
  rejectionReason: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UploadsResponse {
  success: boolean;
  message: string;
  data: {
    uploads: CvDataPoint[];
    count: number;
    page: number;
    limit: number;
  };
  statusCode: number;
}

export type { CvDataPoint, Document, CvDataPoints, UploadsResponse };