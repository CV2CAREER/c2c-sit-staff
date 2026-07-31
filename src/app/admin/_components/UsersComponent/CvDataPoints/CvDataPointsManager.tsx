import React, { useState } from 'react';
import CvDataPointsTable from './CvDataPointsTable';
import { CvDataPointModal } from './CvDataPointModal';
import { CvJobTitlesModal } from './CvJobTitlesModal';
import { CvDataPoint } from './types';
import axiosInstance from '@/services/api-client';
import { SERVER_URI } from '@/constants/env';
import { ADMIN_EXTRACT_CV_DATA_POINTS } from '@/constants/apiEndpoints/admin.endpoint';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

interface CvDataPointsManagerProps {
  customerId?: string;
}

export const CvDataPointsManager: React.FC<CvDataPointsManagerProps> = ({ customerId }) => {
  
const [page, setPage] = useState(0);
const [pageSize, setPageSize] = useState(20);
const [showDeleted, setShowDeleted] = useState(false);
 const {
  data,
  isLoading,
  error,
  refetch,
} = useQuery({
queryKey: ['cvDataPoints', customerId, page, pageSize, showDeleted],
  queryFn: () => fetchDataPoints(customerId, page, pageSize, showDeleted),
  
});


const handleExtractData = async (id: string) => {
    try {
      toast.loading('Extracting CV Data Points...');

      await axiosInstance.post(`${process.env.NEXT_PUBLIC_CUSTOMER_URL}/api/v1/documents/extract-cv-data-points`, { id });
      toast.success('CV Data Points extracted successfully');
      refetch(); // Refresh the data after extraction
    } catch{
      toast.error('An error occurred while extracting data');
    }
  };

    const handlePopulateKeywords = async (id: string, keywords: any) => {
    try {
      if (keywords.length > 0) {
        toast.loading('Populating Keywords...');
        await axiosInstance.post(`${SERVER_URI}${ADMIN_EXTRACT_CV_DATA_POINTS}`, {
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
      <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <Button
            onClick={() => refetch()}
            disabled={isLoading}
          >
            Refresh
          </Button>
          
          <Button
            variant={showDeleted ? "default" : "ghost"}
            onClick={() => {
              setShowDeleted(prev => !prev);
              setPage(0);
            }}
            disabled={isLoading}
          >
            {showDeleted ? "📁 Recycle Bin" : "✅ Active Uploads"}
          </Button>
        </div>
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
const fetchDataPoints = async (customerId?: string, page = 0, pageSize = 20, isDeleted = false): Promise<{
  data: CvDataPoint[];
  totalCount: number;
}> => {
  const queryParams: any = {
    page: page + 1,
    limit: pageSize
  };
  
  if (customerId) queryParams.userId = customerId;
  
  // ✅ ALWAYS send isDeleted parameter - explicit boolean
  queryParams.isDeleted = isDeleted;

  const response = await axiosInstance.get(`${SERVER_URI}/api/v1/uploads`, {
    params: queryParams,
    paramsSerializer: {
      indexes: null
    }
  });

  return {
    data: (response.data.data.uploads || []).map((item: any, index: number) => ({
      ...item,
      // Ensure every row has an id for DataGrid
      id: item.id || `row-${index}-${Date.now()}`
    })),
    totalCount: response.data.data.count
  };
};
