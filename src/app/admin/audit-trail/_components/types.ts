import { GridColDef } from "@mui/x-data-grid-pro";

export type IColumnValues = GridColDef & {
  field: string;
  headerName: string;
  width?: number | string;
  type?: string;
  cellClassName?: string;
  headerClassName?: string;
  disableColumnMenu?: boolean;
  disableExport?: boolean;
  getActions?: () => any;
  editable?: boolean;
};

export interface PaginationData {
  page: number;
  pageSize: number;
  search: string;
}
