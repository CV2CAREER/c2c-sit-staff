import { create } from "zustand";

// --- types ---
interface IFilterState {
  startDate: string;
  endDate: string;
}

interface IFilterActions {
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  clearFilter: () => void;
}

type FilterStore = IFilterState & IFilterActions;

// --- store ---
export const useFilterStore = create<FilterStore>((set) => ({
  startDate: "",
  endDate: "",

  setStartDate: (date) => set({ startDate: date }),
  setEndDate: (date) => set({ endDate: date }),
  clearFilter: () => set({ startDate: "", endDate: "" }),
}));
