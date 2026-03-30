// components/CvDataPoints/CvDataPointActions.tsx
import React from 'react';
import { Button } from 'antd';
import { CvDataPoint } from './types';

interface CvDataPointActionsProps {
  dataPoint: CvDataPoint;
  onExtractData: (id: string) => void;
  onPopulateKeywords: (id: string , keywords: any) => void;
  onViewDataPoints: (dataPoint: CvDataPoint) => void;
  onViewJobTitles: (dataPoint: CvDataPoint) => void;
}

export const CvDataPointActions: React.FC<CvDataPointActionsProps> = ({
  dataPoint,
  onExtractData,
  onPopulateKeywords,
  onViewDataPoints,
  onViewJobTitles,
}) => {
  const isEmpty = isEmptyDataPoint(dataPoint);
  const hasJobTitles = (dataPoint.cvJobTitles?.length ?? 0) > 0;

  return (
    <div className="flex gap-2">
      {isEmpty ? (
        <Button
          type="primary"
          onClick={() => onExtractData(dataPoint.id)}
          className="bg-green-500 hover:bg-green-600"
        >
          Extract Data Points
        </Button>
      ) : (
        <>
          <Button
            type="primary"
            onClick={() => onViewDataPoints(dataPoint)}
            className="bg-blue-500 hover:bg-blue-600"
          >
            View Data Points
          </Button>
          
          {hasJobTitles && (
            <Button
              onClick={() => onViewJobTitles(dataPoint)}
              className="bg-yellow-500 hover:bg-yellow-600 text-white"
            >
              View CV Titles
            </Button>
          )}
          
          <Button
            onClick={() => {
              const keywords = JSON.parse(dataPoint.cvJobTitles || '[]');
              onPopulateKeywords(dataPoint.id, keywords);
            }}
            className="bg-green-500 hover:bg-green-600 text-white"
          >
            Populate Keywords
          </Button>
        </>
      )}
    </div>
  );
};

const isEmptyDataPoint = (dataPoint: CvDataPoint): boolean => {
  const fieldsToCheck: (keyof CvDataPoint)[] = [
    'skills', 'achievements', 'certificationsLicenses',
    'relevantProjects', 'languages', 'workExperience', 'education'
  ];
  
  return fieldsToCheck.every(field => {
    const value = dataPoint[field];
    return !value || (Array.isArray(value) && value.length === 0);
  });
};