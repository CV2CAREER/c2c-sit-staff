"use client";

import ActionsMenu from "@/components/ActionsMenu/ActionsMenu";
import { DefaultActions } from "@/components/ActionsMenu/ActionsMenu";
import { GridColDef } from "@mui/x-data-grid-pro";
import { Recycle, Trash2 } from "lucide-react";
import { JobPrefDataTableActionDialogs } from "./dialogs";

export type JobPrefTableName =
  | "advertisers"
  | "country-states-cities"
  | "classification"
  | "job-type"
  | "craft"
  | "salary-options"
  | "working-rights";

type DataState = "active" | "recycle";

const countryStateAndCitiesColumns: GridColDef[] = [
  { field: "actions", headerName: "Actions", width: 100, align: "center" },
  {
    field: "_id",
    headerName: "ID",
    renderCell(params) {
      return <p>{params.row._doc?._id || params.row._id}</p>;
    },
    width: 80,
  },
  {
    field: "country",
    headerName: "Countries",
    renderCell(params) {
      return <p>{params.row._doc?.country || params.row.country}</p>;
    },
    flex: 1,
  },
  { field: "states", headerName: "States", flex: 1 },
  { field: "cities", headerName: "Cities", flex: 1 },
];

const advertisersColumns: GridColDef[] = [
  { field: "actions", headerName: "Actions", width: 100, align: "center" },
  { field: "id", headerName: "ID", width: 80 },
  { field: "label", headerName: "Label", flex: 1 },
  { field: "value", headerName: "Value", flex: 1 },
];

const sharedColumns: GridColDef[] = [
  { field: "actions", headerName: "Actions", width: 100, align: "center" },
  {
    field: "label",
    headerName: "Label",
    renderCell(params) {
      return <p>{params.row._doc?.label || params.row.label}</p>;
    },
    flex: 1,
  },
  { field: "value", headerName: "Value", flex: 1 },
];

const getColumnsForTable = (tableName: string): GridColDef[] => {
  switch (tableName.toLowerCase()) {
    case "advertisers":
      return advertisersColumns;
    case "country-states-cities":
      return countryStateAndCitiesColumns;
    case "classification":
    case "job-type":
    case "craft":
    case "salary-options":
    case "working-rights":
      return sharedColumns;
    default:
      return [];
  }
};

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
        const recordId = params.row._id || params.row._doc?._id;

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
