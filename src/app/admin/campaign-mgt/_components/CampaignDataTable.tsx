/* eslint-disable */
"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  GridRowsProp,
  GridColDef,
  GridToolbar,
  GridRowSelectionModel,
} from "@mui/x-data-grid-pro";
import { CampaignTableColType } from "@/types/admin";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { modifyCampaignActionsColAndRows, tableColumns } from "./tableColumns";
import { moveTo, StyledDataGridPro } from "@/utils/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import { Switch } from "@/components/ui/switch";
import toast from "react-hot-toast";
import ImportData from "./ImportData";
import CRUDDropDown from "@/app/admin/_components/DropDown/crud-dropdown";
import SearchInput from "@/components/ui/search";
import LoadingSpinner from "@/components/reusable/LoadingSpinner";
import { aggregatorsList } from "./constant";
import { MasterSheetDropDownModal } from "./CampaignFillDown";
import CustomModal from "@/components/CustomModal/CustomModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQueryClient } from '@tanstack/react-query'
import { TableInformationEnum } from "@/types/enum";
import { useCampaignQueries, useCampaignMutations } from "@/hooks/api/admin/campaign";
import KwRtModalComponent from "@/components/GenerateAQComponents/kw-rt-modal-component";
import { useAdminQueries, useAdminMutations } from "@/hooks/api/admin.api";
import CustomModalAQ from "@/components/modals/CustomModalAQ";
import CloseIcon from '@mui/icons-material/Close';
import CDEsPreferences from "@/components/GenerateAQComponents/CDEsPreferences";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload,
  ListRestart,
  Save,
  RadioTower,
  PencilLine,
  Users2,
  Archive,
  LayoutGrid,
  Settings2,
  Trash2,
} from "lucide-react";

export type Pred = {
  role: string;
  titles: string[];
  keywords: string[];
  titlesExcluded: string[];
  keywordsExcluded: string[];
  country: string;
  locations: string[];
  stateExcluded: string[];
  cityExcluded: string[];
  city: string[];
  municipals: string[];
  municipalsExcluded: string[];
  advertisers: string[];
  advertisersExcluded: string[];
  includedJobTitles: string[];
  jobTypes: string[];
  jobTypesExcluded: string[];
  minSalary: number;
  maxSalary: number;
  industries: {
    id: string;
    name: string;
  }[];
  industriesIncluded: {
    id: string;
    name: string;
  }[];
  industriesExcluded: {
    id: string;
    name: string;
  }[];
  classifications: {
    id: string;
    name: string;
  }[];
  classificationsIncluded: {
    id: string;
    name: string;
  }[];
  classificationsExcluded: {
    id: string;
    name: string;
  }[];
  workingRight: string[];
  body: string[];
  bodyExcluded: string[];
  coverletterIncluded: boolean;
  isResumeVariationDeveloped: boolean;
  isAiForCriteriaSelectionAllowed: boolean;
  //roleKeywordExclusive: boolean;
  veteran: boolean;
  additionalComments: string;
  socialSecurityNumber: string;
  taxIdentificationNumber: string;
  maritalStatus: string;
  disabilityStatus: string;
  dateOfBirth: string;
  questions: ({ question: string; answer: string; private: boolean } | null)[];
};

/**
 * @title CampaignDataTable
 * @description This component fetches user data from an API and renders it in a grid using DataGridPro.
 * It displays a loading spinner while fetching data and an error message if the fetch fails.
 * This is used to dynamically fetch and render the "active" or "recycle" users.
 */
