import { StyledDataGridPro } from "@/utils/table";
import { DataGridProProps } from "@mui/x-data-grid-pro";

const TableWithHeaderClass = (props: DataGridProProps) => {
  return <StyledDataGridPro {...props} />;
};

export default TableWithHeaderClass;
