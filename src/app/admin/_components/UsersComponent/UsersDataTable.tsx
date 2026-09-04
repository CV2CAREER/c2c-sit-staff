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
  GridRowSelectionModel,
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
import { useGetAllUsers, useBulkSoftDeleteUsers, useBulkPurgeUsers } from "@/app/admin/users/hooks/users-all";
import {
  UserFilterState,
  PERSONA_OPTIONS,
  STATE_OPTIONS,
  GROUP_OPTIONS,
  LOYALTY_OPTIONS,
  personaForUser,
  stateForUser,
  groupForUser,
  loyaltyForUser,
  matchesFacets,
} from "@/app/admin/users/hooks/user-filters";
import { moveTo, StyledDataGridPro, usersGridSx } from "@/utils/table";
// import { applyDateSort } from "@/utils/dateSort";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FaSearch } from "react-icons/fa";
import { CvDataPointsManager } from "./CvDataPoints/CvDataPointsManager";
import DispatchClient from "@/components/modals/DispatchClient";
import ChangePlanModal from "@/components/modals/ChangePlanModal";
import { Combobox } from "@/components/ui/combobox";
import LoadingSpinner from "@/components/reusable/LoadingSpinner";
import toast from "react-hot-toast";
import CustomModal from "@/components/CustomModal/CustomModal";
import { IDateFilter } from "@/types/common";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { PencilLine, Users2, Archive, Database, SendHorizontal, X, Trash2, MoreHorizontal } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";



// Label lookups for the active-filter chips and summary panel — mirrors the
// sidebar's own option labels exactly (imported from the same source of
// truth) so the chips above the table always agree with what's highlighted
// in the sidebar.
const personaLabel = (key: string): string => PERSONA_OPTIONS.find((o) => o.key === key)?.label ?? key;
const stateLabel = (key: string): string => STATE_OPTIONS.find((o) => o.key === key)?.label ?? key;
const groupLabel = (key: string): string => GROUP_OPTIONS.find((o) => o.key === key)?.label ?? key;
const loyaltyLabel = (key: string): string => LOYALTY_OPTIONS.find((o) => o.key === key)?.label ?? key;

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
  filters: UserFilterState;
  setFilters: (filters: UserFilterState) => void;
  tableRef: any
  dateFilterData: IDateFilter;
  setDateFilterData: React.Dispatch<React.SetStateAction<IDateFilter>>;
}

