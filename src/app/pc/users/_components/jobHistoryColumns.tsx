import { GridColDef } from "@mui/x-data-grid-pro";
import Tooltip from "@mui/material/Tooltip";
import React from "react";
import { formatPreferenceTimestamp, normalizePreferenceValue } from "./AdminUserJobPreferenceHistory";

const PreferenceToolTip = ({ title, children }: { title: string; children?: React.ReactNode }) => {
  return (
    <Tooltip title={title} arrow>
      {children ? (
        <span className="truncate max-w-full block">{children}</span>
      ) : (
        <span
          style={{
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
            maxWidth: "100%",
            display: "block",
          }}
        >
          {title}
        </span>
      )}
    </Tooltip>
  );
};

const generateJobHistoryColumns = (): GridColDef[] => {
  return [
    {
      field: "createdAt",
      headerName: "Timestamp",
      width: 200,
      renderCell: (params: any) => {
        const rawDate = params.row?.saveTimestamp || params.row?.createdAt;
        const formatted = formatPreferenceTimestamp(rawDate);
        return <PreferenceToolTip title={formatted} />;
      },
    },
    {
      field: "fieldChanged",
      headerName: "Field changed",
      width: 240,
      renderCell: (params: any) => {
        const fieldName = params.row?.fieldChanged || params.row?.field || "Preference";
        return (
          <span className="font-medium text-[#1c2533] truncate block">
            {fieldName}
          </span>
        );
      },
    },
    {
      field: "previousValue",
      headerName: "Previous value",
      flex: 1,
      minWidth: 220,
      sortable: false,
      renderCell: (params: any) => {
        const vals = normalizePreferenceValue(params.row?.previousValue);
        if (vals.length === 0) {
          return <span className="text-[#6b7686] italic text-xs">Not set</span>;
        }
        return <PreferenceToolTip title={vals.join(", ")}>{vals.join(", ")}</PreferenceToolTip>;
      },
    },
    {
      field: "newValue",
      headerName: "New value",
      flex: 1,
      minWidth: 220,
      sortable: false,
      renderCell: (params: any) => {
        const vals = normalizePreferenceValue(params.row?.newValue);
        if (vals.length === 0) {
          return <span className="text-[#6b7686] italic text-xs">Not set</span>;
        }
        return <PreferenceToolTip title={vals.join(", ")}>{vals.join(", ")}</PreferenceToolTip>;
      },
    },
  ];
};

export default generateJobHistoryColumns;