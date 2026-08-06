/* eslint-disable */
//app/admin/campaign-mgt/_components/ClientDataTable.tsx
'use client';
import axiosInstance from '@/services/api-client';
import { useParams } from 'next/navigation';
import CustomButton from '@/components/CustomButton/CustomButton';
import CustomModal from '@/components/CustomModal/CustomModal';
import ManualApplicationsModal from '@/components/modals/ManualApplication';
import JobMatchTriggerModal from '@/components/modals/MatchJobs';
import LoadingSpinner from '@/components/reusable/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Combobox } from '@/components/ui/combobox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { TimeRangeSelector } from '@/components/ui/time-range-selector';
import {
  SlidersHorizontal,
  PlayCircle,
  RefreshCcw,
  ArrowUpCircle,
  ArrowDownCircle,
  FilePlus2,
  Sparkles as SparklesIcon,
  SendHorizontal,
  RadioTower,
  PencilLine,
  Upload,
  ListRestart,
  Save,
} from 'lucide-react';
import { useAdminMutations, useAdminQueries } from '@/hooks/api/admin.api';
import { useCampaignMutations } from '@/hooks/api/admin/campaign';
import { useConfirmationModal } from '@/hooks/useConfirmationModule';
import { ButtonProperties } from '@/lib/helpers';
import { ClientTableInformationEnum } from '@/types/enum';
import { StyledDataGridPro } from '@/utils/table';
import {
  GRID_CHECKBOX_SELECTION_COL_DEF,
  GridColDef,
  GridToolbar,
  GridToolbarContainer,
} from '@mui/x-data-grid-pro';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useFetchData } from '@/hooks/useApi';
import Tooltip from '@mui/material/Tooltip';
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { FiLoader } from 'react-icons/fi';
import {
  AdeccoDropDownModal,
  AdzunaDropDownModal,
  CVLibraryDropDownModal,
  JobserveFillDropDownModal,
  JoraDropDownModal,
  LinkedinDropDownModal,
  ReedDropDownModal,
  SeekFillDropDownModal,
} from './CampaignFillDown';
import { singleCampaignColumns } from './clientCampaignTableColumns';
import UpdateJobStatusModal from './JobStatusModal';
import { modifyCampaignActionsColAndRows } from './tableColumns';
// Add these imports at the top

/*---- Data / Interfaces ----*/
interface CampaignClientData {
  data: any[];
}

// Updated Client interface to match backend response
interface Client {
  id: string | number;
  name: string;
  email?: string | null;
  plan: string | null;
  plans?: any;
  craft?: string | null;
  master_credentials?: any | null;
  seekExternalCredentials?: {
    Plan?: string;
    Full_Name?: string;
    Craft?: string;
    [key: string]: any;
  };
  source: 'mongodb' | 'master_credentials' | 'client';
}

// Helper function for consistent API error handling
const handleApiError = (
  error: any,
  defaultMessage: string = 'An error occurred'
): string => {
  const errorMessage =
    error.response?.data?.error ||
    error.response?.data?.message ||
    error.response?.data?.details ||
    error.message ||
    defaultMessage;

  return errorMessage;
};

const toTitleCase = (value?: string) =>
  value ? value.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : 'N/A';
const colors = {
  HQA: '#2BC07A',
  MQA: '#F4A91A',
  LQA: '#EC4040',
};

// Custom hook for client plan management
const useClientPlan = (clientInfo: Client | null) => {
  const hasPremiumAccess = useMemo(() => {
    if (!clientInfo) return false;

    // Extract plan value from the new API response structure (seekExternalCredentials)
    let planValue = clientInfo?.seekExternalCredentials?.Plan;

    // Fallback to other possible locations
    if (!planValue) {
      const plansObj = clientInfo.plans;
      const planFromPlans =
        typeof plansObj === 'string'
          ? plansObj
          : plansObj?.title || plansObj?.name;
      planValue = planFromPlans || clientInfo.plan;
    }

    if (!planValue) {
      // console.log("[ClientPlan] No plan value found for client:", clientInfo.name);
      return false;
    }

    const plan = planValue.toString().toLowerCase().trim();

    // Comprehensive check for premium plan keywords
    const isPremium =
      plan.includes('gold') ||
      plan.includes('platinum') ||
      plan.includes('platnium') || // Handle common typo
      plan.includes('platium') || // Handle another common misspelling
      plan.includes('premium') ||
      plan.includes('diamond') ||
      plan.includes('elite');

    // console.log(`[ClientPlan] Client: ${clientInfo.name}, Plan: ${plan}, IsPremium: ${isPremium}`);

    if (isPremium) return true;

    // Fallback: check raw plans object if it's a NormalizedPlan or has nested properties
    if (clientInfo.plans && typeof clientInfo.plans === 'object') {
      const rawTitle =
        clientInfo.plans.title ||
        clientInfo.plans.name ||
        clientInfo.plans.planName;
      if (rawTitle) {
        const normalizedTitle = rawTitle.toString().toLowerCase();
        if (
          normalizedTitle.includes('gold') ||
          normalizedTitle.includes('platinum') ||
          normalizedTitle.includes('platinium') ||
          normalizedTitle.includes('platium') ||
          normalizedTitle.includes('premium')
        ) {
          return true;
        }
      }
    }

    return false;
  }, [clientInfo]);

  return {
    hasPremiumAccess,
    canUseSecondaryProfile: hasPremiumAccess,
    clientPlan:
      clientInfo?.seekExternalCredentials?.Plan || clientInfo?.plan || null,
    fullPlan: clientInfo?.plans || null,
    planName: (() => {
      if (!clientInfo) return null;
      return clientInfo?.seekExternalCredentials?.Plan || clientInfo?.plan;
    })(),
  };
};

const dataOptionsList = [
  { value: 'questions', label: 'Answered Questions' },
  { value: 'discovery', label: 'Discovery' },
  { value: 'manual_discovery', label: 'Manual Discovery' },
  { value: 'campaign', label: 'Campaign' },
  { value: 'job_applications', label: 'Submissions' },
  { value: 'sample_results', label: 'Sample Results' },
];

const isStage = (tableName: string): boolean => {
  return tableName.toLowerCase().includes('_stage');
};

/**
 * @title ClientDataTable
 * @description This component fetches client data from an API and renders it in a grid using DataGridPro.
 */
