// components/CvDataPoints/CvDataPointModal.tsx
import React from 'react';
import AppModal from '@/components/modals/AppModal';
import { CvDataPoint } from './types';

interface CvDataPointModalProps {
  visible: boolean;
  dataPoint: CvDataPoint | null;
  onClose: () => void;
}

export const CvDataPointModal: React.FC<CvDataPointModalProps> = ({
  visible,
  dataPoint,
  onClose,
}) => {
  if (!dataPoint) return null;

  return (
   <AppModal
      isOpen={visible}
      onClose={onClose} 
    >
      <div className="space-y-6 max-h-[60vh] overflow-y-auto">
        <DataSection label="CV Type" content={dataPoint.cvType} />
        <DataSection label="Contact Information" content={dataPoint.contactInformation} />
        <DataSection label="Professional Summary" content={dataPoint.professionalSummary} />
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-700">Work Experience</h3>
          {dataPoint.workExperience?.map((exp, index) => (
            <div key={index} className="ml-4 mb-4 p-3 bg-gray-50 rounded">
              <p className="font-medium">{exp.jobTitle} at {exp.organization}</p>
              <p className="text-sm text-gray-600">{exp.dates}</p>
              <p className="mt-1">{exp.description}</p>
            </div>
          ))}
        </div>
        
        <ArraySection label="Skills" items={dataPoint.skills} />
        <ArraySection label="Achievements" items={dataPoint.achievements} />
        <ArraySection label="Languages" items={dataPoint.languages} />
      </div>
    </AppModal>
  );
};

const DataSection: React.FC<{ label: string; content: string | undefined }> = ({ label, content }) => (
  <div className="space-y-1">
    <h3 className="text-lg font-semibold text-gray-700">{label}</h3>
    <p className="text-gray-600">{content}</p>
  </div>
);

const ArraySection: React.FC<{ label: string; items: string[] | undefined }> = ({ label, items }) => (
  <div className="space-y-2">
    <h3 className="text-lg font-semibold text-gray-700">{label}</h3>
    <ul className="list-disc ml-8">
      {items?.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  </div>
);