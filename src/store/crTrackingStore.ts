// store/crTrackingStore.ts
import { create } from "zustand";

// Define the type for CRTrackingFormInputs 
type CRTrackingFormInputs = {
  startDate?: string | null;
  endDate?: string | null;
  ownerEmail?: string;
  description: string;
  crType: string;
  stage: string;
  status: string;
  durationInHours: number;
  nil: string;
  change: string;
  severity: string;
  family: string;
  impactedPersona: string[];
  impactedProvider: string[];
  impactedNode: string[];
  owner: string;
  meetAfterCompletion: boolean;
  note?: string | undefined;
  nominatedDeveloper?: string | undefined;
  circularField?: any;
};

// Define the type for crTrackingPage1Data based on its structure
interface CRTrackingPage1Data {
  prevState?: string;
  currentState: string;
  currentStateImageUrls?: string[];
  futureState: string;
  futureStateImageUrls?: string[];
  context: string;
  businessImpact: string;
}

export type CRCompleteForm = CRTrackingFormInputs & CRTrackingPage1Data;

interface CRTrackingState {
  formData: CRTrackingFormInputs | null; // Use the inferred type or null if no data yet
  crTrackingPage1Data: CRTrackingPage1Data | null;
  setFormData: (data: CRTrackingFormInputs) => void; // Enforce the type for setFormData
  setCrTrackingPage1Data: (data: CRTrackingPage1Data) => void;
}

export const useCRTrackingStore = create<CRTrackingState>((set) => ({
  formData: null, // Initialize with null or an empty object matching the schema
  setFormData: (data) => set({ formData: data }),
  crTrackingPage1Data: null, // Initialize with an empty object of the correct type
  setCrTrackingPage1Data: (data) => set({ crTrackingPage1Data: data }),
}));
