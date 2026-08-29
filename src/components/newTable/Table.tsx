/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unsafe-function-type */
"use client";
import React, {  useState, useMemo } from "react";
import { Checkbox } from "antd";
import { modifyHeader, modifyRowData, reOrderKeys } from "@/utils/newTableFunc";
// import { toast } from "react-hot-toast";
import { IoTrashSharp } from "react-icons/io5";
import { MdRestore } from "react-icons/md";
import Image from "next/image";
import hLogo from "../../../public/svg/h-logo.svg";
import {
  GridRowsProp,
  GridRowModesModel,
  GridToolbarContainer,
  GridActionsCellItem,
  GridToolbar,
  GridFilterModel,
} from "@mui/x-data-grid-pro";

import { moveTo, orderTable, StyledDataGridPro } from "@/utils/table";
import dateSortComparator, { applyDateSort } from "@/utils/dateSort";
import "./table.css";

interface IColumnValues {
  field: string;
  headerName: string;
  width: number | string;
  type?: string;
  cellClassName?: string;
  headerClassName?: string;
  getActions?: Function;
  editable?: boolean;
}

interface Itable {
  data: any;
  helpers: any;
  allowDelete?: boolean;
  allowRestore?: any;
  modifyArray: Function;
  handleSelection?: Function;
  editMode?: boolean;
  searchQuery?: string;
  setSearchQuery?: React.Dispatch<React.SetStateAction<string>>;
  setEditMode?: Function;
  handleDelete?: Function;
  onRowClick?: (params: any) => void;
  removeCpan?: boolean;
  cursorPointer?: boolean;
  tableName: string;
  handleDeleteMultiple?: Function;
  actions?: { label: string; isChecked: boolean; handler: Function }[];
  fetchDocs?: () => void;
  checkBoxSelection?: boolean;
  filterModel?: GridFilterModel;
  handleFilterChange?: (model: GridFilterModel) => void;
  paginationData?: { page: number; pageSize: number };
  setPaginationData?: (p: { page: number; pageSize: number }) => void;
  rowCount?: number;
  handleRestore?: Function;
  hideXFlow?: boolean;
  isLoading?: boolean;
  onRowUpdate?: (updatedRow: any, originalRow: any) => Promise<any>;
}

export { StyledDataGridPro };

