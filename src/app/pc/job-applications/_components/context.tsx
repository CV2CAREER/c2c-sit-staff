"use client";

import React, { createContext, useContext, useState } from "react";
import { DefaultActions } from "@/components/ActionsMenu/ActionsMenu";
import { useApplicationTracker } from "@/hooks/useApplicationTracker";
import { useQuestionsTracker } from "@/hooks/useQuestionsTracker";

type FilterOption = { value: string; label: string };

const defaultFilter: FilterOption = { value: "all", label: "All" };

type JobAppsAndQuestionsContextType = {
  activeDialog: DefaultActions | null;
  activeTable: "Applications" | "Questions";
  dataState: "active" | "recycle";
  setActiveDialog: React.Dispatch<React.SetStateAction<DefaultActions | null>>;
  setActiveTable: React.Dispatch<React.SetStateAction<"Applications" | "Questions">>;
  setDataState: React.Dispatch<React.SetStateAction<"active" | "recycle">>;
  paginationModel: { page: number; pageSize: number };
  setPaginationModel: React.Dispatch<React.SetStateAction<{ page: number; pageSize: number }>>;
  // Application filters
  appStatusFilter: FilterOption;
  setAppStatusFilter: React.Dispatch<React.SetStateAction<FilterOption>>;
  aggregatorFilter: FilterOption;
  setAggregatorFilter: React.Dispatch<React.SetStateAction<FilterOption>>;
  sourceFilter: FilterOption;
  setSourceFilter: React.Dispatch<React.SetStateAction<FilterOption>>;
  // Questions-specific filters
  isQuestionsApprovedFilter: FilterOption;
  setIsQuestionsApprovedFilter: React.Dispatch<React.SetStateAction<FilterOption>>;
  questionsRatingFilter: FilterOption;
  setQuestionsRatingFilter: React.Dispatch<React.SetStateAction<FilterOption>>;
  isQuestionsReviewedFilter: FilterOption;
  setIsQuestionsReviewedFilter: React.Dispatch<React.SetStateAction<FilterOption>>;
  questionsAggregatorFilter: FilterOption;
  setQuestionsAggregatorFilter: React.Dispatch<React.SetStateAction<FilterOption>>;
  questionsSourceFilter: FilterOption;
  setQuestionsSourceFilter: React.Dispatch<React.SetStateAction<FilterOption>>;
  // Trackers
  tracker: ReturnType<typeof useApplicationTracker>;
  questionsTracker: ReturnType<typeof useQuestionsTracker>;
};

const JobAppsAndQuestionsContext = createContext<JobAppsAndQuestionsContextType | undefined>(undefined);

export function JobAppsAndQuestionsProvider({
  children,
  initialSource = defaultFilter,
  initialTable = "Applications",
}: {
  children: React.ReactNode;
  initialSource?: FilterOption;
  initialTable?: "Applications" | "Questions";
}) {
  const [activeDialog, setActiveDialog] = useState<DefaultActions | null>(null);
  const [activeTable, setActiveTable] = useState<"Applications" | "Questions">(initialTable);
  const [dataState, setDataState] = useState<"active" | "recycle">("active");
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });

  // Application filters
  const [appStatusFilter, setAppStatusFilter] = useState(defaultFilter);
  const [aggregatorFilter, setAggregatorFilter] = useState(defaultFilter);
  const [sourceFilter, setSourceFilter] = useState(initialSource);

  // Questions filters
  const [isQuestionsApprovedFilter, setIsQuestionsApprovedFilter] = useState(defaultFilter);
  const [questionsRatingFilter, setQuestionsRatingFilter] = useState(defaultFilter);
  const [isQuestionsReviewedFilter, setIsQuestionsReviewedFilter] = useState(defaultFilter);
  const [questionsAggregatorFilter, setQuestionsAggregatorFilter] = useState(defaultFilter);
  const [questionsSourceFilter, setQuestionsSourceFilter] = useState(defaultFilter);

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

  const questionsTracker = useQuestionsTracker({
    state: dataState,
    page: paginationModel.page,
    pageSize: paginationModel.pageSize,
    filters: {
      approved: isQuestionsApprovedFilter.value,
      ratings: questionsRatingFilter.value,
      review: isQuestionsReviewedFilter.value,
      aggregator: questionsAggregatorFilter.value,
      source: questionsSourceFilter.value,
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
