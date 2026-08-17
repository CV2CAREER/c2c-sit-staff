/* eslint-disable */
"use client";
import React, { useState, useEffect } from "react";
import {
  GridRowsProp,
  GridColDef,
  GridToolbar,
  GridToolbarColumnsButton,
  GridToolbarFilterButton,
  GridToolbarDensitySelector,
  GridToolbarExport,
  GridToolbarContainer,
  GridToolbarQuickFilter,
  GRID_CHECKBOX_SELECTION_COL_DEF,
} from "@mui/x-data-grid-pro";
import { UsersTableColType } from "@/types/admin"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FiLoader } from 'react-icons/fi';
import { modifyTableActionsColAndRows, tableColumns } from "../../users/_components/tableColumns";

import { useAdminQueries, useAdminMutations } from "@/hooks/api/admin.api";
import { useMutateData } from "@/hooks/useApi";
import { useQueryClient } from "@tanstack/react-query";
import { ADMIN_USER_PLAN_UPGRADE, ADMIN_USER_PROGRESS_MILESTONE } from "@/constants/apiEndpoints/admin.endpoint";
import { useGetAllUsers } from "@/app/admin/users/hooks/users-all";
import { moveTo, StyledDataGridPro } from "@/utils/table";
// import { applyDateSort } from "@/utils/dateSort";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import CRUDDropDown from "../DropDown/crud-dropdown";
import { FaSearch } from "react-icons/fa";
import SearchInput from "@/components/ui/search";
import { CvDataPointsManager } from "./CvDataPoints/CvDataPointsManager";
import DispatchClient from "@/components/modals/DispatchClient";
import { Combobox } from "@/components/ui/combobox";
import LoadingSpinner from "@/components/reusable/LoadingSpinner";
import toast from "react-hot-toast";
import CustomModal from "@/components/CustomModal/CustomModal";
import { IDateFilter } from "@/types/common";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PencilLine, Users2, Archive, Database, SendHorizontal, X, Settings2, CalendarRange, User, Search } from "lucide-react";
import DateFilter from "@/components/reusable/DateFilter";



const UsersTableToolbar = () => (
  <GridToolbarContainer>
    <GridToolbarColumnsButton />
    <GridToolbarFilterButton />
    <GridToolbarDensitySelector />
    <GridToolbarExport />
    <GridToolbarQuickFilter debounceMs={500} />
  </GridToolbarContainer>
);

/**
 * @title Users Management Data Table
 * @description This component fetches user data from an API and renders it in a grid using DataGridPro.
 * It displays a loading spinner while fetching data and an error message if the fetch fails.
 * This is used to dynamically fetch and render the "active" or "recycle" users.
 */
interface UsersDataTableProps {
  route?: any
  userType: {
    user: string;
    usersDataState: string;
    plan: string;
  };
  setUserType: (data: any) => void;
  tableRef: any
  dateFilterData: IDateFilter;
  setDateFilterData: React.Dispatch<React.SetStateAction<IDateFilter>>;
}

