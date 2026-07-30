// components/CvDataPoints/CvDataPointModal.tsx
import React from 'react';
import AppModal from '@/components/modals/AppModal';

interface CvJobTitlesModalProps {
  visible: boolean;
  jobTitles: string[] | null;
  onClose: () => void;
}

export const CvJobTitlesModal: React.FC<CvJobTitlesModalProps> = ({
  visible,
    jobTitles,
  onClose,
}) => {
  if (!jobTitles) return null;
  const formatCvJobTitles = (jobTitles: string[] | null) => {
    if (!jobTitles || !Array.isArray(jobTitles) || jobTitles.length === 0) return null;

    return (
      <div className="bg-white p-4 md:p-8 rounded-2xl shadow-lg max-w-4xl w-full">
        <div className="flex justify-between items-center mb-6">
          <span className="text-white bg-white text-lg font-semibold w-12 h-12 rounded-full flex items-center justify-center"></span>
          <h2 className="text-2xl font-semibold text-career-blue-800">CV Job Titles</h2>
        </div>

        <ul className="list-disc ml-8">
          {jobTitles.map((jobTitle, index) => (
            <li key={index}>{jobTitle}</li>
          ))}
        </ul>

        <div className="flex justify-end items-center mt-8">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-career-blue-800 text-white rounded-lg hover:bg-career-blue-900 transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-career-blue-500 focus:ring-opacity-50"
          >
            Close
          </button>
        </div>
      </div>
    );
  };
  return (
   <AppModal
      isOpen={visible}
      onClose={onClose} 
    >
        {formatCvJobTitles(jobTitles)}
      
    </AppModal>
  );
};

 