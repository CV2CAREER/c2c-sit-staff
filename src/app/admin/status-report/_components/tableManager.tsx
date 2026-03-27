"use client";

import React, { useState, useEffect } from "react";
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
  const queryClient = useQueryClient();
  const [tables, setTables] = useState<Table[]>([]);
  const [newTableName, setNewTableName] = useState("");

  // --- Centralized API Hooks ---
  const { tablesDomain } = useAdminQueries({ fetchTables: true });
  const { data: tablesData, isLoading: fetchingTables } = tablesDomain;

  const {
    createTableMutation,
    updateTableMutation,
    deleteTableMutation,
    deleteColumnMutation,
  } = useAdminMutations();

  // --- Sync local state for "isOpen" functionality ---
  useEffect(() => {
    if (tablesData) {
      setTables(
        tablesData.map((d) => ({
          ...d,
          id: d._id,
          isOpen: false,
        }))
      );
    }
  }, [tablesData]);

  const invalidateTables = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-tables"] });
  };

  // --- Handlers ---
  const handleCreateTable = () => {
    if (!newTableName.trim()) return;
    createTableMutation.mutate(
      { name: newTableName },
      {
        onSuccess: () => {
          toast.success("Table created successfully!");
          setNewTableName("");
          invalidateTables();
        },
        onError: (error) => toast.error(error.message || "Failed to create table"),
      }
    );
  };

  const handleCreateColumn = async (tableName: string, columnName: string) => {
    if (!columnName.trim()) return;
    updateTableMutation.mutate(
      { name: tableName, column: columnName },
      {
        onSuccess: () => {
          toast.success("Column added successfully!");
          invalidateTables();
        },
        onError: (error) => toast.error(error.message || "Failed to add column"),
      }
    );
  };

  const handleDeleteTable = (tableName: string) => {
    if (!window.confirm(`Are you sure you want to delete table "${tableName}"?`)) return;
    deleteTableMutation.mutate(
      { table: tableName },
      {
        onSuccess: () => {
          toast.success("Table deleted successfully!");
          invalidateTables();
        },
        onError: (error) => toast.error(error.message || "Failed to delete table"),
      }
    );
  };

  const handleDeleteColumn = (tableName: string, columnName: string) => {
    deleteColumnMutation.mutate(
      { tableName, columnName },
      {
        onSuccess: () => {
          toast.success("Column deleted successfully!");
          invalidateTables();
        },
        onError: (error) => toast.error(error.message || "Failed to delete column"),
      }
    );
  };

  const toggleTable = (id: string) => {
    setTables((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isOpen: !t.isOpen } : t))
    );
  };

  const isAnyLoading =
    createTableMutation.isPending ||
    updateTableMutation.isPending ||
    deleteTableMutation.isPending ||
    deleteColumnMutation.isPending;

  return (
    <div className="flex flex-col gap-6 bg-white rounded-3xl p-8 mb-12">
      <h3 className="text-lg font-semibold">Table Columns Manager</h3>

      {fetchingTables ? (
        <div className="flex justify-center items-center h-32">
          <CircularProgress size={40} />
        </div>
      ) : (
        <>
          <div className="flex mb-4 gap-2">
            <input
              type="text"
              placeholder="New Table Name"
              className="px-3 py-2 rounded-xl border border-gray-300"
              value={newTableName}
              onChange={(e) => setNewTableName(e.target.value)}
            />
            <button
              disabled={createTableMutation.isPending}
              onClick={handleCreateTable}
              className={`bg-[#1d4ed8] text-white px-4 py-2 rounded-xl hover:bg-blue-600 ${
                createTableMutation.isPending ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {createTableMutation.isPending ? "Creating..." : "Add Table"}
            </button>
          </div>

          <div className="space-y-4">
            {tables?.map((table) => (
              <div
                key={table.id}
                className="bg-gray-50 border border-gray-200 rounded-2xl shadow-sm p-4"
              >
                <div className="flex justify-between items-center mb-2">
                  <div className="text-md font-medium text-gray-700">{table.name}</div>
                  <div className="flex gap-2">
                    <button
                      className="bg-gray-200 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-300 transition-colors"
                      onClick={() => toggleTable(table.id)}
                    >
                      {table.isOpen ? "Collapse" : "Expand"}
                    </button>
                    <button
                      className={`bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600 transition-colors ${
                        deleteTableMutation.isPending ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                      onClick={() => handleDeleteTable(table.name)}
                      disabled={deleteTableMutation.isPending}
                    >
                      {deleteTableMutation.isPending && deleteTableMutation.variables?.table === table.name ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        "Delete"
                      )}
                    </button>
                  </div>
                </div>

                {table.isOpen && (
                  <div className="pl-4 mt-4 space-y-4 border-l-2 border-gray-200">
                    <ColumnEditor
                      tableName={table.name}
                      onAddColumn={handleCreateColumn}
                      loading={isAnyLoading}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {table.columns.map((col) => {
                        const isDeleting = deleteColumnMutation.isPending && 
                                         deleteColumnMutation.variables?.columnName === col && 
                                         deleteColumnMutation.variables?.tableName === table.name;
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
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
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
