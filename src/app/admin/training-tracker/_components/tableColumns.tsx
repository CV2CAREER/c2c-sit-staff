import { GridColDef, GridRenderCellParams } from "@mui/x-data-grid-pro";
import moment from "moment";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const getBaseColumns = (
  getActions: ({ id, row }: { id: any; row: any }) => React.JSX.Element[],
  getUserFullName: (userId: string) => string,
  getCoachFullName: (coachId: string) => string,
  user: any[],
  activeCoach: any[] | null
) => {
  const columns: GridColDef[] = [
    {
      field: "actions",
      type: "actions",
      headerName: "Actions",
      width: 100,
      getActions,
    },
    {
      field: "traineeId",
      headerName: "Full Name",
      width: 200,
      editable: true,
      type: "singleSelect",
      valueOptions: user.map((u) => ({
        value: u._id || u.id,
        label: `${u.firstName} ${u.lastName}`,
      })),
      renderCell: (params: any) => {
        if (params.row.fullName) return params.row.fullName;
        const u = params.row.user;
        if (u) return `${u.firstName} ${u.lastName}`;
        return getUserFullName(params.value);
      },
      renderEditCell: (params) => (
        <Select
          onValueChange={(value) =>
            params.api.setEditCellValue({
              id: params.id,
              field: params.field,
              value,
            })
          }
          value={params.value}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select Trainee" />
          </SelectTrigger>
          <SelectContent>
            {user.map((u) => (
              <SelectItem key={u._id || u.id} value={u._id || u.id}>
                {`${u.firstName} ${u.lastName}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    {
      field: "coachId",
      headerName: "Coach",
      width: 200,
      type: "singleSelect",
      valueOptions: activeCoach?.map((c) => ({
        value: c._id || c.id,
        label: c.fullName,
      })),
      editable: true,
      renderCell: (params: any) => {
        const pc = params.row.pc;
        if (pc) return `${pc.firstName} ${pc.lastName}`;
        return getCoachFullName(params.value);
      },
      renderEditCell: (params) => (
        <Select
          onValueChange={(value) =>
            params.api.setEditCellValue({
              id: params.id,
              field: params.field,
              value,
            })
          }
          value={params.value}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select Coach" />
          </SelectTrigger>
          <SelectContent>
            {activeCoach?.map((coach) => (
              <SelectItem key={coach._id || coach.id} value={coach._id || coach.id}>
                {coach.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    {
      field: "sessionNumber",
      headerName: "Session Number",
      width: 150,
      type: "singleSelect",
      editable: true,
      valueOptions: [1, 2, 3, 4],
    },
    {
      field: "date",
      headerName: "Date",
      width: 150,
      type: "date",
      editable: true,
      valueGetter: (params: any) =>
        params?.value ? moment(params.value).toDate() : null,
      renderCell: (params: GridRenderCellParams) => (
        <div className="w-full justify-start">
          <p>{params?.row?.date ? moment(params.row.date).format("YYYY-MM-DD") : ""}</p>
        </div>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      width: 160,
      type: "singleSelect",
      editable: true,
      valueOptions: ["Pending", "In Progress", "Completed", "Cancelled", "Upcoming", "No Show"],
    },
    {
      field: "notes",
      headerName: "Notes",
      width: 250,
      editable: true,
    },
    {
      field: "progress",
      headerName: "Progress",
      width: 160,
      editable: true,
      type: "singleSelect",
      valueOptions: ["Pro-Bono", "Prospects", "Onboarding", "in-Flight"],
    },
    {
      field: "reworkType",
      headerName: "Rework Type",
      editable: true,
      width: 160,
      type: "singleSelect",
      valueOptions: ["Light-Touch", "Partial", "Complete", "Nil"],
    },
    {
      field: "createdAt",
      headerName: "Date Received",
      width: 170,
      editable: false,
      renderCell: (params: GridRenderCellParams) => (
        <div className="w-full justify-start">
          <p>{moment(params?.row?.createdAt).format("YYYY-MM-DD HH:mm:ss")}</p>
        </div>
      ),
    },
    // ── Main Assessment Fields ──────────────────────────────────────────
    {
      field: "wmtycDecomposition",
      headerName: "WMTYC Decomposition",
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
      width: 200,
    },
    {
      field: "smeTechnicalDepth",
      headerName: "SME Technical Depth",
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
      width: 200,
    },
    {
      field: "deliverablesQuantification",
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
      headerName: "Deliverables Quantification",
      width: 200,
    },
    {
      field: "locationYearroleInTimeExample",
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
      headerName: "Location Year/Role In Time Example",
      width: 220,
    },
    {
      field: "selfPronounUsage",
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
      headerName: "Self Pronoun Usage",
      width: 200,
    },
    {
      field: "businessDeliverables",
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
      headerName: "Business Deliverables",
      width: 200,
    },
    {
      field: "grammardictioncommunication",
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
      headerName: "Grammar Diction Communication",
      width: 220,
    },
    {
      field: "personabilitylikeabilityhumor",
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
      headerName: "Personability Likeability Humor",
      width: 220,
    },
    {
      field: "respectcurtesy",
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
      headerName: "Respect Courtesy",
      width: 200,
    },
    {
      field: "appearance",
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
      headerName: "Appearance",
      width: 200,
    },
    {
      field: "assessment",
      headerName: "Assessment",
      type: "number",
      width: 150,
      editable: false,
    },
    // ── PC Assessment Fields ───────────────────────────────────────────
    {
      field: "pleasantriessmallTalk",
      headerName: "Pleasantries Small Talk",
      width: 200,
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
    },
    {
      field: "sessionObjectives",
      headerName: "Session Objectives",
      width: 200,
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
    },
    {
      field: "professionIntroduction",
      headerName: "Profession Introduction",
      width: 200,
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
    },
    {
      field: "kpiDescriptionWithExamples",
      headerName: "KPI Description With Examples",
      width: 220,
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
    },
    {
      field: "cvresumeRendition",
      headerName: "CV Resume Rendition",
      width: 200,
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
    },
    {
      field: "respectcourtesyempathyhumility",
      headerName: "Respect Courtesy Empathy Humility",
      width: 240,
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
    },
    {
      field: "kpiCollaborativeScoring",
      headerName: "KPI Collaborative Scoring",
      width: 200,
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
    },
    {
      field: "recordingAvailabilitySurvey",
      headerName: "Recording Availability Survey",
      width: 220,
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
    },
    {
      field: "maximumNumberOfQuestions",
      headerName: "Maximum Number Of Questions",
      width: 220,
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
    },
    {
      field: "complementingpositiveFeedback",
      headerName: "Complementing Positive Feedback",
      width: 220,
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
    },
    {
      field: "clientMultipleGosOnAllQs",
      headerName: "Client Multiple Gos On All Qs",
      width: 220,
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
    },
    {
      field: "timeUtilization",
      headerName: "Time Utilization",
      width: 200,
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
    },
    {
      field: "clientStoryResponses",
      headerName: "Client Story Responses",
      width: 200,
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
    },
    {
      field: "partingQuestions",
      headerName: "Parting Questions",
      width: 200,
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
    },
    {
      field: "timeKeeping",
      headerName: "Time Keeping",
      width: 200,
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
    },
    {
      field: "fillerPhrases",
      headerName: "Filler Phrases",
      width: 200,
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
    },
    {
      field: "intermittentClarificationRequest",
      headerName: "Intermittent Clarification Request",
      width: 220,
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
    },
    {
      field: "perfectAlternateResponses",
      headerName: "Perfect Alternate Responses",
      width: 220,
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
    },
    {
      field: "audiovisualRoomLighteningSetup",
      headerName: "Audiovisual Room Lightening Setup",
      width: 240,
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
    },
    {
      field: "pcAssessment",
      headerName: "PC Assessment",
      type: "number",
      width: 150,
      editable: false,
    },
    // ── Background / Profile Fields ────────────────────────────────────
    {
      field: "preferredCraft",
      headerName: "Preferred Craft",
      width: 180,
      editable: true,
    },
    {
      field: "undergrad",
      headerName: "Undergrad",
      width: 180,
      editable: true,
    },
    {
      field: "postgrad",
      headerName: "Postgrad",
      width: 180,
      editable: true,
    },
    {
      field: "training",
      headerName: "Training",
      width: 180,
      editable: true,
    },
    {
      field: "experience",
      headerName: "Experience",
      width: 180,
      editable: true,
    },
    // ── Session / Scheduling Fields ────────────────────────────────────
    {
      field: "coachingContact",
      headerName: "Coaching Contact",
      width: 170,
      type: "date",
      editable: true,
      valueGetter: (params: any) =>
        params?.value ? moment(params.value).toDate() : null,
      renderCell: (params: any) => (
        <div className="w-full justify-start">
          <p>{params?.row?.coachingContact ? moment(params.row.coachingContact).format("YYYY-MM-DD") : ""}</p>
        </div>
      ),
    },
    {
      field: "coachingBooking",
      headerName: "Coaching Booking",
      width: 170,
      type: "date",
      editable: true,
      valueGetter: (params: any) =>
        params?.value ? moment(params.value).toDate() : null,
      renderCell: (params: any) => (
        <div className="w-full justify-start">
          <p>{params?.row?.coachingBooking ? moment(params.row.coachingBooking).format("YYYY-MM-DD") : ""}</p>
        </div>
      ),
    },
    {
      field: "start",
      headerName: "Start Time",
      width: 140,
      type: "singleSelect",
      editable: true,
      valueOptions: [
        "00.00","00.30","01.00","01.30","02.00","02.30","03.00","03.30",
        "04.00","04.30","05.00","05.30","06.00","06.30","07.00","07.30",
        "08.00","08.30","09.00","09.30","10.00","10.30","11.00","11.30",
        "12.00","12.30","13.00","13.30","14.00","14.30","15.00","15.30",
        "16.00","16.30","17.00","17.30","18.00","18.30","19.00","19.30",
        "20.00","20.30","21.00","21.30","22.00","22.30","23.00",
      ],
    },
    {
      field: "duration",
      headerName: "Duration (min)",
      width: 150,
      type: "singleSelect",
      editable: true,
      valueOptions: [30, 60],
    },
    {
      field: "sessionType",
      headerName: "Session Type",
      width: 160,
      type: "singleSelect",
      editable: true,
      valueOptions: ["Screening", "Interview", "Review", "Feedback"],
    },
    {
      field: "surveyvideo",
      headerName: "Survey / Video",
      width: 150,
      type: "singleSelect",
      editable: true,
      valueOptions: ["YES", "NO"],
    },
    // ── CV Development Status & Reviewer Fields ────────────────────────
    {
      field: "developmentStatus",
      headerName: "Development Status",
      width: 190,
      type: "singleSelect",
      editable: true,
      valueOptions: ["Completed", "In-Progress", "Not-Reviewed", "Not-Required"],
    },
    {
      field: "reviewer1",
      headerName: "Reviewer 1",
      width: 160,
      type: "singleSelect",
      editable: true,
      valueOptions: ["Completed", "In-Progress", "Not-Reviewed", "Not-Required"],
    },
    {
      field: "reviewer2",
      headerName: "Reviewer 2",
      width: 160,
      type: "singleSelect",
      editable: true,
      valueOptions: ["Completed", "In-Progress", "Not-Reviewed", "Not-Required"],
    },
    {
      field: "reviewer3",
      headerName: "Reviewer 3",
      width: 160,
      type: "singleSelect",
      editable: true,
      valueOptions: ["Completed", "In-Progress", "Not-Reviewed", "Not-Required"],
    },
    // ── CV Checklist — Boolean Fields ──────────────────────────────────
    {
      field: "overarchingRoleAndIndustryIdentified",
      headerName: "Overarching Role & Industry Identified",
      width: 280,
      type: "boolean",
      editable: true,
    },
    {
      field: "personalDataGrouping",
      headerName: "Personal Data Grouping",
      width: 210,
      type: "boolean",
      editable: true,
    },
    {
      field: "narrativeBasedGroupings",
      headerName: "Narrative Based Groupings",
      width: 220,
      type: "boolean",
      editable: true,
    },
    {
      field: "professionalSummary",
      headerName: "Professional Summary",
      width: 200,
      type: "boolean",
      editable: true,
    },
    {
      field: "technicalSkills",
      headerName: "Technical Skills",
      width: 170,
      type: "boolean",
      editable: true,
    },
    {
      field: "softSkills",
      headerName: "Soft Skills",
      width: 150,
      type: "boolean",
      editable: true,
    },
    {
      field: "jobDescriptionModification",
      headerName: "Job Description Modification",
      width: 240,
      type: "boolean",
      editable: true,
    },
    {
      field: "factBasedGroupings",
      headerName: "Fact Based Groupings",
      width: 200,
      type: "boolean",
      editable: true,
    },
    {
      field: "businessNameBusinessLocation",
      headerName: "Business Name / Location",
      width: 220,
      type: "boolean",
      editable: true,
    },
    {
      field: "roleTitle",
      headerName: "Role Title",
      width: 140,
      type: "boolean",
      editable: true,
    },
    {
      field: "dateFormat",
      headerName: "Date Format",
      width: 150,
      type: "boolean",
      editable: true,
    },
    {
      field: "educationFormat",
      headerName: "Education Format",
      width: 180,
      type: "boolean",
      editable: true,
    },
    {
      field: "additionals",
      headerName: "Additionals",
      width: 150,
      type: "boolean",
      editable: true,
    },
    {
      field: "colourHighlightNewText",
      headerName: "Colour Highlight New Text",
      width: 220,
      type: "boolean",
      editable: true,
    },
    {
      field: "layoutModification",
      headerName: "Layout Modification",
      width: 190,
      type: "boolean",
      editable: true,
    },
    {
      field: "findReplaceAnd",
      headerName: "Find, Replace & And",
      width: 190,
      type: "boolean",
      editable: true,
    },
    {
      field: "paragraphing",
      headerName: "Paragraphing",
      width: 160,
      type: "boolean",
      editable: true,
    },
    {
      field: "alignment",
      headerName: "Alignment",
      width: 150,
      type: "boolean",
      editable: true,
    },
    {
      field: "textSpacing",
      headerName: "Text Spacing",
      width: 160,
      type: "boolean",
      editable: true,
    },
    {
      field: "differentiationOfEachRoleTitle",
      headerName: "Differentiation Of Each Role Title",
      width: 260,
      type: "boolean",
      editable: true,
    },
    {
      field: "roleNarrativeDifferentiation",
      headerName: "Role Narrative Differentiation",
      width: 240,
      type: "boolean",
      editable: true,
    },
    {
      field: "dateSerializationRationalization",
      headerName: "Date Serialization Rationalization",
      width: 260,
      type: "boolean",
      editable: true,
    },
    {
      field: "roleSegmentation",
      headerName: "Role Segmentation",
      width: 190,
      type: "boolean",
      editable: true,
    },
    {
      field: "grammerreadabilityEase",
      headerName: "Grammar / Readability Ease",
      width: 230,
      type: "boolean",
      editable: true,
    },
    {
      field: "smeTechnicalContent",
      headerName: "SME Technical Content",
      width: 210,
      type: "boolean",
      editable: true,
    },
    {
      field: "clientRequirementsAssessment",
      headerName: "Client Requirements Assessment",
      width: 250,
      type: "boolean",
      editable: true,
    },
    {
      field: "dispatchToClient",
      headerName: "Dispatch To Client",
      width: 190,
      type: "boolean",
      editable: true,
    },
  ];

  return columns;
};
