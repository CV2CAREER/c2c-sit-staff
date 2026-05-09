"use client";

import React from "react";
import { GridPaginationModel } from "@mui/x-data-grid-pro";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { StyledDataGridPro } from "@/utils/table";
import getColumnsForTable, { renderActionsMenu } from "./table-columns";
import { useJobPreferenceData } from "./context";

const clientsList = [
  { value: "advertisers", label: "Advertisers" },
  { value: "classification", label: "Classification" },
  { value: "country-states-cities", label: "Country, States and Cities" },
  { value: "craft", label: "Craft" },
  { value: "job-type", label: "Job Type" },
  { value: "salary-options", label: "Salary Options" },
  { value: "working-rights", label: "Working Rights" },
];

export default function JobPreferenceDataTable() {
  const [isEditable, setIsEditable] = React.useState(false);
  const {
    activeRecordId,
    setActiveDialog,
    setActiveRecordId,
    jobPreferenceDataState,
    setJobPreferenceDataState,
    selectedTable,
    setSelectedTable,
    paginationModel,
    setPaginationModel,
    tracker,
  } = useJobPreferenceData();

  return (
    <section>
      <div className="flex md:hidden gap-1 items-center ml-auto">
        <p>Auto-Generate Questions</p>
        <Switch />
      </div>

      <section className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <section>
          <label className="mr-5">Users Filter</label>
          <Combobox
            list={clientsList}
            placeholder="Select filter option"
            selectedItem={selectedTable}
            setSelectedItem={setSelectedTable}
            noItemsMessage="No option found"
          />
        </section>

        <section className="flex items-center justify-end gap-4">
          <div className="w-[180px] bg-lightblue shadow-md rounded-md text-black p-2 flex items-center gap-2">
            <Checkbox className="bg-white" checked={isEditable} onClick={() => setIsEditable((prev) => !prev)} />
            Allow Editing
          </div>
          <Select
            onValueChange={(value) => setJobPreferenceDataState(value === "active" ? "active" : "recycle")}
          >
            <SelectTrigger className="w-[180px] bg-white shadow-md">
              <SelectValue placeholder={jobPreferenceDataState === "active" ? "Discovery State: Active" : "Discovery State: Recycle"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Discovery State: Active</SelectItem>
              <SelectItem value="recycle">Discovery State: Recycle</SelectItem>
            </SelectContent>
          </Select>
        </section>
      </section>

      <section className="mt-10">
        <StyledDataGridPro
          paginationModel={paginationModel as GridPaginationModel}
          onPaginationModelChange={(next) => setPaginationModel({ page: next.page, pageSize: next.pageSize })}
          rows={tracker.rows}
          getRowId={(row) => row._id || row.id || row._doc?._id}
          rowHeight={38}
          disableRowSelectionOnClick
          rowBufferPx={100}
          paginationMode="server"
          rowCount={tracker.totalCount}
          pagination
          columns={renderActionsMenu(
            getColumnsForTable(selectedTable.value).map((column) => ({
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
              id: updatedRow._id || updatedRow._doc?._id,
              category: selectedTable.label,
              body: { [changedField]: updatedRow[changedField] },
            });

            return updatedRow;
          }}
          loading={tracker.isLoading || tracker.isFetching}
          disableVirtualization={false}
        />
      </section>
    </section>
  );
}
