/* eslint-disable */
"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  GridRowsProp,
  GridColDef,
  GridToolbar,
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
import { useQueryClient } from '@tanstack/react-query'
import { TableInformationEnum } from "@/types/enum";
import { useCampaignQueries, useCampaignMutations } from "@/hooks/api/admin/campaign";
import KwRtModalComponent from "@/components/GenerateAQComponents/kw-rt-modal-component";
import { useAdminQueries, useAdminMutations } from "@/hooks/api/admin.api";
import CustomModalAQ from "@/components/modals/CustomModalAQ";
import CloseIcon from '@mui/icons-material/Close';
import CDEsPreferences from "@/components/GenerateAQComponents/CDEsPreferences";

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
        Alias_Email: cred.Alias_Email ?? null,
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
        SeekSubToExpireDays: cred.SeekSubDurDays ?? null,
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

  const handleFlight = useCallback((clientId: string) => {
    toast.loading("Toggling campaign flight status...");
    toggleFlightStatusMutation.mutate(
      { clientId },
      {
        onSuccess: (res: any) => {
          toast.dismiss();
          toast.success(res.message || "Campaign flight status updated successfully");
          queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
        },
        onError: (err: any) => {
          toast.dismiss();
          toast.error(err.message || "Failed to toggle flight status");
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
    handleFlight
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [columnHeaders, clientDataState, isEditable, route, table, generateAQFn, handleFlight]);


  return (
    <main className="mt-10">
      <ImportData isModalOpen={isImportModalOpen} setShowModal={setIsImportModalOpen} />
      
      <section className="mb-[80px]">
        <section className="mb-9">

          {/* Template Updates section */}
          <section className="flex flex-wrap gap-4 mb-5">
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
            />

            <SearchInput
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />

            <Combobox
              list={[...templateNamesList].sort((a, b) => a.label.localeCompare(b.label))}
              placeholder="Template Name"
              selectedItem={selectedTemplate}
              setSelectedItem={setSelectedTemplate}
              noItemsMessage="No template found"
            />

            <Combobox
              list={[...aggregatorsList].sort((a, b) => a.label.localeCompare(b.label))}
              placeholder="Aggregator"
              selectedItem={selectedAggregator}
              setSelectedItem={setSelectedAggregator}
              noItemsMessage="No aggregator found"
            />
          </section>

          
          {/* Update record section */}
          <section className="flex flex-wrap gap-4">
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
              <SelectTrigger className="w-[180px] bg-white shadow-md">
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
          </section>
        </section>
      </section>

      {/* Reggex Triggers, Allow Editing, & Table State Section */}
      <section className="flex justify-between flex-col sm:flex-row ">
        <div>
          <CRUDDropDown columnHeaders={columnHeaders} />
        </div>
        <div className="my-5 grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          <div className="bg-lightblue shadow-md rounded-md text-sm sm:w-full w-9/12 text-black p-2 flex items-center gap-2 md:col-span-2 lg:col-span-1 justify-between">
            Trigger regex for all users <Switch checked={false} />
          </div>
          {( 
            <div className="bg-lightblue shadow-md rounded-md text-sm sm:w-full w-9/12 text-black p-2 flex items-center gap-2">
              <Checkbox className="bg-white" checked={isEditable} onClick={() => setIsEditable(prev => !prev)} /> Allow Editing
            </div>
          )}
          <Select
            onValueChange={(value: "active" | "recycle" | "all") =>
              setClientDataState(value)
            }
          >
            <SelectTrigger className="w-[180px] bg-white shadow-md">
              <SelectValue
                placeholder={
                  clientDataState === "active" ? "Active Clients" :
                  clientDataState === "recycle" ? "Recycle Bin" : "All Clients"
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              <SelectItem value="active">Active Users</SelectItem>
              <SelectItem value="recycle">Recycle Bin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* Campaign Table Section */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-bold">All Clients ({tableData.length} records)</h2>
          {
            isEditable && 
            <div className="flex flex-row gap-4">
              <Button onClick={() => setIsImportModalOpen(!isImportModalOpen)}>Import Data</Button>
              <Button onClick={() => setFillDownIsOpen(!fillDownIsOpen)}>Fill Drop Down</Button>
              {
                saveMultiple &&
                <Button onClick={() => saveMultipleData()}>Save Data</Button>
              }
            </div>
          }
        </div>
        <div className="h-[700px] w-full">
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
          />
        </div>
      </section>

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
