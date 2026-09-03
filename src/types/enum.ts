export enum SlackChannel {
  CRY_WOLF = 'C06JUAXP73P',
  CHANGE_REQUESTS = 'C07BBMUMMFX',
  TOWN_CRIER = 'C0603SL8QJ0',
  PAYMENTS = 'C077H6PBBFS',
  // VA = 'C04FYK43Q2D',
  VA = 'C09HJKSS42E',
  FREE_TRIALS= 'C08PWPTA8FM',
}

export enum TableInformationEnum {
  ClientInformation = "client Information",
  ClientInformationRecycle = "client Information Recycle",
  AnsweredQuestions = "answered Questions",
  JobApplications = "job_applications",
}

export enum AppQuePageEnum {
  applicationsPage = "applicationsPage",
  applicationsPageRecycle = "applicationsPageRecycle",
  questionsPage = "questionsPage",
  questionsPageRecycle = "questionsPageRecycle",
  failedJobsPage = "failedJobsPage",
}

export enum ClientTableInformationEnum {
  All = 'all',
  Seek = 'seek',
  SeekStage = 'seek_stage',
  SeekRecycle = 'seek Recycle',
  Jobserve = 'jobserve',
  JobserveStage = 'jobserve_stage',
  JobserveRecycle = 'jobserve Recycle',
  Indeed = 'indeed',
  IndeedRecycle = 'indeed Recycle',
  Linkedin = 'linkedin',
  LinkedinRecycle = 'linkedin Recycle',
  Monster = 'monster',
  MonsterRecycle = 'monster Recycle',
  MichaelPage = 'michael_page',
  MichaelPageStage = 'michael_page_stage',
  MichaelPageRecycle = 'michael_page Recycle',
  Randstad = 'randstad',
  RandstadStage = 'randstad_stage',
  RandstadRecycle = 'randstad Recycle',
  Jora = 'jora',
  JoraStage = 'jora_stage',
  JoraRecycle = 'jora Recycle',
  Reed = 'reed',
  ReedStage = 'reed_stage',
  Adecco = 'adecco',
  AdeccoStage = 'adecco_stage',
  AdeccoRecycle = 'adecco Recycle',
  ReedRecycle = 'reed Recycle',
  WorkforceAustralia = 'workforceaustralia',
  WorkforceAustraliaRecycle = 'workforceaustralia Recycle',
  EscapeCity = 'escapecity',
  EscapeCityRecycle = 'escapecity Recycle',
  NHSJobs = 'nhsjobs',
  NHSJobsRecycle = 'nhsjobs Recycle',
  Adzuna = 'adzuna',
  AdzunaStage = 'adzuna_stage',
  AdzunaRecycle = 'adzuna Recycle',
  CareerOne = 'careerone',
  CareerOneStage = 'careerone_stage',
  CareerOneRecycle = 'careerone Recycle',
  JobBank = 'jobbank',
  JobBankStage = 'jobbank_stage',
  JobBankRecycle = 'jobbank Recycle',
  CVLibrary = 'cvlibrary',
  CVLibraryRecycle = 'cvlibrary Recycle',
  ClientSample = 'sample_results',
  ClientSampleRecycle = 'sample Results Recycle',
  JobApplications = 'job_applications',
  JobApplicationsRecycle = 'job Applications Recycle',
  AnsweredQuestions = 'answered Questions',
  AnsweredQuestionsRecycle = 'answered Questions Recycle',
  Campaign = 'campaign',
  Discovery = 'discovery'
}

export enum CelltypeEnum {
  link = "link",
  text = "text",
  toggle = "toggle",
  date = "date",
  options = "options",
  multi = "multi",
  optionsdisplay = "optionsdisplay",
  boolean = "boolean",
  number = "integer",
}

