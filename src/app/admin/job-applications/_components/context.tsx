"use client";

import React, { createContext, useContext, useState } from "react";
import { DefaultActions } from "@/components/ActionsMenu/ActionsMenu";
import { useApplicationTracker } from "@/hooks/useApplicationTracker";

type FilterOption = { value: string; label: string };

type JobAppsAndQuestionsContextType = {
  activeDialog: DefaultActions | null;
  activeTable: "Applications" | "Questions";
  dataState: "active" | "recycle";
  setActiveDialog: React.Dispatch<React.SetStateAction<DefaultActions | null>>;
  setActiveTable: React.Dispatch<React.SetStateAction<"Applications" | "Questions">>;
  setDataState: React.Dispatch<React.SetStateAction<"active" | "recycle">>;
  paginationModel: { page: number; pageSize: number };
  setPaginationModel: React.Dispatch<React.SetStateAction<{ page: number; pageSize: number }>>;
  appStatusFilter: FilterOption;
  setAppStatusFilter: React.Dispatch<React.SetStateAction<FilterOption>>;
  aggregatorFilter: FilterOption;
  setAggregatorFilter: React.Dispatch<React.SetStateAction<FilterOption>>;
  sourceFilter: FilterOption;
  setSourceFilter: React.Dispatch<React.SetStateAction<FilterOption>>;
  tracker: ReturnType<typeof useApplicationTracker>;
};

const defaultFilter = { value: "all", label: "All" };

const JobAppsAndQuestionsContext = createContext<JobAppsAndQuestionsContextType | undefined>(undefined);

export function JobAppsAndQuestionsProvider({ children }: { children: React.ReactNode }) {
  const [activeDialog, setActiveDialog] = useState<DefaultActions | null>(null);
  const [activeTable, setActiveTable] = useState<"Applications" | "Questions">("Applications");
  const [dataState, setDataState] = useState<"active" | "recycle">("active");
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });
  const [appStatusFilter, setAppStatusFilter] = useState(defaultFilter);
  const [aggregatorFilter, setAggregatorFilter] = useState(defaultFilter);
  const [sourceFilter, setSourceFilter] = useState(defaultFilter);

  const tracker = useApplicationTracker({
    state: dataState,
    page: paginationModel.page,
    pageSize: paginationModel.pageSize,
    filters: {
      status: appStatusFilter.value,
      aggregator: aggregatorFilter.value,
      source: sourceFilter.value,
    },
  });

  return (
    <JobAppsAndQuestionsContext.Provider
      value={{
        activeDialog,
        activeTable,
        dataState,
        setActiveDialog,
        setActiveTable,
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
      }}
    >
      {children}
    </JobAppsAndQuestionsContext.Provider>
  );
}

export function useJobAppsAndQuestionsData() {
  const context = useContext(JobAppsAndQuestionsContext);
  if (!context) {
    throw new Error("useJobAppsAndQuestionsData must be used within a JobAppsAndQuestionsProvider");
  }

  return context;
}
