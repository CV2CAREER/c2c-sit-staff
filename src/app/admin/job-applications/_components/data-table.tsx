"use client";

import React, { useEffect, useState } from "react";
import { GridRowSelectionModel, GridToolbar } from "@mui/x-data-grid-pro";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { applyHeaderClassName, StyledDataGridPro } from "@/utils/table";
import jobApplicationsColumns from "./table-columns";
import { useJobAppsAndQuestionsData } from "./context";
import { JobPrefDataTableActionDialogs } from "./dialogs";
import SearchSelect from "@/components/ui/react-select";

const applicationStatusList = [
  { value: "all", label: "All" },
  { value: "failed", label: "Failed" },
  { value: "sample", label: "Sample" },
  { value: "successful", label: "Successful" },
];

const aggregatorsList = [
  { value: "all", label: "All" },
  { value: "INDEED", label: "Indeed" },
  { value: "JORA", label: "Jora" },
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "REED", label: "Reed" },
];

const sourcesList = [
  { value: "all", label: "All" },
  { value: "client", label: "Client" },
  { value: "generic", label: "Generic" },
  { value: "jm", label: "JM" },
];

export default function JobApplicationsAndQuestionsDataTable() {
  const {
    activeDialog,
    setActiveDialog,
    activeTable,
    setActiveTable,
    dataState,
    setDataState,
    paginationModel,
    setPaginationModel,
    appStatusFilter,
    setAppStatusFilter,
    aggregatorFilter,
    setAggregatorFilter,
    sourceFilter,
    setSourceFilter,
    tracker,
  } = useJobAppsAndQuestionsData();

  const [allowEditing, setAllowEditing] = useState(false);
  const [selectedRows, setSelectedRows] = useState<GridRowSelectionModel>({ type: "include", ids: new Set() });
  const [selectedRowForAction, setSelectedRowForAction] = useState<string | number | null>(null);
  const selectedRowIds = Array.from(selectedRows.ids) as Array<string | number>;

  useEffect(() => {
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  }, [activeTable, dataState, appStatusFilter, aggregatorFilter, sourceFilter, setPaginationModel]);

  return (
    <section className="w-full">
      <section className="bg-white rounded-md shadow-md p-6">
        <h2 className="text-lg font-semibold mb-6">Filter</h2>
        <div className="flex gap-5 flex-wrap">
          <div>
            <p>Status</p>
            <SearchSelect
              name="status"
              placeholder="Select status"
              options={applicationStatusList}
              value={appStatusFilter}
              onChange={setAppStatusFilter}
            />
          </div>
          <div>
            <p>Source</p>
            <SearchSelect
              name="source"
              placeholder="Select source"
              options={sourcesList}
              value={sourceFilter}
              onChange={setSourceFilter}
            />
          </div>
          <div>
            <p>Aggregators</p>
            <SearchSelect
              name="aggregator"
              placeholder="Select aggregator"
              options={aggregatorsList}
              value={aggregatorFilter}
              onChange={setAggregatorFilter}
            />
          </div>
        </div>
      </section>

      <section className="flex items-center justify-between flex-wrap gap-4 my-7">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex gap-3">
            <p>Total Applications:</p>
            <p className="font-semibold">{tracker.totalCount}</p>
          </div>
          <div className="flex gap-3">
            <p>Successful:</p>
            <p className="font-semibold">{tracker.counts.successful}</p>
          </div>
          <div className="flex gap-3">
            <p>Failed:</p>
            <p className="font-semibold">{tracker.counts.failed}</p>
          </div>

          {selectedRowIds.length > 0 ? (
            <div className="flex gap-2">
              {dataState === "active" ? (
                <button
                  onClick={() => {
                    setSelectedRowForAction(selectedRowIds[0]);
                    setActiveDialog("soft-delete");
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
                >
                  Move to Recycle ({selectedRowIds.length})
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setSelectedRowForAction(selectedRowIds[0]);
                      setActiveDialog("restore");
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                  >
                    Restore ({selectedRowIds.length})
                  </button>
                  <button
                    onClick={() => {
                      setSelectedRowForAction(selectedRowIds[0]);
                      setActiveDialog("delete");
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                  >
                    Permanently Delete ({selectedRowIds.length})
                  </button>
                </>
              )}
            </div>
          ) : null}
        </div>

        <section className="flex items-center justify-end gap-4">
          <button
            onClick={() => setDataState(dataState === "active" ? "recycle" : "active")}
            className="px-4 py-2 rounded-md bg-slate-800 text-white hover:bg-slate-700 transition-colors"
          >
            {dataState === "active" ? "View Recycle Bin" : "View Active Applications"}
          </button>
          <div className="w-[180px] bg-lightblue shadow-md rounded-md text-black p-2 flex items-center gap-2">
            <Checkbox
              id="allow-editing"
              checked={allowEditing}
              onCheckedChange={(checked) => setAllowEditing(checked === true)}
              className="bg-white"
            />
            <label htmlFor="allow-editing">Allow Editing</label>
          </div>
          <Select onValueChange={(value) => setActiveTable(value === "Applications" ? "Applications" : "Questions")}>
            <SelectTrigger className="w-[180px] bg-white shadow-md">
              <SelectValue placeholder={activeTable} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Applications">Applications</SelectItem>
              <SelectItem value="Questions">Questions</SelectItem>
            </SelectContent>
          </Select>
          <Select onValueChange={(value) => setDataState(value === "active" ? "active" : "recycle")}>
            <SelectTrigger className="w-[180px] bg-white shadow-md">
              <SelectValue placeholder={dataState === "active" ? "Active Applications" : "Recycle Bin"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active Applications</SelectItem>
              <SelectItem value="recycle">Recycle Bin</SelectItem>
            </SelectContent>
          </Select>
        </section>
      </section>

      <section className="mt-10">
        <StyledDataGridPro
          rows={tracker.rows}
          getRowId={(row) => row.id}
          rowHeight={38}
          checkboxSelection={allowEditing}
          rowSelectionModel={selectedRows}
          onRowSelectionModelChange={(newSelection) => setSelectedRows(newSelection)}
          slots={{ toolbar: GridToolbar }}
          slotProps={{ toolbar: { showQuickFilter: true, quickFilterProps: { debounceMs: 500 } } as any }}
          className="bg-white shadow-md rounded-lg"
          disableRowSelectionOnClick
          rowBufferPx={100}
          columns={applyHeaderClassName(jobApplicationsColumns)}
          columnBufferPx={5}
          loading={tracker.isLoading || tracker.isFetching}
          paginationMode="server"
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          rowCount={tracker.totalCount}
          pageSizeOptions={[25, 50, 100]}
          filterMode="server"
          sortingMode="server"
          pagination
        />
      </section>

      {selectedRowForAction && activeDialog ? (
        <JobPrefDataTableActionDialogs appOrQuestionId={selectedRowForAction} />
      ) : null}
    </section>
  );
}
