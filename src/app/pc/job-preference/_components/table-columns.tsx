"use client";

import ActionsMenu from "@/components/ActionsMenu/ActionsMenu";
import { DefaultActions } from "@/components/ActionsMenu/ActionsMenu";
import { GridColDef } from "@mui/x-data-grid-pro";
import { Recycle, Trash2 } from "lucide-react";
import { JobPrefDataTableActionDialogs } from "./dialogs";
import AssuranceSelect from "@/components/AssuranceSelect/AssuranceSelect";
import { useJobPreferenceData } from "./context";

type DataState = "active" | "recycle";

function AssuranceCell({
  row,
  readOnly,
}: {
  row: { id: string | number; AssuranceStatus?: string | null };
  /** True while "Allow Editing" is off: the value is shown but cannot be changed. */
  readOnly: boolean;
}) {
  const { tracker } = useJobPreferenceData();
  return (
    <AssuranceSelect
      value={row.AssuranceStatus}
      disabled={readOnly || tracker.updateAssurance.isPending}
      title={readOnly ? "Turn on Allow Editing to change the assurance" : undefined}
      onChange={(assuranceStatus) => tracker.updateAssurance.mutate({ id: row.id, assuranceStatus })}
    />
  );
}

// Every manual_applications column shown as-is — this grid is a direct view
// of that table (see discovery-tracker.service.ts's EDITABLE_FIELDS for
// which of these can actually be edited in place).
const columns: GridColDef[] = [
  { field: "actions", headerName: "Actions", width: 100, align: "center" },
  { field: "id", headerName: "ID", width: 90 },
  { field: "Client", headerName: "Client", flex: 1 },
  { field: "Status", headerName: "Status", flex: 1 },
  { field: "StatusReason", headerName: "Status Reason", flex: 1 },
  {
    field: "Job_Title",
    headerName: "Job Title",
    width: 220,
    renderCell: (params) => {
      const raw = params.value as string | undefined;
      if (!raw) return null;

      const match = raw.match(/=HYPERLINK\("([^"]+)"\s*,\s*"([^"]+)"\)/i);
      if (!match) return <p className="truncate">{raw}</p>;

      const [, url, label] = match;
      return (
        <div className="py-1 leading-tight overflow-hidden">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate text-sm font-medium text-primary hover:underline"
            title={label}
          >
            {label}
          </a>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate text-[11px] text-gray-400 hover:underline"
            title={url}
          >
            {url}
          </a>
        </div>
      );
    },
  },
  { field: "JobId", headerName: "Job ID", flex: 1 },
  { field: "Internal_Jobsite", headerName: "Internal Jobsite", flex: 1 },
  { field: "External_Jobsite", headerName: "External Jobsite", flex: 1 },
  { field: "Job_Type", headerName: "Job Type", flex: 1 },
  { field: "Advertiser", headerName: "Advertiser", flex: 1 },
  { field: "Location", headerName: "Location", flex: 1 },
  { field: "Country", headerName: "Country", flex: 1 },
  { field: "QualityScore", headerName: "Quality Score", flex: 1 },
  { field: "ApplicationSubmittedBy", headerName: "Submitted By", flex: 1 },
  { field: "ApplicationSubmissionDate", headerName: "Submission Date", flex: 1 },
  { field: "DiscoveredBy", headerName: "Discovered By", flex: 1 },
  { field: "DiscoveryDate", headerName: "Discovery Date", flex: 1 },
  { field: "VettedBy", headerName: "Vetted By", flex: 1 },
  { field: "VettedDate", headerName: "Vetted Date", flex: 1 },
  { field: "CoverLetterRequired", headerName: "Cover Letter Required", flex: 1 },
  { field: "DeclinedReasons", headerName: "Declined Reasons", flex: 1 },
  { field: "ApprovedBy", headerName: "Approved By", flex: 1 },
  { field: "ApprovedDate", headerName: "Approved Date", flex: 1 },
  // SPR-21-58-001: assurance result + who + when. The result is a visible dropdown (no edit
  // mode needed); who/when are stamped by the server and read-only.
  {
    field: "AssuranceStatus",
    headerName: "Assurance",
    flex: 1,
    minWidth: 190,
    sortable: false,
    // Replaced in getColumnsForTable so the cell knows whether "Allow Editing" is on.
    renderCell: (params) => <AssuranceCell row={params.row} readOnly />,
  },
  { field: "AssuredBy", headerName: "Assured By", flex: 1 },
  {
    field: "AssuranceDate",
    headerName: "Assurance Date",
    type: "date",
    flex: 1,
    valueGetter: (value) => (value ? new Date(value as string) : null),
  },
  { field: "ReturnReason", headerName: "Return Reason", flex: 1 },
  { field: "ReturnedBy", headerName: "Returned By", flex: 1 },
  { field: "ReturnedDate", headerName: "Returned Date", flex: 1 },
];

// The assurance dropdown only works while "Allow Editing" is on, like the other editable columns.
const getColumnsForTable = (allowEditing = false): GridColDef[] =>
  columns.map((column) =>
    column.field === "AssuranceStatus"
      ? { ...column, renderCell: (params) => <AssuranceCell row={params.row} readOnly={!allowEditing} /> }
      : column,
  );

export default getColumnsForTable;

export const renderActionsMenu = (
  columnArr: GridColDef[],
  jobPrefDataState: DataState,
  options: {
    activeRecordId: string | number | null;
    setActiveDialog: React.Dispatch<React.SetStateAction<DefaultActions | null>>;
    setActiveRecordId: (id: string | number) => void;
  },
) =>
  columnArr.map((column) => {
    if (column.field !== "actions") return column;

    return {
      ...column,
      renderCell: (params: any) => {
        const recordId = params.row.id;

        return (
          <>
            <ActionsMenu
              actions={
                jobPrefDataState === "active"
                  ? [{ label: "Send to Bin", icon: Trash2, action: "soft-delete" }]
                  : [
                      { label: "Restore", icon: Recycle, action: "restore" },
                      { label: "Delete", icon: Trash2, action: "delete" },
                    ]
              }
              triggerActionDialog={(action) => {
                options.setActiveRecordId(recordId);
                options.setActiveDialog(action);
              }}
            />
            {options.activeRecordId ? <JobPrefDataTableActionDialogs recordId={options.activeRecordId} /> : null}
          </>
        );
      },
    };
  });
