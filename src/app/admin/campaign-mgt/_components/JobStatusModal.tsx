'use client';

import React, { useEffect, useState } from 'react';
import axiosInstance from '@/services/api-client';
import toast from 'react-hot-toast';

interface UpdateJobStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: string;
  initialStatus?: string;
  onUpdated?: () => Promise<void> | void;
}

const statusOptions = [
  'Unattended',
  'Vetted',
  'Submitted',
  'Skipped',
  'Expired',
] as const;

const qualityTags = [
  { label: 'HQA', color: 'bg-green-600' },
  { label: 'MQA', color: 'bg-orange-500' },
  { label: 'LQA', color: 'bg-red-500' },
];

const UpdateJobStatusModal: React.FC<UpdateJobStatusModalProps> = ({
  isOpen,
  onClose,
  applicationId,
  initialStatus = 'Unattended',
  onUpdated,
}) => {
  const [selectedStatus, setSelectedStatus] = useState(initialStatus);
  const [selectedQualityTag, setSelectedQualityTag] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedStatus(initialStatus || 'Unattended');
      setSelectedQualityTag('');
    }
  }, [isOpen, initialStatus]);

  const handleConfirm = async () => {
    if (!applicationId) {
      toast.error('Application id is missing.');
      return;
    }

    if (selectedStatus === 'Vetted' && !selectedQualityTag) {
      toast.error('Select one quality tag before confirming.');
      return;
    }

    const payload: Record<string, string> = {
      applicationId,
      status: selectedStatus.toUpperCase(),
    };

    if (selectedStatus === 'Vetted') {
      payload.qualityScore = selectedQualityTag;
    }

    try {
      setIsSubmitting(true);

      const response = await axiosInstance.post(
        '/api/v1/campaigns/clients/applications/update-status',
        payload
      );

      if (response.data?.success === false) {
        throw new Error(response.data?.message || 'Failed to update status');
      }

      toast.success(
        response.data?.message || 'Application status updated successfully'
      );

      await onUpdated?.();
      onClose();
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        'Failed to update status';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="border-b p-6">
          <h2 className="text-center text-2xl font-semibold">
            Update Job Status
          </h2>
        </div>

        <div className="space-y-6 p-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Status <span className="text-red-500">*</span>
            </label>

            <div className="relative">
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  if (e.target.value !== 'Vetted') {
                    setSelectedQualityTag('');
                  }
                }}
                className="w-full cursor-pointer appearance-none rounded-lg border border-gray-300 bg-white px-4 py-3 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
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

          {selectedStatus === 'Vetted' && (
            <div>
              <label className="mb-3 block text-sm font-medium text-gray-700">
                Quality Assessment
              </label>

              <div className="flex flex-wrap gap-3">
                {qualityTags.map(({ label, color }) => {
                  const isSelected = selectedQualityTag === label;

                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() =>
                        setSelectedQualityTag((prev) =>
                          prev === label ? '' : label
                        )
                      }
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                        isSelected
                          ? `${color} border-transparent text-white`
                          : 'border-gray-300 bg-white hover:bg-gray-50'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {selectedQualityTag && (
                <p className="mt-2 text-xs text-gray-500">
                  Selected: {selectedQualityTag}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3 border-t bg-gray-50 p-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg px-6 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-100 sm:w-auto"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-gray-700 transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {isSubmitting ? 'Saving...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateJobStatusModal;
