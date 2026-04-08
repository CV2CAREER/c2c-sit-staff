"use client";

import React, { createContext, useContext, useState } from "react";
import { DefaultActions } from "@/components/ActionsMenu/ActionsMenu";
import { OptionType } from "@/types";
import { DiscoveryCategory, DiscoveryState, useDiscoveryTracker } from "@/hooks/useDiscoveryTracker";

type JobPreferenceContextType = {
  activeRecordId: string | number | null;
  setActiveRecordId: React.Dispatch<React.SetStateAction<string | number | null>>;
  activeDialog: DefaultActions | null;
  setActiveDialog: React.Dispatch<React.SetStateAction<DefaultActions | null>>;
  jobPreferenceDataState: DiscoveryState;
  setJobPreferenceDataState: React.Dispatch<React.SetStateAction<DiscoveryState>>;
  selectedTable: OptionType;
  setSelectedTable: React.Dispatch<React.SetStateAction<OptionType>>;
  paginationModel: { page: number; pageSize: number };
  setPaginationModel: React.Dispatch<React.SetStateAction<{ page: number; pageSize: number }>>;
  tracker: ReturnType<typeof useDiscoveryTracker>;
};

const defaultTable: OptionType = { value: "advertisers", label: "Advertisers" };

const JobPreferenceContext = createContext<JobPreferenceContextType | undefined>(undefined);

export function JobPreferenceProvider({ children }: { children: React.ReactNode }) {
  const [activeRecordId, setActiveRecordId] = useState<string | number | null>(null);
  const [activeDialog, setActiveDialog] = useState<DefaultActions | null>(null);
  const [jobPreferenceDataState, setJobPreferenceDataState] = useState<DiscoveryState>("active");
  const [selectedTable, setSelectedTable] = useState<OptionType>(defaultTable);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 20 });

  const tracker = useDiscoveryTracker({
    state: jobPreferenceDataState,
    category: selectedTable.value as DiscoveryCategory,
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
        selectedTable,
        setSelectedTable,
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