export type CellDetailType = {
  type: CelltypeEnum;
  value: any;
  highlighted?: boolean;

  editable?: boolean;
  externalLink: string;
  rowId: string;
  columnName: string;
};
export type ClientCellDetailType = {
  type: CelltypeEnum;
  value: any;
  highlighted: boolean;
  editable: boolean;
  rowId: string;
  columnName: string;
  credentialId: string;
};
// Document status
export enum docStatus {
  APPROVED = "Accepted",
  REJECTED = "Rejected",
  REVISED = "Revised",
  PENDING = "Pending",
}

// Aggregator currently supported for verification
export const Jobsite = {
  SEEK: "SEEK",
  JOBSERVE: "JOBSERVE",
  LINKEDIN: "LinkedIn",
  INDEED: "INDEED",
  MONSTER: "MONSTER",
  JORA: "JORA",
  WORKFORCEAUSTRALIA: "WORKFORCEAUSTRALIA",
  ESCAPECITY: "ESCAPECITY",
  NHS_JOBS: "NHSJOBS",
  CV_LIBRARY: "CVLIBRARY",
  ADZUNA: "ADZUNA",
  ADECCO: "ADECCO",
  CAREERONE: "CAREERONE",
  REED: "REED",
};

// All Available Plans Offer Including FREE One
export enum AllPlans {
  // EMERALD = 'Emerald',
  BRONZE = "Bronze",
  SILVER = "Silver",
  GOLD = "Gold",
  PLATINUM = "Platinum",
  COPPER = "Copper",
}

export enum Length {
  OTP = 6,
  REFERRAL_CODE = 12,
  PASSWORD = 15,
  // eslint-disable-next-line
  SALT = 12,
}

export enum InviteeStatus {
  PENDING = "Pending",
  ACCEPTED = "Accepted",
  EXPIRED = "Expired",
}

export enum UserRoles {
  ADMIN = "admin",
  CLIENT = "client",
  GUEST = "guest",
  SALES = "sales",
  COACH = "coach",
  PARTNER = "partner",
  CSE = "customer",
  ASSISTANT = "assistant",
  TEST = "test",
  TPC = "tpc",
  PC = "pc",
  CEC = "cec"
}

export enum Referral {
  EARNING = 50,
}

export enum PreProgress {
  SIGNEDUP = "Signed Up",
  EMAILVERIFIED = "Email Verified",
  UPLOADEDDOC = "Uploaded Doc",
  PREFERENCEINSERTED = "Preference Inserted",
}

export const StagingBots: Record<
  string,
  {
    bot: string;
    droplet: string;
    container: string;
    username: string;
    docker: boolean;
  }
> = {
  SEEK: {
    bot: "seek",
    droplet: "170.64.141.159",
    container: "seek-sample-script",
    username: "root",
    docker: true,
  },
  JORA: {
    bot: "jora",
    droplet: "170.64.175.62",
    container: "jora",
    username: "root",
    docker: true,
  },
  // LINKEDIN: {
  //   bot: 'linkedin',
  //   droplet: '170.64.144.201',
  //   container: 'container1',
  //   username: 'root',
  //   docker: false,
  // },
  JOBSERVE: {
    bot: "jobserve",
    droplet: "170.64.175.62",
    container: "jora-sample-script",
    username: "root",
    docker: false,
  },
  REED: {
    bot: "reed",
    droplet: "170.64.234.40",
    container: "reed",
    username: "root",
    docker: true,
  },
};

export enum ButtonType {
  PRIMARY = "btn-primary",
  SECONDARY = "btn-secondary",
  DISABLED = "btn-disabled",
  DELETE = "btn-danger",
}

export enum TextInputType {
  NUMBER = "number",
  TEXT = "text",
  PASSWORD = "password",
  EMAIL = "email",
  DATE = "date",
}

export enum ClientMilestoneRange {
  LAST_24_HRS = "last-24-hrs",
  THIS_WEEK = "this-week",
  THIS_MONTH = "this-month",
  
}

export enum ClientMilestoneStatus {
  SUCCESSFUL = "Successful",
  FAILED = "Failed",
  IN_PROGRESS = "In Progress",
  EXPIRED = "Expired",
  SKIPPED = "Skipped",
}