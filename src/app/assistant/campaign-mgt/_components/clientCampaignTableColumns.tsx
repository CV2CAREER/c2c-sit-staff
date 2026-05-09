import { Switch } from "@/components/ui/switch";

const baseCampaignColumns = [
  {
    field: "actions",
    headerName: "Actions",
    width: 80,
  },
]
const clientCampaignApplicationColumns = [
  "Advertiser",
  "All_Words",
  "Application_Source",
  "Category",
  "Classification",
  "Client",
  "Country",
  "Date_Advertised",
  "External_Jobsite",
  "Internal_Jobsite",
  "JobId",
  "Job_Title",
  "Job_Type",
  "Location",
  "Options",
  "Question",
  "Requestor",
  "Run_Source",
  "screenshot",
  "SeekAnswersSource",
  "Selection",
  "SelectionType",
  "Status",
  "Timestamp",
  "client_id",
  "id",
  "isDeleted",
  "updateBy",
  "ApplicationSubmittedBy"
];

const clientCampaignQuestionColumns = [
  "id",
  "Client",
  "External_Jobsite",
  "Internal_Jobsite",
  "isDeleted",
  "createdAt",
  "updatedAt",
  "Last_Updated_By",
  "Country",
  "JobId",
  "JobTitle",
  "Question",
  "Selection",
  "Radio",
  "Checkbox",
  "Date",
  "Text",
  "Textarea",
  "Duplicate",
  "Approved",
  "Question_Source",
  "Review",
  "Intelligence",
  "Cv_Body",
  "Ad_Body",
  "Ratings",
  "AI_Rating",
]

// Common columns across all models
const baseAggregatorColumns = [
  'id',
  'Master_Credential_Id',
  'Active',
  'Country',
  'Location',
  'Title_Include',
  'Title_Exclude',
  'Advertiser_Include',
  'Advertiser_Exclude',
  'Body_Include',
  'Body_Exclude',
  'Criteria_Acceptance',
  'updateBy',
  'isDeleted'
];

// Model-specific columns (base + specific)
const adzunaColumns = [
  ...baseAggregatorColumns,
  'All_Words',
  'Sort_By',
  'Date_Posted',
  'Salary_Min',
  'Salary_Max',
  'Job_Category',
  'Remote',
  'Distance',
  'Contract_Type',
  'Hours',
  'Requestor',
  'Keyword_Option',
];

const adeccoColumns = [
  ...baseAggregatorColumns,
  'All_Words',
  'Only_Remote',
  'Contract_Type',
  'Salary_Min',
  'Salary_Max',
  'Salary_Range',
  'Sort_By',
  'Last_Updated',
  'Location_Exclude',
  'Distance',
  'Include_Jobs_Without_Defined_Salary',
  'Keyword_Option',
];

const careeroneColumns = [
  ...baseAggregatorColumns,
  'All_Words',
  'Posted_Within',
  'Contract_Type',
  'Pay_Type',
  'Pay_Min',
  'Pay_Max',
  'Diversity_And_Inclusion',
  'Perks_And_Benefits',
  'Job_Category',
  'Industry',
  'Work_Authorisation',
  'Work_Mode',
  'Work_Type',
  'Skills',
  'Keywords',
  'Languages',
  'Licenses_And_Certifications',
  'Requestor',
  'Keyword_Option',
];

const cvlibraryColumns = [
  ...baseAggregatorColumns,
  'All_Words',
  'Remote',
  'Jobs_Type',
  'Salary_Min',
  'Salary_Max',
  'Salary_Type',
  'Sort_by',
  'Posted_date',
  'Industry',
  'Location_Exclude',
  'Distance',
  'Keyword_Option',
];

const escapecityColumns = [
  ...baseAggregatorColumns,
  'EscapeFactor',
  'Regions',
  'RemoteOptions',
  'RemoteOKThroughout',
  'ListingType',
  'WorkArea',
  'Function',
  'Industry',
  'RoleType',
  'Level',
  'Benefits',
  'Size',
  'UKVisaSponsor',
  'BCorpCertified',
  'Escape100Winner',
  'LocationInclude',
  'LocationExclude',
  'Keyword',
  'Keyword_Type',
  'PostedBy',
  'Distance',
  'Salary',
  'Listed',
  'Sort_By',
  'Total_Results',
  'Classification_Exclude',
  'Include_Cover_Letter',
  'Include_Remote_Working',
  'Include_Criteria',
  'Type_Exclude',
  'Login_Type',
  'updatedBy',
  'Keyword_Option',
];

