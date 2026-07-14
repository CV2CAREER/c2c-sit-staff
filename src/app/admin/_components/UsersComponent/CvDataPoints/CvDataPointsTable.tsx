// components/CvDataPoints/CvDataPointsTable.tsx
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid-pro';
import { CvDataPointActions } from './CvDataPointActions';
import Link from 'next/link';
import { Tooltip } from 'antd';
import { CvDataPoint } from './types';
import { StyledDataGridPro } from '@/utils/table';
import useMediaQuery from '@mui/material/useMediaQuery';



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
  const isMobile = useMediaQuery('(max-width: 768px)');



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
    {
      field: 'userId',
      headerName: 'User ID',
      width: 280,
      sortable: false,
      filterable: false,
    },
    {
      field: 'type',
      headerName: 'Type',
      width: 120,
      sortable: false,
      filterable: false,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      sortable: false,
      filterable: false,
    },
    {
      field: 'document',
      headerName: 'Document',
      width: 300,
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams<CvDataPoint>) => (
        <div>
          <Link
            href={params.value?.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-600"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            {params.value?.name}
          </Link>
        </div>
      ),
    },
    {
      field: 'source',
      headerName: 'Source',
      width: 120,
      sortable: false,
      filterable: false,
    },
    {
      field: 'cvJobTitles',
      headerName: 'Job Titles Count',
      width: 150,
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams<CvDataPoint>) => {
        return <span>{params.value?.length || 0}</span>;
      },
    },
    {
      field: 'keywords',
      headerName: 'Keywords Count',
      width: 150,
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams<CvDataPoint>) => {
        return <span>{params.value?.length || 0}</span>;
      },
    },
    {
      field: 'isDefault',
      headerName: 'Default',
      width: 100,
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams<CvDataPoint>) => {
        return <span>{params.value ? 'Yes' : 'No'}</span>;
      },
    },
    {
      field: 'cvType',
      headerName: 'CV Type',
      width: 150,
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams<CvDataPoint>) => {
        return params.row.cvDataPoints?.cvType || '-';
      },
    },
    {
      field: 'contactInformation',
      headerName: 'Contact Information',
      width: 200,
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams<CvDataPoint>) => {
        return params.row.cvDataPoints?.contactInformation || '-';
      },
    },
    {
      field: 'professionalSummary',
      headerName: 'Professional Summary',
      width: 250,
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams<CvDataPoint>) => {
        const value = params.row.cvDataPoints?.professionalSummary;
        return (
          <Tooltip title={value} arrow>
            <span className="truncate block max-w-[240px]">{value || '-'}</span>
          </Tooltip>
        );
      },
    },
    {
      field: 'skills',
      headerName: 'Skills',
      width: 200,
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams<CvDataPoint>) => {
        const value = params.row.cvDataPoints?.skills;
        return Array.isArray(value) ? value.join(', ') : '-';
      },
    },
    {
      field: 'workExperience',
      headerName: 'Work Experience',
      width: 250,
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams<CvDataPoint>) => {
        const value = params.row.cvDataPoints?.workExperience;
        return Array.isArray(value) ? `${value.length} records` : '-';
      },
    },
    {
      field: 'education',
      headerName: 'Education',
      width: 150,
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams<CvDataPoint>) => {
        const value = params.row.cvDataPoints?.education;
        return Array.isArray(value) ? `${value.length} records` : '-';
      },
    },
    {
      field: 'achievements',
      headerName: 'Achievements',
      width: 150,
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams<CvDataPoint>) => {
        const value = params.row.cvDataPoints?.achievements;
        return Array.isArray(value) ? value.length : '0';
      },
    },
    {
      field: 'certificationsLicenses',
      headerName: 'Certifications',
      width: 150,
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams<CvDataPoint>) => {
        const value = params.row.cvDataPoints?.certificationsLicenses;
        return Array.isArray(value) ? value.length : '0';
      },
    },
    {
      field: 'relevantProjects',
      headerName: 'Relevant Projects',
      width: 150,
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams<CvDataPoint>) => {
        const value = params.row.cvDataPoints?.relevantProjects;
        return Array.isArray(value) ? value.length : '0';
      },
    },
    {
      field: 'languages',
      headerName: 'Languages',
      width: 150,
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams<CvDataPoint>) => {
        const value = params.row.cvDataPoints?.languages;
        return Array.isArray(value) ? value.join(', ') : '-';
      },
    },
    {
      field: 'professionalAssociationsVolunteerWork',
      headerName: 'Associations',
      width: 150,
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams<CvDataPoint>) => {
        const value = params.row.cvDataPoints?.professionalAssociationsVolunteerWork;
        return Array.isArray(value) ? value.length : '0';
      },
    },
    {
      field: 'createdAt',
      headerName: 'Created',
      width: 180,
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams<CvDataPoint>) => {
        return new Date(params.value).toLocaleString();
      },
    },
  ];


  const responsiveColumns = isMobile
    ? columns.map((col) => {
        const mobileWidths: Record<string, number> = {
          actions: 270,
          userId: 140,
          type: 95,
          status: 95,
          document: 180,
          source: 100,
          cvJobTitles: 120,
          keywords: 120,
          isDefault: 90,
          cvType: 110,
          contactInformation: 150,
          professionalSummary: 180,
          skills: 140,
          workExperience: 150,
          education: 120,
          achievements: 120,
          certificationsLicenses: 130,
          relevantProjects: 130,
          languages: 120,
          professionalAssociationsVolunteerWork: 140,
          createdAt: 145,
        };

        const mobileWidth = mobileWidths[col.field];
        if (!mobileWidth) return col;

        const currentWidth = typeof col.width === 'number' ? col.width : mobileWidth;
        return {
          ...col,
          width: Math.min(currentWidth, mobileWidth),
        };
      })
    : columns;

  return (
    <div className="h-[450px] md:h-[600px] w-full">
      <StyledDataGridPro
      rows={dataPoints.map((item, index) => ({
        ...item,
        id: item.id || `dg-row-${index}-${Date.now()}`
      }))}
      columns={responsiveColumns}
      loading={loading}
      density={isMobile ? 'compact' : 'standard'}
      columnHeaderHeight={isMobile ? 40 : 56}
      rowHeight={isMobile ? 36 : undefined}
      pagination
      paginationMode="server"
      rowCount={totalCount}
      paginationModel={{ page, pageSize }} // ✅ this replaces page & pageSize props
      onPaginationModelChange={onPaginationModelChange}
      pageSizeOptions={[10, 25, 50]}
      getRowId={(row) => {
        // Always return a unique id, generate one if missing
        return row.id  || `${row.type}-${row.source}-${row.dateUpdated}-${Math.random().toString(36).substr(2, 9)}`;
      }}
      disableRowSelectionOnClick
      sx={
        isMobile
          ? {
              '& .MuiDataGrid-columnHeader, & .MuiDataGrid-cell': {
                px: 0.75,
              },
              '& .MuiDataGrid-columnHeaderTitle': {
                fontSize: '0.72rem',
                lineHeight: 1.15,
              },
              '& .MuiDataGrid-cell': {
                fontSize: '0.75rem',
              },
            }
          : undefined
      }
    />
    </div>
  );
};


