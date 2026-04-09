"use client";
import React, { Suspense, useEffect, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Checkbox } from "@/components/ui/checkbox";
import { GridColDef, GridRowsProp, GridToolbar } from "@mui/x-data-grid-pro";
import CRTableColumns from "./table-columns";
import TableWithHeaderClass from "@/components/Table";
import { OptionType } from "@/types";
import CreateCRTrackingModal from "./modals/create-modal";
import { generateColumns } from "@/utils/tableColumns";
import { modifyEOTArray } from "./EOTRequest/modifyArray";
import EOTRequest from "./EOTRequest/Button";
import CRTrackingOptionsModal from "./modals/options-modal";
import ConnectToHubStaff from "./connect-hubstaff";
import dynamic from "next/dynamic";
import { RowData } from "./modals/EditRowModal";
import LoadingModal from "@/components/ui/loading-modal";
import { modifyCRArray } from "./modifyColumns";
import {
  useCRTrackingQueries,
  useCRTrackingMutations,
} from "@/hooks/api/admin/cr-tracking";

const EditRowModal = dynamic(() => import("./modals/EditRowModal"));
const DeleteConfirmModal = dynamic(() => import("./modals/DeleteConfirmation"));

const CRTrackingDataTable: React.FC<{ id: string }> = ({ id }) => {
  /*---- State ----*/
  const [dataState, setDataState] = React.useState<"active" | "recycle">(
    "active"
  );
  const [selectedCR, setSelectedCR] = React.useState<OptionType | null>(null);
  const [activeTable, setActiveTable] = React.useState<
    "cr" | "eot" | "completed"
  >("cr");
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [selectedRow, setSelectedRow] = React.useState<RowData | null>(null);
  const [allowEdit, setAllowEdit] = React.useState<boolean>(false);

  /*---- Domain Hooks ----*/
  const { crDataDomain, eotDataDomain } = useCRTrackingQueries({
    fetchCRTrackingData: true,
    crTrackingDataState: dataState,
    fetchEOTData: activeTable === "eot",
  });

  const { softDeleteMutation, permanentDeleteMutation } =
    useCRTrackingMutations();

  const options = useMemo(() => {
    const ops: { label: string; value: string }[] = [];
    crDataDomain.data?.forEach(
      (item: { id: string; description: string }) => {
        ops.push({
          value: item.id,
          label: item.id + ": " + item.description,
        });
      }
    );
    return ops;
  }, [crDataDomain.data]);

  useEffect(() => {
    const value = options.find((option) => option.value === id);
    if (value) {
      setSelectedCR({ label: value.label, value: value.value });
    }
  }, [options, id]);

  const rows: GridRowsProp = useMemo(() => {
    if (selectedCR)
      return (
        crDataDomain.data?.filter(
          (item: { id: string }) => item.id === selectedCR.value
        ) || []
      );
    if (activeTable === "completed") {
      return (
        crDataDomain.data?.filter(
          (item: { stage?: string }) =>
            item?.stage?.toLowerCase() === "completed"
        ) || []
      );
    }
    return (
      crDataDomain.data?.filter(
        (item: { stage?: string }) =>
          item?.stage?.toLowerCase() !== "completed"
      ) || []
    );
  }, [crDataDomain.data, activeTable, selectedCR]);

  const eotRows: GridRowsProp = useMemo(
    () => eotDataDomain.data || [],
    [eotDataDomain.data]
  );

  const eotColumns = useMemo(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    () => modifyEOTArray(generateColumns(eotRows as any)),
    [eotRows]
  );

  const modifyArray = (arr: GridColDef[]) =>
    modifyCRArray(
      arr,
      dataState,
      setDataState,
      setSelectedRow,
      setIsDeleteModalOpen,
      allowEdit,
      crDataDomain.refetch
    );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getRowClassName = (params: any) => {
    const stage = params.row.stage;
    const isEvenRow = params.indexRelativeToCurrentPage % 2 === 0;
    const baseClass = isEvenRow ? "bg-white" : "bg-career-gray-400";
    const cursorClass = allowEdit ? "cursor-pointer" : "";

    const stageClass =
      stage === "Backlog"
        ? "!bg-[#FFE5B4]"
        : stage === "Lounge"
          ? "!bg-[#F9F9F9]"
          : stage === "Build"
            ? "flash-green" // Add flashing effect for "Build"
            : stage === "Test"
              ? "!bg-[#9fc3fc]"
              : stage === "Ice Box"
                ? "!bg-[#aaebfa]"
                : stage === "System Testing (ST)"
                  ? "!bg-[#B3D9FF]"
                  : "";

    return `${baseClass} ${cursorClass} ${stageClass} transition-colors duration-200`;
  };

  return (
    <section>
      <section>
        <section className="flex flex-wrap gap-4 mb-6">
          <Combobox
            list={options}
            placeholder="Select CR ID"
            selectedItem={selectedCR}
            setSelectedItem={setSelectedCR}
            noItemsMessage="No CR found"
          />
          <CreateCRTrackingModal />
        </section>

        <section className="flex gap-4">
          <CRTrackingOptionsModal />
          <ConnectToHubStaff />
          <EOTRequest />
        </section>
      </section>

      <section className="flex items-center justify-end gap-4 mt-12 my-5">
        <div className="w-fit bg-lightblue shadow-md rounded-md text-black p-2 flex items-center gap-2">
          <Checkbox
            className="bg-white"
            checked={activeTable === "completed"}
            onClick={() => {
              if (activeTable !== "completed") {
                setActiveTable("completed");
              } else {
                setActiveTable("cr");
              }
            }}
          />{" "}
          Show Completed CRs
        </div>
        <div className="w-fit bg-lightblue shadow-md rounded-md text-black p-2 flex items-center gap-2">
          <Checkbox
            className="bg-white"
            checked={activeTable === "eot"}
            onClick={() => {
              if (activeTable !== "eot") {
                setActiveTable("eot");
              } else {
                setActiveTable("cr");
              }
            }}
          />{" "}
          Show EOT Requests
        </div>
        <div className="w-[180px] bg-lightblue shadow-md rounded-md text-black p-2 flex items-center gap-2">
          <Checkbox
            className="bg-white"
            onClick={() => setAllowEdit(!allowEdit)}
          />{" "}
          Allow Editing
        </div>
        <Select
          onValueChange={(value) =>
            value === "active"
              ? setDataState("active")
              : setDataState("recycle")
          }
        >
          <SelectTrigger className="w-[180px] bg-white shadow-md">
            <SelectValue
              placeholder={
                dataState === "active" ? "Active CRs" : "Recycle Bin"
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active CRs</SelectItem>
            <SelectItem value="recycle">Recycle Bin</SelectItem>
          </SelectContent>
        </Select>
      </section>

      <section className="mt-10">
        {(activeTable === "cr" || activeTable === "completed") && (
          <TableWithHeaderClass
            initialState={{
              pagination: {
                paginationModel: { pageSize: 20 },
              },
            }}
            rows={rows}
            slots={
              { 
                toolbar: GridToolbar,
              }
            }
            showToolbar={true}
            getRowId={(row) => row._id}
            rowHeight={50}
            disableRowSelectionOnClick
            rowBufferPx={100}
            columns={modifyArray(CRTableColumns)}
            columnBufferPx={5}
            loading={crDataDomain.isLoading}
            pagination
            getRowClassName={getRowClassName}
            checkboxSelection={allowEdit}
            onRowClick={(params) => {
              if (allowEdit) {
                setSelectedRow(params.row as RowData);
                setIsEditModalOpen(true);
              }
            }}
          />
        )}
        {activeTable === "eot" && !eotDataDomain.isLoading && eotDataDomain.data && (
          <TableWithHeaderClass
            getRowId={(row) => row._id}
            rowHeight={38}
            columns={eotColumns}
            rows={eotDataDomain.data}
            loading={eotDataDomain.isLoading}
          />
        )}
      </section>
      {isEditModalOpen && ( // for dynamically importing modal
        <Suspense fallback={<LoadingModal />}>
          <EditRowModal
            rowData={selectedRow}
            onClose={() => setIsEditModalOpen(false)}
            isOpen={isEditModalOpen} // For Opening Transition
            refetch={eotDataDomain.refetch}
          />
        </Suspense>
      )}
      {isDeleteModalOpen && (
        <Suspense fallback={<LoadingModal />}>
          <DeleteConfirmModal
            isOpen={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            onConfirm={async () => {
              if (dataState === "active") {
                softDeleteMutation.mutate(
                  { id: selectedRow?._id as string },
                  {
                    onSuccess: () => setIsDeleteModalOpen(false),
                  }
                );
              } else {
                permanentDeleteMutation.mutate(
                  { id: selectedRow?._id as string },
                  {
                    onSuccess: () => {
                      setDataState("active");
                      setIsDeleteModalOpen(false);
                    },
                  }
                );
              }
            }}
            recycle={dataState === "recycle"}
            itemName={
              (selectedRow?.id + ": " + selectedRow?.description) as string
            }
          />
        </Suspense>
      )}
    </section>
  );
};

export default CRTrackingDataTable;
