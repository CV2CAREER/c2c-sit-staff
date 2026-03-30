// components/CvDataPoints/CvDataPointsManager.tsx
import React, { useState } from 'react';
import CvDataPointsTable from './CvDataPointsTable';
import { CvDataPointModal } from './CvDataPointModal';
import { CvJobTitlesModal } from './CvJobTitlesModal';
import { CvDataPoint } from './types';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

interface CvDataPointsManagerProps {
  customerId?: string;
}

export const CvDataPointsManager: React.FC<CvDataPointsManagerProps> = ({ customerId }) => {
  
const [page, setPage] = useState(0);
const [pageSize, setPageSize] = useState(20);
 const {
  data,
  isLoading,
  error,
  refetch,
} = useQuery({
  queryKey: ['cvDataPoints', customerId, page, pageSize],
  queryFn: () => fetchDataPoints(customerId, page, pageSize),
  
});





const handleExtractData = async (id: string) => {
    try {
      toast.loading('Extracting CV Data Points...');

      await axios.post('/api/admin/extractCVDataPoints', { id });
      toast.success('CV Data Points extracted successfully');
      refetch(); // Refresh the data after extraction
    } catch{
      // console.error('Error extracting data:', error);
      toast.error('An error occurred while extracting data');
    }
  };

    const handlePopulateKeywords = async (id: string, keywords: any) => {
    try {
      if (keywords.length > 0) {
        toast.loading('Populating Keywords...');
        await axios.post('/api/admin/extractCVDataPoints', {
          id,
          keywords,
        });
        toast.success('Keywords populated successfully');
      } else {
        toast.error('No keywords to populate');
      }
    } catch {
      // console.error('Error populating keywords:', error);
      toast.error('An error occurred while populating keywords');
    }
  };

  const [selectedDataPoint, setSelectedDataPoint] = useState<CvDataPoint | null>(null);
  const [showDataPointModal, setShowDataPointModal] = useState(false);
  const [showJobTitlesModal, setShowJobTitlesModal] = useState(false);


  const handleViewDataPoints = (dataPoint: CvDataPoint) => {
    setSelectedDataPoint(dataPoint);
    setShowDataPointModal(true);
  };

  const handleViewJobTitles = (dataPoint: CvDataPoint) => {
    setSelectedDataPoint(dataPoint);
    setShowJobTitlesModal(true);
  };

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Error loading CV data points</p>
        <Button onClick={() => refetch()} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="cv-data-points-manager">
      <div className="flex justify-between items-center mb-4">

        <Button
          onClick={() => fetchDataPoints(customerId)}
          disabled={isLoading}
        >
          Refresh
        </Button>
      </div>

    
        <CvDataPointsTable
        dataPoints={data?.data ?? []}
        loading={isLoading}
        onExtractData={handleExtractData}
        onPopulateKeywords={handlePopulateKeywords}
        onViewDataPoints={handleViewDataPoints}
        onViewJobTitles={handleViewJobTitles}
        totalCount={data?.totalCount ?? 0}
        page={page}
        pageSize={pageSize}
        onPaginationModelChange={({ page, pageSize }) => {
          setPage(page);
          setPageSize(pageSize);
        }}
      />

      <CvDataPointModal
        visible={showDataPointModal}
        dataPoint={selectedDataPoint}
        onClose={() => setShowDataPointModal(false)}
      />

      <CvJobTitlesModal
        visible={showJobTitlesModal}
        jobTitles={selectedDataPoint?.cvJobTitles || null}
        onClose={() => setShowJobTitlesModal(false)}
      />
    </div>
  );
};
const fetchDataPoints = async (customerId?: string, page = 0, pageSize = 20): Promise<{
  data: CvDataPoint[];
  totalCount: number;
}> => {
  const params = new URLSearchParams();
  if (customerId) params.append("customerId", customerId);
  params.append("skip", String(page * pageSize));
  params.append("limit", String(pageSize));

  const response = await axios.get(`/api/admin/extractCVDataPoints?${params.toString()}`);
  return response.data;
};
