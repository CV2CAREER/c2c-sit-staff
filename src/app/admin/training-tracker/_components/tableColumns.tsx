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
      headerClassName: "bg-[#80D7FF]",
      getActions,
    },
    {
      field: "traineeId",
      headerName: "Full Name",
      width: 200,
      headerClassName: "bg-[#80D7FF]",
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
      headerClassName: "bg-[#80D7FF]",
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
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "date",
      headerName: "Date",
      width: 150,
      type: "date",
      editable: true,
      headerClassName: "bg-[#80D7FF]",
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
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "notes",
      headerName: "Notes",
      width: 250,
      editable: true,
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "progress",
      headerName: "Progress",
      width: 160,
      editable: true,
      type: "singleSelect",
      valueOptions: ["Pro-Bono", "Prospects", "Onboarding", "in-Flight"],
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "reworkType",
      headerName: "Rework Type",
      editable: true,
      width: 160,
      type: "singleSelect",
      valueOptions: ["Light-Touch", "Partial", "Complete", "Nil"],
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "createdAt",
      headerName: "Date Received",
      width: 170,
      editable: false,
      headerClassName: "bg-[#80D7FF]",
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
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "smeTechnicalDepth",
      headerName: "SME Technical Depth",
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
      width: 200,
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "deliverablesQuantification",
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
      headerName: "Deliverables Quantification",
      width: 200,
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "locationYearroleInTimeExample",
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
      headerName: "Location Year/Role In Time Example",
      width: 220,
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "selfPronounUsage",
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
      headerName: "Self Pronoun Usage",
      width: 200,
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "businessDeliverables",
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
      headerName: "Business Deliverables",
      width: 200,
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "grammardictioncommunication",
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
      headerName: "Grammar Diction Communication",
      width: 220,
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "personabilitylikeabilityhumor",
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
      headerName: "Personability Likeability Humor",
      width: 220,
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "respectcurtesy",
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
      headerName: "Respect Courtesy",
      width: 200,
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "appearance",
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
      headerName: "Appearance",
      width: 200,
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "assessment",
      headerName: "Assessment",
      type: "number",
      width: 150,
      headerClassName: "bg-[#80D7FF]",
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
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "sessionObjectives",
      headerName: "Session Objectives",
      width: 200,
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "professionIntroduction",
      headerName: "Profession Introduction",
      width: 200,
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "kpiDescriptionWithExamples",
      headerName: "KPI Description With Examples",
      width: 220,
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "cvresumeRendition",
      headerName: "CV Resume Rendition",
      width: 200,
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "respectcourtesyempathyhumility",
      headerName: "Respect Courtesy Empathy Humility",
      width: 240,
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "kpiCollaborativeScoring",
      headerName: "KPI Collaborative Scoring",
      width: 200,
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "recordingAvailabilitySurvey",
      headerName: "Recording Availability Survey",
      width: 220,
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "maximumNumberOfQuestions",
      headerName: "Maximum Number Of Questions",
      width: 220,
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "complementingpositiveFeedback",
      headerName: "Complementing Positive Feedback",
      width: 220,
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "clientMultipleGosOnAllQs",
      headerName: "Client Multiple Gos On All Qs",
      width: 220,
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "timeUtilization",
      headerName: "Time Utilization",
      width: 200,
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "clientStoryResponses",
      headerName: "Client Story Responses",
      width: 200,
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "partingQuestions",
      headerName: "Parting Questions",
      width: 200,
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "timeKeeping",
      headerName: "Time Keeping",
      width: 200,
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "fillerPhrases",
      headerName: "Filler Phrases",
      width: 200,
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "intermittentClarificationRequest",
      headerName: "Intermittent Clarification Request",
      width: 220,
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "perfectAlternateResponses",
      headerName: "Perfect Alternate Responses",
      width: 220,
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "audiovisualRoomLighteningSetup",
      headerName: "Audiovisual Room Lightening Setup",
      width: 240,
      type: "singleSelect",
      editable: true,
      valueOptions: [0, 1, 2, 3, 4, 5],
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "pcAssessment",
      headerName: "PC Assessment",
      type: "number",
      width: 150,
      headerClassName: "bg-[#80D7FF]",
      editable: false,
    },
    // ── Background / Profile Fields ────────────────────────────────────
    {
      field: "preferredCraft",
      headerName: "Preferred Craft",
      width: 180,
      editable: true,
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "undergrad",
      headerName: "Undergrad",
      width: 180,
      editable: true,
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "postgrad",
      headerName: "Postgrad",
      width: 180,
      editable: true,
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "training",
      headerName: "Training",
      width: 180,
      editable: true,
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "experience",
      headerName: "Experience",
      width: 180,
      editable: true,
      headerClassName: "bg-[#80D7FF]",
    },
    // ── Session / Scheduling Fields ────────────────────────────────────
    {
      field: "coachingContact",
      headerName: "Coaching Contact",
      width: 170,
      type: "date",
      editable: true,
      headerClassName: "bg-[#80D7FF]",
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
      headerClassName: "bg-[#80D7FF]",
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
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "duration",
      headerName: "Duration (min)",
      width: 150,
      type: "singleSelect",
      editable: true,
      valueOptions: [30, 60],
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "sessionType",
      headerName: "Session Type",
      width: 160,
      type: "singleSelect",
      editable: true,
      valueOptions: ["Screening", "Interview", "Review", "Feedback"],
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "surveyvideo",
      headerName: "Survey / Video",
      width: 150,
      type: "singleSelect",
      editable: true,
      valueOptions: ["YES", "NO"],
      headerClassName: "bg-[#80D7FF]",
    },
    // ── CV Development Status & Reviewer Fields ────────────────────────
    {
      field: "developmentStatus",
      headerName: "Development Status",
      width: 190,
      type: "singleSelect",
      editable: true,
      valueOptions: ["Completed", "In-Progress", "Not-Reviewed", "Not-Required"],
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "reviewer1",
      headerName: "Reviewer 1",
      width: 160,
      type: "singleSelect",
      editable: true,
      valueOptions: ["Completed", "In-Progress", "Not-Reviewed", "Not-Required"],
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "reviewer2",
      headerName: "Reviewer 2",
      width: 160,
      type: "singleSelect",
      editable: true,
      valueOptions: ["Completed", "In-Progress", "Not-Reviewed", "Not-Required"],
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "reviewer3",
      headerName: "Reviewer 3",
      width: 160,
      type: "singleSelect",
      editable: true,
      valueOptions: ["Completed", "In-Progress", "Not-Reviewed", "Not-Required"],
      headerClassName: "bg-[#80D7FF]",
    },
    // ── CV Checklist — Boolean Fields ──────────────────────────────────
    {
      field: "overarchingRoleAndIndustryIdentified",
      headerName: "Overarching Role & Industry Identified",
      width: 280,
      type: "boolean",
      editable: true,
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "personalDataGrouping",
      headerName: "Personal Data Grouping",
      width: 210,
      type: "boolean",
      editable: true,
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "narrativeBasedGroupings",
      headerName: "Narrative Based Groupings",
      width: 220,
      type: "boolean",
      editable: true,
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "professionalSummary",
      headerName: "Professional Summary",
      width: 200,
      type: "boolean",
      editable: true,
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "technicalSkills",
      headerName: "Technical Skills",
      width: 170,
      type: "boolean",
      editable: true,
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "softSkills",
      headerName: "Soft Skills",
      width: 150,
      type: "boolean",
      editable: true,
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "jobDescriptionModification",
      headerName: "Job Description Modification",
      width: 240,
      type: "boolean",
      editable: true,
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "factBasedGroupings",
      headerName: "Fact Based Groupings",
      width: 200,
      type: "boolean",
      editable: true,
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "businessNameBusinessLocation",
      headerName: "Business Name / Location",
      width: 220,
      type: "boolean",
      editable: true,
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "roleTitle",
      headerName: "Role Title",
      width: 140,
      type: "boolean",
      editable: true,
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "dateFormat",
      headerName: "Date Format",
      width: 150,
      type: "boolean",
      editable: true,
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "educationFormat",
      headerName: "Education Format",
      width: 180,
      type: "boolean",
      editable: true,
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "additionals",
      headerName: "Additionals",
      width: 150,
      type: "boolean",
      editable: true,
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "colourHighlightNewText",
      headerName: "Colour Highlight New Text",
      width: 220,
      type: "boolean",
      editable: true,
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "layoutModification",
      headerName: "Layout Modification",
      width: 190,
      type: "boolean",
      editable: true,
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "findReplaceAnd",
      headerName: "Find, Replace & And",
      width: 190,
      type: "boolean",
      editable: true,
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "paragraphing",
      headerName: "Paragraphing",
      width: 160,
      type: "boolean",
      editable: true,
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "alignment",
      headerName: "Alignment",
      width: 150,
      type: "boolean",
      editable: true,
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "textSpacing",
      headerName: "Text Spacing",
      width: 160,
      type: "boolean",
      editable: true,
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "differentiationOfEachRoleTitle",
      headerName: "Differentiation Of Each Role Title",
      width: 260,
      type: "boolean",
      editable: true,
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "roleNarrativeDifferentiation",
      headerName: "Role Narrative Differentiation",
      width: 240,
      type: "boolean",
      editable: true,
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "dateSerializationRationalization",
      headerName: "Date Serialization Rationalization",
      width: 260,
      type: "boolean",
      editable: true,
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "roleSegmentation",
      headerName: "Role Segmentation",
      width: 190,
      type: "boolean",
      editable: true,
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "grammerreadabilityEase",
      headerName: "Grammar / Readability Ease",
      width: 230,
      type: "boolean",
      editable: true,
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "smeTechnicalContent",
      headerName: "SME Technical Content",
      width: 210,
      type: "boolean",
      editable: true,
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "clientRequirementsAssessment",
      headerName: "Client Requirements Assessment",
      width: 250,
      type: "boolean",
      editable: true,
      headerClassName: "bg-[#80D7FF]",
    },
    {
      field: "dispatchToClient",
      headerName: "Dispatch To Client",
      width: 190,
      type: "boolean",
      editable: true,
      headerClassName: "bg-[#80D7FF]",
    },
  ];

  return columns;
};