const UsersDataTable: React.FC<UsersDataTableProps> = ({userType, setUserType, tableRef, dateFilterData, setDateFilterData, route = "admin"}) => {
  /*---- State ----*/
  const [usersDataState, setUsersDataState] = useState<
    "active" | "recycle"
  >("active");
  const [columnHeaders, setColumnHeaders] =
    useState<GridColDef[]>(tableColumns);
  const [tableName, setTableName] = useState<
    "USERS" | "CDE" | "CVDATAPOINTS"
  >("USERS");
  const [editMode, setEditMode] = useState(false);
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [tableData, setTableData] = useState<readonly UsersTableColType[]>([]);
  const [progressBeingHandled, setProgressBeingHandled] = useState<{
    value: string;
    readyState: 0 | 1 | 2;
  } | null>(null);
  const [userToUpdate, setUserToUpdate] = useState<any | null>(null);
  const [allPaths, setAllPaths] = useState<string[]>([]);
  const [allRunsModal, setAllRunsModal] = useState<string[]>([]);
  const [paymentConfirmationModalOpen, setPaymentConfirmationModalOpen] = useState(false);
  const [loginCredentialsModalOpen, setLoginCredentialsModalOpen] = useState(false);
  const [hasRunModal, setHasRunModal] = useState<string[]>([]);
  const [planOverrideMetadata, setPlanOverrideMetadata] = useState<{
    type: string;
    data: { planId: string; plan: string };
  }>({ type: 'plan_selected', data: {  planId: '', plan: '' } });

  const { featureTitlesDomain } = useAdminQueries({
    fetchFeatureTitles: true,
  });
  const featurePlans = featureTitlesDomain?.data?.features || [];
  const planOrder = ['Coral', 'Emerald', 'Bronze', 'Silver', 'Gold', 'Platinum'];
  const orderedPlans = planOrder
    .map(name => featurePlans.find((p: any) => p.title?.toLowerCase() === name.toLowerCase()))
    .filter(Boolean);

  // New GET /v1/user/all endpoint replacing old API call
  const allUsers = useGetAllUsers({
    enabled: true,
    active: usersDataState === "active" ? true : undefined,
    recycle: usersDataState === "recycle" ? true : undefined,
    q: searchQuery,
    userType: userType?.user !== "all" ? userType?.user?.toLowerCase() : undefined,
    plan: userType?.plan !== "all" ? userType?.plan?.toLowerCase() : undefined,
    startDate: dateFilterData.startDate ?? undefined,
    endDate: dateFilterData.endDate ?? undefined,
  });

  const queryClient = useQueryClient();
  const upgradePlanMutation = useMutateData<any, { featureId: string; userId: string }>({
    method: "PATCH",
    url: (params) => ADMIN_USER_PLAN_UPGRADE(params.userId),
    mutationKey: ["admin-upgrade-plan-modal"],
    onSuccess: () => {
      toast.success("User plan upgraded successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-fetch-plans"] });
      queryClient.invalidateQueries({ queryKey: ["admin-feature-titles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-detail"] });
    },
    onError: () => {
      toast.error("Failed to upgrade user plan");
    },
  });
  const userProgressMutation = useMutateData<any, { progress: string; userId: string }>({
    method: "PATCH",
    url: (params) => ADMIN_USER_PROGRESS_MILESTONE(params.userId),
    mutationKey: ["admin-user-progress-milestone"],
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-list"] });
    },
    onError: () => {
      toast.error("Failed to update user progress");
    },
  });

  // Legacy query removed - all filtering now handled by useGetAllUsers
  // const { updateUserProgressMutation } = useAdminMutations();

  const rows: GridRowsProp<UsersTableColType> = React.useMemo(() => {
    // Use new endpoint data - map id to uniqueId for Customer Id column display
    return (allUsers.users || []).map((user: any) => ({
      ...user,
      uniqueId: user.id
    }));
  }, [allUsers.users]);

  const handleRowClick = (params: any) => {
    if (editMode) {
      setSelectedRow(params.row);
      setIsEditModalOpen(true);
    }
  };

  useEffect(() => {
    if (!selectedUser) {
      setTableData(rows);
    }
  }, [rows, selectedUser]);

  const runProgressAPIDefault = async (value: string, userId: string, user: any, metadata?: {}) => {
    try {
      // Skip Payment Confirmed here - it's handled by the dedicated modal with plan upgrade
      if (value === 'Payment Confirmed') {
        return true;
      }
      
      await toast.promise(
        userProgressMutation.mutateAsync({
          userId,
          progress: value,
        }),
        {
          loading: 'Updating progress - ' + value,
          success: `Progress(${value}) updated!`,
          error: `Failed to update Progress(${value})!`,
        },
      );
      return true;
    } catch (error) {
      return false;
    }
  };

  const handleProgressOverride = async (progress: string, currentProgress: string, user: any) => {
    setProgressBeingHandled({
      value: progress,
      readyState: 0,
    });

    const allProgresses = [
      'Email Verified',
      'Documents Declined',
      'Documents Accepted',
      'Plan Selected',
      'Payment Confirmed',
      'Login Credentials Verified',
      'Sample Results Accepted',
      'Sample Results Dispatched',
      'Preparatory Session Declined',
      'Preparatory Session Accepted',
      'Application Hold',
      'Application Expired',
      'Application Commenced',
      'Offer Notification Received',
      'Campaign Ended',
    ];

    const highProgresses = [
      'Plan Selected',
      'Payment Confirmed',
      'Login Credentials Verified',
      'Sample Results Accepted',
      'Sample Results Dispatched',
      'Preparatory Session Accepted',
      'Preparatory Session Declined',
      'Application Commenced',
      'Application Hold',
      'Application Expired',
      'Offer Notification Received',
      'Campaign Ended',
    ];

    setProgressBeingHandled((current: any) => {
      return { ...current, readyState: 1 };
    });

    if (progress === currentProgress) {
      if (progress === 'Email Verified') {
        runProgressAPIDefault(progress, user.id, user);
      } else return false;
    } else {
      if (highProgresses.includes(progress) || highProgresses.includes(currentProgress)) {
        const progressPath = allProgresses.slice(
          allProgresses.indexOf(currentProgress) > allProgresses.indexOf(progress)
            ? allProgresses.indexOf(progress)
            : allProgresses.indexOf(currentProgress) + 1,
          allProgresses.indexOf(progress) < allProgresses.indexOf(currentProgress)
            ? allProgresses.indexOf(currentProgress)
            : allProgresses.indexOf(progress) + 1,
        );

        let formattedProgressPath: any[] = [];

        progressPath.forEach((pg) => {
          if (pg !== progress) {
            if (['Application', 'Documents', 'Preparatory'].includes(pg.split(' ')[0])) {
              if (pg.includes('Application')) {
                if (pg.includes('Commenced')) {
                  formattedProgressPath.push(pg);
                }
              }
              if (pg.includes('Documents')) {
                if (pg.includes('Accepted')) {
                  formattedProgressPath.push(pg);
                }
              }
              if (pg.includes('Preparatory Session')) {
                if (pg.includes('Accepted')) {
                  formattedProgressPath.push(pg);
                }
              }
            } else formattedProgressPath.push(pg);
          } else formattedProgressPath.push(pg);
        });

        setUserToUpdate(user);
        setAllPaths(formattedProgressPath);

        for (const path of formattedProgressPath) {
          switch (path) {
            case 'Plan Selected':
              setAllRunsModal((current: any) => {
                return [...current, 'Plan Selected'];
              });
              await runProgressAPIDefault('Plan Selected', user.id || user._id, user);
              break;

            case 'Payment Confirmed':
              setAllRunsModal((current: any) => {
                return [...current, 'Payment Confirmed'];
              });
              if (
                !formattedProgressPath.includes('Login Credentials Verified') ||
                formattedProgressPath.indexOf(path) <
                  formattedProgressPath.indexOf('Login Credentials Verified')
              ) {
                setProgressBeingHandled({
                  value: path,
                  readyState: 0,
                });
                setPaymentConfirmationModalOpen(true);
              }

              break;

            case 'Login Credentials Verified':
              setAllRunsModal((current: any) => {
                return [...current, 'Login Credentials Verified'];
              });
              if (
                !formattedProgressPath.includes('Plan Selected') ||
                formattedProgressPath.indexOf(path) < formattedProgressPath.indexOf('Plan Selected')
              ) {
                setProgressBeingHandled({
                  value: path,
                  readyState: 0,
                });
                setLoginCredentialsModalOpen(true);
              }
              break;

              default:
                await runProgressAPIDefault(path, user.id || user._id, user);
          }
        }
      } else runProgressAPIDefault(progress, user.id || user._id, user);
    }

    setProgressBeingHandled((current: any) => {
      return { ...current, readyState: 2 };
    });

    return true;
  };

  const renderTable = () => {
      switch (tableName) {
        case "USERS":
          return (
            <div className="h-[500px] md:h-[800px] w-full" ref={tableRef}>
              <StyledDataGridPro
                initialState={{
                  pinnedColumns: {
                    left: [GRID_CHECKBOX_SELECTION_COL_DEF.field],
                  },
                  pagination: {
                    paginationModel: { pageSize: 20 },
                  },
                }}
                slots={{ toolbar: GridToolbar, loadingOverlay: LoadingSpinner, }}
                showToolbar={true}
                rows={tableData}
                getRowId={(row) => row.id}
                rowHeight={38}
                rowReordering
                disableRowSelectionOnClick
                onRowClick={handleRowClick}
                rowBufferPx={100}
                columns={
                  modifyTableActionsColAndRows(
                    columnHeaders, 
                    usersDataState, 
                    editMode, 
                    route, 
                    async (value: any, currentProgress: any, user: any) => {
                      await handleProgressOverride(value, currentProgress, user);
                    },
                  )
                }
                onColumnOrderChange={(e) => {
                  moveTo(tableName, e.column.field, e.targetIndex);
                }}
                columnBufferPx={5}
                checkboxSelection={editMode}
                 loading={allUsers.isLoading}
                pagination
                pageSizeOptions={[10, 20, 50, 100]}
                pinnedColumns={{ left: ['__check__', 'Customer Id', 'uniqueId', "actions"] }}
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
          );

        case "CVDATAPOINTS":
          return <CvDataPointsManager />;

        default:
          return <div className="text-center text-gray-500">Select a table to view data</div>;
      }
  };

  const renderTitle = () => {
    switch (tableName) {
      case "USERS":
        return "Users Management";
      case "CDE":
        return "CDEs Management";
      case "CVDATAPOINTS":
        return "CV Data Points Management";
      default:
        return "Users Management";
    }
  };

  useEffect(() => {
    if (selectedUser && rows.length > 0) {
      const filteredRows = rows.filter((row: any) => row.id === selectedUser.value);
      
      // Only update if different to prevent re-renders
      setTableData(prev => {
        const isSame =
          prev.length === filteredRows.length &&
          prev.every((row, i) => row.id === filteredRows[i].id);
          
        return isSame ? prev : filteredRows;
      });
    }
  }, [selectedUser, rows]);


  return (
    <section className="flex flex-col gap-4">
      <Card className="rounded-xl border-primary/15 shadow-[0_1px_10px_rgba(0,142,211,0.10)]">
        <CardContent className="flex flex-col gap-4 p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                <User size={14} className="text-primary" />
                Client
              </span>
              <Combobox
                list={rows
                  .map((user: any) => ({
                  value: user.id,
                  label: [user.firstName, user.middleName, user.lastName].filter(Boolean).join(" ").trim() || user.email || "Unnamed User",
                }))
                  .sort((a, b) => a.label.localeCompare(b.label)) // <- alphabetical magic
                }
                placeholder="Client Name"
                selectedItem={selectedUser}
                setSelectedItem={setSelectedUser}
                noItemsMessage="No client found"
                btnTriggerStyles="w-full justify-between"
                // loadingMore={shouldFetchMoreUsers}
                // setLoadingMore={setShouldFetchMoreUsers}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                <Search size={14} className="text-primary" />
                Search
              </span>
              <SearchInput
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                className="h-9 w-full rounded-md border border-input bg-white px-3 py-2 shadow-sm text-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                <CalendarRange size={14} className="text-primary" />
                Date Filter
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <DateFilter onFilterDataChange={setDateFilterData} />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Quick Actions</span>
              <Settings2 size={16} className="hidden text-gray-400 sm:block" />
              <CRUDDropDown columnHeaders={columnHeaders} />

              {route === "admin" && (
                <>
                  <Button
                    variant="outline"
                    className="gap-2 border-primary/20 text-primary transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                    onClick={() => setTableName("CVDATAPOINTS")}
                  >
                    <Database size={16} /> View CV Data Points
                  </Button>

                  <Button
                    variant="outline"
                    className="gap-2 border-primary/20 text-primary transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                    onClick={() => setIsDispatchModalOpen(true)}
                  >
                    <SendHorizontal size={16} /> Send Client info to PC
                  </Button>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex shrink-0 cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-xl border border-gray-100 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-primary/30 hover:bg-primary/5">
                <Checkbox checked={editMode} onClick={() => setEditMode(prev=>!prev)} />
                <PencilLine size={16} className="text-primary" />
                Allow Editing
              </label>

              <Tabs
              className="w-fit shrink-0"
              value={usersDataState}
              onValueChange={(value) => {
                const nextState = value === "active" ? "active" : "recycle";
                setUsersDataState(nextState);
                setUserType({
                  ...userType,
                  usersDataState: nextState,
                });
              }}
            >
              <TabsList className="w-fit flex-nowrap rounded-xl border border-gray-100 bg-gray-50 p-1 shadow-sm">
                <TabsTrigger
                  value="active"
                  className="shrink-0 gap-1.5 rounded-lg px-4 py-2 text-sm transition-colors hover:text-primary data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm"
                >
                  <Users2 size={14} />
                  Active Users
                </TabsTrigger>
                <TabsTrigger
                  value="recycle"
                  className="shrink-0 gap-1.5 rounded-lg px-4 py-2 text-sm transition-colors hover:text-primary data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm"
                >
                  <Archive size={14} />
                  Recycle Bin
                </TabsTrigger>
              </TabsList>
              </Tabs>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border-primary/15 shadow-[0_1px_10px_rgba(0,142,211,0.10)]">
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-4 space-y-0 border-b border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg font-bold text-gray-900">{renderTitle()}</CardTitle>
            {tableName === "USERS" && (
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                {tableData.length} records
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {renderTable()}
        </CardContent>
      </Card>
      <DispatchClient
        visibility={isDispatchModalOpen}
        togggleVisibility={setIsDispatchModalOpen}
      />

      {/* Plan confirmation modal */}
      <CustomModal
        visibility={!!paymentConfirmationModalOpen}
        toggleVisibility={() => setPaymentConfirmationModalOpen((current) => !current)}
      >
        <div className="bg-white p-4 sm:p-6 rounded-2xl min-h-[200px] relative">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Select {userToUpdate?.firstName}&apos;s plan
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">Choose a plan to confirm payment for this user.</p>
            </div>
            <button
              className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              onClick={() => {
                setPaymentConfirmationModalOpen(false);
                setProgressBeingHandled(null);
                setUserToUpdate(null);
                setHasRunModal((current: any) => {
                  return [...current, 'Payment Confirmed'];
                });
                setPlanOverrideMetadata({ type: 'payment_confirmed', data: { planId: '', plan: '' } });
              }}
            >
              <X size={18} />
            </button>
          </div>

          <div className="w-full flex flex-col">
            <div className="w-full h-fit flex flex-wrap items-center gap-3 py-4">
              {orderedPlans.map((plan: any) => (
                <div
                  key={plan.id}
                  onClick={() => {
                    setPlanOverrideMetadata((current: any) => {
                      return { ...current, data: { planId: plan.id, plan: plan.title } };
                    });
                  }}
                  className={`rounded-xl border px-2 transition-colors cursor-pointer ${
                    planOverrideMetadata.data.planId === plan.id
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-primary/40'
                  } h-[80px] w-[100px] grid place-items-center`}
                >
                  <p className={`text-sm font-semibold text-center capitalize ${planOverrideMetadata.data.planId === plan.id ? 'text-primary' : 'text-gray-700'}`}>{plan.title} plan</p>
                </div>
              ))}
            </div>

            <Button
              disabled={upgradePlanMutation.isPending || !planOverrideMetadata.data.planId || !userToUpdate?.id}
              onClick={async () => {
                if (!userToUpdate?.id) return;
                // Step 1: Upgrade the user plan with the featureId
                await upgradePlanMutation.mutateAsync({
                  featureId: planOverrideMetadata.data.planId,
                  userId: userToUpdate.id,
                });
                // Step 2: Update progress to Payment Confirmed
                await userProgressMutation.mutateAsync({
                  userId: userToUpdate.id,
                  progress: 'Payment Confirmed',
                });
                setPlanOverrideMetadata({ type: 'payment_confirmed', data: { planId: '', plan: '' } });
                setPaymentConfirmationModalOpen(false);
              }}
              className="capitalize mt-2 flex items-center gap-2 w-fit"
              type="submit"
            >
              {upgradePlanMutation.isPending || userProgressMutation.isPending ? (
                <FiLoader className="animate-spin text-base" />
              ) : (
                ''
              )}
              Updat
              {upgradePlanMutation.isPending || userProgressMutation.isPending
                ? 'ing...'
                : 'e'}
            </Button>
          </div>
        </div>
      </CustomModal>
    </section>
  );
};

export default UsersDataTable;
