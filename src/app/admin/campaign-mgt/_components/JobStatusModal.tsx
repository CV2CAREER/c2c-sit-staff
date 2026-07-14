'use client';

import React, { useEffect, useRef, useState } from 'react';
import axiosInstance from '@/services/api-client';
import toast from 'react-hot-toast';

interface UpdateJobStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: string;
  initialStatus?: string;
  onUpdated?: () => Promise<void> | void;
}

const qualityTags = [
  { label: 'HQA', bg: '#2BC07A' },
  { label: 'MQA', bg: '#F4A91A' },
  { label: 'LQA', bg: '#EC4040' },
];

const statusOptions = [
  'Unattended',
  'Vetted',
  'Submitted',
  'Skipped',
  'Expired',
] as const;

type StatusOption = (typeof statusOptions)[number];

const qualityStatuses: StatusOption[] = ['Vetted'];

const UpdateJobStatusModal: React.FC<UpdateJobStatusModalProps> = ({
  isOpen,
  onClose,
  applicationId,
  initialStatus = 'Unattended',
  onUpdated,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string>(initialStatus);
  const [selectedQualityTag, setSelectedQualityTag] = useState<string>('');
  const [statusReason, setStatusReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const current = initialStatus.toLowerCase();

  let available: StatusOption[] = [...statusOptions];

  // Ensure the incoming status is one of the allowed options
  const currentStatus: StatusOption = statusOptions.includes(
    initialStatus as StatusOption
  )
    ? (initialStatus as StatusOption)
    : 'Unattended';

  if (current === 'vetted') {
    available = available.filter((s) => s !== 'Unattended');
  }

  if (['submitted', 'expired'].includes(current)) {
    available = [currentStatus];
  }

  useEffect(() => {
    if (isOpen) {
      setSelectedStatus(initialStatus || 'Unattended');
      setSelectedQualityTag('');
      setStatusReason('');
      setDropOpen(false);
    }
  }, [isOpen, initialStatus]);

  // ✅ Removed click-outside listener — dropdown only closes when user
  // explicitly toggles it or selects a non-quality option

  const handleSelectOption = (val: string) => {
    setSelectedStatus(val);
    setSelectedQualityTag('');

    // Clear skipped reason when another status is selected
    if (val !== 'Skipped') {
      setStatusReason('');
    }

    // ✅ Only close for options that don't need a quality tag
    if (!qualityStatuses.includes(val as StatusOption)) {
      setDropOpen(false);
    }
    // For Vetted / Completed keep dropdown open so user picks a pill
  };

  const handleConfirm = async () => {
    if (!applicationId) {
      toast.error('Application id is missing.');
      return;
    }
    if (
      qualityStatuses.includes(selectedStatus as StatusOption) &&
      !selectedQualityTag
    ) {
      toast.error('Select one quality tag before confirming.');
      return;
    }

    if (selectedStatus === 'Skipped' && !statusReason.trim()) {
      toast.error('Please enter a reason for skipping.');
      return;
    }

    const payload: Record<string, string> = {
      applicationId,
      status: selectedStatus.toUpperCase(),
    };
    if (qualityStatuses.includes(selectedStatus as StatusOption)) {
      payload.qualityScore = selectedQualityTag;
    }

    if (selectedStatus === 'Skipped') {
      payload.StatusReason = statusReason.trim();
    }

    try {
      setIsSubmitting(true);
      const response = await axiosInstance.post(
        '/api/v1/campaigns/clients/applications/update-status',
        payload
      );
      if (response.data?.success === false) {
        setIsSubmitting(false);
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

  const needsQuality = qualityStatuses.includes(selectedStatus as StatusOption);
  const needsStatusReason = selectedStatus === 'Skipped';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full rounded-2xl bg-white shadow-2xl"
        style={{ maxWidth: 360 }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-5">
          <h2 className="text-center text-lg font-semibold text-gray-900">
            Update Job Status
          </h2>
        </div>

        {/* Body */}
        <div className="px-6 pb-5">
          <label className="mb-2 block text-sm text-gray-500">
            Status <span className="text-red-500">*</span>
          </label>

          <div ref={dropRef}>
            {/* Trigger — only toggle, never auto-close */}
            <button
              type="button"
              onClick={() => setDropOpen((v) => !v)}
              className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 transition-colors hover:border-gray-300 focus:outline-none"
            >
              <span>
                {selectedStatus}
                {selectedQualityTag && (
                  <span className="ml-2 text-gray-400">
                    · {selectedQualityTag}
                  </span>
                )}
              </span>
              <svg
                className={`h-4 w-4 text-gray-400 transition-transform ${dropOpen ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* Inline panel */}
            {dropOpen && (
              <div className="mt-1.5 w-full overflow-hidden rounded-xl border border-gray-200 bg-white">
                {available.map((val, i) => {
                  const showPills =
                    qualityStatuses.includes(val) && selectedStatus === val;

                  return (
                    <React.Fragment key={val}>
                      <div
                        className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm text-gray-800 hover:bg-gray-50"
                        onClick={() => handleSelectOption(val)}
                      >
                        <span
                          className={
                            selectedStatus === val ? 'font-medium' : ''
                          }
                        >
                          {val}
                        </span>
                        {selectedStatus === val && (
                          <span className="text-gray-700">✓</span>
                        )}
                      </div>

                      {/* Quality pills — shown under Vetted or Completed when selected */}
                      {showPills && (
                        <div className="flex gap-2 pb-3 pl-8 pr-4">
                          {qualityTags.map(({ label, bg }) => {
                            const isSelected = selectedQualityTag === label;
                            return (
                              <button
                                key={label}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedQualityTag((prev) =>
                                    prev === label ? '' : label
                                  );
                                }}
                                style={{
                                  background: bg,
                                  outline: isSelected
                                    ? `2px solid ${bg}`
                                    : 'none',
                                  outlineOffset: isSelected ? 2 : 0,
                                }}
                                className="rounded-md px-3 py-1 text-xs font-bold text-white transition-all hover:opacity-85"
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {i < statusOptions.length - 1 && (
                        <div className="border-t border-gray-100" />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}

            {needsStatusReason && (
              <div className="mt-4">
                <label className="mb-2 block text-sm text-gray-500">
                  Reason for Skipping <span className="text-red-500">*</span>
                </label>

                <textarea
                  rows={4}
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="Enter the reason for skipping this application..."
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-[#0e9bd9] focus:outline-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 pb-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-gray-100 px-6 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="rounded-lg px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: '#0e9bd9' }}
          >
            {isSubmitting ? 'Saving...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateJobStatusModal;
