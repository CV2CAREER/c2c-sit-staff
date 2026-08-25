export const DROPDOWN_OPTIONS = (listKey: string) => `/api/v1/admin/dropdown-options/${listKey}`;
export const DROPDOWN_OPTIONS_RECYCLE_BIN = (listKey: string) =>
  `/api/v1/admin/dropdown-options/${listKey}/recycle-bin`;
export const DROPDOWN_OPTIONS_REORDER = (listKey: string) =>
  `/api/v1/admin/dropdown-options/${listKey}/reorder`;
export const DROPDOWN_OPTION = (id: string) => `/api/v1/admin/dropdown-options/item/${id}`;
export const DROPDOWN_OPTION_RESTORE = (id: string) => `/api/v1/admin/dropdown-options/item/${id}/restore`;
export const DROPDOWN_OPTION_PERMANENT = (id: string) => `/api/v1/admin/dropdown-options/item/${id}/permanent`;
