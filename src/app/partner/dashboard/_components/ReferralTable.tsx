"use client";

import { LicenseInfo } from "@mui/x-license-pro";
LicenseInfo.setLicenseKey(process.env.NEXT_PUBLIC_MUI_X_LICENSE_KEY!);

import React, { useState, useMemo } from "react";
import {
  DataGridPro,
  GridColDef,
  GridRenderCellParams,
  GridToolbarColumnsButton,
  GridToolbarFilterButton,
  GridToolbarDensitySelector,
  GridToolbarExport,
  GridToolbarContainer,
} from "@mui/x-data-grid-pro";
import { TextField, IconButton, styled } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

const StyledDataGridPro = styled(DataGridPro)(() => ({
  "& .MuiDataGrid-root": {
    border: "none",
    backgroundColor: "#ffffff",
    boxShadow:
      "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)",
    borderRadius: "8px",
  },
  "& .MuiDataGrid-cell": {
    borderBottom: "1px solid #f0f0f0",
  },
  "& .MuiDataGrid-columnHeaders": {
    backgroundColor: "#80D7FF",
    color: "#333",
    fontWeight: "bold",
  },
  "& .MuiDataGrid-row:nth-of-type(even)": {
    backgroundColor: "#f8f8f8",
  },
  "& .MuiDataGrid-row:hover": {
    backgroundColor: "#e6f7ff",
  },
}));

interface Referral {
  _id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  isUserSubscribed?: boolean;
  status?: string;
  createdAt?: string;
}

export default function ReferralTable({ referrals }: { referrals: Referral[] }) {
  const [search, setSearch] = useState("");

  const capitalize = (text: string) =>
    text ? text.charAt(0).toUpperCase() + text.slice(1).toLowerCase() : "Unknown";

  const rows = useMemo(() => {
    return referrals
      .map((r, i) => ({
        id: r._id || i,
        firstName: r.firstName || "",
        lastName: r.lastName || "",
        email: r.email || "",
        isUserSubscribed: r.isUserSubscribed,
        status: r.status || "",
        createdAt: r.createdAt || new Date().toISOString(),
      }))
      .filter((r) =>
        [r.firstName, r.lastName, r.email]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase())
      );
  }, [referrals, search]);

  const columns: GridColDef[] = [
    { field: "firstName", headerName: "First Name", flex: 1, minWidth: 120 },
    { field: "lastName", headerName: "Last Name", flex: 1, minWidth: 120 },
    { field: "email", headerName: "Email", flex: 1.5, minWidth: 200 },
    {
      field: "isUserSubscribed",
      headerName: "Subscription Status",
      flex: 1,
      minWidth: 160,
      renderCell: (params: GridRenderCellParams<any, boolean>) =>
        params.value ? "Active" : "Inactive",
    },
    {
      field: "status",
      headerName: "Referral Status",
      flex: 1,
      minWidth: 160,
      renderCell: (params: GridRenderCellParams<any, string>) =>
        capitalize(params.value || ""),
    },
  ];

  const CustomToolbar = () => (
    <GridToolbarContainer className="flex flex-wrap gap-2 p-2">
      <GridToolbarColumnsButton />
      <GridToolbarFilterButton />
      <GridToolbarDensitySelector />
      <GridToolbarExport
        csvOptions={{ fileName: "referrals" }}
        printOptions={{ disableToolbarButton: false }}
      />
      <div className="ml-auto flex gap-2 items-center">
        <TextField
          size="small"
          value={search}
          placeholder="Search referrals"
          onChange={(e) => setSearch(e.target.value)}
        />
        <IconButton>
          <SearchIcon />
        </IconButton>
      </div>
    </GridToolbarContainer>
  );

  return (
    <div className="w-full overflow-x-auto">
      <div className="mb-3 w-full max-w-md">
        <form
          onSubmit={(e) => e.preventDefault()}
          className="w-full flex items-center space-x-2"
        >
          <TextField
            fullWidth
            size="small"
            placeholder="Search All Text..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <IconButton onClick={() => setSearch(search)}>
            <SearchIcon />
          </IconButton>
        </form>
      </div>

      <div className="min-w-[700px]">
        <StyledDataGridPro
          rows={rows}
          columns={columns}
          pageSizeOptions={[10, 20, 50]}
          paginationModel={{ page: 0, pageSize: 10 }}
          checkboxSelection={false}
          disableRowSelectionOnClick
          rowReordering
          slots={{ toolbar: CustomToolbar }}
          sx={{
            height: 500,
            width: "100%",
          }}
        />
      </div>
    </div>
  );
}