const UsersDataTable: React.FC<UsersDataTableProps> = ({filters, setFilters, tableRef, dateFilterData, setDateFilterData, route = "admin"}) => {
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
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>({
    type: "include",
    ids: new Set(),
  });
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState<boolean>(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState<boolean>(false);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState<boolean>(false);
  const [isChangePlanModalOpen, setIsChangePlanModalOpen] = useState<boolean>(false);
  const [changePlanUser, setChangePlanUser] = useState<any | null>(null);
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

  // Fetches the full active-or-recycled set once; search/role/plan/date are
  // applied client-side below (see filteredRows) so those filters are
  // instant instead of round-tripping to the backend on every change.
  const allUsers = useGetAllUsers({
    enabled: true,
    active: usersDataState === "active" ? true : undefined,
    recycle: usersDataState === "recycle" ? true : undefined,
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

  const bulkSoftDeleteUsers = useBulkSoftDeleteUsers();
  const bulkPurgeUsers = useBulkPurgeUsers();

  const selectedIds = React.useMemo(
    () => Array.from(rowSelectionModel.ids),
    [rowSelectionModel],
  );

  const clearSelection = () => setRowSelectionModel({ type: "include", ids: new Set() });

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkDeleting(true);
    const mutation = usersDataState === "active" ? bulkSoftDeleteUsers : bulkPurgeUsers;

    try {
      const result = await mutation.mutateAsync({ userIds: selectedIds.map(String) });
      const { deletedCount, failedCount } = result.data;

      if (deletedCount > 0) {
        toast.success(
          usersDataState === "active"
            ? `${deletedCount} user(s) moved to recycle bin`
            : `${deletedCount} user(s) permanently deleted`,
        );
      }
      if (failedCount > 0) {
        toast.error(`Failed to delete ${failedCount} user(s)`);
      }
    } catch {
      toast.error("Failed to delete users");
    }

    queryClient.invalidateQueries({ queryKey: ["users-all"] });
    clearSelection();
    setIsBulkDeleting(false);
    setIsBulkDeleteDialogOpen(false);
  };

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

  // Client-side facet/date filtering, run in-browser over the already
  // fetched active-or-recycled set so it's instant. Facet matching
  // (persona/state/group/loyalty) lives in user-filters.ts, shared with the
  // sidebar so a pill's count and what actually gets filtered can't drift apart.
  const filteredRows: GridRowsProp<UsersTableColType> = React.useMemo(() => {
    const startTime = dateFilterData.startDate ? new Date(dateFilterData.startDate).getTime() : undefined;
    const endTime = dateFilterData.endDate ? new Date(dateFilterData.endDate).getTime() : undefined;

    return rows.filter((user: any) => {
      if (!matchesFacets(user, filters)) return false;
      if (startTime !== undefined || endTime !== undefined) {
        const created = user.createdAt ? new Date(user.createdAt).getTime() : NaN;
        if (Number.isNaN(created)) return false;
        if (startTime !== undefined && created < startTime) return false;
        if (endTime !== undefined && created > endTime) return false;
      }
      return true;
    });
  }, [rows, filters, dateFilterData.startDate, dateFilterData.endDate]);

  useEffect(() => {
    if (!selectedUser) {
      setTableData(filteredRows);
    }
  }, [filteredRows, selectedUser]);

  // Summary panel stats — headline count is the fully filtered set (facets +
  // search + date), "of X users" is the base active-or-recycled population
  // before any of that. Active/Staff/Newcomers and the persona breakdown bar
  // describe the currently filtered set, same as the reference design.
  const summary = React.useMemo(() => {
    const total = rows.length;
    const count = filteredRows.length;
    const activeCount = filteredRows.filter((u: any) => stateForUser(u) === "active").length;
    const staffCount = filteredRows.filter((u: any) => groupForUser(u) === "staff").length;
    const newcomerCount = filteredRows.filter((u: any) => loyaltyForUser(u) === "newcomer").length;

    const personaBreakdown = PERSONA_OPTIONS.map((opt) => ({
      ...opt,
      count: filteredRows.filter((u: any) => personaForUser(u) === opt.key).length,
    })).filter((p) => p.count > 0);

    const titleParts = [
      filters.persona ? personaLabel(filters.persona) : null,
      filters.state ? stateLabel(filters.state) : null,
    ].filter(Boolean) as string[];

    return {
      total,
      count,
      basePct: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
      activePct: count > 0 ? Math.round((activeCount / count) * 100) : 0,
      staffCount,
      newcomerCount,
      personaBreakdown,
      title: titleParts.length ? titleParts.join(" · ") : "All Users",
    };
  }, [rows, filteredRows, filters.persona, filters.state]);

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
                rowHeight={46}
                columnHeaderHeight={44}
                rowReordering
                disableRowSelectionOnClick
                onRowClick={handleRowClick}
                rowSelectionModel={rowSelectionModel}
                onRowSelectionModelChange={setRowSelectionModel}
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
                    (user: any) => {
                      setChangePlanUser(user);
                      setIsChangePlanModalOpen(true);
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
                sx={usersGridSx}
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

  // Users with a real name sort alphabetically first; anyone with no
  // first/middle/last name at all (falls back to email, or "Unnamed User")
  // is pushed to the end instead of being interleaved by that fallback text.
  const clientOptions = React.useMemo(() => {
    const named: { value: string; label: string }[] = [];
    const unnamed: { value: string; label: string }[] = [];
    rows.forEach((user: any) => {
      const fullName = [user.firstName, user.middleName, user.lastName].filter(Boolean).join(" ").trim();
      const entry = { value: user.id, label: fullName || user.email || "Unnamed User" };
      (fullName ? named : unnamed).push(entry);
    });
    named.sort((a, b) => a.label.localeCompare(b.label));
    unnamed.sort((a, b) => a.label.localeCompare(b.label));
    return [...named, ...unnamed];
  }, [rows]);

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
        <CardContent className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                {summary.title}
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <h2 className="text-4xl font-semibold text-gray-900">{summary.count.toLocaleString()}</h2>
                <span className="text-xs text-gray-500">
                  of {summary.total.toLocaleString()} users · {summary.basePct}% of base
                </span>
              </div>
            </div>
            <div className="flex gap-6 text-right">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Active</p>
                <p className="mt-1 text-xl font-semibold text-gray-900">{summary.activePct}%</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Staff</p>
                <p className="mt-1 text-xl font-semibold text-gray-900">{summary.staffCount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Newcomers</p>
                <p className="mt-1 text-xl font-semibold text-gray-900">{summary.newcomerCount.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {summary.personaBreakdown.length > 0 && (
            <>
              <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-gray-100">
                {summary.personaBreakdown.map((p) => (
                  <div
                    key={p.key}
                    className="h-full"
                    style={{ width: `${(p.count / summary.count) * 100}%`, background: p.color }}
                  />
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {summary.personaBreakdown.map((p) => (
                  <span key={p.key} className="flex items-center text-[11.5px] text-gray-600">
                    <span
                      className="mr-1.5 inline-block h-2 w-2 rounded-full"
                      style={{ background: p.color }}
                    />
                    {p.label} {p.count.toLocaleString()}
                  </span>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {(filters.persona || filters.state || filters.group || filters.loyalty) && (
        <div className="flex flex-wrap items-center gap-2 px-1">
          <span className="text-xs font-semibold text-gray-500">Active filters</span>
          {filters.persona && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-900 px-2.5 py-1 text-xs font-semibold text-white">
              Persona: {personaLabel(filters.persona)}
              <button
                type="button"
                onClick={() => setFilters({ ...filters, persona: null })}
                className="text-white/60 hover:text-white"
              >
                <X size={12} />
              </button>
            </span>
          )}
          {filters.state && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-900 px-2.5 py-1 text-xs font-semibold text-white">
              State: {stateLabel(filters.state)}
              <button
                type="button"
                onClick={() => setFilters({ ...filters, state: null })}
                className="text-white/60 hover:text-white"
              >
                <X size={12} />
              </button>
            </span>
          )}
          {filters.group && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-900 px-2.5 py-1 text-xs font-semibold text-white">
              Group: {groupLabel(filters.group)}
              <button
                type="button"
                onClick={() => setFilters({ ...filters, group: null })}
                className="text-white/60 hover:text-white"
              >
                <X size={12} />
              </button>
            </span>
          )}
          {filters.loyalty && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-900 px-2.5 py-1 text-xs font-semibold text-white">
              Loyalty: {loyaltyLabel(filters.loyalty)}
              <button
                type="button"
                onClick={() => setFilters({ ...filters, loyalty: null })}
                className="text-white/60 hover:text-white"
              >
                <X size={12} />
              </button>
            </span>
          )}
        </div>
      )}

      <Card className="rounded-xl border-primary/15 shadow-[0_1px_10px_rgba(0,142,211,0.10)]">
        <CardHeader className="flex-col gap-4 border-b border-gray-100 p-4 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg font-bold text-gray-900">{renderTitle()}</CardTitle>
            {tableName === "USERS" && (
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                {tableData.length} records
              </span>
            )}
          </div>

          {tableName === "USERS" && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-full sm:w-56">
                <Combobox
                  list={clientOptions}
                  placeholder="Client Name"
                  selectedItem={selectedUser}
                  setSelectedItem={setSelectedUser}
                  noItemsMessage="No client found"
                  btnTriggerStyles="w-full justify-between"
                />
              </div>

              <label className="flex shrink-0 cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-xl border border-gray-100 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-primary/30 hover:bg-primary/5">
                <Checkbox
                  checked={editMode}
                  onClick={() =>
                    setEditMode((prev) => {
                      if (prev) clearSelection();
                      return !prev;
                    })
                  }
                />
                <PencilLine size={16} className="text-primary" />
                Allow Editing
              </label>

              <Tabs
                className="w-fit shrink-0"
                value={usersDataState}
                onValueChange={(value) => {
                  const nextState = value === "active" ? "active" : "recycle";
                  setUsersDataState(nextState);
                  clearSelection();
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

              {route === "admin" && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="shrink-0 border-gray-100">
                      <MoreHorizontal size={16} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setTableName("CVDATAPOINTS")}>
                      <Database size={16} /> View CV Data Points
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsDispatchModalOpen(true)}>
                      <SendHorizontal size={16} /> Send Client info to PC
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}

          {tableName === "USERS" && editMode && selectedIds.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-gray-500">
                {selectedIds.length} selected
              </span>
              <Button
                variant="outline"
                className="gap-2 border-red-200 text-red-600 transition-colors hover:border-red-400 hover:bg-red-50 hover:text-red-600"
                onClick={() => setIsBulkDeleteDialogOpen(true)}
              >
                <Trash2 size={16} />
                {usersDataState === "active"
                  ? `Move to Recycle (${selectedIds.length})`
                  : `Delete Permanently (${selectedIds.length})`}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-4">
          {renderTable()}
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
              {usersDataState === "active"
                ? `${selectedIds.length} user(s) will be moved to the Recycle bin.`
                : `${selectedIds.length} user(s) will be deleted permanently from our server! This action cannot be undone.`}
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
                : usersDataState === "active"
                  ? "Confirm"
                  : "Permanently Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DispatchClient
        visibility={isDispatchModalOpen}
        togggleVisibility={setIsDispatchModalOpen}
      />

      <ChangePlanModal
        visibility={isChangePlanModalOpen}
        toggleVisibility={(open) => {
          setIsChangePlanModalOpen(open);
          if (!open) setChangePlanUser(null);
        }}
        user={changePlanUser}
        planOptions={orderedPlans.map((p: any) => ({ id: p.id, title: p.title }))}
        onSuccess={() => {
          allUsers.refetch();
          queryClient.invalidateQueries({ queryKey: ["admin-user-plan-summary"] });
        }}
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
