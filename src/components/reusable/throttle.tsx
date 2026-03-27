"use client";

import React, { useState } from "react";
import toast from "react-hot-toast";
import { CircularProgress } from "@mui/material";
import { useAdminQueries, useAdminMutations } from "@/hooks/api/admin.api";
import { useQueryClient } from "@tanstack/react-query";
import { Throttle } from "@/types/admin.types";

interface NewThrottle {
  aggregator: string;
  value: number | string;
}

interface EditedThrottles {
  [key: number]: number | string;
}

const AggregatorsThrottle = () => {
  const queryClient = useQueryClient();
  const [newThrottle, setNewThrottle] = useState<NewThrottle>({
    aggregator: "",
    value: 1,
  });
  const [editedThrottles, setEditedThrottles] = useState<EditedThrottles>({});

  // --- Centralized API Hooks ---
  const { throttlesDomain } = useAdminQueries({ fetchThrottles: true });
  const { data: throttles = [], isLoading: isFetching } = throttlesDomain;

  const {
    createThrottleMutation,
    updateThrottleMutation,
    deleteThrottleMutation,
  } = useAdminMutations();

  // --- Helpers ---
  const handleValueChange = (id: number, value: string) => {
    setEditedThrottles((prev) => ({
      ...prev,
      [id]: value === "" ? "" : parseInt(value, 10) || 0,
    }));
  };

  const invalidateThrottles = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-throttles"] });
  };

  // --- Actions ---
  const handleAddThrottle = () => {
    if (!newThrottle.aggregator || newThrottle.value === "" || isNaN(Number(newThrottle.value))) {
      toast.error("Please provide a valid aggregator name and throttle value.");
      return;
    }

    createThrottleMutation.mutate(
      { ...newThrottle, value: Number(newThrottle.value) },
      {
        onSuccess: () => {
          toast.success("Throttle added successfully");
          setNewThrottle({ aggregator: "", value: 1 });
          invalidateThrottles();
        },
        onError: (error) => {
          toast.error(error.message || "Failed to add throttle");
        },
      }
    );
  };

  const handleUpdateThrottle = (id: number) => {
    const newValue = editedThrottles[id];
    if (newValue === undefined || newValue === "" || isNaN(Number(newValue))) {
      toast.error("Invalid throttle value.");
      return;
    }

    updateThrottleMutation.mutate(
      { id, value: Number(newValue) },
      {
        onSuccess: () => {
          toast.success("Throttle updated successfully");
          setEditedThrottles((prev) => {
            const newState = { ...prev };
            delete newState[id];
            return newState;
          });
          invalidateThrottles();
        },
        onError: (error) => {
          toast.error(error.message || "Failed to update throttle");
        },
      }
    );
  };

  const handleDeleteThrottle = (id: number) => {
    if (!window.confirm("Are you sure you want to delete this throttle?")) return;

    deleteThrottleMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success("Throttle deleted successfully");
          invalidateThrottles();
        },
        onError: (error) => {
          toast.error(error.message || "Failed to delete throttle");
        },
      }
    );
  };

  return (
    <div className="bg-white rounded-3xl p-8 mb-12">
      <h3 className="text-lg font-semibold mb-6">Aggregator Throttles</h3>
      
      {isFetching ? (
        <div className="flex justify-center p-8">
          <CircularProgress />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="py-4 font-medium text-gray-500">Aggregator</th>
                <th className="py-4 font-medium text-gray-500">Throttle Value</th>
                <th className="py-4 font-medium text-gray-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {throttles.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-gray-400">
                    No throttles configured.
                  </td>
                </tr>
              ) : (
                throttles.map((throttle: Throttle) => {
                  const isUpdating = updateThrottleMutation.isPending && updateThrottleMutation.variables?.id === throttle.id;
                  const isDeleting = deleteThrottleMutation.isPending && deleteThrottleMutation.variables?.id === throttle.id;
                  const currentValue = editedThrottles[throttle.id] ?? throttle.value;
                  const isEdited = editedThrottles[throttle.id] !== undefined && editedThrottles[throttle.id] !== throttle.value;
                  const isDisabled = isUpdating || isDeleting;

                  return (
                    <tr key={throttle.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-4 font-medium text-career-black-200">
                        {throttle.aggregator}
                      </td>
                      <td className="py-4">
                        <input
                          type="number"
                          className="w-24 px-3 py-1 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                          value={currentValue}
                          onChange={(e) => handleValueChange(throttle.id, e.target.value)}
                          disabled={isDisabled}
                          min={0}
                        />
                      </td>
                      <td className="py-4 text-right flex justify-end gap-2">
                        <button
                          onClick={() => handleUpdateThrottle(throttle.id)}
                          disabled={!isEdited || isDisabled || currentValue === "" || isNaN(Number(currentValue))}
                          className={`bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition-colors ${
                            (!isEdited || isDisabled || currentValue === "" || isNaN(Number(currentValue))) ? "opacity-30 cursor-not-allowed" : ""
                          }`}
                          title="Save Change"
                        >
                          {isUpdating ? <CircularProgress size={16} color="inherit" /> : "Save"}
                        </button>
                        <button
                          onClick={() => handleDeleteThrottle(throttle.id)}
                          disabled={isDisabled}
                          className={`bg-red-50 text-red-500 p-2 rounded-lg hover:bg-red-100 transition-colors ${
                            isDisabled ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                          title="Delete Throttle"
                        >
                          {isDeleting ? <CircularProgress size={16} color="inherit" /> : "Delete"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-8 pt-8 border-t border-gray-100 flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-500">Aggregator Name</label>
          <input
            type="text"
            className="px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
            value={newThrottle.aggregator}
            onChange={(e) => setNewThrottle({ ...newThrottle, aggregator: e.target.value })}
            placeholder="e.g. Seek"
            disabled={createThrottleMutation.isPending}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-500">Throttle Value</label>
          <input
            type="number"
            className="px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none w-32"
            value={newThrottle.value}
            onChange={(e) => setNewThrottle({
              ...newThrottle,
              value: e.target.value === "" ? "" : parseInt(e.target.value, 10) || 0,
            })}
            disabled={createThrottleMutation.isPending}
            min={0}
          />
        </div>
        <button
          onClick={handleAddThrottle}
          disabled={!newThrottle.aggregator || newThrottle.value === "" || isNaN(Number(newThrottle.value)) || createThrottleMutation.isPending || isFetching}
          className={`bg-[#1d4ed8] text-white px-6 py-2 rounded-xl hover:bg-blue-700 transition-colors h-[42px] ${
            (!newThrottle.aggregator || newThrottle.value === "" || isNaN(Number(newThrottle.value)) || createThrottleMutation.isPending || isFetching) ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {createThrottleMutation.isPending ? <CircularProgress size={20} color="inherit" /> : "Add Throttle"}
        </button>
      </div>
    </div>
  );
};

export default AggregatorsThrottle;
