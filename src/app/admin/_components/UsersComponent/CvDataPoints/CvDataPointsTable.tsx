// components/CvDataPoints/CvDataPointsTable.tsx
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid-pro';
import { CvDataPointActions } from './CvDataPointActions';
import Link from 'next/link';
import { Tooltip } from 'antd';
import { CvDataPoint } from './types';
import { StyledDataGridPro } from '@/utils/table';



interface CvDataPointsTableProps {
  dataPoints: CvDataPoint[];
  loading: boolean;
  totalCount: number;
  page: number;
  pageSize: number;
  onPaginationModelChange: (model: { page: number; pageSize: number }) => void;
  onExtractData: (id: string) => void;
  onPopulateKeywords: (id: string, keywords: string[]) => void;
  onViewDataPoints: (dataPoint: CvDataPoint) => void;
  onViewJobTitles: (dataPoint: CvDataPoint) => void;
}

export default function CvDataPointsTable({
  dataPoints,
  loading,
  totalCount,
  page,
  pageSize,
  onPaginationModelChange,
  onExtractData,
  onPopulateKeywords,
  onViewDataPoints,
  onViewJobTitles,
}: CvDataPointsTableProps) {



  const keys: (keyof CvDataPoint)[] = [
    'customerId',
    'fullName',
    'document',
    'source',
    'cvType',
    'contactInformation',
    'professionalSummary',
    'workExperience',
    'education',
    'skills',
    'achievements',
    'certificationsLicenses',
    'relevantProjects',
    'languages',
    'professionalAssociationsVolunteerWork',
  ];

  const columns: GridColDef[] = [
    {
      field: 'actions',
      headerName: 'Actions',
      width: 500,
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams<CvDataPoint>) => (
        <CvDataPointActions
          dataPoint={params.row}
          onExtractData={onExtractData}
          onPopulateKeywords={onPopulateKeywords}
          onViewDataPoints={onViewDataPoints}
          onViewJobTitles={onViewJobTitles}
        />
      ),
    },
  ].concat(
    keys
      .filter((key) => key !== 'id')
      .map((key) => {
        if (key === 'document') {
          return {
            field: key,
            headerName: 'Document',
            width: 300,

            sortable: false,
            filterable: false,
            renderCell: (params: GridRenderCellParams<CvDataPoint>) => (
              <div>
                {params.value?.map((doc: { fileUrl: string; filename: string }, index: number) => (
                  <Link
                    key={index}
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-600"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    {doc.filename}
                    {index < params.value?.length - 1 && ', '}
                  </Link>
                ))}
              </div>
            ),
          };
        }
        
        return {
          field: key,
          headerName:
            key.charAt(0).toUpperCase() +
            key
              .slice(1)
              .replace(/([A-Z])/g, ' $1')
              .trim(),
          width: 300,
          sortable: false,
          filterable: false,
          renderCell: (params: GridRenderCellParams<CvDataPoint>) => {
            let cellContent = '';
            
            if (Array.isArray(params.value)) {
              if (key === 'workExperience' || key === 'education') {
                cellContent = params.value
                  ?.map((item: any) =>
                    `${item.jobTitle || item.degree} at ${item.organization} (${item.dates})`
                  )
                  .join(', ');
              } else {
                cellContent = params.value?.join(', ');
              }
            } else if (typeof params.value === 'object' && params.value !== null) {
              cellContent = JSON.stringify(params.value);
            } else {
              cellContent = params.value || '';
            }

            return (
              <Tooltip title={cellContent} arrow>
                <span>{cellContent}</span>
              </Tooltip>
            );
          },
        };
      })
  );

  return (
    <div className="h-[600px] w-full">
      <StyledDataGridPro
  rows={dataPoints}
  columns={columns}
  loading={loading}
  pagination
  paginationMode="server"
  rowCount={totalCount}
  paginationModel={{ page, pageSize }} // ✅ this replaces page & pageSize props
  onPaginationModelChange={onPaginationModelChange}
  pageSizeOptions={[10, 25, 50]}
  getRowId={(row) => row.id}
  disableRowSelectionOnClick
/>
    </div>
  );
};