const ClientDataTable: React.FC<{
  clientId: string | number;
  route: string;
}> = ({ clientId, route }: { clientId: string | number; route: string }) => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [sampleRunEnvironment, setSampleRunEnvironment] = React.useState<
    'LIVE' | 'TEST' | null
  >('TEST');
  const [defaultAggregatorValue, setDefaultAggregatorValue] = React.useState<
    string | null
  >('seek');

  const [dataOption, setDataOption] = React.useState<{
    label: string;
    value: string;
  } | null>({
    label: 'Submissions',
    value: 'job_applications',
  });
  const [selectedAggregator, setSelectedAggregator] = React.useState<{
    label: string;
    value: string;
  } | null>(null);
  const [aggregatorDataState, setAggregatorDataState] = React.useState<
    'active' | 'recycle'
  >('active');
  const [tableData, setTableData] = useState<any[]>([]);
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 100,
  });
  const { openConfirmationModal, ConfirmationModalComponent } =
    useConfirmationModal();
  const [makeQuery, setMakeQuery] = useState(false);
  const [isApplicationmodalOpen, setIsApplicationModalOpen] = useState(false);
  const [isJobMatchModalOpen, setIsJobMatchModalOpen] = useState(false);
  const [tableDisplay, setTableDisplay] = useState<
    'data-option' | 'aggregator' | null
  >('data-option');
  const [totalTableCount, setTotalTableCount] = useState(0);
  const [isEditable, setIsEditable] = useState(false);
  const [jobApplicationsStatusFilter, setJobApplicationsStatusFilter] =
    useState<'Successful' | 'Failed' | null>(null);
  const [selectedTour, setSelectedTour] = React.useState<{
    label: string;
    value: string;
  }>({ label: 'All Tour', value: 'all' });
  const [loaders, setLoaders] = useState({
    isPushingToQueue: false,
    isUpdatingKeywords: false,
    isDispatchingSample: false,
  });
  const [showFillDown, setShowFillDown] = useState(false);
  const [fillDownIsOpen, setFillDownIsOpen] = useState<boolean>(false);
  const [fillDownValues, setFillDownValues] = useState<{
    columnName?: string;
    value?: string;
  }>({});
  const [ColumnValue, setColumnValue] = useState<string>('Active');
  const [saveMultiple, setSaveMultiple] = useState(false);
  const [fillCountry, setFillCountry] = useState('');
  const [isdeletingAll, setIsdeletingAll] = useState(false);
  const [isPrimary, setIsPrimary] = useState(true);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<any>(null);

  const queryClient = useQueryClient();

  const adminQueriesOptions = React.useMemo(
    () => ({
      clientId: clientId.toString(),
      fetchSingleClient: true,
      fetchAggregators: true,
      fetchCampaignSheet: tableDisplay === 'aggregator',
      fetchClientApplications: dataOption?.value === 'job_applications',
      fetchClientTours: true,
      campaignOptions: {
        active: aggregatorDataState === 'active' ? 'true' : 'false',
        aggregator: selectedAggregator?.value,
        dataOption: dataOption?.value,
        tableDisplay: tableDisplay ?? undefined,
        applicationStatus: jobApplicationsStatusFilter,
        credentialsTourId:
          selectedTour.value !== 'all' ? selectedTour.value : undefined,
        limit: paginationModel.pageSize,
        skip: paginationModel.page,
      },
    }),
    [
      clientId,
      tableDisplay,
      aggregatorDataState,
      selectedAggregator,
      dataOption,
      jobApplicationsStatusFilter,
      selectedTour,
      paginationModel.pageSize,
      paginationModel.page,
    ]
  );

  const {
    singleClientDomain,
    campaignSheetDomain,
    aggregatorsDomain,
    clientApplicationsDomain,
    clientToursDomain,
  } = useAdminQueries(adminQueriesOptions);

  const aiVettingConfigQuery = useFetchData<any>({
    method: 'GET',
    url: '/api/v1/admin/ai-vetting',
    queryKey: ['admin-ai-vetting-config'],
    enabled: true,
    staleEarly: true,
  });
  const aiVettingConfig = aiVettingConfigQuery.data?.data ?? {};
  const isLearningMonth = aiVettingConfig?.learningMonth === true;

  const {
    dispatchSampleMutation,
    updateCampaignSheetMutation,
    deleteCampaignSheetMutation,
  } = useAdminMutations();

  const {
    generateKeywordsFromResumeMutation,
    addToClientQueueMutation,
    syncAggregatorsMutation,
  } = useCampaignMutations();

  // Extract actual user data from API response wrapper
  const apiResponse = singleClientDomain.data;
  const clientInfo = apiResponse?.data || apiResponse;
  const isLoadingClient = singleClientDomain.isLoading;

  const { data: jobsiteAggregators, isLoading: isJobsiteAggregatorsLoading } =
    aggregatorsDomain;
  const {
    data: applicationData,
    isLoading: isApplicationLoading,
    error: applicationError,
  } = campaignSheetDomain;
  const {
    data: clientApplicationsData,
    isLoading: isClientApplicationsLoading,
    error: clientApplicationsError,
  } = clientApplicationsDomain;

  // Use the custom hook for client plan management
  const { hasPremiumAccess, canUseSecondaryProfile, planName } = useClientPlan(
    (clientInfo as unknown as Client) || null
  );
  const showSecondarySwitch = canUseSecondaryProfile;

  // Force primary profile if user doesn't have premium access
  useEffect(() => {
    if (!hasPremiumAccess) {
      setIsPrimary(true);
    }
  }, [hasPremiumAccess]);

  const tourOptionsList = [
    { label: 'All Tour', value: 'all' },
    ...(clientToursDomain?.data ?? []).map((tour: any) => ({
      label: `Tour ${tour.tourNumber}${tour.isActive ? ' (Active)' : ''}`,
      value: tour.id,
    })),
  ];

  const jobsiteAggregatorsList = jobsiteAggregators?.flatMap(
    (aggregator: { name: string; picture: string }) => [
      {
        label:
          aggregator.name.charAt(0).toUpperCase() + aggregator.name.slice(1),
        value: aggregator.name.toLowerCase(),
      },
      {
        label:
          aggregator.name.charAt(0).toUpperCase() +
          aggregator.name.slice(1) +
          ' STAGE',
        value: aggregator.name.toLowerCase() + '_stage',
      },
    ]
  );

  const selectedAggValue = selectedAggregator?.value;

  // console.log(tableData, "Data to be filled in table")

  const handleUpdateKeywords = async () => {
    if (!clientId) {
      return toast.error('Client ID is required to generate keywords');
    }

    const loadingToast = toast.loading(
      'Generating keywords and role titles from resume...'
    );

    try {
      setLoaders((prev) => ({ ...prev, isUpdatingKeywords: true }));

      await generateKeywordsFromResumeMutation.mutateAsync({
        id: clientId.toString(),
        keywords: true,
        roleTitles: true,
        increment: false,
      });

      toast.success('Keywords and role titles generated successfully');
      toast.dismiss(loadingToast);
      queryClient.invalidateQueries({ queryKey: ['admin-campaign-sheet'] });
    } catch (error) {
      const errorMessage = handleApiError(
        error,
        'Failed to generate keywords from resume'
      );
      toast.error(errorMessage);
      toast.dismiss(loadingToast);
    } finally {
      setLoaders((prev) => ({ ...prev, isUpdatingKeywords: false }));
    }
  };

  const pushToAggQueue = async () => {
    let loadingToast: string | undefined;
    try {
      const loadingToast = toast.loading('Pushing to aggregator queue...');
      setLoaders((prev) => ({ ...prev, isPushingToQueue: true }));

      const response = await addToClientQueueMutation.mutateAsync({
        queue: selectedAggregator?.value ?? '',
        environment: sampleRunEnvironment ?? 'TEST',
        aggregator: selectedAggregator?.value ?? '',
        clientId: clientId.toString(),
      });

      toast.dismiss(loadingToast);
      toast.success(
        response.message || 'Successfully pushed to aggregator queue'
      );
    } catch (error: any) {
      if (loadingToast) toast.dismiss(loadingToast);
      // console.error("Error pushing to aggregator queue:", error);
      const errorMessage = handleApiError(
        error,
        'An error occurred while pushing to the aggregator queue.'
      );
      toast.error(errorMessage);
    } finally {
      setLoaders((prev) => ({ ...prev, isPushingToQueue: false }));
    }
  };

  const dispatchUserSampleAction = useMutation({
    mutationFn: async (userId: string) => {
      setLoaders((prev) => ({ ...prev, isDispatchingSample: true }));
      toast.loading('Dispatching Samples');
      return dispatchSampleMutation.mutateAsync({ clientId: userId });
    },
    onSuccess: (data: any) => {
      setLoaders((prev) => ({ ...prev, isDispatchingSample: false }));
      toast.success(data.message || 'Samples dispatched for user');
      queryClient.invalidateQueries({ queryKey: ['admin-campaign-sheet'] });
    },
    onError: (error: any) => {
      setLoaders((prev) => ({ ...prev, isDispatchingSample: false }));
      const errorMessage = handleApiError(
        error,
        'Could not dispatch user samples'
      );
      toast.error(errorMessage);
    },
  });

  const handleOverrideIncrement = async (
    env: string,
    action: 'override' | 'increment'
  ) => {
    let loadingToast: string | undefined;
    try {
      loadingToast = toast.loading(
        `${action === 'override' ? 'Overriding' : 'Incrementing'} role title and keywords...`
      );

      await syncAggregatorsMutation.mutateAsync({
        clientId: clientId.toString(),
        syncType: action,
        fromStage: true,
      });

      toast.dismiss(loadingToast);
      const actionVerb = action === 'override' ? 'overridden' : 'incremented';
      toast.success(
        `Successfully ${actionVerb} role title and keywords to ${env}`
      );
      queryClient.invalidateQueries({ queryKey: ['admin-campaign-sheet'] });
    } catch (error: any) {
      if (loadingToast) toast.dismiss(loadingToast);
      // console.error("Error updating campaign sheet:", error);
      const errorMessage = handleApiError(
        error,
        'An error occurred while updating the campaign sheet'
      );
      toast.error(errorMessage);
    }
  };

  // const columns = useMemo(() => {
  //   let value;

  //   if (tableDisplay === "aggregator") {
  //     value = selectedAggregator?.value ?? "seek";
  //   } else if (tableDisplay === "data-option") {
  //     value = dataOption?.value;
  //   } else {
  //     return [];
  //   }

  //   if (!value) return [];

  //   const columns = singleCampaignColumns(value) as GridColDef[];

  //   return modifyCampaignActionsColAndRows(
  //     columns,
  //     aggregatorDataState,
  //     isEditable,
  //     "admin",
  //     selectedAggregator?.value ?? dataOption?.value ?? "seek",
  //     "campaign-client",
  //     tableData,
  //     setTableData,
  //   );
  // }, [selectedAggregator, dataOption, isEditable, tableData]);

  const params = useParams<{ id?: string }>();
  const resolvedClientId = String(params?.id ?? clientId);

  const [isSampleResultsLoading, setIsSampleResultsLoading] = useState(false);
  const sampleResultsPollRef = useRef<NodeJS.Timeout | null>(null);
  const sampleResultsPollInFlightRef = useRef(false);

  // const isDataOptionLoading =
  //   dataOption?.value === 'job_applications'
  //     ? isClientApplicationsLoading
  //     : isApplicationLoading;

  const isDataOptionLoading =
    dataOption?.value === 'job_applications'
      ? isClientApplicationsLoading
      : dataOption?.value === 'manual_discovery'
        ? isSampleResultsLoading
        : isApplicationLoading;

  const parseHyperlinkFormula = (value?: string | null) => {
    if (!value) return { url: '', label: '' };

    const match = value.match(/^=HYPERLINK\("([^"]+)"\s*,\s*"([^"]+)"\)$/i);
    if (!match) {
      return { url: value, label: value };
    }

    return {
      url: match[1],
      label: match[2],
    };
  };

  const mapSampleResultRow = (item: any) => {
    const { url, label } = parseHyperlinkFormula(item?.Job_Title);

    return {
      id: item?.id,
      Client:
        `${item?.user?.firstName ?? ''} ${item?.user?.lastName ?? ''}`.trim(),
      Job_Id: item?.JobId ?? 'N/A',
      Job_Title: item?.Job_Title,
      Job_Location: item?.Location ?? 'N/A',
      Job_Type: item?.Job_Type ?? 'N/A',
      Application_Status: toTitleCase(item?.Status || 'Unattended'),
      Status_Reason: item?.StatusReason?.trim() || 'N/A',
      Quality_Score:
        (item?.Status || 'unattended').toLowerCase() === 'Unattended'
          ? 'TBD'
          : ['skipped', 'expired'].includes(
                (item?.Status || 'unattended').toLowerCase()
              )
            ? 'N/A'
            : (item?.QualityScore ?? ''),
      Discovered_By: item?.DiscoveredBy ?? 'N/A',
      Timestamp_Discovered: item?.DiscoveryDate ?? 'N/A',
      Vetted_By: item?.VettedBy ?? 'N/A',
      Timestamp_Vetted: item?.VettedDate ?? 'N/A',
      Submitted_By: item?.ApplicationSubmittedBy ?? 'N/A',
      Timestamp_Submitted: item?.ApplicationSubmissionDate ?? 'N/A',
      Date_Advertised: item?.createdAt ?? 'N/A',
      Advertiser: item?.Advertiser ?? 'N/A',
      External_Jobsite: item?.External_Jobsite ?? 'N/A',
      Internal_Jobsite: item?.Internal_Jobsite ?? 'N/A',
      Client_Id: item?.Client ?? 'N/A',
      Updated_At: item?.updatedAt ?? 'N/A',
      CoverLetterRequired: item?.CoverLetterRequired,
      AI_Score: item?.ai_score ?? null,
      AI_Reason: item?.ai_reason ?? null,
      AI_Status: item?.ai_status ?? null,
      user: item?.user,
    };
  };

  const sampleResultColumns = useMemo<GridColDef[]>(
    () => [
      { field: 'id', headerName: 'Id', width: 140 },
      { field: 'Client', headerName: 'Client', width: 180 },
      { field: 'Job_Id', headerName: 'Job Id', width: 180 },
      {
        field: 'Job_Title',
        headerName: 'Job Title',
        minWidth: 260,
        flex: 1,
        renderCell: (params: any) => {
          console.log(params.row);
          const match = params.row?.Job_Title.match(
            /=HYPERLINK\("([^"]+)","([^"]+)"\)/i
          );

          const jobTitleUrl = match
            ? {
                url: match[1],
                title: match[2],
              }
            : null;
          return (
            <a
              href={jobTitleUrl?.title || '#'}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 hover:underline"
              onClick={(e) => {
                if (!jobTitleUrl?.url) e.preventDefault();
              }}
            >
              {jobTitleUrl?.url || 'N/A'}
            </a>
          );
        },
      },
      { field: 'Job_Location', headerName: 'Job Location', width: 220 },
      { field: 'Job_Type', headerName: 'Job Type', width: 160 },
      {
        field: 'Application_Status',
        headerName: 'Application Status',
        width: 180,
        renderCell: (params: any) => (
          <div
            onClick={() => {
              const status = (params.value || '').toLowerCase();

              const blocked =
                !isEditable ||
                ['submitted', 'expired'].includes(status);

              if (blocked) return;

              setSelectedRow(params.row);
              setIsStatusModalOpen(true);
            }}
            className="cursor-pointer font-medium text-blue-600 hover:text-blue-700 hover:underline"
          >
            {toTitleCase(params.value)}
          </div>
        ),
      },
      {
        field: 'Status_Reason',
        headerName: 'Status Reason',
        width: 260,
        renderCell: (params: any) => <span>{params.value || 'N/A'}</span>,
      },
      {
        field: 'Quality_Score',
        headerName: 'Quality Score',
        width: 140,
        renderCell: (params: any) => {
          const color =
            params.value in colors
              ? colors[params.value as keyof typeof colors]
              : '#999';
          return (
            <span
              className="rounded-md px-3 py-1 text-xs font-bold text-white"
              style={{
                background: `${color}`,
              }}
            >
              {params.value || 'N/A'}
            </span>
          );
        },
      },
      {
        field: 'CoverLetterRequired',
        headerName: 'Cover Letter',
        width: 130,
        renderCell: (params: any) => (
          <span style={{ color: params.value ? '#22B14C' : '#9CA3AF' }}>
            {params.value ? 'Yes' : 'No'}
          </span>
        ),
      },
      {
        field: 'AI_Score',
        headerName: 'AI Score',
        width: 160,
        renderCell: (params: any) => {
          const score = params.value;
          const status = params.row?.AI_Status;
          const reason = params.row?.AI_Reason;

          let label = 'N/A';
          let color = '#999';

          if (status === 'pending') {
            label = 'PENDING';
          } else if (status === 'failed') {
            label = 'FAILED';
          } else if (typeof score === 'string') {
            label = score;
            color = score in colors ? colors[score as keyof typeof colors] : '#999';
          }

          return (
            <div className="flex items-center gap-1.5">
              <Tooltip
                title={reason || 'No AI reason available'}
                arrow
                placement="top"
              >
                <span
                  className="rounded-md px-3 py-1 text-xs font-bold text-white"
                  style={{ background: color, cursor: 'help' }}
                >
                  {label}
                </span>
              </Tooltip>
              {isLearningMonth && status === 'classified' && (
                <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                  Learning Month
                </span>
              )}
            </div>
          );
        },
      },
      { field: 'Discovered_By', headerName: 'Discovered By', width: 170 },
      {
        field: 'Timestamp_Discovered',
        headerName: 'Timestamp Discovered',
        width: 220,
      },
      { field: 'Vetted_By', headerName: 'Vetted By', width: 160 },
      { field: 'Timestamp_Vetted', headerName: 'Timestamp Vetted', width: 200 },
      { field: 'Submitted_By', headerName: 'Submitted By', width: 160 },
      {
        field: 'Timestamp_Submitted',
        headerName: 'Timestamp Submitted',
        width: 210,
      },
      { field: 'Date_Advertised', headerName: 'Date Advertised', width: 200 },
      { field: 'Advertiser', headerName: 'Advertiser', width: 200 },
      { field: 'External_Jobsite', headerName: 'External Jobsite', width: 180 },
      { field: 'Internal_Jobsite', headerName: 'Internal Jobsite', width: 180 },
      { field: 'Client_Id', headerName: 'Client Id', width: 160 },
      { field: 'Updated_At', headerName: 'Updated At', width: 200 },
    ],
    []
  );

  // const columns = useMemo(() => {
  //   let value;

  //   if (tableDisplay === 'aggregator') {
  //     value = selectedAggregator?.value ?? 'seek';
  //   } else if (tableDisplay === 'data-option') {
  //     value = dataOption?.value;
  //   } else {
  //     return [];
  //   }

  //   if (!value) return [];

  //   let rawColumns = singleCampaignColumns(value) as GridColDef[];

  //   // ==================== SPECIAL HANDLING FOR MANUAL DISCOVERY ====================
  //   if (value === 'manual_discovery' || value === 'manual_discovery_stage') {
  //     rawColumns = singleCampaignColumns(value) as GridColDef[]; // This will now work after you add it to columnKeys

  //     // Optional: Add custom renderers / styling specific to Manual Discovery
  //     rawColumns = rawColumns.map((col: any) => {
  //       // Make Application Status clickable
  //       if (col.field === 'Application_Status') {
  //         return {
  //           ...col,
  //           width: 180,
  //           renderCell: (params: any) => (
  //             <div
  //               onClick={() => {
  //                 setSelectedRow(params.row);
  //                 setIsStatusModalOpen(true);
  //               }}
  //               className="cursor-pointer font-medium text-blue-600 hover:text-blue-700 hover:underline"
  //             >
  //               {params.value || 'Unattended'}
  //             </div>
  //           ),
  //         };
  //       }

  //       if (col.field === 'Quality_Score') {
  //         return {
  //           ...col,
  //           width: 140,
  //           renderCell: (params: any) => (
  //             <span
  //               className={`font-medium px-2 py-1 rounded ${
  //                 params.value >= 80
  //                   ? 'text-green-700 bg-green-100'
  //                   : params.value >= 60
  //                     ? 'text-yellow-700 bg-yellow-100'
  //                     : 'text-red-700 bg-red-100'
  //               }`}
  //             >
  //               {params.value}
  //             </span>
  //           ),
  //         };
  //       }

  //       // You can add more custom columns here in the future
  //       // if (col.field === "Application_Status") { ... }

  //       return col;
  //     });
  //   }
  //   // ============================================================================

  //   return modifyCampaignActionsColAndRows(
  //     rawColumns,
  //     aggregatorDataState,
  //     isEditable,
  //     'admin',
  //     selectedAggregator?.value ?? dataOption?.value ?? 'seek',
  //     'campaign-client',
  //     tableData,
  //     setTableData
  //   );
  // }, [
  //   tableDisplay,
  //   selectedAggregator,
  //   dataOption,
  //   isEditable,
  //   aggregatorDataState,
  //   tableData,
  // ]);

  const table =
    selectedAggregator?.value?.toLowerCase() ??
    dataOption?.value?.toLowerCase() ??
    'seek';

  const isManualDiscoveryView =
    tableDisplay === 'data-option' && dataOption?.value === 'manual_discovery';

  const columns = useMemo(() => {
    let value;

    if (tableDisplay === 'aggregator') {
      value = selectedAggregator?.value ?? 'seek';
    } else if (tableDisplay === 'data-option') {
      value = dataOption?.value;
    } else {
      return [];
    }

    if (!value) return [];

    let rawColumns: GridColDef[] =
      value === 'manual_discovery'
        ? sampleResultColumns
        : (singleCampaignColumns(value) as GridColDef[]);

    if (value === 'manual_discovery' || value === 'manual_discovery_stage') {
      rawColumns = rawColumns.map((col: any) => {
        if (col.field === 'Application_Status') {
          return {
            ...col,
            width: 180,
            renderCell: (params: any) => (
              <div
                onClick={() => {
                  const status = (params.value || '').toLowerCase();

                  const blocked =
                    !isEditable ||
                    ['submitted', 'expired'].includes(status);

                  if (blocked) return;

                  setSelectedRow(params.row);
                  setIsStatusModalOpen(true);
                }}
                className="cursor-pointer font-medium text-blue-600 hover:text-blue-700 hover:underline"
              >
                {params.value
                  ? params.value.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
                  : 'Unattended'}
              </div>
            ),
          };
        }

        if (col.field === 'Quality_Score') {
          return {
            ...col,
            width: 140,
            renderCell: (params: any) => {
              const color =
                params.value in colors
                  ? colors[params.value as keyof typeof colors]
                  : '#999';
              return (
                <span
                  className="rounded-md px-3 py-1 text-xs font-bold text-white"
                  style={{
                    background: `${color}`,
                  }}
                >
                  {params.value || 'N/A'}
                </span>
              );
            },
          };
        }

        return col;
      });
    }

    const adjustedColumns = modifyCampaignActionsColAndRows(
      rawColumns,
      aggregatorDataState,
      isEditable,
      'admin',
      selectedAggregator?.value ?? dataOption?.value ?? 'seek',
      'campaign-client',
      tableData,
      setTableData
    );

    if (!(isMobile && isManualDiscoveryView)) {
      return adjustedColumns;
    }

    const mobileWidths: Record<string, number> = {
      id: 100,
      Client: 130,
      Job_Id: 120,
      Job_Location: 150,
      Job_Type: 120,
      Application_Status: 150,
      Status_Reason: 170,
      Quality_Score: 120,
      Discovered_By: 130,
      Timestamp_Discovered: 160,
      Vetted_By: 120,
      Timestamp_Vetted: 150,
      Submitted_By: 130,
      Timestamp_Submitted: 160,
      Date_Advertised: 140,
      Advertiser: 130,
      External_Jobsite: 140,
      Internal_Jobsite: 140,
      Client_Id: 120,
      Updated_At: 140,
    };

    return adjustedColumns.map((col) => {
      const mobileWidth = mobileWidths[col.field];
      if (!mobileWidth) return col;

      const currentWidth = typeof col.width === 'number' ? col.width : mobileWidth;
      return {
        ...col,
        width: Math.min(currentWidth, mobileWidth),
      };
    });
  }, [
    tableDisplay,
    selectedAggregator,
    dataOption,
    isEditable,
    aggregatorDataState,
    tableData,
    sampleResultColumns,
    isMobile,
    isManualDiscoveryView,
  ]);

  const fetchSampleResults = useCallback(async (isPoll = false) => {
    if (dataOption?.value !== 'manual_discovery') return;
    if (sampleResultsPollInFlightRef.current) return;

    sampleResultsPollInFlightRef.current = true;

    try {
      if (!isPoll) setIsSampleResultsLoading(true);

      const response = await axiosInstance.get(
        `/api/v1/campaigns/clients/${resolvedClientId}/applications/manual`,
        {
          params: {
            credentialsTourId:
              selectedTour.value !== 'all' ? selectedTour.value : undefined,
          },
        }
      );

      if (response.data?.success === false) {
        throw new Error(
          response.data?.message || 'Failed to fetch sample results'
        );
      }

      const rows = response.data?.data?.data ?? [];
      const mappedRows = rows.map(mapSampleResultRow);

      setTableData(mappedRows);
      setTotalTableCount(
        response.data?.data?.pagination?.totalCount ?? mappedRows.length
      );

      const hasPendingAI = mappedRows.some(
        (row: any) => row.AI_Status == null || row.AI_Score == null
      );

      if (sampleResultsPollRef.current) {
        clearTimeout(sampleResultsPollRef.current);
        sampleResultsPollRef.current = null;
      }

      if (hasPendingAI) {
        sampleResultsPollRef.current = setTimeout(
          () => fetchSampleResults(true),
          5000
        );
      }
    } catch (error: any) {
      setTableData([]);
      setTotalTableCount(0);
      toast.error(handleApiError(error, 'Failed to fetch sample results'));
    } finally {
      setIsSampleResultsLoading(false);
      sampleResultsPollInFlightRef.current = false;
    }
  }, [dataOption?.value, resolvedClientId, isApplicationmodalOpen, selectedTour]);

  useEffect(() => {
    fetchSampleResults();

    return () => {
      if (sampleResultsPollRef.current) {
        clearTimeout(sampleResultsPollRef.current);
        sampleResultsPollRef.current = null;
      }
    };
  }, [fetchSampleResults]);

  // UPDATED useEffect to process applicationData correctly
  useEffect(() => {
    if (applicationData) {
      // console.log("Application data received:", applicationData);

      // Check if the request was successful
      if (applicationData.success === false) {
        // console.error("API returned error:", applicationData.message);
        toast.error(applicationData.message || 'Failed to fetch data');
        setTableData([]);
        setTotalTableCount(0);
        return;
      }

      // Extract data from the response structure
      const data = applicationData.data;

      // For campaign/sheet endpoint, optionsData might be in data.data
      const optionsData = data?.optionsData || data?.data || [];
      const totalCount = data?.totalCount || data?.count || 0;

      setTableData(optionsData);
      setTotalTableCount(totalCount);
      setMakeQuery(false);
    } else if (applicationError) {
      setTableData([]);
      setTotalTableCount(0);
      // console.error("Error fetching application data:", applicationError);

      // Extract error message properly
      const errorMessage = handleApiError(
        applicationError,
        'Failed to fetch application data'
      );
      toast.error(errorMessage);
    }
  }, [applicationData, applicationError]);

  useEffect(() => {
    if (dataOption?.value !== 'job_applications') return;
    if (clientApplicationsData) {
      const applications = clientApplicationsData?.data?.data ?? [];
      const total =
        clientApplicationsData?.data?.totalCount ?? applications.length;
      setTableData(applications);
      setTotalTableCount(total);
    } else if (clientApplicationsError) {
      setTableData([]);
      setTotalTableCount(0);
      toast.error('Failed to fetch client applications');
    }
  }, [clientApplicationsData, clientApplicationsError, dataOption?.value]);

  useEffect(() => {
    if (!selectedAggregator && tableDisplay === 'aggregator') {
      setMakeQuery(true);
    }
  }, []);

  useEffect(() => {
    setShowFillDown(
      table != 'questions' &&
        table !== 'job_applications' &&
        table !== 'sample_results'
    );
  }, [table]);

  const handleFillDropDown = (values: any) => {
    if (typeof values.value === 'object') {
      values.value = values.value.map((el: any) => el.value).join(',');
    }
    setTableData((prevData) => {
      const updatedData = prevData.map((el) => {
        if (
          values.columnName === 'Active' ||
          values.columnName === 'Include_Cover_Letter'
        ) {
          // @ts-ignore
          el[values.columnName] = Boolean(values.value);
        } else {
          // @ts-ignore
          el[values.columnName] = values.value;
        }
        return el;
      });
      return updatedData;
    });
    setFillDownIsOpen(false);
    setSaveMultiple(true);
  };

  const saveMultipleData = async () => {
    try {
      toast.loading('Saving data...');
      const response = await updateCampaignSheetMutation.mutateAsync({
        table: table,
        data: tableData,
      });

      toast.success(response.message || 'Data created successfully');
      queryClient.invalidateQueries({
        queryKey: ['admin-campaign-sheet'],
      });
    } catch (error: any) {
      // console.log("[Save Multiple] Error occurred:", error);
      const errorMessage = handleApiError(
        error,
        'Something went wrong saving data'
      );
      toast.error(errorMessage);
    } finally {
      setSaveMultiple(false);
    }
  };

  const handleDeleteAll = async () => {
    try {
      setIsdeletingAll(true);
      toast.loading('Recycling all data...');

      const response = await deleteCampaignSheetMutation.mutateAsync({
        entity: table,
        table: table,
        id: clientId,
        action: 'soft-delete',
      });

      toast.success(response.message || 'Data recycled successfully');
      queryClient.invalidateQueries({
        queryKey: ['admin-campaign-sheet'],
      });
    } catch (error: any) {
      // console.error(error);
      const errorMessage = handleApiError(
        error,
        'Something went wrong recycling data'
      );
      toast.error(errorMessage);
    } finally {
      setIsdeletingAll(false);
    }
  };

  function EditToolbar(props: any) {
    return (
      <GridToolbarContainer>
        <div className="flex flex-row justify-center items-center gap-2">
          <GridToolbar />
          {isEditable && table === 'sample_results' && (
            <CustomButton
              customClass="!h-[2.75rem] !w-[200px] !rounded-[0.25rem] bg-red-500 hover:bg-red-400 text-white font-semibold mb-4"
              handleClick={handleDeleteAll}
              isDisabled={isdeletingAll}
              size={ButtonProperties.SIZES.small}
              title="Delete All Sample Results"
              variant={ButtonProperties.VARIANT.primary.name}
            />
          )}
        </div>
      </GridToolbarContainer>
    );
  }

  /* ---- Render ---- */
  return (
    <main className="flex flex-col gap-4 mb-10">
      {/* Filters */}
      <Card className="rounded-xl border-primary/15 shadow-[0_1px_10px_rgba(0,142,211,0.10)]">
        <CardHeader className="p-4 pb-3">
          <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <SlidersHorizontal size={18} className="text-primary" />
            View &amp; Filters
          </CardTitle>
          <CardDescription>
            Choose an aggregator or data source to inspect for this client.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex w-full flex-wrap gap-4">
            <Combobox
              list={jobsiteAggregatorsList ?? []}
              placeholder="Select Aggregator"
              selectedItem={selectedAggregator}
              setSelectedItem={(agg) => {
                if (typeof agg === 'object') {
                  setSelectedAggregator(agg);
                  setDataOption(null);
                  setMakeQuery(true);
                  setTableDisplay('aggregator');
                }
              }}
              loading={isJobsiteAggregatorsLoading}
              noItemsMessage="No Jobsite Aggregator found"
              btnTriggerStyles="w-full sm:w-[200px] justify-between"
            />
            <Select
              onValueChange={(value) => {
                if (value === 'active') {
                  setAggregatorDataState('active');
                  setMakeQuery(true);
                } else {
                  setAggregatorDataState('recycle');
                  setMakeQuery(true);
                }
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px] bg-white">
                <SelectValue
                  placeholder={
                    aggregatorDataState === 'active'
                      ? 'Active Data'
                      : 'Recycle Bin'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active Data</SelectItem>
                <SelectItem value="recycle">Recycle Bin</SelectItem>
              </SelectContent>
            </Select>
            <Combobox
              list={dataOptionsList}
              placeholder="Select Data Option"
              selectedItem={dataOption}
              setSelectedItem={(option) => {
                if (typeof option === 'object') {
                  setSelectedAggregator(null);

                  if (option.value === 'campaign') {
                    window.location.href = '/admin/campaign-mgt';
                    return;
                  }

                  if (option.value === 'discovery') {
                    window.location.href = `/admin/campaign-mgt/client/${clientId}`;
                    return;
                  }

                  if (option.value === 'manual_discovery') {
                    setDataOption(option);
                    setMakeQuery(true);
                    setTableDisplay('data-option');
                    return;
                  }

                  setDataOption(option);
                  setMakeQuery(true);
                  setTableDisplay('data-option');
                }
              }}
              noItemsMessage="No option found"
              btnTriggerStyles="w-full sm:w-[200px] justify-between"
            />
            <Select
              onValueChange={(value) =>
                value === 'LIVE'
                  ? setSampleRunEnvironment('LIVE')
                  : setSampleRunEnvironment('TEST')
              }
            >
              <SelectTrigger className="w-full sm:w-[180px] bg-white">
                <SelectValue
                  placeholder={
                    sampleRunEnvironment === 'LIVE' ? 'Live' : 'Test'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LIVE">Live</SelectItem>
                <SelectItem value="TEST">Test</SelectItem>
              </SelectContent>
            </Select>
            {dataOption?.value === 'job_applications' && (
              <Select
                onValueChange={(value) => {
                  if (value === 'Successful') {
                    setJobApplicationsStatusFilter('Successful');
                    setMakeQuery(true);
                  } else if (value === 'Failed') {
                    setJobApplicationsStatusFilter('Failed');
                    setMakeQuery(true);
                  }
                }}
              >
                <SelectTrigger className="w-full sm:w-[180px] bg-white">
                  <SelectValue placeholder="Application Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Successful">Successful</SelectItem>
                  <SelectItem value="Failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            )}
            {(dataOption?.value === 'job_applications' ||
              dataOption?.value === 'manual_discovery') && (
              <Select
                value={selectedTour.value}
                onValueChange={(value) => {
                  const option =
                    tourOptionsList.find((tour) => tour.value === value) ??
                    { label: 'All Tour', value: 'all' };
                  setSelectedTour(option);
                  setMakeQuery(true);
                }}
              >
                <SelectTrigger className="w-full sm:w-[180px] bg-white shadow-md">
                  <SelectValue placeholder="All Tour" />
                </SelectTrigger>
                <SelectContent>
                  {tourOptionsList.map((tour) => (
                    <SelectItem key={tour.value} value={tour.value}>
                      {tour.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <TimeRangeSelector styles="bg-white" />
          </div>

          {(tableDisplay === 'aggregator' || tableDisplay === 'data-option') && (
            <div className="mt-4 flex flex-wrap gap-3 border-t border-gray-100 pt-4">
              {tableDisplay === 'aggregator' && (
                <Button
                  className="w-full gap-2 bg-green-700 hover:bg-green-800 md:w-fit"
                  disabled={loaders.isPushingToQueue}
                  onClick={() => {
                    openConfirmationModal({
                      title: 'Run Client Sample',
                      description:
                        'Are you sure you want to run the client sample?',
                      onConfirm: () => {
                        pushToAggQueue();
                      },
                    });
                  }}
                >
                  <PlayCircle size={16} /> Run Client Sample
                </Button>
              )}
              {tableDisplay === 'aggregator' && (
                <Button
                  variant="outline"
                  className="w-full gap-2 md:w-fit border-primary/20 text-primary transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                  disabled={loaders.isUpdatingKeywords}
                  onClick={() => {
                    openConfirmationModal({
                      title: 'Update Role',
                      description:
                        'Are you sure you want to update the role title and keywords?',
                      onConfirm: () => {
                        handleUpdateKeywords();
                      },
                    });
                  }}
                >
                  <RefreshCcw size={16} /> Update Role title and keywords
                </Button>
              )}

              {tableDisplay === 'aggregator' &&
                selectedAggregator?.value &&
                (() => {
                  const env = isStage(selectedAggregator?.value) ? 'Live' : 'Stage';
                  return (
                    <>
                      <Button
                        variant="outline"
                        className="w-full gap-2 md:w-fit border-primary/20 text-primary transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                        disabled={loaders.isUpdatingKeywords}
                        onClick={() => {
                          openConfirmationModal({
                            title: 'Override Inputs',
                            description:
                              'Are you sure you want to override the inputs?',
                            onConfirm: () => {
                              handleOverrideIncrement(env, 'override');
                            },
                          });
                        }}
                      >
                        <ArrowUpCircle size={16} /> Override to {env}
                      </Button>

                      <Button
                        variant="outline"
                        className="w-full gap-2 md:w-fit border-primary/20 text-primary transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                        disabled={loaders.isUpdatingKeywords}
                        onClick={() => {
                          openConfirmationModal({
                            title: 'Increment Inputs',
                            description:
                              'Are you sure you want to increment the inputs?',
                            onConfirm: () => {
                              handleOverrideIncrement(env, 'increment');
                            },
                          });
                        }}
                      >
                        <ArrowDownCircle size={16} /> Increment to {env}
                      </Button>
                    </>
                  );
                })()}
              {tableDisplay === 'data-option' && (
                <>
                  <Button
                    variant="outline"
                    className="w-full gap-2 md:w-fit border-primary/20 text-primary transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                    onClick={() => {
                      setIsApplicationModalOpen(true);
                    }}
                  >
                    <FilePlus2 size={16} /> Add Application
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full gap-2 md:w-fit border-primary/20 text-primary transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                    onClick={() => {
                      setIsJobMatchModalOpen(true);
                    }}
                  >
                    <SparklesIcon size={16} /> Match Jobs
                  </Button>
                  <Button
                    className="w-full gap-2 md:w-fit"
                    disabled={loaders.isUpdatingKeywords}
                    onClick={() => {
                      openConfirmationModal({
                        title: 'Dispatch Samples',
                        description: 'Are you sure you want to dispatch samples?',
                        onConfirm: () => {
                          dispatchUserSampleAction.mutate(clientId as string);
                        },
                      });
                    }}
                  >
                    {loaders.isDispatchingSample ? (
                      <FiLoader className="animate-spin text-base" />
                    ) : (
                      <>
                        <SendHorizontal size={16} /> Dispatch Samples
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Regex Trigger, Allow Editing & Profile Section */}
      <Card className="rounded-xl border-primary/15 shadow-[0_1px_10px_rgba(0,142,211,0.10)]">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-end">
          {isLoadingClient ? (
            <div className="px-4 py-2 rounded-lg bg-gray-100 text-gray-500 text-sm">
              Loading client info...
            </div>
          ) : showSecondarySwitch ? (
            <button
              onClick={() => setIsPrimary((prev) => !prev)}
              className={`px-4 py-2 rounded-xl text-sm font-medium shadow-sm transition-colors ${
                isPrimary
                  ? 'bg-primary/10 text-primary hover:bg-primary/20'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isPrimary ? 'Using Primary Profile' : 'Using Secondary Profile'}
            </button>
          ) : (
            <div className="px-4 py-2 rounded-xl bg-gray-50 text-gray-500 text-sm">
              Gold or Platinum plan required for secondary profile
            </div>
          )}
          <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-gray-100 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-primary/30 hover:bg-primary/5">
            <RadioTower size={16} className="text-primary" />
            Trigger regex for this user
            <Switch />
          </label>
          <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-gray-100 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-primary/30 hover:bg-primary/5">
            <Checkbox
              checked={isEditable}
              onClick={() => setIsEditable(!isEditable)}
            />
            <PencilLine size={16} className="text-primary" />
            Allow Editing
          </label>
        </CardContent>
      </Card>

      {/* Client Table Section */}
      <Card className="rounded-xl border-primary/15 shadow-[0_1px_10px_rgba(0,142,211,0.10)]">
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-4 space-y-0 border-b border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg font-bold text-gray-900">
              {selectedAggregator?.label ??
                dataOption?.label ??
                table.charAt(0).toUpperCase() + table.slice(1).replace('_', ' ')}{' '}
              Table
            </CardTitle>
          </div>
          {isEditable && (
            <div className="flex flex-row flex-wrap gap-3 w-full md:w-auto">
              <Button
                variant="outline"
                className="gap-2 border-primary/20 text-primary transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
              >
                <Upload size={16} /> Import Data
              </Button>
              <Button
                variant="outline"
                className="gap-2 border-primary/20 text-primary transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                onClick={() => setFillDownIsOpen(!fillDownIsOpen)}
              >
                <ListRestart size={16} /> Fill Drop Down
              </Button>
              {saveMultiple && (
                <Button className="gap-2" onClick={() => saveMultipleData()}>
                  <Save size={16} /> Save Data
                </Button>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent className="p-4">
        <div className="h-[500px] md:h-[800px] w-full">
          {tableDisplay === 'aggregator' && (
            <StyledDataGridPro
              initialState={{
                pinnedColumns: {
                  left: [GRID_CHECKBOX_SELECTION_COL_DEF.field],
                },
              }}
              paginationModel={paginationModel}
              slots={{
                loadingOverlay: LoadingSpinner,
              }}
              showToolbar={true}
              rows={tableData}
              rowHeight={38}
              rowReordering
              disableRowSelectionOnClick
              checkboxSelection={isEditable}
              rowBufferPx={100}
              columns={columns}
              onPaginationModelChange={(pgntnModel) => {
                setPaginationModel(pgntnModel);
                setMakeQuery(true);
              }}
              paginationMode="client"
              columnBufferPx={5}
              loading={isApplicationLoading}
              pagination
              pinnedColumns={{ left: ['__check__', 'actions'] }}
              sx={{
                border: "1px solid #f1f5f9",
                borderRadius: "12px",
                "& .MuiDataGrid-columnHeaders": { backgroundColor: "rgba(0, 142, 211, 0.08)" },
                "& .MuiDataGrid-row:hover": { backgroundColor: "rgba(0, 142, 211, 0.06)" },
              }}
            />
          )}
          {tableDisplay === 'data-option' &&
            (dataOption?.value === 'job_applications' ? (
              // Job applications come back in full (no server pagination), so
              // let the grid render every row and paginate them client-side.
              <StyledDataGridPro
                initialState={{
                  pinnedColumns: {
                    left: [GRID_CHECKBOX_SELECTION_COL_DEF.field],
                  },
                }}
                slots={{
                  loadingOverlay: LoadingSpinner,
                }}
                showToolbar={true}
                rows={tableData}
                rowHeight={38}
                rowReordering
                disableRowSelectionOnClick
                checkboxSelection={isEditable}
                rowBufferPx={100}
                columns={columns}
                paginationMode="client"
                columnBufferPx={5}
                loading={isDataOptionLoading}
                pagination
                pinnedColumns={{ left: ['__check__', 'actions'] }}
                sx={{
                  border: "1px solid #f1f5f9",
                  borderRadius: "12px",
                  "& .MuiDataGrid-columnHeaders": { backgroundColor: "rgba(0, 142, 211, 0.08)" },
                  "& .MuiDataGrid-row:hover": { backgroundColor: "rgba(0, 142, 211, 0.06)" },
                }}
              />
            ) : (
              <StyledDataGridPro
                initialState={{
                  pinnedColumns: {
                    left: [GRID_CHECKBOX_SELECTION_COL_DEF.field],
                  },
                }}
                paginationModel={paginationModel}
                slots={{
                  loadingOverlay: LoadingSpinner,
                }}
                showToolbar={true}
                rows={tableData}
                rowHeight={38}
                density={isMobile && isManualDiscoveryView ? 'compact' : 'standard'}
                columnHeaderHeight={isMobile && isManualDiscoveryView ? 40 : 56}
                rowReordering
                disableRowSelectionOnClick
                checkboxSelection={isEditable}
                rowBufferPx={100}
                rowCount={totalTableCount}
                columns={columns}
                onPaginationModelChange={(pgntnModel) => {
                  setPaginationModel(pgntnModel);
                  setMakeQuery(true);
                }}
                paginationMode="server"
                columnBufferPx={5}
                loading={isDataOptionLoading}
                pagination
                pinnedColumns={{ left: ['__check__', 'actions'] }}
                sx={{
                  border: "1px solid #f1f5f9",
                  borderRadius: "12px",
                  "& .MuiDataGrid-columnHeaders": { backgroundColor: "rgba(0, 142, 211, 0.08)" },
                  "& .MuiDataGrid-row:hover": { backgroundColor: "rgba(0, 142, 211, 0.06)" },
                  ...(isMobile && isManualDiscoveryView
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
                    : {}),
                }}
              />
            ))}
        </div>
        </CardContent>
      </Card>

      <ConfirmationModalComponent />

      {isApplicationmodalOpen && (
        <CustomModal
          toggleVisibility={setIsApplicationModalOpen}
          visibility={isApplicationmodalOpen}
          callBack={() => setIsApplicationModalOpen(false)}
          classNameToModifyModalPosition="center"
        >
          <ManualApplicationsModal
            visible={isApplicationmodalOpen}
            onClose={() => setIsApplicationModalOpen(false)}
            clientId={clientId}
          />
        </CustomModal>
      )}

      <JobMatchTriggerModal
        visible={isJobMatchModalOpen}
        onCancel={() => setIsJobMatchModalOpen(false)}
        credId={clientId as string}
        onTrigger={(options) => {
          setIsJobMatchModalOpen(false);
        }}
      />

      {/* Fill down components */}
      {showFillDown && (
        <CustomModal
          toggleVisibility={setFillDownIsOpen}
          visibility={fillDownIsOpen}
        >
          {!!columns?.length &&
            (table.toLowerCase() === ClientTableInformationEnum.Seek ||
              table.toLowerCase() === ClientTableInformationEnum.SeekStage) && (
              <SeekFillDropDownModal
                ColumnValues={columns}
                ColumnValue={ColumnValue}
                setColumnValue={setColumnValue}
                setFillDownValues={setFillDownValues}
                handleFillDropDown={handleFillDropDown}
                fillDownValues={fillDownValues}
              />
            )}

          {!!columns.length &&
            (table.toLowerCase() === ClientTableInformationEnum.Jobserve ||
              table.toLowerCase() ===
                ClientTableInformationEnum.JobserveStage) && (
              <JobserveFillDropDownModal
                ColumnValues={columns}
                ColumnValue={ColumnValue}
                setColumnValue={setColumnValue}
                setFillDownValues={setFillDownValues}
                handleFillDropDown={handleFillDropDown}
                fillDownValues={fillDownValues}
                fillCountry={'United Kingdom'}
              />
            )}

          {!!columns.length &&
            (table.toLowerCase() === ClientTableInformationEnum.Linkedin ||
              table.toLowerCase() === ClientTableInformationEnum.Indeed) && (
              <LinkedinDropDownModal
                ColumnValues={columns}
                ColumnValue={ColumnValue}
                setColumnValue={setColumnValue}
                setFillDownValues={setFillDownValues}
                handleFillDropDown={handleFillDropDown}
                fillCountry={'Australia'}
                fillDownValues={fillDownValues}
              />
            )}

          {!!columns.length &&
            (table.toLowerCase() === ClientTableInformationEnum.Adecco ||
              table.toLowerCase() === ClientTableInformationEnum.Monster) && (
              <AdeccoDropDownModal
                ColumnValues={columns}
                ColumnValue={ColumnValue}
                setColumnValue={setColumnValue}
                setFillDownValues={setFillDownValues}
                handleFillDropDown={handleFillDropDown}
                fillDownValues={fillDownValues}
                fillCountry={'United Kingdom'}
              />
            )}

          {!!columns.length &&
            (table.toLowerCase() === ClientTableInformationEnum.Jora ||
              table.toLowerCase() === ClientTableInformationEnum.JoraStage) && (
              <JoraDropDownModal
                ColumnValues={columns}
                ColumnValue={ColumnValue}
                setColumnValue={setColumnValue}
                setFillDownValues={setFillDownValues}
                handleFillDropDown={handleFillDropDown}
                fillCountry={'Australia'}
                fillDownValues={fillDownValues}
              />
            )}

          {!!columns.length &&
            (table.toLowerCase() === ClientTableInformationEnum.Reed ||
              table.toLowerCase() === ClientTableInformationEnum.ReedStage) && (
              <ReedDropDownModal
                ColumnValues={columns}
                ColumnValue={ColumnValue}
                setColumnValue={setColumnValue}
                setFillDownValues={setFillDownValues}
                handleFillDropDown={handleFillDropDown}
                fillCountry={'United Kingdom'}
                fillDownValues={fillDownValues}
              />
            )}

          {!!columns.length &&
            (table.toLowerCase() === ClientTableInformationEnum.Adzuna ||
              table.toLowerCase() === ClientTableInformationEnum.AdzunaStage ||
              table.toLowerCase() === ClientTableInformationEnum.CareerOne ||
              table.toLowerCase() ===
                ClientTableInformationEnum.CareerOneStage ||
              table.toLowerCase() === ClientTableInformationEnum.JobBank ||
              table.toLowerCase() ===
                ClientTableInformationEnum.WorkforceAustralia ||
              table.toLowerCase() ===
                ClientTableInformationEnum.EscapeCity) && (
              <AdzunaDropDownModal
                ColumnValues={columns}
                ColumnValue={ColumnValue}
                setColumnValue={setColumnValue}
                setFillDownValues={setFillDownValues}
                handleFillDropDown={handleFillDropDown}
                fillCountry={'Australia'}
                fillDownValues={fillDownValues}
              />
            )}

          {!!columns.length &&
            (table.toLowerCase() === ClientTableInformationEnum.CVLibrary ||
              table.toLowerCase() === ClientTableInformationEnum.NHSJobs) && (
              <CVLibraryDropDownModal
                ColumnValues={columns}
                ColumnValue={ColumnValue}
                setColumnValue={setColumnValue}
                setFillDownValues={setFillDownValues}
                handleFillDropDown={handleFillDropDown}
                fillCountry={'United Kingdom'}
                fillDownValues={fillDownValues}
              />
            )}
        </CustomModal>
      )}
      {/* Update Job Status Modal */}
      <UpdateJobStatusModal
        isOpen={isStatusModalOpen}
        onClose={() => {
          setIsStatusModalOpen(false);
          setSelectedRow(null);
        }}
        applicationId={selectedRow?.id ?? ''}
        initialStatus={selectedRow?.Application_Status || 'Unattended'}
        rowData={selectedRow}
        onUpdated={async () => {
          if (dataOption?.value === 'manual_discovery') {
            await fetchSampleResults();
          } else {
            setMakeQuery(true);
          }
        }}
      />
    </main>
  );
};

export default ClientDataTable;
