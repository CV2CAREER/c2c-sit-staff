interface CvDataPoint {
  id: string ;
  customerId: string;
  fullName: string;
  document?: Array<{
    fileUrl: string;
    filename: string;
  }>;
  source?: string;
  cvType?: string;
  contactInformation?: string;
  professionalSummary?: string;
  workExperience?: Array<{
    jobTitle: string;
    organization: string;
    dates: string;
    description?: string;
  }>;
  education?: Array<{
    degree: string;
    organization: string;
    dates: string;
  }>;
  skills?: string[];
  achievements?: string[];
  certificationsLicenses?: Array<{
    name: string;
    organization: string;
    dates: string;
    description?: string;
  }>;
  relevantProjects?: string[];
  languages?: string[];
  professionalAssociationsVolunteerWork?: string[];
  cvJobTitles?: string; // JSON string of job titles
}

// Export the interface for use in other components
export type { CvDataPoint };