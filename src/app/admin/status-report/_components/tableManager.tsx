/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useState } from "react";
import { useAdminQueries, useAdminMutations } from "@/hooks/api/admin.api";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ApiTable, ApiTableColumn } from "@/types/admin.types";
import { CircularProgress } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";

export default function TableManager() {
  const queryClient = useQueryClient();
  const { tablesDomain } = useAdminQueries({ fetchTables: true });
  const { data: tablesData = [], isLoading: fetchingTables, isError, error, refetch } = tablesDomain;
  const { createTableMutation, deleteTableMutation } = useAdminMutations();
  const [newTableName, setNewTableName] = useState("");
  const [pendingDeleteTable, setPendingDeleteTable] = useState<string | null>(null);

  const handleCreateTable = () => {
    if (!newTableName.trim()) return;
    const toastId = toast.loading(`Creating table "${newTableName}"...`);
    createTableMutation.mutate(
      { name: newTableName.trim() },
      {
        onSuccess: () => {
          toast.success(`Table "${newTableName}" created`, { id: toastId, duration: 4000 });
          setNewTableName("");
          queryClient.invalidateQueries({ queryKey: ["admin-schema-tables"] });
        },
        onError: (error) => toast.error(error.message || "Failed to create table", { id: toastId, duration: 4000 }),
      }
    );
  };

  const handleDeleteTable = (tableName: string) => {
    setPendingDeleteTable(tableName);
  };

  const handleConfirmDelete = () => {
    if (!pendingDeleteTable) return;
    const tableName = pendingDeleteTable;
    setPendingDeleteTable(null);
    const toastId = toast.loading(`Deleting table "${tableName}"...`);
    deleteTableMutation.mutate(
      { table: tableName },
      {
        onSuccess: () => {
          toast.success(`Table "${tableName}" deleted`, { id: toastId, duration: 4000 });
          queryClient.invalidateQueries({ queryKey: ["admin-schema-tables"] });
        },
        onError: (error) => toast.error(error.message || "Failed to delete table", { id: toastId, duration: 4000 }),
      }
    );
  };

  return (
    <>
    {pendingDeleteTable && (
      <DeleteConfirmModal
        tableName={pendingDeleteTable}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDeleteTable(null)}
      />
    )}
    <div className="flex flex-col gap-6 bg-white rounded-3xl p-8 mb-12">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Table Columns Manager</h3>
        <button
          onClick={() => refetch()}
          disabled={fetchingTables}
          className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-40 flex items-center gap-1"
          title="Reload table list"
        >
          {fetchingTables ? <CircularProgress size={12} /> : "↺ Refresh"}
        </button>
      </div>

      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm">
          <p className="font-semibold text-red-700 mb-1">Failed to load tables</p>
          <p className="text-red-600 font-mono text-xs break-all">
            {(error as any)?.message || JSON.stringify(error) || "Unknown error"}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-2 text-xs text-red-700 underline hover:text-red-900"
          >
            Try again
          </button>
        </div>
      )}

      {fetchingTables ? (
        <div className="flex justify-center items-center h-32">
          <CircularProgress size={40} />
        </div>
      ) : !isError && (
        <div className="space-y-3">
          {tablesData.length === 0 ? (
            <p className="text-gray-400 text-sm py-4 text-center">No tables found.</p>
          ) : (
            tablesData.map((table) => (
              <TableItem
                key={table._id}
                table={table}
                onDeleteTable={handleDeleteTable}
                isDeletingTable={
                  deleteTableMutation.isPending &&
                  deleteTableMutation.variables?.table === table.name
                }
              />
            ))
          )}
        </div>
      )}

      <div className="border-t border-gray-100 pt-6 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-500">New Table Name</label>
          <input
            type="text"
            placeholder="e.g. custom_reports"
            className="px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            value={newTableName}
            onChange={(e) => setNewTableName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateTable()}
            disabled={createTableMutation.isPending}
          />
        </div>
        <button
          onClick={handleCreateTable}
          disabled={!newTableName.trim() || createTableMutation.isPending}
          className={`bg-[#1d4ed8] text-white px-5 py-2 rounded-xl hover:bg-blue-700 transition-colors text-sm h-[42px] ${
            !newTableName.trim() || createTableMutation.isPending ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {createTableMutation.isPending ? <CircularProgress size={16} color="inherit" /> : "Create Table"}
        </button>
      </div>
    </div>
    </>
  );
}

function DeleteConfirmModal({
  tableName,
  onConfirm,
  onCancel,
}: {
  tableName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl mx-4">
        <h4 className="text-base font-semibold text-gray-900 mb-2">Delete table?</h4>
        <p className="text-sm text-gray-500 mb-1">
          This will permanently delete{" "}
          <span className="font-mono font-medium text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded">
            {tableName}
          </span>{" "}
          and all its data.
        </p>
        <p className="text-sm text-red-500 mb-6">This action cannot be undone.</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function TableItem({
  table,
  onDeleteTable,
  isDeletingTable,
}: {
  table: ApiTable;
  onDeleteTable: (name: string) => void;
  isDeletingTable: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingDeleteColumn, setPendingDeleteColumn] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { tablesDomain: columnDomain } = useAdminQueries({
    fetchTables: isOpen,
    tableName: isOpen ? table.name : undefined,
  });

  const columns: ApiTableColumn[] = isOpen ? (columnDomain.data?.[0]?.columns ?? []) : [];
  const isLoadingColumns = isOpen && columnDomain.isLoading;

  const { updateTableMutation, deleteColumnMutation } = useAdminMutations();

  const handleAddColumn = (columnName: string) => {
    if (!columnName.trim()) return;
    const toastId = toast.loading(`Adding column "${columnName}"...`);
    updateTableMutation.mutate(
      { tableName: table.name, columnName, type: "string" },
      {
        onSuccess: () => {
          toast.success("Column added", { id: toastId, duration: 4000 });
          queryClient.invalidateQueries({ queryKey: ["admin-schema", table.name] });
        },
        onError: (error) => toast.error(error.message || "Failed to add column", { id: toastId, duration: 4000 }),
      }
    );
  };

  const handleDeleteColumn = (columnName: string) => {
    setPendingDeleteColumn(columnName);
  };

  const handleConfirmDeleteColumn = () => {
    if (!pendingDeleteColumn) return;
    const columnName = pendingDeleteColumn;
    setPendingDeleteColumn(null);
    const toastId = toast.loading(`Deleting column "${columnName}"...`);
    deleteColumnMutation.mutate(
      { tableName: table.name, columnName },
      {
        onSuccess: () => {
          toast.success("Column deleted", { id: toastId, duration: 4000 });
          queryClient.invalidateQueries({ queryKey: ["admin-schema", table.name] });
        },
        onError: (error) => toast.error(error.message || "Failed to delete column", { id: toastId, duration: 4000 }),
      }
    );
  };

  return (
    <>
    {pendingDeleteColumn && (
      <DeleteColumnConfirmModal
        columnName={pendingDeleteColumn}
        tableName={table.name}
        onConfirm={handleConfirmDeleteColumn}
        onCancel={() => setPendingDeleteColumn(null)}
      />
    )}
    <div className="border border-gray-200 rounded-2xl overflow-hidden">
      <div
        className="flex justify-between items-center px-5 py-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => setIsOpen((o) => !o)}
      >
        <div className="flex items-center gap-3">
          <TableChartOutlinedIcon className="text-gray-400" fontSize="small" />
          <span className="font-medium text-gray-800 text-sm">{table.name}</span>
          {table.isCodebase && (
            <span className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">
              <LockOutlinedIcon sx={{ fontSize: 11 }} />
              Codebase
            </span>
          )}
          {!table.isCodebase && (
            <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full border border-green-100">
              Custom
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!table.isCodebase && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteTable(table.name);
              }}
              disabled={isDeletingTable}
              className={`p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors ${
                isDeletingTable ? "opacity-40 cursor-not-allowed" : ""
              }`}
              title="Delete table"
            >
              {isDeletingTable ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                <DeleteOutlineIcon fontSize="small" />
              )}
            </button>
          )}
          {isOpen ? (
            <KeyboardArrowUpIcon className="text-gray-500" fontSize="small" />
          ) : (
            <KeyboardArrowDownIcon className="text-gray-500" fontSize="small" />
          )}
        </div>
      </div>

      {isOpen && (
        <div className="px-5 py-4 border-t border-gray-100 space-y-4">
          <ColumnEditor
            tableName={table.name}
            onAddColumn={handleAddColumn}
            loading={updateTableMutation.isPending}
          />

          {isLoadingColumns ? (
            <div className="flex justify-center py-4">
              <CircularProgress size={24} />
            </div>
          ) : columns.length === 0 ? (
            <p className="text-gray-400 text-xs py-2">No columns found.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {columns.map((col) => {
                const colName = typeof col === "string" ? col : col.name;
                const isDynamic = typeof col === "object" && col.isDynamic;
                const isDeleting =
                  deleteColumnMutation.isPending &&
                  deleteColumnMutation.variables?.columnName === colName;

                return (
                  <div
                    key={colName}
                    className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-gray-100 shadow-sm"
                  >
                    <span className="text-sm text-gray-600 truncate mr-2">{colName}</span>
                    {isDynamic ? (
                      <button
                        onClick={() => handleDeleteColumn(colName)}
                        disabled={deleteColumnMutation.isPending}
                        className={`shrink-0 p-1 rounded-md bg-red-50 text-red-500 hover:bg-red-100 transition-colors ${
                          deleteColumnMutation.isPending ? "opacity-40 cursor-not-allowed" : ""
                        }`}
                        title="Delete column"
                      >
                        {isDeleting ? (
                          <CircularProgress size={12} color="inherit" />
                        ) : (
                          <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                        )}
                      </button>
                    ) : (
                      <LockOutlinedIcon
                        sx={{ fontSize: 14 }}
                        className="shrink-0 text-gray-300"
                        titleAccess="Codebase column — cannot be deleted"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
    </>
  );
}

function DeleteColumnConfirmModal({
  columnName,
  tableName,
  onConfirm,
  onCancel,
}: {
  columnName: string;
  tableName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl mx-4">
        <h4 className="text-base font-semibold text-gray-900 mb-2">Delete column?</h4>
        <p className="text-sm text-gray-500 mb-1">
          This will permanently remove{" "}
          <span className="font-mono font-medium text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded">
            {columnName}
          </span>{" "}
          from{" "}
          <span className="font-mono font-medium text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded">
            {tableName}
          </span>
          .
        </p>
        <p className="text-sm text-red-500 mb-6">This action cannot be undone.</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function ColumnEditor({
  tableName,
  onAddColumn,
  loading,
}: {
  tableName: string;
  onAddColumn: (columnName: string) => void;
  loading: boolean;
}) {
  const [columnName, setColumnName] = useState("");

  const handleAdd = () => {
    if (!columnName.trim()) return;
    onAddColumn(columnName.trim());
    setColumnName("");
  };

  return (
    <div className="flex gap-2">
      <input
        type="text"
        placeholder="New column name"
        className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        value={columnName}
        onChange={(e) => setColumnName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        disabled={loading}
      />
      <button
        onClick={handleAdd}
        disabled={!columnName.trim() || loading}
        className={`bg-green-500 text-white px-4 py-1.5 rounded-lg hover:bg-green-600 text-sm transition-colors ${
          !columnName.trim() || loading ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        {loading ? <CircularProgress size={14} color="inherit" /> : "Add Column"}
      </button>
    </div>
  );
}
