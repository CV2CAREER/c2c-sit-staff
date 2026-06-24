"use client";

import React, { useState } from "react";

interface UpdateJobStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (status: string, qualityTags?: string[]) => void;
  initialStatus?: string;
}

const UpdateJobStatusModal: React.FC<UpdateJobStatusModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialStatus = "Unattended",
}) => {
  const [selectedStatus, setSelectedStatus] = useState(initialStatus);
  const [selectedQualityTags, setSelectedQualityTags] = useState<string[]>([]);

  const statusOptions = [
    "Unattended",
    "Vetted",
    "Submitted",
    "Skipped",
    "Expired",
  ];

  const qualityTags = [
    { label: "HQA", color: "bg-green-500" },
    { label: "MQA", color: "bg-orange-500" },
    { label: "LQA", color: "bg-red-500" },
  ];

  const toggleQualityTag = (tag: string) => {
    if (selectedQualityTags.includes(tag)) {
      setSelectedQualityTags(selectedQualityTags.filter((t) => t !== tag));
    } else {
      setSelectedQualityTags([...selectedQualityTags, tag]);
    }
  };

  const handleConfirm = () => {
    onConfirm(
      selectedStatus,
      selectedStatus === "Vetted" ? selectedQualityTags : undefined,
    );
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b">
          <h2 className="text-2xl font-semibold text-center">
            Update Job Status
          </h2>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status <span className="text-red-500">*</span>
            </label>

            <div className="relative">
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  if (e.target.value !== "Vetted") {
                    setSelectedQualityTags([]);
                  }
                }}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                ▼
              </div>
            </div>
          </div>

          {/* Quality Tags - Only show when Vetted is selected */}
          {selectedStatus === "Vetted" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Quality Assessment
              </label>
              <div className="flex gap-3">
                {qualityTags.map(({ label, color }) => {
                  const isSelected = selectedQualityTags.includes(label);
                  return (
                    <button
                      key={label}
                      onClick={() => toggleQualityTag(label)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                        isSelected
                          ? `${color} text-white border-transparent`
                          : "bg-white border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              {selectedQualityTags.length > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  Selected: {selectedQualityTags.join(", ")}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="s-6 py-2.5 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateJobStatusModal;