const CampaignDataTable: React.FC<{route:string}> = ({route}:{route: string}) => {
  const [clientDataState, setClientDataState] = useState<"active" | "recycle" | "all">("active");
  const [columnHeaders, setColumnHeaders] = useState<GridColDef[]>(tableColumns);
  const [templateNamesList, setTemplateNamesList] = useState<{ label: string, value: string }[]>([])
  const [isEditable, setIsEditable] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false)
  const [fillDownIsOpen, setFillDownIsOpen] = useState<boolean>(false);
  const [kwrtIsOpen, setKwrtIsOpen] = useState<boolean>(false);
  const [fillDownValues, setFillDownValues] = useState<{ columnName?: string; value?: string }>({});
  const [ColumnValue, setColumnValue] = useState<string>('Active');
  const [selectedClient, setSelectedClient] = useState<{label: string; value: string;} | null>(null);
  const [usersSkip, setusersSkip] = useState(0)
  const [shouldFetchMoreUsers, setShouldFetchMoreUsers] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<{label: string; value: string | number;} | null>(null);
  const [selectedAggregator, setSelectedAggregator] = useState<{label: string; value: string;} | null>(null);
  const [tableData, setTableData] = useState<any[any]>([]);
  const tableDataRef = useRef(tableData);
  useEffect(() => { tableDataRef.current = tableData; }, [tableData]);
  const [ searchQuery, setSearchQuery ] = useState<string>("");
  const [saveMultiple, setSaveMultiple] = useState(false);
  const [table, setTable] = useState(TableInformationEnum.ClientInformation);
  const [reFetch, setRefetch] = useState(false);
  const [usersId, setUserID] = useState<string | null>(null);
  const [mongoClientID, setMongoClientID] = useState<string | null>(null);
  const [clientData, setClientData] = useState<null | any[]>(null);
  const [isloading, setIsLoading] = useState<boolean>(false);
  const [preferences, setPreferences] = useState<Pred>();
  const [credentialsId, setCredentialsId] = useState<null | string>(null);
  const [jobType, setJobType] = useState([]);
  const [workingRights, setWorkingRights] = useState([]);
  const [reload, setReload] = useState(false);
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 20,
  });
  const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>({
    type: "include",
    ids: new Set(),
  });
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState<boolean>(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState<boolean>(false);
const queryClient = useQueryClient();
  const adminQueriesOptions = React.useMemo(() => ({
    fetchUsersFullName: true,
    usersFullNameSkip: usersSkip,
    fetchCampaignClients: true,
    campaignActive: clientDataState === "all" ? "all" : (clientDataState === "active" ? "true" : "false"),
    campaignSearch: searchQuery,
    fetchSheetsTemplates: true,
    fetchJobPreferences: true,
    fetchUserDocsAndPreferences: !!usersId,
    userId: usersId || "",
  }), [usersSkip, clientDataState, searchQuery, usersId]);

  const {
    usersFullNameDomain,
    campaignClientsDomain,
    sheetsTemplatesDomain,
    jobPreferencesOptionsDomain,
    userDocsAndPreferencesDomain,
  } = useAdminQueries(adminQueriesOptions);
  const { documentReviewDomain } = useCampaignQueries({
    userId: usersId || "",
    fetchUserDocsAndPreferences: !!usersId,
  });

  const {
    updateCampaignSheetBulkMutation,
    reverseUserIdMutation,
    flightCampaignMutation,
    bulkSoftDeleteCampaignMutation,
    bulkPermanentDeleteCampaignMutation,
  } = useAdminMutations();
  const { toggleFlightStatusMutation } = useCampaignMutations();

  const usersItems = usersFullNameDomain.data || [];
  const rowsData = campaignClientsDomain.data || [];
  const templatesData = sheetsTemplatesDomain.data;
  const jobPreferencesOptionsData = jobPreferencesOptionsDomain.data;
  
  const isLoading = usersFullNameDomain.isLoading || campaignClientsDomain.isLoading;

  // Create new user
  const createNewRecord = (): void => {
    if (!selectedClient || !selectedTemplate || !selectedAggregator) {
      toast.error("Please select all fields")
    }
    const data = { client: selectedClient, template: selectedTemplate, aggregrator: selectedAggregator }
  }

  // Reverted: Update data on the table to its old no-op state (as per old code)
  const updateRecord = (): void => {
    if (!selectedClient || !selectedTemplate || !selectedAggregator) {
      toast.error("Please select all fields")
    }
    const data = { client: selectedClient, template: selectedTemplate, aggregrator: selectedAggregator }
  }

  useEffect(() => {
    if (shouldFetchMoreUsers) {
      setusersSkip(usersSkip + 20)
      setShouldFetchMoreUsers(false)
    }
  }, [shouldFetchMoreUsers])

  useEffect(() => {
    if (templatesData) {
      setTemplateNamesList((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(templatesData)) return prev;
        return templatesData;
      });
    }
  }, [templatesData])

  useEffect(() => {
    const preferencesArray = Array.isArray(jobPreferencesOptionsData)
      ? jobPreferencesOptionsData
      : (jobPreferencesOptionsData as any)?.data || [];

    if (preferencesArray && Array.isArray(preferencesArray)) {
      const newJobType = preferencesArray.find((opt: any) => opt.category === "Job Type")?.options || [];
      const newWorkingRights = preferencesArray.find((opt: any) => opt.category === "Working Rights")?.options || [];
      setJobType((prev: any) => JSON.stringify(prev) === JSON.stringify(newJobType) ? prev : newJobType);
      setWorkingRights((prev: any) => JSON.stringify(prev) === JSON.stringify(newWorkingRights) ? prev : newWorkingRights);
    }
  }, [jobPreferencesOptionsData])

  const rows: GridRowsProp<CampaignTableColType> = React.useMemo(() => {
    if (!rowsData || !Array.isArray(rowsData)) return [];

    return rowsData.map((client: any) => {
      // Shorthand for the credentials JSONB so we don't repeat optional chaining
      const cred = client.seekExternalCredentials ?? {};

      return {
        // Spread raw API response first so action buttons and any extra fields are available
        ...client,

        // ── Identity ──────────────────────────────────────────────
        id: client.id,
        clientId: client.clientId,
        CustomerId: client.clientId || cred.CustomerId,

        // ── Personal info (seekExternalCredentials) ───────────────
        Full_Name: `${cred.First_Name} ${cred.Middle_Name} ${cred.Last_Name}` || cred.Full_Name,
        First_Name: cred.First_Name ?? null,
        Middle_Name: cred.Middle_Name ?? null,
        Last_Name: cred.Last_Name ?? null,

        // ── Contact ───────────────────────────────────────────────
        Email: client.seekEmail,
        // SPR-19-02-009: real proxy mailbox (jobsite_credentials.email) via
        // the backend's jobsiteCredentialEmail field, not the retired
        // Alias_Email from seekExternalCredentials.
        Alias_Email: client.jobsiteCredentialEmail ?? null,
        Alias_Password: cred.Alias_Password ?? null,
        ExternalPassword: cred.ExternalPassword || null,

        // ── Plan & location ───────────────────────────────────────
        Plan: cred.Plan ?? null,
        Country: client.currentCity ?? null,
        ReturnCount: client.returnCount ?? 0,
        Batch: cred.Batch ?? null,
        Craft: cred.Craft ?? null,
        Order: cred.Order ?? null,
        Assurance: cred.Assurance ?? null,

        // ── Campaign status (top-level) ───────────────────────────
        Active: client.Active ?? false,
        SeekAnswerPriority: client.SeekAnswerPriority ?? false,
        // API sends "capitalized" (lowercase) – table column key is "Capitalized"
        Capitalized: client.capitalized ?? null,
        campaignActive: !client.isDeleted,
        isDeleted: client.isDeleted,

        // ── Subscription dates (mixed: top-level + credentials) ───
        SeekSubStartDate: client.SeekSubStartDate ?? null,
        SeekSubEndDate: cred.SeekSubEndDate ?? null,
        SeekSubDurDays: cred.SeekSubDurDays ?? null,
        SeekSubRemainingDays: cred.SeekSubRemainingDays ?? null,
        SeekSubToExpireDays: cred.SeekSubToExpireDays ?? null,
        SeekSubExpired: cred.SeekSubExpired ?? null,
        GraceDuration: cred.GraceDuration ?? null,
        CampaignEnd: cred.CampaignEnd ?? null,

        // ── Aggregators ───────────────────────────────────────────
        // Seek is tracked at top-level (SeekAggregator); all others live in credentials
        Seek_Aggregator: client.SeekAggregator ?? false,
        Linkedin_Aggregator: cred.Linkedin_Aggregator ?? false,
        Jobserve_Aggregator: cred.Jobserve_Aggregator ?? false,
        EscapeCity_Aggregator: cred.EscapeCity_Aggregator ?? false,
        WorkforceAustralia_Aggregator: cred.WorkforceAustralia_Aggregator ?? false,
        Indeed_Aggregator: cred.Indeed_Aggregator ?? false,
        Monster_Aggregator: cred.Monster_Aggregator ?? false,
        Jora_Aggregator: cred.Jora_Aggregator ?? false,
        Adzuna_Aggregator: cred.Adzuna_Aggregator ?? false,
        CareerOne_Aggregator: cred.CareerOne_Aggregator ?? false,
        Reed_Aggregator: cred.Reed_Aggregator ?? false,
        Adecco_Aggregator: cred.Adecco_Aggregator ?? 0,
        CVLibrary_Aggregator: cred.CVLibrary_Aggregator ?? false,
        NHSJobs_Aggregator: cred.NHSJobs_Aggregator ?? false,
        Throttle_Listing: cred.Throttle_Listing ?? false,

        // ── PC assignment (AssignVA + EditModal need VaName / VaEmail) ─
        VaName: client.AssignedPCName ?? null,
        VaEmail: client.AssignedPCEmail ?? null,
        AssignedPCName: client.AssignedPCName ?? null,
        AssignedPCEmail: client.AssignedPCEmail ?? null,
        // ── Vet assignment ─
        VetName: client.AssignedVetName ?? null,
        VetEmail: client.AssignedVetEmail ?? null,
        AssignedVetName: client.AssignedVetName ?? null,
        AssignedVetEmail: client.AssignedVetEmail ?? null,
        // ── Completed assignment ─
        CompletedName: client.AssignedCompletedName ?? null,
        CompletedEmail: client.AssignedCompletedEmail ?? null,
        AssignedCompletedName: client.AssignedCompletedName ?? null,
        AssignedCompletedEmail: client.AssignedCompletedEmail ?? null,
        // ── Interim DPC / SPC assignment ─
        InterimDPCName: client.InterimDPCName ?? null,
        InterimDPCEmail: client.InterimDPCEmail ?? null,
        InterimSPCName: client.InterimSPCName ?? null,
        InterimSPCEmail: client.InterimSPCEmail ?? null,
        updateBy: client.updatedBy ?? null,

        // ── Metadata ──────────────────────────────────────────────
        createdAt: client.createdAt,
        updatedAt: client.updatedAt,
      };
    });
  }, [rowsData]);

  useEffect(() => {
    if (rows && rows.length > 0) {
      setTableData((prev: any) => {
        // Simple check to avoid setting state if data hasn't changed its length or identity
        if (prev === rows || (prev.length === rows.length && JSON.stringify(prev) === JSON.stringify(rows))) {
          return prev;
        }
        return rows;
      });
    }
  }, [rows]);



  const saveMultipleData = async () => {
    if (tableData.length === 0) return;
    toast.loading("Saving changes...");
    updateCampaignSheetBulkMutation.mutate(
      { table, data: tableData },
      {
        onSuccess: () => {
          toast.dismiss();
          toast.success("Changes saved successfully");
          setTableData([]);
          queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
        },
        onError: (err: any) => {
          toast.dismiss();
          toast.error(err.message || "Failed to save changes");
        },
      }
    );
  };

  const selectedIds = React.useMemo(
    () => Array.from(rowSelectionModel.ids),
    [rowSelectionModel],
  );

  const clearSelection = () => setRowSelectionModel({ type: "include", ids: new Set() });

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkDeleting(true);
    const isRecycleBin = clientDataState === "recycle";
    const mutation = isRecycleBin ? bulkPermanentDeleteCampaignMutation : bulkSoftDeleteCampaignMutation;

    try {
      const result = await mutation.mutateAsync({ ids: selectedIds });
      const affectedCount = result.data?.affectedCount ?? selectedIds.length;

      toast.success(
        isRecycleBin
          ? `${affectedCount} client(s) permanently deleted`
          : `${affectedCount} client(s) moved to recycle bin`,
      );
      queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["admin-fetch-campaign-clients"] });
    } catch {
      toast.error("Failed to delete clients");
    }

    clearSelection();
    setIsBulkDeleting(false);
    setIsBulkDeleteDialogOpen(false);
  };

  const handleFillDropDown = (values: any) => {
    if (typeof values.value === 'object') {
      //@ts-ignore
      values.value = values.value.map((el) => el.value).join(',');
    }
    setTableData((prevData: any) => {
      const updatedData = prevData.map((el: any) => {
        if (values.columnName === 'Active' || values.columnName === 'Include_Cover_Letter') {
          // @ts-ignore
          el[values.columnName] = Boolean(values.value);
        } else {
          // @ts-ignore
          el[values.columnName] = values.value;
        }

        return el;
      });
      return updatedData
    });
    setFillDownIsOpen(false);
    setSaveMultiple(true);
  };

  const generateAQFn = useCallback(async (clientId: string) => {
    setCredentialsId(clientId);
    setUserID(clientId);
    setKwrtIsOpen(true);
  }, []);

  useEffect(() => {
    if (documentReviewDomain.data) {
      const { userDocs, userPreference } = documentReviewDomain.data;
      if (userDocs) {
        userDocs.forEach((doc: any) => {
          if (!Array.isArray(doc.document)) {
            doc.document = [doc.document];
          }
        });
        setClientData(userDocs);
      }
      if (userPreference) {
        setPreferences(userPreference);
      }
    }
  }, [documentReviewDomain.data]);

  const fetchClientDocuments = async () => {
    setRefetch(false);
  };

  const [flightTogglingId, setFlightTogglingId] = useState<string | null>(null);

  const handleFlight = useCallback((clientId: string) => {
    setFlightTogglingId(clientId);
    const toastId = toast.loading("Toggling campaign flight status...");
    toggleFlightStatusMutation.mutate(
      { clientId },
      {
        onSuccess: (res: any) => {
          setFlightTogglingId(null);
          toast.success(res.message || "Campaign flight status updated successfully", { id: toastId });
          queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
        },
        onError: (err: any) => {
          setFlightTogglingId(null);
          toast.error(err.message || "Failed to toggle flight status", { id: toastId });
        },
      }
    );
  }, [toggleFlightStatusMutation, queryClient]);

  useEffect(() => {
    if(usersId){
      fetchClientDocuments();
    }
  }, [usersId]);

  const memoizedColumns = useMemo(() => modifyCampaignActionsColAndRows(
    columnHeaders,
    clientDataState,
    isEditable,
    route,
    table,
    "campaign",
    tableDataRef.current,
    setTableData,
    generateAQFn,
    handleFlight,
    flightTogglingId
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [columnHeaders, clientDataState, isEditable, route, table, generateAQFn, handleFlight, flightTogglingId]);


  return (
    <main className="flex flex-col gap-4 mb-10">
      <ImportData isModalOpen={isImportModalOpen} setShowModal={setIsImportModalOpen} />

      {/* Bulk Template Update */}
      <Card className="rounded-xl border-primary/15 shadow-[0_1px_10px_rgba(0,142,211,0.10)]">
        <CardContent className="flex flex-col gap-4 p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex min-w-[160px] flex-1 flex-col gap-1.5 sm:flex-none">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Client</span>
              <Combobox
                list={rows
                  .map((user: any) => ({
                    value: user.id,
                    label: `${user.Full_Name}`,
                  }))
                  .sort((a, b) => a.label.localeCompare(b.label))}
                placeholder="Client Name"
                selectedItem={selectedClient}
                setSelectedItem={setSelectedClient}
                noItemsMessage="No client found"
                loadingMore={shouldFetchMoreUsers}
                setLoadingMore={setShouldFetchMoreUsers}
                btnTriggerStyles="w-full sm:w-[200px] justify-between"
              />
            </div>

            <div className="flex min-w-[160px] flex-1 flex-col gap-1.5 sm:flex-none">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Search</span>
              <SearchInput
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                className="h-9 w-full min-w-[200px] rounded-md border border-input bg-white px-3 py-2 shadow-sm text-sm sm:w-auto"
              />
            </div>

            <div className="flex min-w-[160px] flex-1 flex-col gap-1.5 sm:flex-none">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Template</span>
              <Combobox
                list={[...templateNamesList].sort((a, b) => a.label.localeCompare(b.label))}
                placeholder="Template Name"
                selectedItem={selectedTemplate}
                setSelectedItem={setSelectedTemplate}
                noItemsMessage="No template found"
                btnTriggerStyles="w-full sm:w-[200px] justify-between"
              />
            </div>

            <div className="flex min-w-[160px] flex-1 flex-col gap-1.5 sm:flex-none">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Aggregator</span>
              <Combobox
                list={[...aggregatorsList].sort((a, b) => a.label.localeCompare(b.label))}
                placeholder="Aggregator"
                selectedItem={selectedAggregator}
                setSelectedItem={setSelectedAggregator}
                noItemsMessage="No aggregator found"
                btnTriggerStyles="w-full sm:w-[200px] justify-between"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Regex Trigger, Allow Editing, Table View & Dropdown Config */}
      <Card className="rounded-xl border-primary/15 shadow-[0_1px_10px_rgba(0,142,211,0.10)]">
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Settings2 size={16} className="hidden text-gray-400 sm:block" />
            <CRUDDropDown columnHeaders={columnHeaders} />

            <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-gray-100 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-primary/30 hover:bg-primary/5">
              <RadioTower size={16} className="text-primary" />
              Trigger regex for all users
              <Switch checked={false} />
            </label>

            <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-gray-100 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-primary/30 hover:bg-primary/5">
              <Checkbox
                checked={isEditable}
                onClick={() =>
                  setIsEditable((prev) => {
                    if (prev) clearSelection();
                    return !prev;
                  })
                }
              />
              <PencilLine size={16} className="text-primary" />
              Allow Editing
            </label>

            <Select
              onValueChange={(value) => {
                switch (value) {
                  case "add-record":
                    createNewRecord()
                    break;
                  case "update-record":
                    updateRecord()
                    break;
                  default:
                    toast.error("Invalid drop down action")
                    break;
                }
              }}
            >
              <SelectTrigger className="w-full sm:w-[200px] bg-white">
                <SelectValue
                  placeholder=
                  "Record Actions"
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="add-record"
                >Add new Record</SelectItem>
                <SelectItem value="update-record">Update Record</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Tabs
            value={clientDataState}
            onValueChange={(value) => {
              setClientDataState(value as "active" | "recycle" | "all");
              clearSelection();
            }}
          >
            <TabsList className="rounded-xl border border-gray-100 bg-gray-50 p-1 shadow-sm">
              <TabsTrigger
                value="all"
                className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm transition-colors hover:text-primary data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm"
              >
                <LayoutGrid size={14} />
                All Clients
              </TabsTrigger>
              <TabsTrigger
                value="active"
                className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm transition-colors hover:text-primary data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm"
              >
                <Users2 size={14} />
                Active Users
              </TabsTrigger>
              <TabsTrigger
                value="recycle"
                className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm transition-colors hover:text-primary data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm"
              >
                <Archive size={14} />
                Recycle Bin
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Campaign Table Section */}
      <Card className="rounded-xl border-primary/15 shadow-[0_1px_10px_rgba(0,142,211,0.10)]">
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-4 space-y-0 border-b border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg font-bold text-gray-900">All Clients</CardTitle>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              {tableData.length} records
            </span>
          </div>
          {
            isEditable &&
            <div className="flex flex-row flex-wrap items-center gap-3 w-full md:w-auto">
              <Button
                variant="outline"
                className="gap-2 border-primary/20 text-primary transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                onClick={() => setIsImportModalOpen(!isImportModalOpen)}
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
              {
                saveMultiple &&
                <Button className="gap-2" onClick={() => saveMultipleData()}>
                  <Save size={16} /> Save Data
                </Button>
              }
              {
                selectedIds.length > 0 &&
                <>
                  <span className="text-xs font-semibold text-gray-500">
                    {selectedIds.length} selected
                  </span>
                  <Button
                    variant="outline"
                    className="gap-2 border-red-200 text-red-600 transition-colors hover:border-red-400 hover:bg-red-50 hover:text-red-600"
                    onClick={() => setIsBulkDeleteDialogOpen(true)}
                  >
                    <Trash2 size={16} />
                    {clientDataState === "recycle"
                      ? `Delete Permanently (${selectedIds.length})`
                      : `Move to Recycle (${selectedIds.length})`}
                  </Button>
                </>
              }
            </div>
          }
        </CardHeader>
        <CardContent className="p-4">
          <div className="h-[500px] md:h-[700px] w-full">
            <StyledDataGridPro
              slots={
                {
                  toolbar: GridToolbar,
                  loadingOverlay: LoadingSpinner,
                }
              }
              showToolbar={true}
              rows={tableData}
              loading={isLoading}
              getRowId={(row) => row.id}
              rowHeight={38}
              rowReordering
              disableRowSelectionOnClick
              rowBufferPx={100}
              columns={memoizedColumns}
              columnBufferPx={5}
              checkboxSelection={isEditable}
              rowSelectionModel={rowSelectionModel}
              onRowSelectionModelChange={setRowSelectionModel}
              pagination
              paginationMode="client"
              pageSizeOptions={[10, 20, 50, 100]}
              paginationModel={paginationModel}
              onPaginationModelChange={(model: any) => {
                setPaginationModel(model);
              }}
              pinnedColumns={{ left: ['__check__', 'CustomerId', 'generatePassword', 'actions'] }}
              onColumnOrderChange={(e: any) => {
                moveTo("MASTERSHEET", e.column.field, e.targetIndex);
              }}
              sx={{
                border: "1px solid #f1f5f9",
                borderRadius: "12px",
                "& .MuiDataGrid-columnHeaders": {
                  backgroundColor: "rgba(0, 142, 211, 0.08)",
                },
                "& .MuiDataGrid-row:hover": {
                  backgroundColor: "rgba(0, 142, 211, 0.06)",
                },
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={isBulkDeleteDialogOpen}
        onOpenChange={(open) => !isBulkDeleting && setIsBulkDeleteDialogOpen(open)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              {clientDataState === "recycle"
                ? `${selectedIds.length} client(s) will be deleted permanently from our server! This action cannot be undone.`
                : `${selectedIds.length} client(s) will be moved to the Recycle bin.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              disabled={isBulkDeleting}
              onClick={() => setIsBulkDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isBulkDeleting}
              onClick={handleBulkDelete}
            >
              {isBulkDeleting
                ? "Deleting..."
                : clientDataState === "recycle"
                  ? "Permanently Delete"
                  : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Campaign Table Fill Down Modal */}
      <CustomModal toggleVisibility={setFillDownIsOpen} visibility={fillDownIsOpen}>
        {!!columnHeaders.length && (
          <MasterSheetDropDownModal
            ColumnValues={columnHeaders}
            ColumnValue={ColumnValue}
            setColumnValue={setColumnValue}
            setFillDownValues={setFillDownValues}
            handleFillDropDown={handleFillDropDown}
            fillDownValues={fillDownValues}
          />
        )}
      </CustomModal>

      {/* Generate AQ Modal */}
      <CustomModalAQ visibility={kwrtIsOpen} toggleVisibility={() => setKwrtIsOpen(false)}>
        <div className="bg-white max-w-4xl w-full flex items-center justify-start rounded-lg py-4 px-2 flex-col overflow-y-auto max-h-[60vh]">
          <div className="flex w-full p-4 justify-end">
            <CloseIcon
              className="rounded hover:bg-gray-200 p-2 text-gray-600 text-24 large-size"
              style={{ fontSize: '24px', cursor: 'pointer', minWidth: '28px', minHeight: '28px' }}
              onClick={() => setKwrtIsOpen(false)}
            />
          </div>

          {
            clientData ?
            <div>
              <KwRtModalComponent
                loading={isLoading}
                data={clientData}
                fetchClientDocuments={fetchClientDocuments}
                mongoClientID={mongoClientID}
                credentialId={credentialsId}
                masterSheet={true}
              />

              <div className="mt-6 w-full p-8 rounded-xl bg-white shadow-lg">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-semibold text-gray-900">Edit CDEs</h3>
                </div>
                {preferences && (
                  <CDEsPreferences
                    //@ts-ignore
                    id={usersId ?? mongoClientID}
                    preference={preferences}
                    loading={isLoading}
                    jobType={jobType}
                    workingRights={workingRights}
                    setReload={setReload}
                    setRefetch={setRefetch}
                  />
                )}
              </div>
            </div>
            :
            <LoadingSpinner/>
          }

        </div>
      </CustomModalAQ>
    </main>
  );
};

export default CampaignDataTable;
