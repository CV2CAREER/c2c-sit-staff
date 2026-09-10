"use client";

import React from "react";
import { GridPaginationModel, GridToolbar } from "@mui/x-data-grid-pro";
import { HiOutlineBriefcase, HiOutlineFilter } from "react-icons/hi";
import { Pencil } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StyledDataGridPro } from "@/utils/table";
import getColumnsForTable, { renderActionsMenu } from "./table-columns";
import { useJobPreferenceData } from "./context";
import { DISCOVERY_FILTER_FIELDS } from "@/hooks/useDiscoveryTracker";

export default function JobPreferenceDataTable() {
  const [isEditable, setIsEditable] = React.useState(false);
  const {
    activeRecordId,
    setActiveDialog,
    setActiveRecordId,
    jobPreferenceDataState,
    setJobPreferenceDataState,
    selectedField,
    setSelectedField,
    selectedValue,
    setSelectedValue,
    paginationModel,
    setPaginationModel,
    tracker,
  } = useJobPreferenceData();

  const valueOptions = [
    { value: "Any", label: "Any" },
    ...tracker.filterValues.map((v) => ({ value: v, label: v })),
  ];

  return (
    <section className="relative overflow-hidden flex flex-col gap-5 bg-white rounded-xl p-4 md:p-6 border border-primary/15 shadow-[0_1px_10px_rgba(0,142,211,0.10)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <HiOutlineBriefcase size={20} />
          </span>
          <div>
            <h2 className="text-lg md:text-xl font-semibold leading-tight">Manual Applications</h2>
            <p className="text-xs text-gray-400">
              {tracker.totalCount} record{tracker.totalCount === 1 ? "" : "s"} · {jobPreferenceDataState === "active" ? "Active" : "Recycle Bin"}
            </p>
          </div>
        </div>

        <Select
          onValueChange={(value) => setJobPreferenceDataState(value === "active" ? "active" : "recycle")}
        >
          <SelectTrigger className="w-[200px] bg-white border-gray-200 shadow-sm">
            <SelectValue placeholder={jobPreferenceDataState === "active" ? "Discovery State: Active" : "Discovery State: Recycle"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Discovery State: Active</SelectItem>
            <SelectItem value="recycle">Discovery State: Recycle</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4 rounded-lg border border-gray-100 bg-gray-50 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex items-center gap-2 pb-2 text-primary">
            <HiOutlineFilter size={16} />
            <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Filter</span>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Field</label>
            <Combobox
              list={DISCOVERY_FILTER_FIELDS}
              placeholder="Filter by field"
              selectedItem={selectedField}
              setSelectedItem={(item) => {
                setSelectedField(item);
                setSelectedValue("Any");
              }}
              noItemsMessage="No option found"
              btnTriggerStyles="min-w-[180px] justify-between bg-white shadow-sm"
            />
          </div>

          {selectedField ? (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Value</label>
              <Combobox
                list={valueOptions}
                placeholder="Select value"
                selectedItem={{ value: selectedValue, label: selectedValue }}
                setSelectedItem={(item) => setSelectedValue(item?.value ?? "Any")}
                noItemsMessage="No values found"
                btnTriggerStyles="min-w-[180px] justify-between bg-white shadow-sm"
              />
            </div>
          ) : null}
        </div>

        <label className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 shadow-sm cursor-pointer">
          <Checkbox checked={isEditable} onClick={() => setIsEditable((prev) => !prev)} />
          <Pencil size={14} className="text-primary" />
          Allow Editing
        </label>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-100">
        <StyledDataGridPro
          slots={{ toolbar: GridToolbar }}
          showToolbar
          paginationModel={paginationModel as GridPaginationModel}
          onPaginationModelChange={(next) => setPaginationModel({ page: next.page, pageSize: next.pageSize })}
          rows={tracker.rows}
          getRowId={(row) => row.id}
          rowHeight={54}
          disableRowSelectionOnClick
          rowBufferPx={100}
          pagination
          columns={renderActionsMenu(
            getColumnsForTable().map((column) => ({
              ...column,
              editable: column.field !== "actions" && column.field !== "id" && isEditable,
            })),
            jobPreferenceDataState,
            {
              activeRecordId,
              setActiveDialog,
              setActiveRecordId,
            },
          )}
          columnBufferPx={5}
          processRowUpdate={(updatedRow, oldRow) => {
            const changedField = Object.keys(updatedRow).find((key) => updatedRow[key] !== oldRow[key]);
            if (!changedField) return updatedRow;

            tracker.updateRecord.mutate({
              id: updatedRow.id,
              body: { [changedField]: updatedRow[changedField] },
            });

            return updatedRow;
          }}
          loading={tracker.isLoading || tracker.isFetching}
          disableVirtualization={false}
        />
      </div>
    </section>
  );
}