const indeedColumns = [
  ...baseAggregatorColumns,
  'All_Words',
  'Keyword_Type',
  'Job_Language',
  'Jobs_Type',
  'Salary_Estimate',
  'Industry',
  'Company',
  'Developer_Skill',
  'Developer_Type',
  'Job_Category',
  'Exclude_Title',
  'Include_Title',
  'Grade_Level',
  'School_Subject',
  'Programming_Language',
  'Shift_and_Schedule',
  'Language_Requirement',
  'Finance_and_Accounting_Skills',
  'Sales_Skills',
  'Radius',
  'Relevance',
  'Remote',
  'Education_Level',
  'Posted_By',
  'Date_Posted',
  'Experience_Level',
  'Encourage_To_Apply',
  'Clearance_Type',
  'Travel_Requirement',
  'License',
  'Standards',
  'Keyword_Option',
];

const jobserveColumns = [
  ...baseAggregatorColumns,
  'Keyword',
  'Keyword_Type',
  'Eligibilities',
  'PostedBy',
  'Categories',
  'Industries',
  'Proximity',
  'Type',
  'Min',
  'Max',
  'Listed',
  'Sort_By',
  'Total_Results',
  'Location_Exclude',
  'Classification_Exclude',
  'Include_Cover_Letter',
  'Include_Remote_Working',
  'Include_Criteria',
  'Type_Exclude',
  'Login_Type',
  'Keyword_Option',
];

const joraColumns = [
  ...baseAggregatorColumns,
  'All_Words',
  'Keyword_Type',
  'Salary',
  'Jobs_Type',
  'Sort_By',
  'Distance',
  'Date_Posted',
  'Keyword_Option',
];

const linkedinColumns = [
  ...baseAggregatorColumns,
  'Keyword',
  'Keyword_Type',
  'Salary',
  'Location_Exclude',
  'Location_Include',
  'Experience',
  'Premise_Type',
  'Date_Posted',
  'Jobs_Type',
  'Company_Exclude',
  'Company_Include',
  'Industry',
  'Job_Function',
  'Commitments',
  'Distance',
  'Sort_by',
  'Under_10_applicants',
  'In_your_network',
  'Job_collections',
  'Keyword_Option',
];

const monsterColumns = [
  ...baseAggregatorColumns,
  'All_Words',
  'Keyword_Type',
  'Exclude_Title',
  'Include_Title',
  'Salary_Estimate',
  'Date_Posted',
  'Jobs_Type',
  'Remote',
  'Radius',
  'Keyword_Option',
];

const nhsjobsColumns = [
  ...baseAggregatorColumns,
  'All_Words',
  'Sort_By',
  'Location_Exclude',
  'Keyword_Option',
];

const reedColumns = [
  ...baseAggregatorColumns,
  'All_Words',
  'Keyword_Type',
  'Salary_Min',
  'Salary_Max',
  'Jobs_Type',
  'Classification',
  'Distance',
  'Remote',
  'Posted_By',
  'Date_Posted',
  'Keyword_Option',
];

const seekColumns = [
  ...baseAggregatorColumns,
  'Keyword',
  'Requestor',
  'Keyword_Type',
  'Classification',
  // 'Type',
  'Type_Name',
  'Min',
  'Max',
  'Listed',
  'Sort_By',
  'Total_Results',
  'Keyword_Option',
  'Location_Exclude',
  'Classification_Exclude',
  'Title_Filter_Inclusive',
  'Title_Filter_Exclusive',
  'Advertiser_Include_Regex',
  'Advertiser_Exclude_Regex',
  'Include_Cover_Letter',
  'Include_Criteria',
  'Type_Exclude'
];


//Remember to update the columns in the API response if you add new columns here 
const sampleResultsColumns = ['id', 'Client', 'Timestamp', 'Internal_Jobsite', 'External_Jobsite', 'All_Words', 'Status', 'Application_Mode', 'Category', 'Job_Title', 'JobId', 'Location', 'Job_Type', 'Date_Advertised', 'Requestor', 'Sample_Type', 'ApplicationSubmittedBy', 'MatchLevel'];

