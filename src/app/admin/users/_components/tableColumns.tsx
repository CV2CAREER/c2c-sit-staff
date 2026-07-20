import { GridColDef } from "@mui/x-data-grid-pro";
import UsersTableActions from "./Actions";
import { Switch } from "@mui/material";
import Link from "next/link";
import { UpdateSelect } from "@/components/AdminUsersComponent/filter-select";
import { PreProgress } from "@/types/enum";

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
  { field: "firstName", headerName: "First Name", width: 150 },
  { field: "middleName", headerName: "Middle Name", width: 150 },
  { field: "lastName", headerName: "Last Name", width: 150 },
  { field: "isActive", headerName: "Active", width: 100 },
  { field: "email", headerName: "Email", width: 200 },
  { field: "role", headerName: "Persona", width: 150 },
  { field: "gender", headerName: "Gender", width: 100 },
  { field: "customerClass", headerName: "Customer Class", width: 200 },
  { field: "currentCityOfResidence", headerName: "Current City Of Residence", width: 200 },
  { field: "phoneNumber", headerName: "Voice Number", width: 150 },
  { field: "whatsappNumber", headerName: "Whatsapp Number", width: 150 },
  { field: "country", headerName: "Country", width: 150 },
  { field: "heritage", headerName: "Heritage", width: 150 },
  { field: "applicationStatus", headerName: "Application Status", width: 200 },
  { field: "prepSessionStatus", headerName: "Prep Session Status", width: 200 },
  { field: "isUserSubscribed", headerName: "Subscribed", width: 100 },
  {
    field: "isAmbassador",
    headerName: "Ambassador",
    renderCell: (params: any) =>
      params.row.isAmbassador ? (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
          Ambassador
        </span>
      ) : null,
    width: 130,
  },
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
  { field: "plan", headerName: "Plan", width: 150 },
  { field: "progress", headerName: "Progress", width: 150 },
  { field: "createdAt", headerName: "Created At", width: 180 },
  { field: "updatedBy", headerName: "Updated By", width: 150 },
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
  handleUserProgress?: any
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
    const personaCol: GridColDef = {
      ...el,
      renderCell: (params: any) => {
        const val = params?.row?.role; 
        return val === "assistant" ? "PC" : val ?? "";
      },
    };
    return [...acc, personaCol];
  }
    return [...acc, el];
  }, []); 
  return newArr;
};