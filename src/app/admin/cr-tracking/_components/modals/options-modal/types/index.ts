// types/index.ts

export interface BaseOption {
  _id: string;
  name: string;
}

export interface Owner extends BaseOption {
  email: string;
  slackId: string;
  role: string;
}

export interface Change extends BaseOption {}
export interface Severity extends BaseOption {}
export interface Family extends BaseOption {}
export interface Stage extends BaseOption {}
export interface Type extends BaseOption {}
export interface ImpactedProvider extends BaseOption {}
export interface ImpactedNode extends BaseOption {}

export interface ImpactedPersona {
  _id: string;
  label: string; // Impacted Persona uses 'label' instead of 'name'
}

// Consolidated API Response Type
export interface AllCrOptionsResponse {
  message: string;
  allCROwnersData: Owner[];
  allCRChangesData: Change[];
  allCRSeveritiesData: Severity[];
  allCRFamiliesData: Family[];
  allCRStagesData: Stage[];
  allCRTypesData: Type[];
  allCRImpactedPersonasData: ImpactedPersona[];
  allCRImpactedProvidersData: ImpactedProvider[];
  allCRImpactedNodesData: ImpactedNode[];
}

// Props for generic forms (AddForm, UpdateForm, DeleteForm)
export interface GenericFormProps<T> {
  onClose: () => void; // To go back to the selection screen (or close dialog if no selection screen)
  onSuccess: () => void; // To notify parent of successful operation (e.g., refetch data)
  itemType: string; // e.g., 'owner', 'changes'
  itemLabelField?: keyof T; // Field to use for display in select/list, defaults to 'name'
}

export interface AddFormProps extends GenericFormProps<any> {} // 'any' for now as formData is dynamic
export interface UpdateFormProps extends GenericFormProps<any> {
  items: any[]; // Items to select from for update
}
export interface DeleteFormProps extends GenericFormProps<any> {
  items: any[]; // Items to select from for delete
}

// Props for content components (AddOptionsContent, UpdateOptionsContent, DeleteOptionsContent)
// These now receive data directly and a single onSuccess callback
export interface OptionsContentProps {
  onCloseModal: () => void; // To close the entire dialog
  onSuccess: () => void; // Generic success callback to trigger data refetch in parent (CudOptionsDialog)
  // Data arrays for update/delete operations
  owners: Owner[];
  changes: Change[];
  severities: Severity[];
  families: Family[];
  stages: Stage[];
  types: Type[];
  impactedPersonas: ImpactedPersona[];
  impactedProviders: ImpactedProvider[];
  impactedNodes: ImpactedNode[];
}

// Props for the main CudOptionsDialog component
export interface CudOptionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "add" | "update" | "delete";
}
