/* eslint-disable @typescript-eslint/ban-ts-comment */
import { applyHeaderClassName, StyledDataGridPro } from "@/utils/table";
import { DataGridProProps } from "@mui/x-data-grid-pro";

const TableWithHeaderClass = (props: DataGridProProps) => {
  return (
    <StyledDataGridPro
      {...props}
      //@ts-ignore
      columns={applyHeaderClassName(props.columns)}
    />
  );
};

export default TableWithHeaderClass;