const workforceaustraliaColumns = [
  ...baseAggregatorColumns,
  'Remote',
  'Salary',
  'Work_Type',
  'Job_Age',
  'Tenure',
  'Vacancy_type',
  'Keyword',
  'Sort_By',
  'Company_Include',
  'Company_Exclude',
  'Requestor',
  'updatedBy',
  'Keyword_Option',
];

type ColumnKeys = {
  adecco: string[]
  adzuna: string[]
  questions: string[]
  job_applications: string[]
  sample_results: string[]
  careerone: string[]
  cvlibrary: string[]
  escapecity: string[]
  indeed: string[]
  jobserve: string[]
  jora: string[]
  linkedin: string[]
  monster: string[]
  nhsjobs: string[]
  reed: string[]
  seek: string[]
  workforceaustralia: string[]
}
const columnKeys: ColumnKeys = {
  adecco:adeccoColumns,
  adzuna: adzunaColumns,
  questions: clientCampaignQuestionColumns,
  job_applications: clientCampaignApplicationColumns,
  sample_results: sampleResultsColumns,
  careerone: careeroneColumns,
  cvlibrary: cvlibraryColumns,
  escapecity: escapecityColumns,
  indeed: indeedColumns,
  jobserve: jobserveColumns,
  jora: joraColumns,
  linkedin: linkedinColumns,
  monster: monsterColumns,
  nhsjobs: nhsjobsColumns,
  reed: reedColumns,
  seek: seekColumns,
  workforceaustralia: workforceaustraliaColumns 
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const handleTableHeader = (key: string, table: string) => {
  // let modifiedKey;

  // if((key === "updateBy" || key === "ApplicationSubmittedBy") && (table === "job_applications" || table === "sample_results")){
  //   return "Application Submitted By"
  // }

  if(key === "Keyword"){
    return "Keyword or Role Titles"
  }

  if(key === "Keyword_Option"){
    return "KW/RT Logic"
  }

  // Replace underscores with spaces, insert spaces before uppercase letters (camelCase), 
  // then capitalize each word
  const modifiedKey = key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (char) => char.toUpperCase());

  return modifiedKey
}

const renderCellAsSwitchArr = [
  "Active"
];

const campaignTableColumns = (table: string) => {
  return [
    ...baseCampaignColumns,
    ...columnKeys[table.replace("_stage", "") as keyof ColumnKeys]?.map((key: string) => {
      const headerName = handleTableHeader(key, table)
      if (renderCellAsSwitchArr.includes(key)) {
        return {
          field: key,
          headerName,
          width: 200,
          renderCell: (params: any) => {
            const checked = !!params.value;
            return (
              <Switch
                checked={checked}
                className={checked ? "bg-green-600" : "bg-red-600"}
              />
            );
          },
        };
      }
      if (key.toLocaleLowerCase() === 'keyword_option') {
        return {
          field: key,
          headerName: 'KW/RT Logic',
          width: 200,
          type: key,
          renderCell: (params: any) => {
            const formatText = (text: any) =>
              text?.split('_') 
                .map((word: any) => word.charAt(0).toUpperCase() + word.slice(1)) 
                .join(' '); 

            return <span>{formatText(params.value)}</span>;
          },
          // headerClassName: 'bg-[#80D7FF] capitalize',
        };
      }
      if (key === "Job_Title") {
        return {
          field: key,
          headerName,
          width: 300,
          renderCell: (params: any) => {
            const jobTitle = params.value;
            const regex = /<a href="([^"]+)"[^>]*>(.*?)<\/a>/;
            const match = jobTitle.match(regex);

            if (match && match.length === 3) {
              const href = match[1];
              const text = match[2];
              return (
                <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {text}
                </a>
              );
            }
            return <span>{jobTitle}</span>;
          },
        };
      }
      return {
        field: key,
        headerName,
        width: 180
      }
    })
  ] as any[]
}

export const singleCampaignColumns = (value: string| undefined) => {
  return campaignTableColumns(value as string)
}
