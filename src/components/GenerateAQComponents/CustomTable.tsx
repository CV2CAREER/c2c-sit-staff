/* eslint-disable @typescript-eslint/ban-ts-comment */
"use client";
import React, { Suspense, useEffect } from "react";
import { useTable, useRowSelect, usePagination } from "react-table";
import { useRowSelectColumn } from "@lineup-lite/hooks";
import { Option } from "@material-tailwind/react";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import ReactPaginate from "react-paginate";

interface CustomTableProps {
  columns: Array<any>;
  data: any;
  tableClass?: string;
  tHeadClass?: string;
  tBodyClass?: string;
  tdClass?: string;
  thClass?: string;
  tableHeadTrClass?: string;
  tableBodyTrClass?: string;
  setSelected?: (data: any) => void;
  paginate?: boolean;
  paginationDetails?: {
    totalPages: number;
    totalUser: number;
    currentPage: number;
  };
  dataSize?: number;
  handlePageSize?: (pageDataSize: number) => void;
  handlePage?: (page: number) => void;
  columnVisibility?: any;
  addedFilter?: boolean;
  className?: string;
  showSelection?: boolean;
}

const CustomTable = ({
  columns,
  data,
  tableClass = "",
  tHeadClass = "",
  tBodyClass = "",
  tdClass = "",
  thClass = "",
  tableBodyTrClass = "",
  tableHeadTrClass = "",
  setSelected,
  paginate = false,
  paginationDetails,
  dataSize = 50,
  handlePageSize,
  handlePage,
  columnVisibility,
  addedFilter,
  className = "",
  showSelection = true,
}: CustomTableProps) => {
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    selectedFlatRows, // Use in future to get selected rows
  }: any = useTable(
    {
      columns,
      data: data || [],
    },
    usePagination,
    // @ts-expect-error: react-table v7 plugin types mismatch
    showSelection && useRowSelect,
    showSelection && useRowSelectColumn,
  );

  useEffect(() => {
    if (selectedFlatRows) {
      setSelected && setSelected(selectedFlatRows);
    }
  }, [selectedFlatRows]);

  return (
    <div className={`overflow-x-auto shadow-md rounded-lg ${className}`}>
      <table className={`w-full bg-white ${tableClass}`} {...getTableProps()}>
        <thead className={`bg-blue-50 ${tHeadClass}`}>
          {headerGroups.map((headerGroup: any, index: number) => (
            <tr
              className={`${tableHeadTrClass}`}
              {...headerGroup.getHeaderGroupProps()}
              key={index}
            >
              {headerGroup.headers.map((column: any, index: number) => (
                <th
                  className={`px-6 py-3 text-left text-xs font-semibold text-black uppercase tracking-wider ${thClass}`}
                  {...column.getHeaderProps()}
                  key={`${column.id}-${index}`}
                >
                  {addedFilter &&
                    column?.id === "selection" &&
                    column.render("Header")}
                  {addedFilter &&
                    columnVisibility[column?.Header] &&
                    column.render("Header")}
                  {!addedFilter && column.render("Header")}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody
          className={`divide-y divide-gray-200 ${tBodyClass}`}
          {...getTableBodyProps()}
        >
          {rows.map((row: any, index: number) => {
            prepareRow(row);
            return (
              <tr
                className={`hover:bg-blue-50 transition-colors ${tableBodyTrClass}`}
                {...row.getRowProps()}
                key={index}
              >
                {row.cells.map((cell: any, index: number) => {
                  return (
                    <td
                      className={`px-6 py-4 whitespace-nowrap text-sm text-gray-700 ${tdClass}`}
                      {...cell.getCellProps()}
                      key={index}
                    >
                      {addedFilter &&
                        cell?.column?.id === "selection" &&
                        cell.render("Cell")}
                      {addedFilter &&
                        columnVisibility[cell?.column?.Header] &&
                        cell.render("Cell")}
                      {!addedFilter && cell.render("Cell")}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      {paginate && (
        <Suspense
          fallback={
            <div className="animate-pulse text-xs text-gray-500 p-4">
              Loading...
            </div>
          }
        >
          <div
            className={`w-full bg-blue-50 px-6 py-3 ${tableClass} flex items-center justify-between`}
          >
            <ReactPaginate
              // @ts-expect-error: react-paginate props typing issue
              forcePage={paginationDetails?.currentPage - 1 || 0}
              previousLabel={
                <ChevronRightIcon
                  strokeWidth={2}
                  className="h-4 w-4 text-[#797979]"
                />
              }
              nextLabel={
                <ChevronRightIcon
                  strokeWidth={2}
                  className="h-4 w-4 text-[#797979]"
                />
              }
              // @ts-expect-error: react-paginate props typing issue
              pageCount={paginationDetails.totalPages || 1}
              onPageChange={(e) => {
                handlePage?.(e.selected + 1);
              }}
              containerClassName="flex items-center gap-2"
              activeLinkClassName="text-white bg-blue-500 rounded-full w-8 h-8 flex items-center justify-center"
              pageLinkClassName="h-8 w-8 flex items-center justify-center text-gray-500 hover:bg-gray-200 rounded-full transition-colors"
              breakClassName="text-gray-500 w-8 h-8 flex items-center justify-center rounded-full"
              breakLinkClassName="text-gray-500 w-8 h-8 flex items-center justify-center rounded-full"
              previousClassName="hover:bg-gray-200 rounded-full transition-colors"
              nextClassName="hover:bg-gray-200 rounded-full transition-colors"
              disabledClassName="opacity-50 cursor-not-allowed"
              marginPagesDisplayed={1}
              pageRangeDisplayed={1}
            />

            <div className="flex items-center gap-4 text-sm text-gray-500">
              <p>
                Page {paginationDetails?.currentPage || 1} of
                {
                  // @ts-expect-error: pagination details typing conflict
                  paginationDetails.totalPages
                }
              </p>
              <select
                value={dataSize.toString()}
                onChange={(e) => handlePageSize?.(Number(e.target.value))}
              >
                <Option value="50">50</Option>
                <Option value="100">100</Option>
                <Option value="150">150</Option>
                <Option value="200">200</Option>
              </select>
            </div>
          </div>
        </Suspense>
      )}
    </div>
  );
};

export default CustomTable;
