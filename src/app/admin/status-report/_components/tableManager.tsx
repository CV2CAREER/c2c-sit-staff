/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useState} from "react";
import { useAdminQueries, useAdminMutations } from "@/hooks/api/admin.api";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ApiTable } from "@/types/admin.types";
import { CircularProgress } from "@mui/material";

interface Table extends ApiTable {
  id: string;
  isOpen: boolean;
}

export default function TableManager() {
  const { tablesDomain } = useAdminQueries({ fetchTables: true });
  const { data: tablesData = [], isLoading: fetchingTables } = tablesDomain;

  return (
    <div className="flex flex-col gap-6 bg-white rounded-3xl p-8 mb-12">
      <h3 className="text-lg font-semibold">Table Columns Manager</h3>

      {fetchingTables ? (
        <div className="flex justify-center items-center h-32">
          <CircularProgress size={40} />
        </div>
      ) : (
        <div className="space-y-4">
          {tablesData.map((table) => (
            <TableItem key={table._id} table={table} />
          ))}
        </div>
      )}
    </div>
  );
}

function TableItem({ table }: { table: ApiTable }) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const { tablesDomain: columnDomain } = useAdminQueries({ 
    fetchTables: true, 
    tableName: table.name 
  });
  
  const columns = isOpen ? (columnDomain.data?.[0]?.columns || []) : [];
  const isLoadingColumns = isOpen && columnDomain.isLoading;

  const {
    updateTableMutation,
    deleteColumnMutation,
  } = useAdminMutations();

  const handleCreateColumn = async (tableName: string, columnName: string) => {
    if (!columnName.trim()) return;
    updateTableMutation.mutate(
      { tableName, columnName, type: "string" }, // v1 backend uses expandColumn (tableName, columnName, type)
      {
        onSuccess: () => {
          toast.success("Column added successfully!");
          queryClient.invalidateQueries({ queryKey: ["admin-schema", tableName] });
        },
        onError: (error) => toast.error(error.message || "Failed to add column"),
      }
    );
  };

  const handleDeleteColumn = (tableName: string, columnName: string) => {
    if (!window.confirm(`Delete column "${columnName}" from "${tableName}"?`)) return;
    deleteColumnMutation.mutate(
      { tableName, columnName },
      {
        onSuccess: () => {
          toast.success("Column deleted successfully!");
          queryClient.invalidateQueries({ queryKey: ["admin-schema", tableName] });
        },
        onError: (error) => toast.error(error.message || "Failed to delete column"),
      }
    );
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-2xl shadow-sm p-4">
      <div className="flex justify-between items-center mb-2">
        <div className="text-md font-medium text-gray-700">{table.name}</div>
        <button
          className="bg-gray-200 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-300 transition-colors"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? "Collapse" : "Expand"}
        </button>
      </div>

      {isOpen && (
        <div className="pl-4 mt-4 space-y-4 border-l-2 border-gray-200">
          <ColumnEditor
            tableName={table.name}
            onAddColumn={handleCreateColumn}
            loading={updateTableMutation.isPending}
          />
          {isLoadingColumns ? (
            <CircularProgress size={20} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {columns.map((col) => {
                const isDeleting = deleteColumnMutation.isPending && 
                                 deleteColumnMutation.variables?.columnName === col;
                return (
                  <div
                    key={col}
                    className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-gray-100 shadow-sm"
                  >
                    <span className="text-sm text-gray-600">{col}</span>
                    <button
                      onClick={() => handleDeleteColumn(table.name, col)}
                      className={`text-xs bg-red-100 text-red-600 px-2 py-1 rounded-md hover:bg-red-200 transition-colors ${
                        deleteColumnMutation.isPending ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                      disabled={deleteColumnMutation.isPending}
                    >
                      {isDeleting ? <CircularProgress size={12} color="inherit" /> : "Delete"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ColumnEditor({
  tableName,
  onAddColumn,
  loading,
}: {
  tableName: string;
  onAddColumn: (tableName: string, columnName: string) => Promise<void>;
  loading: boolean;
}) {
  const [columnName, setColumnName] = useState("");

  const handleAdd = async () => {
    if (!columnName.trim()) return;
    await onAddColumn(tableName, columnName);
    setColumnName("");
  };

  return (
    <div className="flex gap-2 mb-2">
      <input
        type="text"
        placeholder="New Column Name"
        className="px-3 py-1 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        value={columnName}
        onChange={(e) => setColumnName(e.target.value)}
      />
      <button
        onClick={handleAdd}
        className={`bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600 text-sm transition-colors ${
          loading ? "opacity-50 cursor-not-allowed" : ""
        }`}
        disabled={loading}
      >
        {loading ? <CircularProgress size={16} color="inherit" /> : "Add Column"}
      </button>
    </div>
  );
}
