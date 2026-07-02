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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useMemo, useState, useCallback } from 'react';
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
  { value: 'job_applications', label: 'Job Applications' },
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
  const [sampleRunEnvironment, setSampleRunEnvironment] = React.useState<
    'LIVE' | 'TEST' | null
  >('TEST');
  const [defaultAggregatorValue, setDefaultAggregatorValue] = React.useState<
    string | null
  >('seek');

  const [dataOption, setDataOption] = React.useState<{
    label: string;
    value: string;
  } | null>(null);
  const [selectedAggregator, setSelectedAggregator] = React.useState<{
    label: string;
    value: string;
  } | null>({
    label: 'Seek',
    value: 'seek',
  });
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
  >('aggregator');
  const [totalTableCount, setTotalTableCount] = useState(0);
  const [isEditable, setIsEditable] = useState(false);
  const [jobApplicationsStatusFilter, setJobApplicationsStatusFilter] =
    useState<'Successful' | 'Failed' | null>(null);
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
      campaignOptions: {
        active: aggregatorDataState === 'active' ? 'true' : 'false',
        aggregator: selectedAggregator?.value,
        dataOption: dataOption?.value,
        tableDisplay: tableDisplay ?? undefined,
        applicationStatus: jobApplicationsStatusFilter,
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
      paginationModel.pageSize,
      paginationModel.page,
    ]
  );

  const {
    singleClientDomain,
    campaignSheetDomain,
    aggregatorsDomain,
    clientApplicationsDomain,
  } = useAdminQueries(adminQueriesOptions);

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
                ['submitted', 'skipped', 'expired'].includes(status);

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
                    ['submitted', 'skipped', 'expired'].includes(status);

                  if (blocked) return;

                  setSelectedRow(params.row);
                  setIsStatusModalOpen(true);
                }}
                className="cursor-pointer font-medium text-blue-600 hover:text-blue-700 hover:underline"
              >
                {params.value || 'Unattended'}
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

    return modifyCampaignActionsColAndRows(
      rawColumns,
      aggregatorDataState,
      isEditable,
      'admin',
      selectedAggregator?.value ?? dataOption?.value ?? 'seek',
      'campaign-client',
      tableData,
      setTableData
    );
  }, [
    tableDisplay,
    selectedAggregator,
    dataOption,
    isEditable,
    aggregatorDataState,
    tableData,
    sampleResultColumns,
  ]);

  const fetchSampleResults = useCallback(async () => {
    if (dataOption?.value !== 'manual_discovery') return;

    try {
      setIsSampleResultsLoading(true);

      const response = await axiosInstance.get(
        `/api/v1/campaigns/clients/${resolvedClientId}/applications/manual`
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
    } catch (error: any) {
      setTableData([]);
      setTotalTableCount(0);
      toast.error(handleApiError(error, 'Failed to fetch sample results'));
    } finally {
      setIsSampleResultsLoading(false);
    }
  }, [dataOption?.value, resolvedClientId, isApplicationmodalOpen]);

  useEffect(() => {
    fetchSampleResults();
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
      const total = clientApplicationsData?.data?.pagination?.totalCount ?? 0;
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

  const table =
    selectedAggregator?.value.toLowerCase() ??
    dataOption?.value.toLowerCase() ??
    'seek';

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
    <main className="mt-10">
      <section>
        <section className="mb-9">
          <section className="flex w-full md:w-fit flex-wrap gap-4 mb-9">
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
              <SelectTrigger className="w-[180px] bg-white shadow-md">
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
            />
            <Select
              onValueChange={(value) =>
                value === 'LIVE'
                  ? setSampleRunEnvironment('LIVE')
                  : setSampleRunEnvironment('TEST')
              }
            >
              <SelectTrigger className="w-[180px] bg-white shadow-md">
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
                <SelectTrigger className="w-[180px] bg-white shadow-md">
                  <SelectValue placeholder="Application Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Successful">Successful</SelectItem>
                  <SelectItem value="Failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            )}
          </section>
        </section>

        <section className="flex flex-wrap gap-4 mb-9">
          {tableDisplay === 'aggregator' && (
            <Button
              className="w-full md:w-fit bg-green-700 hover:bg-green-80"
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
              Run Client Sample
            </Button>
          )}
          {tableDisplay === 'aggregator' && (
            <Button
              className="w-full md:w-fit"
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
              Update Role title and keywords
            </Button>
          )}

          {tableDisplay === 'aggregator' &&
            selectedAggregator?.value &&
            (() => {
              const env = isStage(selectedAggregator?.value) ? 'Live' : 'Stage';
              return (
                <>
                  <Button
                    className="w-full md:w-fit"
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
                    Override to {env}
                  </Button>

                  <Button
                    className="w-full md:w-fit"
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
                    Increment to {env}
                  </Button>
                </>
              );
            })()}
          {tableDisplay === 'data-option' && (
            <>
              <Button
                className="w-full md:w-fit"
                onClick={() => {
                  setIsApplicationModalOpen(true);
                }}
              >
                Add Application
              </Button>
              <Button
                className="w-full md:w-fit"
                onClick={() => {
                  setIsJobMatchModalOpen(true);
                }}
              >
                Match Jobs
              </Button>
              <Button
                className="w-full md:w-fit"
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
                  'Dispatch Samples'
                )}
              </Button>
            </>
          )}
        </section>
      </section>

      {/* Reggex Triggers & Allow Editing Section */}
      <section className="flex flex-col sm:flex-row items-end sm:items-center sm:justify-end gap-4 mt-12 mb-5">
        {isLoadingClient ? (
          <div className="px-4 py-2 rounded-lg bg-gray-200 text-gray-500">
            Loading client info...
          </div>
        ) : showSecondarySwitch ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPrimary((prev) => !prev)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isPrimary
                  ? 'bg-blue text-white hover:bg-blue-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isPrimary ? 'Using Primary Profile' : 'Using Secondary Profile'}
            </button>
          </div>
        ) : (
          <div className="px-4 py-2 rounded-lg bg-gray-200 text-gray-500 text-sm">
            Gold or Platinum plan required for secondary profile
          </div>
        )}
        <div className="w-fit bg-lightblue shadow-md rounded-md text-sm text-black p-2 flex items-center gap-2">
          Trigger reggex for this user <Switch />
        </div>
        {
          <div className="w-[180px] bg-lightblue shadow-md rounded-md text-sm text-black p-2 flex items-center gap-2">
            <Checkbox
              className="bg-white"
              checked={isEditable}
              onClick={() => setIsEditable(!isEditable)}
            />{' '}
            Allow Editing
          </div>
        }
      </section>

      {/* Client Table Section */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-bold">
            {table.charAt(0).toUpperCase() + table.slice(1).replace('_', ' ')}{' '}
            table
          </h2>
          {isEditable && (
            <div className="flex flex-row gap-4">
              <Button>Import Data</Button>
              <Button onClick={() => setFillDownIsOpen(!fillDownIsOpen)}>
                Fill Drop Down
              </Button>
              {saveMultiple && (
                <Button onClick={() => saveMultipleData()}>Save Data</Button>
              )}
            </div>
          )}
        </div>

        <div className="h-[800px] w-full">
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
            />
          )}
          {tableDisplay === 'data-option' && (
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
            />
          )}
        </div>
      </section>

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
