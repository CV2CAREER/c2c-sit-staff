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
  ];

  return columns;
};
