export interface ResumeReview {
  csr: boolean;
  pc: boolean;
  hr: boolean;
  po: boolean;
}

export interface ServiceHistory {
  from: string;
  to: string;
  date: Date;
}

// Upload Document Types
export interface WorkExperience {
  jobTitle: string;
  organization: string;
  dates: string;
  description: string;
}

export interface Education {
  degree: string;
  organization: string;
  description: string;
  dates: string;
}

export interface CertificationLicense {
  name: string;
  organization: string;
  dates: string;
  description: string;
}

export interface ProfessionalAssociation {
  name: string;
  organization: string;
  dates: string;
  description: string;
}

export interface CvDataPoints {
  cvType: "native" | "refined" | "extracted" | "default";
  contactInformation: string;
  professionalSummary: string;
  workExperience: WorkExperience[];
  education: Education[];
  skills: string[];
  achievements: string[];
  certificationsLicenses: CertificationLicense[];
  relevantProjects: string[];
  languages: string[];
  professionalAssociationsVolunteerWork: ProfessionalAssociation[];
}

export interface DocumentFile {
  url?: string;
  publicId?: string;
  name?: string;
  size?: number;
  mimeType?: string;
  [key: string]: unknown;
}
