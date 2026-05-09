"use client";
import React, { useMemo } from "react";
import Link from "next/link";
import { GridColDef } from "@mui/x-data-grid-pro";
import { StyledDataGridPro } from "@/utils/table";
import { useAdminMutations, useAdminQueries } from "@/hooks/api/admin.api";
import { IconButton, Tooltip } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";

/**
 * @title UnSubscribedUsersDataTable
 * @description This component fetches unsubscribed users data from the API and renders it in a grid using DataGridPro.
 */
const UnsubscribedUsersDataTable: React.FC = () => {
  const { unsubscribedUsers, isUnsubscribedUsersLoading } = useAdminQueries({
    fetchUnsubscribedUsers: true,
  });

  const { deleteUnsubscribedUser, isDeletingUnsubscribedUser } = useAdminMutations();

  const handleRemove = (userId: string) => {
    if (window.confirm("Are you sure you want to remove this user from the unsubscribed list?")) {
      deleteUnsubscribedUser({ userId });
    }
  };

  /*-- Columns --*/
  const columns: GridColDef[] = useMemo(() => [
    {
      field: "actions",
      headerName: "Actions",
      width: 80,
      renderCell: (params) => (
        <Tooltip title="Remove from list">
          <IconButton 
            size="small" 
            color="error" 
            onClick={() => handleRemove(params.row.userId)}
            disabled={isDeletingUnsubscribedUser}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
    {
      field: "username",
      headerName: "User",
      renderCell: (params) => {
          return (
            <Link className="text-blue hover:text-career-blue-400" href={`/admin/users/${params.row.id}`}>
              {`${params.row.firstName} ${params.row.lastName} (${params.row.email})`}
            </Link>
          );
      },
      flex: 1,
      minWidth: 200,
    },
    {
      field: "reason",
      headerName: "Reason",
      flex: 1,
      minWidth: 300,
      renderCell: (params) => params.value || "No reason provided",
    },
    {
      field: "date",
      headerName: "Date",
      flex: 1,
      renderCell: (params) => params.row.date || new Date(params.row.createdAt).toLocaleDateString(),
    },
    {
      field: "time",
      headerName: "Time",
      flex: 1,
      renderCell: (params) => params.row.time || new Date(params.row.createdAt).toLocaleTimeString(),
    },
  ], [isDeletingUnsubscribedUser]);

  return (
    <section>
      <StyledDataGridPro
        initialState={{
          pagination: {
            paginationModel: { pageSize: 20 },
          },
        }}
        rows={unsubscribedUsers}
        getRowId={(row) => row.id}
        rowHeight={38}
        disableRowSelectionOnClick
        rowBufferPx={100}
        columns={columns}
        columnBufferPx={5}
        loading={isUnsubscribedUsersLoading}
        pagination
      />
    </section>
  );
};

export default UnsubscribedUsersDataTable;
