import { camelCaseToSentenceCase } from "./helperFns";
import useDateSort from "./useDateSort";

export function generateColumns(rows: any[]) {
  const fi = rows[0];
  const tableColumns = [
    ...Object.keys({ ...fi, note: "", updatedBy: "", nominatedDeveloper: "" }),
  ];
  const keyTitleMap = {
    updatedBy: "Last Updated By",
  };
  const modifiedArr = tableColumns.map((el) => {
    return {
      field: el,
      headerName: keyTitleMap[el as keyof typeof keyTitleMap]
        ? keyTitleMap[el as keyof typeof keyTitleMap]
        : camelCaseToSentenceCase(el),
      width: 200,
      type: el,
      cellClassName: "el",
      renderCell: el === "counter" ? renderCounterCell : undefined,
      sortComparator: [
        "createdat",
        "updatedat",
        "timestamp",
        "enddate",
        "startdate",
      ].includes(el.toLowerCase())
        ? useDateSort()
        : undefined,
    };
  });

  return modifiedArr;
}

const renderCounterCell = (params: any) => {
  const daysSpent = params.value;
  let color = "text-green-500"; // Default: fresh/new
  let status = "Fresh";

  if (daysSpent > 7) {
    color = "text-red-500"; // Overdue/urgent
    status = "High";
  } else if (daysSpent >= 4) {
    color = "text-yellow-500"; // Warning: getting older
    status = "Medium";
  } else {
    color = "text-green-500"; // Fresh/new
    status = "Low";
  }

  return (
    <div className={`flex items-center ${color}`}>
      <span className="font-bold mr-2">{daysSpent}</span>
      <span className="text-xs">{status}</span>
    </div>
  );
};
