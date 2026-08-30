"use client";

import React, { useEffect, useState } from "react";
import { GridRowSelectionModel, GridToolbar } from "@mui/x-data-grid-pro";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StyledDataGridPro } from "@/utils/table";
import jobApplicationsColumns from "./table-columns";
import questionsColumns from "./questions-columns";
import { useJobAppsAndQuestionsData } from "./context";
import { JobPrefDataTableActionDialogs } from "./dialogs";
import CustomSelectDropDown from "@/components/ui/custom-select-dropdown";

const applicationStatusList = [
  { value: "all", label: "All" },
  { value: "Failed", label: "Failed" },
  { value: "Sample", label: "Sample" },
  { value: "Successful", label: "Successful" },
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

const isApprovedList = [
  { value: "all", label: "All" },
  { value: "false-inc", label: "False-INC" },
  { value: "false-review", label: "False-Review" },
  { value: "true", label: "True" },
];

const ratingslist = [
  { value: "all", label: "All" },
  { value: "25", label: "25" },
  { value: "50", label: "50" },
];

const reviewedList = [
  { value: "all", label: "All" },
  { value: "no", label: "No" },
  { value: "yes", label: "Yes" },
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
    // Application filters
    appStatusFilter,
    setAppStatusFilter,
    aggregatorFilter,
    setAggregatorFilter,
    sourceFilter,
    setSourceFilter,
    // Questions filters
    isQuestionsApprovedFilter,
    setIsQuestionsApprovedFilter,
    questionsRatingFilter,
    setQuestionsRatingFilter,
    isQuestionsReviewedFilter,
    setIsQuestionsReviewedFilter,
    questionsAggregatorFilter,
    setQuestionsAggregatorFilter,
    questionsSourceFilter,
    setQuestionsSourceFilter,
    tracker,
    questionsTracker,
  } = useJobAppsAndQuestionsData();

  const isQuestions = activeTable === "Questions";
  const activeTracker = isQuestions ? questionsTracker : tracker;

  const [allowEditing, setAllowEditing] = useState(false);
  const [selectedRows, setSelectedRows] = useState<GridRowSelectionModel>({ type: "include", ids: new Set() });
  const [selectedRowForAction, setSelectedRowForAction] = useState<string | number | null>(null);
  const selectedRowIds = Array.from(selectedRows.ids) as Array<string | number>;

  useEffect(() => {
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  }, [
    activeTable,
    dataState,
    appStatusFilter,
    aggregatorFilter,
    sourceFilter,
    isQuestionsApprovedFilter,
    questionsRatingFilter,
    isQuestionsReviewedFilter,
    questionsAggregatorFilter,
    questionsSourceFilter,
    setPaginationModel,
  ]);

  return (
    <section className="w-full">
      <section className="bg-white rounded-md shadow-md p-6">
        <h2 className="text-lg font-semibold mb-6">Filter</h2>
        <div className="flex gap-5 flex-wrap">
          {isQuestions ? (
            <>
              <div>
                <p>Approved</p>
                <CustomSelectDropDown
                  selected={isQuestionsApprovedFilter}
                  menu={isApprovedList}
                  setSelected={setIsQuestionsApprovedFilter}
                />
              </div>
              <div>
                <p>Ratings</p>
                <CustomSelectDropDown
                  selected={questionsRatingFilter}
                  menu={ratingslist}
                  setSelected={setQuestionsRatingFilter}
                />
              </div>
              <div>
                <p>Review</p>
                <CustomSelectDropDown
                  selected={isQuestionsReviewedFilter}
                  menu={reviewedList}
                  setSelected={setIsQuestionsReviewedFilter}
                />
              </div>
              <div>
                <p>Source</p>
                <CustomSelectDropDown
                  selected={questionsSourceFilter}
                  menu={sourcesList}
                  setSelected={setQuestionsSourceFilter}
                />
              </div>
              <div>
                <p>Aggregators</p>
                <CustomSelectDropDown
                  selected={questionsAggregatorFilter}
                  menu={aggregatorsList}
                  setSelected={setQuestionsAggregatorFilter}
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <p>Status</p>
                <CustomSelectDropDown
                  selected={appStatusFilter}
                  menu={applicationStatusList}
                  setSelected={setAppStatusFilter}
                />
              </div>
              <div>
                <p>Source</p>
                <CustomSelectDropDown
                  selected={sourceFilter}
                  menu={sourcesList}
                  setSelected={setSourceFilter}
                />
              </div>
              <div>
                <p>Aggregators</p>
                <CustomSelectDropDown
                  selected={aggregatorFilter}
                  menu={aggregatorsList}
                  setSelected={setAggregatorFilter}
                />
              </div>
            </>
          )}
        </div>
      </section>

      <section className="flex items-center justify-between flex-wrap gap-4 my-7">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex gap-3">
            <p>Total {activeTable}:</p>
            <p className="font-semibold">{activeTracker.totalCount}</p>
          </div>
          {!isQuestions && (
            <>
              <div className="flex gap-3">
                <p>Successful:</p>
                <p className="font-semibold">{tracker.counts.successful}</p>
              </div>
              <div className="flex gap-3">
                <p>Failed:</p>
                <p className="font-semibold">{tracker.counts.failed}</p>
              </div>
            </>
          )}

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

        <section className="flex w-full sm:w-auto flex-wrap sm:flex-nowrap items-center justify-start sm:justify-end gap-3 sm:gap-4">
          {/* <button
            onClick={() => setDataState(dataState === "active" ? "recycle" : "active")}
            className="px-4 py-2 rounded-md bg-slate-800 text-white hover:bg-slate-700 transition-colors"
          >
            {dataState === "active" ? `View Recycle Bin` : `View Active ${activeTable}`}
          </button> */}
          <div className="w-full sm:w-[180px] bg-lightblue shadow-md rounded-md text-black p-2 flex items-center gap-2">
            <Checkbox
              id="allow-editing"
              checked={allowEditing}
              onCheckedChange={(checked) => setAllowEditing(checked === true)}
              className="bg-white"
            />
            <label htmlFor="allow-editing">Allow Editing</label>
          </div>
          <Select
            value={activeTable}
            onValueChange={(value) => setActiveTable(value === "Applications" ? "Applications" : "Questions")}
          >
            <SelectTrigger className="w-full sm:w-[180px] bg-white shadow-md">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Applications">Applications</SelectItem>
              <SelectItem value="Questions">Questions</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={dataState}
            onValueChange={(value) => setDataState(value === "active" ? "active" : "recycle")}
          >
            <SelectTrigger className="w-full sm:w-[180px] bg-white shadow-md">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active {activeTable}</SelectItem>
              <SelectItem value="recycle">Recycle Bin</SelectItem>
            </SelectContent>
          </Select>
        </section>
      </section>

      <section className="mt-10">
        <StyledDataGridPro
          rows={activeTracker.rows}
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
          columns={isQuestions ? questionsColumns : jobApplicationsColumns}
          columnBufferPx={5}
          loading={activeTracker.isLoading || activeTracker.isFetching}
          paginationMode="server"
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          rowCount={activeTracker.totalCount}
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
