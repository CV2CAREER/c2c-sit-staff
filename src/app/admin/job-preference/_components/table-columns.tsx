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
  { field: "Client", headerName: "Client", flex: 1, width: 150, },
  { field: "Status", headerName: "Status",  width: 150, },
  { field: "QualityScore", headerName: "Quality Score",  width: 150, },
  { field: "StatusReason", headerName: "Status Reason",  width: 150, },
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
  { field: "JobId", headerName: "Job ID",  width: 150, },
  { field: "Internal_Jobsite", headerName: "Internal Jobsite",  width: 150, },
  { field: "External_Jobsite", headerName: "External Jobsite",  width: 150, },
  { field: "Job_Type", headerName: "Job Type",  width: 150, },
  { field: "Advertiser", headerName: "Advertiser",  width: 150, },
  { field: "Location", headerName: "Location",  width: 150, },
  { field: "Country", headerName: "Country",  width: 150, },
  { field: "ApplicationSubmittedBy", headerName: "Submitted By",  width: 150, },
  { field: "ApplicationSubmissionDate", headerName: "Submission Date",  width: 150, },
  { field: "DiscoveredBy", headerName: "Discovered By",  width: 150, },
  { field: "DiscoveryDate", headerName: "Discovery Date",  width: 150, },
  { field: "VettedBy", headerName: "Vetted By",  width: 150, },
  { field: "VettedDate", headerName: "Vetted Date",  width: 150, },
  { field: "CoverLetterRequired", headerName: "Cover Letter Required",  width: 150, },
  { field: "DeclinedReasons", headerName: "Declined Reasons",  width: 150, },
  { field: "ApprovedBy", headerName: "Approved By",  width: 150, },
  { field: "ApprovedDate", headerName: "Approved Date",  width: 150, },
  // SPR-21-58-001: assurance result + who + when. The result is a visible dropdown (no edit
  // mode needed); who/when are stamped by the server and read-only.
  {
    field: "AssuranceStatus",
    headerName: "Assurance",
    width: 190,
    sortable: false,
    // Replaced in getColumnsForTable so the cell knows whether "Allow Editing" is on.
    renderCell: (params) => <AssuranceCell row={params.row} readOnly />,
  },
  { field: "AssuredBy", headerName: "Assured By", width: 160 },
  {
    field: "AssuranceDate",
    headerName: "Assurance Date",
    type: "date",
    width: 160,
    valueGetter: (value) => (value ? new Date(value as string) : null),
  },
  { field: "ReturnReason", headerName: "Return Reason",  width: 150, },
  { field: "ReturnedBy", headerName: "Returned By",  width: 150, },
  { field: "ReturnedDate", headerName: "Returned Date",  width: 150, },
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
