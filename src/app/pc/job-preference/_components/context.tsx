"use client";

import React, { createContext, useContext, useState } from "react";
import { DefaultActions } from "@/components/ActionsMenu/ActionsMenu";
import { OptionType } from "@/types";
import { DiscoveryState, useDiscoveryTracker } from "@/hooks/useDiscoveryTracker";

type JobPreferenceContextType = {
  activeRecordId: string | number | null;
  setActiveRecordId: React.Dispatch<React.SetStateAction<string | number | null>>;
  activeDialog: DefaultActions | null;
  setActiveDialog: React.Dispatch<React.SetStateAction<DefaultActions | null>>;
  jobPreferenceDataState: DiscoveryState;
  setJobPreferenceDataState: React.Dispatch<React.SetStateAction<DiscoveryState>>;
  selectedField: OptionType | null;
  setSelectedField: React.Dispatch<React.SetStateAction<OptionType | null>>;
  selectedValue: string;
  setSelectedValue: React.Dispatch<React.SetStateAction<string>>;
  paginationModel: { page: number; pageSize: number };
  setPaginationModel: React.Dispatch<React.SetStateAction<{ page: number; pageSize: number }>>;
  tracker: ReturnType<typeof useDiscoveryTracker>;
};

const JobPreferenceContext = createContext<JobPreferenceContextType | undefined>(undefined);

export function JobPreferenceProvider({ children }: { children: React.ReactNode }) {
  const [activeRecordId, setActiveRecordId] = useState<string | number | null>(null);
  const [activeDialog, setActiveDialog] = useState<DefaultActions | null>(null);
  const [jobPreferenceDataState, setJobPreferenceDataState] = useState<DiscoveryState>("active");
  const [selectedField, setSelectedField] = useState<OptionType | null>(null);
  const [selectedValue, setSelectedValue] = useState<string>("Any");
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 50 });

  // A new state/filter is a different result set: go back to the first page.
  const filterKey = `${jobPreferenceDataState}|${selectedField?.value ?? ""}|${selectedValue}`;
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    setPaginationModel((prev) => (prev.page === 0 ? prev : { ...prev, page: 0 }));
  }

  const tracker = useDiscoveryTracker({
    state: jobPreferenceDataState,
    field: selectedField?.value,
    value: selectedValue !== "Any" ? selectedValue : undefined,
    page: paginationModel.page,
    pageSize: paginationModel.pageSize,
  });

  return (
    <JobPreferenceContext.Provider
      value={{
        activeRecordId,
        setActiveRecordId,
        activeDialog,
        setActiveDialog,
        jobPreferenceDataState,
        setJobPreferenceDataState,
        selectedField,
        setSelectedField,
        selectedValue,
        setSelectedValue,
        paginationModel,
        setPaginationModel,
        tracker,
      }}
    >
      {children}
    </JobPreferenceContext.Provider>
  );
}

export function useJobPreferenceData() {
  const context = useContext(JobPreferenceContext);
  if (!context) {
    throw new Error("useJobPreferenceData must be used within a JobPreferenceProvider");
  }

  return context;
}
