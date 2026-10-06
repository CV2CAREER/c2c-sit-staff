import { GridColDef } from "@mui/x-data-grid-pro";
import UsersTableActions from "./Actions";
import { Switch } from "@mui/material";
import Link from "next/link";
import { UpdateSelect } from "@/components/AdminUsersComponent/filter-select";
import { PreProgress } from "@/types/enum";
import { AuditRequiredToggle, AuditFindingsInput } from "@/components/AuditFields/AuditCells";
import PerceptionCell, { PerceptionBadge } from "@/components/PerceptionSelect/PerceptionCell";

/**
 * @title Table Columns
 * @description This file exports the columns for the users table.
 */
export const tableColumns: GridColDef[] = [
  {
    field: "actions",
    headerName: "Actions",
    width: 100,
  },
  { field: "uniqueId", headerName: "Customer Id", width: 150 },
  { field: "zohoId", headerName: "Zoho Id", width: 150 },
  {
    field: "fullName",
    headerName: "Full Name",
    renderCell: (params) => {
      const fullName = `${params.row.firstName} ${params.row.middleName || ""} ${params.row.lastName}`;
      return <p className="capitalize">{fullName}</p>;
    },
    width: 230,
  },
  // SPR-21-02-002: First/Middle/Last Name columns removed — Full Name is the
  // single name column; values stay in the row data.
  // { field: "firstName", headerName: "First Name", width: 150 },
  // { field: "middleName", headerName: "Middle Name", width: 150 },
  // { field: "lastName", headerName: "Last Name", width: 150 },
  { field: "isActive", headerName: "Active", width: 100 },
  { field: "email", headerName: "Email", width: 200 },
  { field: "role", headerName: "Persona", width: 150 },
  { field: "staffPerception", headerName: "Staff Perception", width: 200 },
  { field: "plan", headerName: "Plan", width: 150 },
  { field: "signUpAs", headerName: "Sign Up As", width: 160 },
  { field: "referralsCount", headerName: "Referrals", width: 120 },
  { field: "gender", headerName: "Gender", width: 100 },
  { field: "currentCityOfResidence", headerName: "Current City Of Residence", width: 200 },
  { field: "phoneNumber", headerName: "Voice Number", width: 150 },
  { field: "whatsappNumber", headerName: "Whatsapp Number", width: 150 },
  { field: "country", headerName: "Country", width: 150 },
  { field: "heritage", headerName: "Heritage", width: 150 },
  {
    field: "hearAboutUs",
    headerName: "Hear About Us",
    width: 170,
    // SPR-19-16-021/022: nullable, no backfill — pre-deployment accounts
    // have no value.
    valueGetter: (value) => value ?? "Not Recorded",
  },
  { field: "applicationStatus", headerName: "Application Status", width: 200 },
  { field: "prepSessionStatus", headerName: "Prep Session Status", width: 200 },
  { field: "isUserSubscribed", headerName: "Subscribed", width: 100 },
  { field: "isDocumentApproved", headerName: "Document Approved", width: 150 },
  { field: "isDocumentUploaded", headerName: "Document Uploaded", width: 150 },
  { field: "isSampleDispatched", headerName: "Sample Dispatched", width: 150 },
  {
    field: "hasResume",
    headerName: "C/R",
    renderCell: (params) => {
      return <Switch checked={params?.row.hasResume} />;
    },
    width: 150,
  },
  {
    field: "hasCoverLetter",
    headerName: "C/L",
    renderCell: (params) => {
      return <Switch checked={params?.row.hasCoverLetter} />;
    },
    width: 150,
  },
  { field: "revenue", headerName: "Revenue", width: 150 },
  { field: "communication", headerName: "Communication", width: 150 },
  { field: "returnCount", headerName: "Return Count", width: 150 },
  { field: "socials", headerName: "Socials", width: 150 },
  { field: "progress", headerName: "Progress", width: 150 },
  { field: "createdAt", headerName: "Created At", width: 180 },
  { field: "updatedBy", headerName: "Updated By", width: 150 },
  // SPR-21-33-001: audit columns, always last
  {
    field: "auditRequired",
    headerName: "Audit Required",
    width: 150,
    sortable: false,
    renderCell: (params: any) => (
      <AuditRequiredToggle target="user" rowId={params.row.id} value={params.row.auditRequired} />
    ),
  },
  {
    field: "auditFindings",
    headerName: "Audit Findings",
    width: 280,
    sortable: false,
    renderCell: (params: any) => (
      <AuditFindingsInput target="user" rowId={params.row.id} value={params.row.auditFindings} />
    ),
  },
];

