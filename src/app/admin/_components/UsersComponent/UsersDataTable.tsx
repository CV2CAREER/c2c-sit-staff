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
import { FiLoader, FiX } from 'react-icons/fi';
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
}

const UsersDataTable: React.FC<UsersDataTableProps> = ({userType, setUserType, tableRef, dateFilterData, route = "admin"}) => {
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
            <div className="h-[800px] w-full" ref={tableRef}>
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
    <section className="mt-10">
      <div className="flex items-center space-x-4 mb-4">
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
                    // loadingMore={shouldFetchMoreUsers}
                    // setLoadingMore={setShouldFetchMoreUsers}
                  />
     <SearchInput
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
      </div>
      <section>
        <section className="flex flex-wrap gap-4 mb-9">
          <CRUDDropDown columnHeaders={columnHeaders} />

        </section>

        <section className="flex gap-4">
       {route === "admin" && ( 
        <>
          <Button className="border-[2px] border-blue" variant="ghost" onClick={
              () => setTableName("CVDATAPOINTS")
            }>
              View CV Data Points
            </Button>

          <Button className="border-[2px] border-blue" variant="ghost"
           onClick={  
            () => setIsDispatchModalOpen(true)
          }>
            Send Client info to PC
          </Button>
          </>)}
        </section>
      </section>

      <section className="flex items-center justify-end gap-4 my-5">

        {(  <div className="w-[180px] bg-lightblue shadow-md rounded-md text-black p-2 flex items-center gap-2"> <Checkbox className="bg-white" checked={editMode} onClick={() => setEditMode(prev=>!prev)} /> Allow Editing </div>)}

        <Select
          onValueChange={(value) =>
            {
              value === "active"
              ? setUsersDataState("active")
              : setUsersDataState("recycle")

              value === "active"
              ? setUserType({
                  ...userType,
                  usersDataState: "active"
                })
              : setUserType({
                  ...userType,
                  usersDataState: "recycle"
                })
            }
          }
        >
          <SelectTrigger className="w-[180px] bg-white shadow-md">
            <SelectValue
              placeholder={
                usersDataState === "active" ? "Active Users" : "Recycle Bin"
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active Users</SelectItem>
            <SelectItem value="recycle">Recycle Bin</SelectItem>
          </SelectContent>
        </Select>
      </section>

      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-bold">
            {renderTitle()}
          </h2>
        </div>
        {renderTable()}
       
      </section>
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
          <div className="flex items-center justify-end">
            <button
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
              <FiX className="text-2xl" />
            </button>
          </div>
          <h2>
            <span className="text-24 !font-medium font-sharp-grotesk mt-4 text-career-black-200">
              Select {userToUpdate?.firstName} plan
            </span>
          </h2>
          <p>Are you sure you want to select plan?</p>

          <div className="w-full flex flex-col">
            <div className="w-full h-fit flex-row flex items-center space-x-4 py-4">
              {orderedPlans.map((plan: any) => (
                <div
                  key={plan.id}
                  onClick={() => {
                    setPlanOverrideMetadata((current: any) => {
                      return { ...current, data: { planId: plan.id, plan: plan.title } };
                    });
                  }}
                  className={`rounded border px-2 transition-all cursor-pointer ${
                    planOverrideMetadata.data.planId === plan.id
                      ? 'border-blue-600 border-2'
                      : 'border-gray-500'
                  } h-[80px] w-[100px] grid place-items-center`}
                >
                  <p className="text-sm font-semibold text-center capitalize">{plan.title} plan</p>
                </div>
              ))}
            </div>

            <Button
              disabled={upgradePlanMutation.isPending || !planOverrideMetadata.data.planId || !userToUpdate?.id}
              color="light-blue"
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
              className="capitalize mt-4 flex items-center gap-2 max-w-[120px]"
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
