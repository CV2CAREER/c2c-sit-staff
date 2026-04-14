"use client";

import {
  GridRowsProp,
  GridColDef,
  GridValidRowModel,
} from "@mui/x-data-grid-pro";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { IColumnValues, PaginationData } from "./types";
import { modifyHeader, modifyRowData, reOrderKeys } from "@/utils/newTableFunc";
import { moveTo, orderTable } from "@/utils/table";
import { applyDateSort } from "@/utils/dateSort";
import { camelCaseToSentenceCase, addDescription } from "@/utils/table";
import { updateUserDetails } from "../_utils/api";
import TableWithHeaderClass from "@/components/Table";
import React, { useEffect, useState } from "react";

interface AuditTrailTableProps {
  auditTrailsData: any[];
  totalCount: number;
  paginationData: PaginationData;
  setPaginationData: React.Dispatch<React.SetStateAction<PaginationData>>;
  editMode: boolean;
}

const AuditTrailTable: React.FC<AuditTrailTableProps> = ({
  auditTrailsData,
  totalCount,
  paginationData,
  setPaginationData,
  editMode,
}) => {
  const queryClient = useQueryClient();
  const [columnHeaders, setColumnHeaders] = useState<
    GridColDef<GridValidRowModel>[]
  >([]);
  const [rowsData, setRowsData] = useState<GridRowsProp>([]);
  const tableName = "AUDIT_TRAIL";

  const updateUserDetailsMutation = useMutation({
    mutationFn: ({ payload, id }: { payload: any; id: string }) =>
      updateUserDetails(payload, id),
    onMutate: () => {
      toast.loading("Saving changes");
    },
    onSuccess: () => {
      toast.success("Changes saved successfully");
      queryClient.invalidateQueries({ queryKey: ["auditTrails"] });
    },
    onError: () => {
      toast.error("Failed to save changes.");
    },
  });

  const sortColumnHeaders = (newHeaders: any) => {
    const ordered = orderTable(tableName, applyDateSort(newHeaders));
    if (ordered) {
      setColumnHeaders(ordered);
    } else {
      setColumnHeaders(newHeaders);
    }
  };

  const getRowClassName = (params: any) => {
    return params.indexRelativeToCurrentPage % 2 !== 0
      ? "bg-career-gray-400"
      : "bg-white";
  };

  const handleEditRowsModelChange = async (newModel: any) => {
    try {
      await updateUserDetailsMutation.mutateAsync({
        payload: newModel,
        id: newModel._id,
      });
    } catch {
      toast.error("An error occurred while updating the row.");
    }
  };

  const handleProcessRowUpdateError = () => {
    toast.error("An error occurred while processing the row update.");
  };

  useEffect(() => {
    if (auditTrailsData && auditTrailsData.length > 0) {
      const _auditTrails = auditTrailsData.map(addDescription);

      let modifiedArr: IColumnValues[] = Object?.keys(
        _auditTrails[0] || {}
      ).map((el) => ({
        field: el,
        headerName: camelCaseToSentenceCase(el),
        width: 200,
        type: el,
        headerClassName: "bg-[#80D7FF]",
        editable: editMode,
        ...(el === 'dataEntry' ? {
          renderCell: (params: any) => {
            if (!params?.row?.dataEntry) return <span>-</span>;
            return (
              <span className="text-xs overflow-hidden text-ellipsis">
                {JSON.stringify(params.row.dataEntry)}
              </span>
            );
          }
        } : {})
      })) as IColumnValues[];

      modifiedArr = modifiedArr.filter(
        (el) =>
          el.field !== "_id" &&
          el.field !== "userId" &&
          el.field !== "updatedAt" &&
          el.field !== "userRole" &&
          el.field !== "__v"
      );

      const desiredOrder = [
        "fullName",
        "email",
        "deviceUsed",
        "description",
        "dataEntry",
      ];

      const modifiedObjArr = modifyHeader(
        reOrderKeys(modifiedArr, desiredOrder),
        "user-table",
        null,
        () => queryClient.invalidateQueries({ queryKey: ["auditTrails"] }),
        null
      );

      sortColumnHeaders(modifiedObjArr);
      setRowsData(
        _auditTrails.map((el: any, index: number) => modifyRowData(el, index))
      );
    } else {
      setRowsData([]);
      setColumnHeaders([]);
    }
  }, [auditTrailsData, editMode, queryClient]);

  const handleSelectionChange = (_newSelection: any) => {
    // selection change currently unused
  };

  return (
    <div className="mt-8">
      <TableWithHeaderClass
        checkboxSelection={editMode}
        rows={rowsData}
        onRowSelectionModelChange={handleSelectionChange}
        columns={columnHeaders}
        processRowUpdate={(updatedRow) => handleEditRowsModelChange(updatedRow)}
        onProcessRowUpdateError={handleProcessRowUpdateError}
        slotProps={{
          toolbar: { setRowsData } as any,
        }}
        getRowClassName={getRowClassName}
        paginationMode="server"
        rowCount={totalCount || 0}
        pageSizeOptions={[25, 50, 100]}
        onPaginationModelChange={(data) => {
          setPaginationData((prev) => ({
            ...prev,
            page: data.page,
            pageSize: data.pageSize,
          }));
        }}
        onColumnOrderChange={(e) => {
          moveTo(tableName, e.column.field, e.targetIndex);
        }}
        paginationModel={paginationData}
        disableRowSelectionOnClick={!editMode}
        getRowId={(row) => row.id}
      />
    </div>
  );
};

export default AuditTrailTable;