/**
 * Updates the "actions" column in a table column array to conditionally render an action menu.
 *
 * This function takes an array of table columns and a users data state which determines the actions
 * to be rendered. For an "active" state, the actions ["edit", "soft-delete"] are applied, and for a
 * "recycle" state, the actions ["restore", "delete"] are applied.
 *
 * @param columnArr - The original array of grid column definitions.
 * @param usersDataState - A string indicating the users data state. Use "active" for the active state and "recycle" for the recycle state.
 * @param isVisible - state that defines if the actions that can be performed are visible
 * 
 * @returns A new array of grid column definitions with the "actions" column updated to render the appropriate action buttons.
 */
export const modifyTableActionsColAndRows = (
  columnArr: GridColDef[],
  usersDataState: "active" | "recycle",
  isVisible: boolean,
  route: "admin"| "assistant" = "admin",
  handleUserProgress?: any,
  onOpenChangePlan?: (user: any) => void,
) => {
  const newArr = columnArr.reduce((acc: GridColDef[], el: GridColDef) => {
    if (el.field === "actions") {
      if (!isVisible) {
        return acc;
      }

      const actionsEl: GridColDef = { 
        ...el,
        renderCell: (params: any) => (
          <UsersTableActions
            user={params.row}
            actions={usersDataState === "active"
              ? ["edit", "soft-delete", "accept-documents", "dispatch-sample-result", "reject-documents", "view-documents", "view-profile", "approve-account"]
              : ["restore", "delete"]}
          />
        )
      }
      return [...acc, actionsEl]
    }

    if (el.field === "fullName") {
      const fullNameEl: GridColDef = { 
        ...el,
        renderCell: (params) => {
          let fullName = `${params.row.firstName} ${params.row.lastName}`
          if (params.row.middleName !== "" && params.row.middleName !== undefined && params.row.middleName !== null) { // Added checks for middleName
            fullName = `${params.row.firstName} ${params.row.middleName} ${params.row.lastName}`
          }
          return <Link className="text-blue hover:text-career-blue-400" href={`/${route}/users/${params.id}`}>{fullName}</Link>
        }
      }
      return [...acc, fullNameEl]
    }

    // SPR-21-33-002: Staff Perception can be changed straight from the grid in Edit mode
    if (el.field === "staffPerception") {
      const perceptionEl: GridColDef = {
        ...el,
        editable: false,
        // Plain text normally; the dropdown only appears while Edit mode is on
        renderCell: (params) =>
          isVisible ? (
            <PerceptionCell
              userId={params.row.id}
              field="staffPerception"
              value={params.value}
            />
          ) : (
            <PerceptionBadge value={params.value} />
          ),
      };
      return [...acc, perceptionEl];
    }

    if (el.field.toLowerCase() === "progress"){
      const progress: GridColDef = {
        ...el,
        renderCell: (params) => {
          return (
            <UpdateSelect
              placeholder="N/A"
              options={[
                {
                  label: PreProgress.SIGNEDUP,
                  value: PreProgress.SIGNEDUP,
                },
                {
                  label: PreProgress.PREFERENCEINSERTED,
                  value: PreProgress.PREFERENCEINSERTED,
                },
                {
                  label: PreProgress.UPLOADEDDOC,
                  value: PreProgress.UPLOADEDDOC,
                },
                {
                  label: 'Email Verified',
                  value: 'Email Verified',
                },
                {
                  label: 'Documents Accepted',
                  value: 'Documents Accepted',
                },
                {
                  label: 'Documents Declined',
                  value: 'Documents Declined',
                },
                {
                  label: 'CV/Resume Uplifted',
                  value: 'CV/Resume Uplifted',
                },
                {
                  label: 'Service Selected',
                  value: 'Plan Selected',
                },
                {
                  label: 'Payment Confirmed',
                  value: 'Payment Confirmed',
                },
                {
                  label: 'Login Credentials Verified',
                  value: 'Login Credentials Verified',
                },
                {
                  label: 'Sample Results Dispatched',
                  value: 'Sample Results Dispatched',
                },
                {
                  label: 'Sample Results Accepted',
                  value: 'Sample Results Accepted',
                },
                {
                  label: 'Preparatory Session Accepted',
                  value: 'Preparatory Session Accepted',
                },
                {
                  label: 'Preparatory Session Declined',
                  value: 'Preparatory Session Declined',
                },
                {
                  label: 'Application Commenced',
                  value: 'Application Commenced',
                },
                {
                  label: 'Application Hold',
                  value: 'Application Hold',
                },
                {
                  label: 'Application Expired',
                  value: 'Application Expired',
                },
                {
                  label: 'Offer Notification Received',
                  value: 'Offer Notification Received',
                },
                {
                  label: 'Campaign Ended',
                  value: 'Campaign Ended',
                },
              ]}
              value={params?.value}
              onValueChange={(value: any) => {
                handleUserProgress(value, params?.row?.progress, params?.row);
              }}
            />
          );
        },
      }

      return [...acc, progress]
    }

    if (el.field === "role") {
    const roleConfig: Record<string, { label: string; dot: string; text: string }> = {
      admin: { label: "Admin", dot: "bg-rose-500", text: "text-rose-700" },
      coach: { label: "Coach", dot: "bg-career-blue-800", text: "text-career-blue-800" },
      client: { label: "Client", dot: "bg-emerald-500", text: "text-emerald-700" },
      guest: { label: "Guest", dot: "bg-gray-400", text: "text-gray-600" },
      partner: { label: "Partner", dot: "bg-purple-500", text: "text-purple-700" },
      sales: { label: "Sales", dot: "bg-amber-500", text: "text-amber-700" },
      cse: { label: "CSE", dot: "bg-cyan-500", text: "text-cyan-700" },
      customer: { label: "Customer", dot: "bg-cyan-500", text: "text-cyan-700" },
      assistant: { label: "PC", dot: "bg-indigo-500", text: "text-indigo-700" },
      probono: { label: "Probono", dot: "bg-teal-500", text: "text-teal-700" },
      technology: { label: "Technology", dot: "bg-slate-500", text: "text-slate-700" },
      business: { label: "Business", dot: "bg-pink-500", text: "text-pink-700" },
      test: { label: "Test", dot: "bg-gray-300", text: "text-gray-400" },
    };
    const personaCol: GridColDef = {
      ...el,
      renderCell: (params: any) => {
        const val = params?.row?.role;
        const entry = val ? roleConfig[val] : null;

        if (!entry) {
          if (!val) {
            return (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium italic text-gray-400">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300" />
                Not Set
              </span>
            );
          }
          return (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium capitalize text-gray-600">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
              {val}
            </span>
          );
        }

        return (
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${entry.text}`}>
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${entry.dot}`} />
            {entry.label}
          </span>
        );
      },
    };
    return [...acc, personaCol];
  }

    if (el.field === "signUpAs") {
      const signUpAsCol: GridColDef = {
        ...el,
        renderCell: (params: any) => {
          const value = params?.row?.signUpAs;
          const config: Record<string, { label: string; dot: string; text: string }> = {
            Job_Seeker: { label: "Job Seeker", dot: "bg-career-blue-800", text: "text-career-blue-800" },
            Employee: { label: "Employee", dot: "bg-emerald-500", text: "text-emerald-700" },
            Channel_Partner: { label: "Channel Partner", dot: "bg-purple-500", text: "text-purple-700" },
            Ambassador: { label: "Ambassador", dot: "bg-amber-500", text: "text-amber-700" },
          };
          const entry = value ? config[value] : null;

          if (!entry) {
            return (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium italic text-gray-400">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300" />
                Not Set
              </span>
            );
          }

          return (
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${entry.text}`}>
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${entry.dot}`} />
              {entry.label}
            </span>
          );
        },
      };
      return [...acc, signUpAsCol];
    }

    if (el.field === "plan") {
      const planCol: GridColDef = {
        ...el,
        renderCell: (params: any) => {
          const value = params?.row?.plan;
          if (isVisible && onOpenChangePlan) {
            return (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenChangePlan(params.row);
                }}
                className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-career-blue-800 shadow-sm transition-colors hover:border-career-blue-800/40 hover:bg-career-blue-800/5"
              >
                {value || "No plan"}
              </button>
            );
          }
          return <p>{value || "N/A"}</p>;
        },
      };
      return [...acc, planCol];
    }

    if (el.field === "referralsCount") {
      const referralsCol: GridColDef = {
        ...el,
        renderCell: (params: any) => {
          const count = params?.row?.referralsCount ?? 0;
          return (
            <span
              className={`inline-flex min-w-[28px] items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                count > 0 ? "bg-career-blue-800/10 text-career-blue-800" : "bg-gray-100 text-gray-400"
              }`}
            >
              {count}
            </span>
          );
        },
      };
      return [...acc, referralsCol];
    }
    return [...acc, el];
  }, []); 
  return newArr;
};