const Table = ({
  data,
  helpers,
  allowDelete,
  allowRestore,
  modifyArray,
  filterModel,
  searchQuery,
  setSearchQuery,
  handleFilterChange,
  handleSelection,
  editMode = false,
  setEditMode,
  handleDelete,
  onRowClick,
  removeCpan,
  cursorPointer,
  handleDeleteMultiple,
  actions,
  tableName,
  checkBoxSelection = true,
  paginationData,
  handleRestore,
  setPaginationData,
  rowCount,
  isLoading = false,
  onRowUpdate,
}: Itable) => {
  const [rowIds, setRowIds] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [pagination, setPagination] = useState({
    page: paginationData?.page ?? 0,
    pageSize: paginationData?.pageSize ?? 15,
  });

  const rowsData = useMemo(() => {
    if (!data) return [];
    return data.map((el: any, index: number) => modifyRowData(el, index));
  }, [data]);

  const filteredRow = useMemo(() => {
    const sQuery = searchQuery || query;
    if (!sQuery) return rowsData;

    return rowsData.filter((row: any) =>
      Object.values(row).some((value) => {
        return value
          ?.toString()
          .toLowerCase()
          .includes(sQuery.toLowerCase());
      }),
    );
  }, [rowsData, searchQuery, query]);

  const columnHeaders = useMemo(() => {
    if (!data?.length) return [];

    const fi = data[0];
    const exemptCols = [
      "prevState",
      "nominatedDeveloperEmail",
      "nilEmail",
      "credentialId",
    ];

    const tableColumns = [
      ...Object.keys({
        ...fi,
        note: "",
        updatedBy: "",
        nominatedDeveloper: "",
      }),
    ].filter((f) => !exemptCols.includes(f));

    const keyTitleMap: Record<string, string> = {
      updatedBy: "Last Updated By",
    };

    let modifiedArr: IColumnValues[] = tableColumns.map((el) => {
      return {
        field: el,
        // @ts-ignore
        headerName: keyTitleMap[el]
          ? keyTitleMap[el]
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
          ? dateSortComparator()
          : undefined,
      };
    });

    if (allowDelete === true) {
      modifiedArr.unshift({
        field: "actions",
        type: "actions",
        headerName: "Delete",
        width: 100,
        getActions: (params: any) => {
          return [
            <GridActionsCellItem
              key={params.id}
              disabled={!editMode}
              icon={
                <IoTrashSharp className="hover:text-red-500 cursor-pointer hover:shadow-md transition-all" />
              }
              label="Cancel"
              className="textPrimary"
              onClick={() => {
                const id = params.row.aggregator?._id || params.id;
                if (handleDelete) {
                  handleDelete(id);
                }
              }}
              color="inherit"
            />,
          ];
        },
      });
    }

    if (allowRestore) {
      modifiedArr.unshift({
        field: "restore",
        type: "actions",
        headerName: "Restore",
        width: 100,
        getActions: (params: any) => {
          return [
            <GridActionsCellItem
              key={params.id}
              icon={
                <MdRestore className="hover:text-blue-500 cursor-pointer hover:shadow-md transition-all" />
              }
              label="Restore"
              className="textPrimary"
              onClick={() => {
                const id = params.row.aggregator?._id || params.id;
                // @ts-ignore
                handleRestore(id);
              }}
              color="inherit"
            />,
          ];
        },
      });
    }

    modifiedArr = modifyArray(modifiedArr, helpers);

    if (removeCpan) {
      modifiedArr = modifiedArr.filter((el) => el.field !== "action");
    }

    const modifiedObjArr = modifyHeader(
      reOrderKeys(modifiedArr),
      "cpan",
      null,
      null,
      helpers,
    );

    const ordered = orderTable(tableName, applyDateSort(modifiedObjArr));
    return ordered || modifiedObjArr;
  }, [data, helpers, editMode, allowDelete, handleDelete, allowRestore, modifyArray, removeCpan, tableName]);


  const removeDuplicateHeaders = (columnHeaders: any[]) => {
    const uniqueFields = new Set();
    const uniqueColumns = columnHeaders.filter((column: any) => {
      if (!uniqueFields.has(column.field)) {
        uniqueFields.add(column.field);
        return true; // Keep the element
      }
      return false; // Filter out the element
    });

    return uniqueColumns;
  };


  function handleSearchSubmit() {
    setSearchLoading(true);
    // let filteredRows;
    const sQuery = searchQuery || query;
    if (!sQuery) {
      // Logic for filteredRow is already in useMemo, but handleSearchSubmit implies a manual trigger
      // Since it's client-side, it's already sync. We just set searchLoading.
      setSearchLoading(false);
      return;
    }
    setSearchLoading(false);
  }

  const handleSelectionChange = (newSelection: number[]) => {
    // @ts-ignore
    setRowIds(newSelection);
    const users = [];

    if (handleSelection) {
      for (let i = 0; i < data.length; i++) {
        for (let j = 0; j < newSelection.length; j++) {
          if (data[i]._id === newSelection[j]) {
            users.push(data[i]);
          }
        }
      }

      handleSelection(users);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface EditToolbarProps {
    setRowsData: (newRows: (oldRows: GridRowsProp) => GridRowsProp) => void;
    setRowModesModel: (
      newModel: (oldModel: GridRowModesModel) => GridRowModesModel,
    ) => void;
  }

  function EditToolbar() {
    return (
      <GridToolbarContainer>
        <GridToolbar />
      </GridToolbarContainer>
    );
  }
  const getRowClassName = (params: any) => {
    const stage = params.row.stage;
    const isEvenRow = params.indexRelativeToCurrentPage % 2 === 0;
    const baseClass = isEvenRow ? "bg-white" : "bg-career-gray-400";
    const cursorClass = cursorPointer ? "cursor-pointer" : "";

    const stageClass =
      stage === "Backlog"
        ? "!bg-[#FFE5B4]"
        : stage === "Lounge"
          ? "!bg-[#F9F9F9]"
          : stage === "Build"
            ? "flash-green" // Add flashing effect for "Build"
            : stage === "Test"
              ? "!bg-[#9fc3fc]"
              : stage === "Ice Box"
                ? "!bg-[#aaebfa]"
                : stage === "System Testing (ST)"
                  ? "!bg-[#B3D9FF]"
                  : "";

    return `${baseClass} ${cursorClass} ${stageClass} transition-colors duration-200`;
  };


  function camelCaseToSentenceCase(str: string) {
    if (!str.includes("_")) {
      return str
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/^./, function (match) {
          return match.toUpperCase();
        });
    } else {
      return str.replace(/_/g, " ");
    }
  }


  const handleEditRowsModelChange = async (newModel: any, oldModel: any) => {
    if (onRowUpdate) {
      return await onRowUpdate(newModel, oldModel);
    }
  };


  // Custom render function for the counter cell
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

  return (
    <div>
      {/* <Header editMode={editMode} setEditMode={setEditMode} /> */}

      <div className="flex flex-wrap gap-4 items-center justify-end pt-4 pb-16">
        {actions?.map((a, i) => (
          <div
            key={i}
            className="flex items-center bg-[#80d7ff] rounded-md p-3"
          >
            <p className="mr-2 text-sm font-medium text-black">{a.label}</p>
            <Checkbox checked={a.isChecked} onChange={() => a.handler()} />
          </div>
        ))}

        {setEditMode && (
          <div className="flex items-center bg-[#80d7ff] rounded-md p-3">
            <p className="mr-2 text-sm font-medium text-black">Allow editing</p>
            <Checkbox
              checked={editMode}
              onChange={() => setEditMode(!editMode)}
            />
          </div>
        )}
      </div>

      {!isLoading && (
        <div>
          {!!rowIds.length && allowDelete && (
            <div className="mb-4 flex items-center bg-red-100 p-2 rounded">
              <IoTrashSharp
                // @ts-ignore
                onClick={() => handleDeleteMultiple(rowIds)}
                className="text-red-500 mr-2 cursor-pointer hover:text-red-700 transition-all"
              />
              <p className="text-sm text-red-700">Delete selected data</p>
            </div>
          )}
          <div className="overflow-x-auto">
            <div className="mb-3 xl:w-96">
              <div className="relative mb-4 flex w-full items-stretch">
                {/* <!--Search input--> */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSearchSubmit();
                  }}
                  className="w-[330px] flex items-center space-x-2"
                >
                  <label htmlFor="search" className="sr-only">
                    Search
                  </label>
                  <input
                    spellCheck={true}
                    type="search"
                    className="w-[240px] relative block rounded border border-solid border-neutral-300 bg-transparent px-3 py-[0.25rem] text-base font-normal leading-[1.6] text-neutral-700 outline-none transition duration-200 ease-in-out focus:z-[3] focus:border-primary focus:text-neutral-700 focus:shadow-[inset_0_0_0_1px_rgb(59,113,202)] focus:outline-none dark:border-neutral-600 dark:text-neutral-200 dark:placeholder:text-neutral-200 dark:focus:border-primary"
                    placeholder="Search All Text..."
                    aria-label="Search"
                    value={setSearchQuery ? searchQuery : query}
                    onChange={(e) => {
                      setSearchQuery
                        ? setSearchQuery(e.target.value)
                        : setQuery(e.target.value);
                    }}
                    aria-describedby="button-addon2"
                  />
                  <button className="bg-none outline-none border-none w-[65px] p-0 flex items-center justify-center">
                    {!searchLoading ? (
                      <span
                        className="input-group-text flex items-center whitespace-nowrap rounded px-3 py-1.5 text-center text-base font-normal text-neutral-700 dark:text-neutral-200"
                        id="basic-addon2"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="h-5 w-5"
                        >
                          <path
                            fillRule="evenodd"
                            d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </span>
                    ) : (
                      <div role="status">
                        <svg
                          aria-hidden="true"
                          className="w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600"
                          viewBox="0 0 100 101"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                            fill="currentColor"
                          />
                          <path
                            d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                            fill="currentFill"
                          />
                        </svg>
                        <span className="sr-only">Loading...</span>
                      </div>
                    )}
                  </button>
                </form>
              </div>
            </div>
            <StyledDataGridPro
              pagination
              checkboxSelection={editMode && checkBoxSelection}
              rows={filteredRow}
              processRowUpdate={(updatedRow: any, originalRow: any) =>
                handleEditRowsModelChange(updatedRow, originalRow)
              }
              onRowSelectionModelChange={handleSelectionChange as any}
              columns={removeDuplicateHeaders(columnHeaders)}
              getRowClassName={getRowClassName}
              sx={{
                "& .MuiDataGrid-row:hover": {
                  cursor: cursorPointer ? "pointer" : "default",
                  "& .MuiDataGrid-footerContainer": {
                    display: "flex !important",
                  },
                  "& .MuiTablePagination-root": { display: "block !important" },
                },
              }}
              paginationMode="server"
              filterModel={filterModel} // Restore filters
              onFilterModelChange={handleFilterChange} // Capture filter changes
              rowCount={rowCount ?? (data?.length || 0)}
              pageSizeOptions={[500, 1000, 3000]}
              rowBufferPx={100}
              columnBufferPx={5}
              rowReordering
              onPaginationModelChange={
                setPaginationData ? setPaginationData : setPagination
              }
              slots={{
                toolbar: EditToolbar as any,
              }}
              slotProps={{
                toolbar: {
                  showQuickFilter: true,
                  quickFilterProps: { debounceMs: 500 },
                } as any,
              }}
              onColumnOrderChange={(e: any) => {
                moveTo(tableName, e.column.field, e.targetIndex);
              }}
              paginationModel={paginationData ? paginationData : pagination}
              getRowId={(row: any) => row._id}
              disableRowSelectionOnClick={true}
              onRowClick={onRowClick}
            />
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center bg-white p-6 h-[20vh]">
          <div className="h-[200px] flex items-center justify-center animate-pulse">
            <Image className="" src={hLogo} alt="Laigus logo" />
          </div>
        </div>
      )}
    </div>
  );
};

export default Table;
