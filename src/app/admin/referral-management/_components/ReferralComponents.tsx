"use client";
import axiosInstance from "@/services/api-client";
import { useReferralQueries, useReferralMutations } from "@/hooks/api/admin/referral";
import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { List } from "@mui/material";
import Link from "next/link";
import AdminUserReferralTable from "./ReferralTable";
import { GridColDef } from "@mui/x-data-grid-pro";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FiLoader } from "react-icons/fi";
import RestoreFromTrashIcon from '@mui/icons-material/RestoreFromTrash';
import Table from "@/components/newTable/Table";

interface IUserData {
  fullName: string;
  id: string;
  role: string;
  email: string;
}

interface IUser {
  email?: string;
  fullName?: string;
}

const ReferralComponent = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [queryString, setQueryString] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [user, setUser] = useState<IUser>({});
  const [variance, setVariance] = useState("claim");
  const [userIsLoading, setUserIsLoading] = useState(false);
  const [reasonModalVisibility, setReasonModalVisibility] = useState(false);
  const [declinationReason, setDeclinationReason] = useState<string>("");
  const [selectedId, setSelectedId] = useState<string>("");
  const [editMode, setEditMode] = useState<boolean>(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userData, setUserData] = useState<IUserData[]>([]);
  const [paginationData, setPaginationData] = useState({
    page: 0,
    pageSize: 10,
  });
  const [rowCount, setRowCount] = useState(0);
  const [clickedUserRefs, setClickedUserRefs] = useState("");
  const [clickedUserId, setClickedUserId] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<any>(null);
  const [editForm, setEditForm] = useState<{ status: string; paymentStatus: string }>({
    status: "",
    paymentStatus: "",
  });

  const [detailedReferredUsers, setDetailedReferredUsers] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const isDeletedReferral = (entry: any) =>
    Boolean(entry?.archived || entry?.isDeleted || entry?.deletedAt);

  // === Domain Hooks ===
  const { referralsListDomain, referredUsersDetailsDomain } = useReferralQueries({
    fetchReferrals: true,
    fetchReferredUsersDetails: !!clickedUserId,
    variance: variance,
    archived: showDeleted,
    page: paginationData.page + 1,
    pageSize: paginationData.pageSize,
    referrerId: clickedUserId
  });

  const {
    updateReferralStatus,
    updatePaymentStatus,
    approveClaim,
    declineClaim,
    deleteReferral,
    hardDeleteReferral,
    restoreReferral
  } = useReferralMutations();

  useEffect(() => {
    setPaginationData({ page: 0, pageSize: 10 });
    setShowDeleted(false);
  }, [variance]);

  const tableName = `Refferal_${variance}_${showDeleted ? "deleted" : ""}`;

  const handleUpdateReferral = async (payload: {
    email: string;
    id: string;
    status?: string;
    variance?: string;
    paymentStatus?: string;
  }) => {
    try {
      const loadingToast = toast.loading("Loading...");

      if (payload.paymentStatus !== undefined) {
         await updatePaymentStatus.mutateAsync({
           id: payload.id,
           paymentStatus: payload.paymentStatus
         });
      } else {
         await updateReferralStatus.mutateAsync({
           id: payload.id,
           variance: payload.variance,
           status: payload.status,
           referrerEmail: payload.email,
         });
      }

      toast.success(`Referral updated successfully`, { id: loadingToast });
      referralsListDomain.refetch();
    } catch {
      toast.error("Something went wrong");
      // console.log(error);
    }
  };

  const fetchReferredUsersDetails = async (userId: string) => {
    if (!userId) {
      toast.error("Cannot fetch referred users: Missing user ID");
      return;
    }
    setClickedUserId(userId);
  };

  const handleAcceptClaim = async (id: string) => {
    try {
      const loadingToast = toast.loading("Loading...");
      await approveClaim.mutateAsync(id);
      toast.success("Referral Approved successfully", { id: loadingToast });
      referralsListDomain.refetch();
    } catch {
      toast.error("Something went wrong");
      // console.log(error);
    }
  };

  const handleDeclineClaim = async (id: string) => {
    setSelectedId(id);
    setReasonModalVisibility(true);
  };

  // Sync referralsListDomain to users state
  useEffect(() => {
    setUserIsLoading(referralsListDomain.isLoading || referralsListDomain.isFetching);
    
    if (referralsListDomain.data) {
      const responseData = referralsListDomain.data;
      const usersArray = responseData?.users || responseData || [];
      const totalCount = responseData?.total || 0;

      const normalizedUsers = Array.isArray(usersArray)
        ? usersArray.map((u: any) => ({
            ...u,
            id: u.referralId || u.id || u._id,
            // Flatten nested user object (claim view)
            ...(u.user
              ? {
                  userName: `${u.user.firstName || ""} ${u.user.lastName || ""}`.trim(),
                  userEmail: u.user.email || "",
                  userProfileId: u.user.id || "",
                }
              : {}),
          }))
        : [];

      setUsers(normalizedUsers);
      setRowCount(
        typeof totalCount === "number" && totalCount > 0
          ? totalCount
          : normalizedUsers.length
      );
    } else if (referralsListDomain.isError && !referralsListDomain.isLoading) {
      setUsers([]);
      toast.error("Failed to load referrals. Please try again.");
    }
  }, [referralsListDomain.data, referralsListDomain.isError, variance, showDeleted, referralsListDomain.isLoading, referralsListDomain.isFetching]);

  // Sync referredUsersDetailsDomain
  useEffect(() => {
    setLoadingDetails(referredUsersDetailsDomain.isLoading || referredUsersDetailsDomain.isFetching);
    if (referredUsersDetailsDomain.data) {
       const usersData = Array.isArray(referredUsersDetailsDomain.data) ? referredUsersDetailsDomain.data : [];
       setDetailedReferredUsers(usersData);
       if (usersData.length === 0 && clickedUserId) {
         toast.error("No referred users found in database");
       }
    } else if (referredUsersDetailsDomain.isError) {
       setDetailedReferredUsers([]);
       toast.error("Failed to load referred users details");
    }
  }, [referredUsersDetailsDomain.data, referredUsersDetailsDomain.isError, referredUsersDetailsDomain.isLoading, referredUsersDetailsDomain.isFetching, clickedUserId]);

  const handleShowUserRef = (email: string, fullName: string) => {
    setUser({ email, fullName });
    setUserData([]);
    setQueryString("");
  };

  useEffect(() => {
    let timer: any;
    if (queryString) {
      setIsLoading(true);
      timer = setTimeout(() => {
        axiosInstance
          .get(`/api/v1/admin/users?q=${queryString}`)
          .then((res) => {
            const data = res.data.filteredData.map((el: any) => ({
              id: el.id,
              role: el.role,
              fullName: `${el.firstName} ${el.middleName} ${el.lastName}`,
              email: el.email,
            }));
            // console.log({ data });
            setUserData(data);
          })
          .catch(() => { /* error handled silently */ })
          .finally(() => setIsLoading(false));
      }, 1000);
    } else {
      setUserData([]);
      setIsLoading(false);
    }
    return () => clearTimeout(timer);
  }, [queryString]);

  function modifyArray(modifiedArr: GridColDef<any>[]) {
    modifiedArr = modifiedArr.filter(
      (el) =>
        el.field !== "isVerified" &&
        el.field !== "aggregator" &&
        el.field !== "profile" &&
        el.field !== "_id" &&
        el.field !== "middleName" &&
        el.field !== "phoneNumber" &&
        el.field !== "country" &&
        el.field !== "isApplicationStarted" &&
        el.field !== "applicationStatus" &&
        el.field !== "prepSessionStatus" &&
        el.field !== "isEmailVerified" &&
        el.field !== "isDocumentApproved" &&
        el.field !== "isDocumentUploaded" &&
        el.field !== "hasOpenedJobsiteProfile" &&
        el.field !== "isSampleDispatched" &&
        el.field !== "stars" &&
        el.field !== "returnCount" &&
        el.field !== "permissions" &&
        el.field !== "userSessionsMilestones" &&
        el.field !== "isActive" &&
        el.field !== "progress" &&
        el.field !== "promotionalCount" &&
        el.field !== "numberOfFreePromo" &&
        el.field !== "numberOfReferralsBeforePromo" &&
        el.field !== "numberOfFreePromoCount" &&
        el.field !== "note" &&
        el.field !== "nominatedDeveloper" &&
        el.field !== "lastUpdatedBy" &&
        el.field !== "source" &&
        el.field !== "id" &&
        el.field !== "referralId" &&
        el.field !== "referredUserId"
    );

    if (variance == "all") {
      // Flat referral records — hide referrerName (API populates it with referred user's name)
      modifiedArr = modifiedArr.filter((f) => f.field !== "referrerName");

      // Referrer Email
      const referrerEmailField = modifiedArr.find((f) => f.field === "referrerEmail");
      if (referrerEmailField) {
        referrerEmailField.headerName = "Referrer Email";
        referrerEmailField.width = 230;
        referrerEmailField.renderCell = (props) => (
          <div className="text-blue-600 font-medium truncate">{props.row.referrerEmail || "N/A"}</div>
        );
      }

      // Referral Code
      const referralCodeField = modifiedArr.find((f) => f.field === "referralCode");
      if (referralCodeField) {
        referralCodeField.headerName = "Referral Code";
        referralCodeField.width = 220;
        referralCodeField.renderCell = (props) => (
          <div className="text-gray-700 truncate">{props.row.referralCode || "N/A"}</div>
        );
      }

      // Referred Name — link to their profile via referredUserId
      const referredNameField = modifiedArr.find((f) => f.field === "referredName");
      if (referredNameField) {
        referredNameField.headerName = "Referred User";
        referredNameField.width = 180;
        referredNameField.renderCell = (props) => {
          const userId = props.row.referredUserId;
          const name = props.row.referredName || "Unknown";
          return userId ? (
            <Link href={`/admin/users/${userId}`} className="text-blue-600 font-medium hover:underline cursor-pointer">
              {name}
            </Link>
          ) : (
            <div className="text-gray-600">{name}</div>
          );
        };
      }

      // Referred Email
      const referredEmailField = modifiedArr.find((f) => f.field === "referredEmail");
      if (referredEmailField) {
        referredEmailField.headerName = "Referred Email";
        referredEmailField.width = 230;
        referredEmailField.renderCell = (props) => (
          <div className="text-gray-700 truncate">{props.row.referredEmail || "N/A"}</div>
        );
      }

      // Status
      const statusField = modifiedArr.find((f) => f.field === "status");
      if (statusField) {
        statusField.headerName = "Status";
        statusField.width = 120;
        statusField.renderCell = (props) => {
          const status = props.row.status || "CLAIMED";
          const colorClass =
            status === "APPROVED" ? "bg-green-100 text-green-800" :
            status === "CLAIMED"  ? "bg-blue-100 text-blue-800" :
            status === "PENDING"  ? "bg-yellow-100 text-yellow-800" :
            status === "REJECTED" ? "bg-red-100 text-red-800" :
            "bg-gray-100 text-gray-800";
          return (
            <span className={`px-2 py-1 rounded text-xs font-medium ${colorClass}`}>{status}</span>
          );
        };
      }

      // Role
      const roleField = modifiedArr.find((f) => f.field === "role");
      if (roleField) {
        roleField.headerName = "Role";
        roleField.width = 110;
        roleField.renderCell = (props) => (
          <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800 capitalize">
            {props.row.role || "N/A"}
          </span>
        );
      }

      // Is Client
      const isClientField = modifiedArr.find((f) => f.field === "isClient");
      if (isClientField) {
        isClientField.headerName = "Client";
        isClientField.width = 90;
        isClientField.renderCell = (props) => (
          <span className={`px-2 py-1 rounded text-xs font-medium ${props.row.isClient ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
            {props.row.isClient ? "Yes" : "No"}
          </span>
        );
      }

      // Payment Status
      const paymentStatusField = modifiedArr.find((f) => f.field === "paymentStatus");
      if (paymentStatusField) {
        paymentStatusField.headerName = "Payment Status";
        paymentStatusField.width = 140;
        paymentStatusField.renderCell = (props) => {
          const status = (props.row.paymentStatus || "Unpaid").toLowerCase();
          const colorClass =
            status === "paid"    ? "bg-green-100 text-green-800" :
            status === "pending" ? "bg-yellow-100 text-yellow-800" :
            "bg-red-100 text-red-800";
          return (
            <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${colorClass}`}>{status}</span>
          );
        };
      }

      // Amount Owed
      const amountOwedField = modifiedArr.find((f) => f.field === "amountOwed");
      if (amountOwedField) {
        amountOwedField.headerName = "Amount Owed";
        amountOwedField.width = 130;
        amountOwedField.renderCell = (props) => (
          <div className="font-semibold text-green-600">${(props.row.amountOwed || 0).toFixed(2)}</div>
        );
      }

      // Business Name
      const businessNameField = modifiedArr.find((f) => f.field === "businessName");
      if (businessNameField) {
        businessNameField.headerName = "Business Name";
        businessNameField.width = 180;
        businessNameField.renderCell = (props) => (
          <div className="truncate">{props.row.businessName || "—"}</div>
        );
      }

      // Created At
      const createdAtField = modifiedArr.find((f) => f.field === "createdAt");
      if (createdAtField) {
        createdAtField.headerName = "Date";
        createdAtField.width = 120;
        createdAtField.renderCell = (props) => (
          <div className="text-sm text-gray-600">
            {props.row.createdAt ? new Date(props.row.createdAt).toLocaleDateString() : "N/A"}
          </div>
        );
      }

      if (showDeleted) {
        modifiedArr.unshift({
          field: "restore",
          headerName: "Restore",
          width: 100,
          headerClassName: "bg-[#80D7FF]",
          renderCell: (params: any) => (
            <div
              onClick={() => handleRestore(params.row["id"] || params.row["_id"])}
              className="cursor-pointer hover:text-blue-600 transition-colors"
            >
              <RestoreFromTrashIcon />
            </div>
          ),
        });
      }
    }

    if (variance !== "all") {
      // Only hide the raw nested object and its internal helper field
      modifiedArr = modifiedArr.filter(
        (f) => f.field !== "user" && f.field !== "userProfileId"
      );

      // Referrer
      const referrerField = modifiedArr.find((f) => f.field === "referrer");
      if (referrerField) {
        referrerField.headerName = "Referrer";
        referrerField.width = 230;
        referrerField.renderCell = (props) => (
          <div className="text-blue-600 font-medium truncate">{props.row.referrer || "N/A"}</div>
        );
      }

      // User Name (flattened from nested user object)
      const userNameField = modifiedArr.find((f) => f.field === "userName");
      if (userNameField) {
        userNameField.headerName = "User Name";
        userNameField.width = 180;
        userNameField.renderCell = (props) => {
          const profileId = props.row.userId;
          const name = props.row.userName || "Unknown";
          return profileId ? (
            <Link href={`/admin/users/${profileId}`} className="text-blue-600 font-medium hover:underline cursor-pointer">
              {name}
            </Link>
          ) : (
            <div className="text-gray-600">{name}</div>
          );
        };
      }

      // User Email (flattened)
      const userEmailField = modifiedArr.find((f) => f.field === "userEmail");
      if (userEmailField) {
        userEmailField.headerName = "User Email";
        userEmailField.width = 230;
        userEmailField.renderCell = (props) => (
          <div className="text-gray-700 truncate">{props.row.userEmail || "N/A"}</div>
        );
      }

      // User ID
      const userIdField = modifiedArr.find((f) => f.field === "userId");
      if (userIdField) {
        userIdField.headerName = "User ID";
        userIdField.width = 150;
        userIdField.renderCell = (props) => (
          <Link href={`/admin/users/${props.row.userId}`} className="font-mono text-xs text-blue-600 hover:underline truncate">
            {props.row.userId || "N/A"}
          </Link>
        );
      }

      // Status badge
      const statusField = modifiedArr.find((f) => f.field === "status");
      if (statusField) {
        statusField.headerName = "Status";
        statusField.width = 120;
        statusField.renderCell = (props) => {
          const status = props.row.status || "CLAIMED";
          const colorClass =
            status === "APPROVED" ? "bg-green-100 text-green-800" :
            status === "CLAIMED"  ? "bg-blue-100 text-blue-800" :
            status === "PENDING"  ? "bg-yellow-100 text-yellow-800" :
            status === "REJECTED" ? "bg-red-100 text-red-800" :
            "bg-gray-100 text-gray-800";
          return (
            <span className={`px-2 py-1 rounded text-xs font-medium ${colorClass}`}>{status}</span>
          );
        };
      }

      // Payment Status (referralStatus field)
      const referralStatusField = modifiedArr.find((f) => f.field === "referralStatus");
      if (referralStatusField) {
        referralStatusField.headerName = "Payment Status";
        referralStatusField.width = 140;
        referralStatusField.renderCell = (props) => {
          const status = (props.row.referralStatus || "Unpaid").toLowerCase();
          const colorClass =
            status === "paid"    ? "bg-green-100 text-green-800" :
            status === "pending" ? "bg-yellow-100 text-yellow-800" :
            "bg-red-100 text-red-800";
          return (
            <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${colorClass}`}>{status}</span>
          );
        };
      }

      // Is Deleted badge
      const isDeletedField = modifiedArr.find((f) => f.field === "isDeleted");
      if (isDeletedField) {
        isDeletedField.headerName = "Deleted";
        isDeletedField.width = 90;
        isDeletedField.renderCell = (props) => (
          <span className={`px-2 py-1 rounded text-xs font-medium ${props.row.isDeleted ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
            {props.row.isDeleted ? "Yes" : "No"}
          </span>
        );
      }

      // Updated By
      const updatedByField = modifiedArr.find((f) => f.field === "updatedBy");
      if (updatedByField) {
        updatedByField.headerName = "Updated By";
        updatedByField.width = 180;
        updatedByField.renderCell = (props) => (
          <div className="text-gray-600 truncate">{props.row.updatedBy || "—"}</div>
        );
      }

      // Created At
      const createdAtField = modifiedArr.find((f) => f.field === "createdAt");
      if (createdAtField) {
        createdAtField.headerName = "Created";
        createdAtField.width = 120;
        createdAtField.renderCell = (props) => (
          <div className="text-sm text-gray-600">
            {props.row.createdAt ? new Date(props.row.createdAt).toLocaleDateString() : "N/A"}
          </div>
        );
      }

      // Updated At
      const updatedAtField = modifiedArr.find((f) => f.field === "updatedAt");
      if (updatedAtField) {
        updatedAtField.headerName = "Updated";
        updatedAtField.width = 120;
        updatedAtField.renderCell = (props) => (
          <div className="text-sm text-gray-600">
            {props.row.updatedAt ? new Date(props.row.updatedAt).toLocaleDateString() : "N/A"}
          </div>
        );
      }

      if (!showDeleted) {
        modifiedArr.unshift({
          field: "editReferral",
          headerName: "Edit",
          width: 90,
          headerClassName: "bg-[#80D7FF]",
          renderCell: (params: any) => (
            <button
              disabled={!editMode}
              onClick={() => openEditModal(params.row)}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                editMode
                  ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              Edit
            </button>
          ),
        });
      }

      if (showDeleted) {
        modifiedArr.unshift({
          field: "restore",
          headerName: "Restore",
          width: 100,
          headerClassName: "bg-[#80D7FF]",
          renderCell: (params: any) => (
            <div
              onClick={() => handleRestore(params.row["id"] || params.row["_id"])}
              className="cursor-pointer hover:text-blue-600 transition-colors"
            >
              <RestoreFromTrashIcon />
            </div>
          ),
        });
      }

      if (variance === "claim" && !showDeleted) {
        modifiedArr.unshift(
          {
            field: "approveClaim",
            headerName: "Approve Claim",
            width: 150,
            headerClassName: "bg-[#80D7FF]",
            renderCell: (params: any) => {
              const id = params.row["id"] || params.row["_id"];
              return (
                <button
                  onClick={() => handleAcceptClaim(id)}
                  className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded w-full transition-colors"
                >
                  Approve
                </button>
              );
            },
          },
          {
            field: "declineClaim",
            headerName: "Decline Claim",
            width: 150,
            headerClassName: "bg-[#80D7FF]",
            renderCell: (params: any) => (
              <button
                onClick={() => handleDeclineClaim(params.row["id"] || params.row["_id"])}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded w-full transition-colors"
              >
                Decline
              </button>
            ),
          }
        );
      }
    }

      return modifiedArr;
  }

  /*
  const columns = useMemo(() => {
    if (users && users.length > 0) {
      const firstItem = users[0];
      // console.log("First user item:", firstItem);
      const columnDefs = Object.keys(firstItem).map((key) => ({
        field: key,
        headerName: camelCaseToTitleCase(key),
        width: 150,
      }));
      return modifyArray(columnDefs);
    } else {
      return [];
    }
  }, [users, isVarianceAll, variance, showDeleted, clickedUserRefs]);
  */

  const handleSubmit = async (id: string) => {
    try {
      const loadingToast = toast.loading("Loading...");
      await declineClaim.mutateAsync({ id, reason: declinationReason });
      toast.success("Referral Declined successfully", { id: loadingToast });
      setReasonModalVisibility(false);
      setDeclinationReason("");
      referralsListDomain.refetch();
    } catch {
      // Error handled silently
    }
  };

  const openEditModal = (row: any) => {
    setEditingRow(row);
    setEditForm({
      status: row?.status || "PENDING",
      paymentStatus: row?.paymentStatus || "unpaid",
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingRow) return;
    const id = editingRow.id || editingRow._id;
    if (!id) {
      toast.error("Invalid referral row.");
      return;
    }

    const loadingToast = toast.loading("Saving changes...");
    try {
      if (editForm.status) {
        await updateReferralStatus.mutateAsync({
          id,
          variance,
          status: editForm.status,
          referrerEmail: editingRow.referrerEmail || editingRow.email,
        });
      }

      if (editForm.paymentStatus) {
        await updatePaymentStatus.mutateAsync({
          id,
          paymentStatus: editForm.paymentStatus,
        });
      }

      toast.success("Referral updated successfully.", { id: loadingToast });
      setEditModalOpen(false);
      setEditingRow(null);
      referralsListDomain.refetch();
    } catch {
      toast.error("Failed to update referral.", { id: loadingToast });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const loadingToast = toast.loading("Recycling claim..");
      const res = await deleteReferral.mutateAsync({ id, variance });
      toast.success(res.message || "Deleted successfully", { id: loadingToast });
      referralsListDomain.refetch();
    } catch {
      // Error handled silently
    }
  };

  const handleHardDelete = async (id: string) => {
    try {
      const loadingToast = toast.loading("Recycling claim..");
      const res = await hardDeleteReferral.mutateAsync({ id, variance });
      toast.success(res.message || "Deleted successfully", { id: loadingToast });
      referralsListDomain.refetch();
    } catch {
      // Error handled silently
    }
  };

  const handleDeleteMultiple = async (selectedIds: any) => {
    const ids = (Array.isArray(selectedIds) ? selectedIds : []).filter(Boolean);
    if (ids.length === 0) return;

    const loadingToast = toast.loading(
      showDeleted ? "Deleting selected referrals..." : "Moving selected referrals..."
    );

    try {
      if (showDeleted) {
        await Promise.all(
          ids.map((id: string) =>
            hardDeleteReferral.mutateAsync({ id: String(id), variance })
          )
        );
      } else {
        await Promise.all(
          ids.map((id: string) =>
            deleteReferral.mutateAsync({ id: String(id), variance })
          )
        );
      }

      toast.success("Selected referrals updated successfully.", { id: loadingToast });
      referralsListDomain.refetch();
    } catch {
      toast.error("Failed to update selected referrals.", { id: loadingToast });
    }
  };

  const handleSelection = async (_prop: any) => {
    // console.log("Selecting Referrals...", { prop });
  };

  const handleRestore = async (id: string) => {
    try {
      const loadingToast = toast.loading("Restoring claim...");
      await restoreReferral.mutateAsync({ id, variance });
      toast.success("Referral Claim Restored Successfully", {
        id: loadingToast,
      });
      referralsListDomain.refetch();
    } catch {
      toast.error("Something went wrong");
   }
  };


  return (
    <div className="flex flex-col bg-white rounded-sm p-3 sm:p-5 shadow-md">
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="bg-white rounded-lg shadow-md p-4 max-w-md mx-auto">
          <DialogTitle className="text-xl font-bold text-center mb-4">
            Edit Referral
          </DialogTitle>
          <div className="space-y-4">
            <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={editForm.status || "PENDING"}
                  onValueChange={(value) =>
                    setEditForm((prev) => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">PENDING</SelectItem>
                    <SelectItem value="APPROVED">APPROVED</SelectItem>
                    <SelectItem value="REJECTED">REJECTED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Payment Status</label>
              <Select
                value={editForm.paymentStatus || "unpaid"}
                onValueChange={(value) =>
                  setEditForm((prev) => ({ ...prev, paymentStatus: value }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select payment status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unpaid">unpaid</SelectItem>
                  <SelectItem value="pending">pending</SelectItem>
                  <SelectItem value="paid">paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogActions className="flex justify-between mt-5">
            <Button
              variant="outline"
              onClick={() => {
                setEditModalOpen(false);
                setEditingRow(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save</Button>
          </DialogActions>
        </DialogContent>
      </Dialog>

      <Dialog
        open={reasonModalVisibility}
        onOpenChange={setReasonModalVisibility}
      >
        <DialogContent className="bg-white rounded-lg shadow-md p-4 max-w-md mx-auto">
          <DialogTitle className="text-xl font-bold text-center mb-4">
            Reason for Declining Claim
          </DialogTitle>
          <textarea
            className="w-full h-32 border border-gray-300 rounded-md p-2 mb-6 focus:outline-none focus:ring focus:ring-blue-500 focus:ring-opacity-50 resize-none"
            value={declinationReason}
            onChange={(e) => setDeclinationReason(e.target.value)}
          />
          <DialogActions className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => {
                setDeclinationReason("");
                setReasonModalVisibility(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleSubmit(selectedId)}
              disabled={!declinationReason}
            >
              Submit
            </Button>
          </DialogActions>
        </DialogContent>
      </Dialog>

      <div className="w-full flex justify-between items-center">
        <Select
          onValueChange={(value) => {
            setVariance(value);
          }}
          value={variance}
        >
          <SelectTrigger className="w-[180px] bg-white shadow-md">
            <SelectValue
              placeholder={
                variance === "claim" ? "Claim Referrals" : "All Referrals"
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="claim">Claim Referrals</SelectItem>
            <SelectItem value="all">All Referrals</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {userIsLoading && (
        <div className="w-full mt-10 flex justify-center z-[400]">
          <FiLoader className="h-10 w-10 animate-spin text-gray-500" />
        </div>
      )}

      {!userIsLoading && !queryString && !Object.keys(user).length && (
        <div className="">
          <Table
            allowDelete={true}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            data={users}
            setEditMode={setEditMode}
            helpers={{ handleUpdateReferral, variance }}
            modifyArray={modifyArray}
            tableName={tableName}
            editMode={editMode}
            handleDelete={showDeleted ? handleHardDelete : handleDelete}
            handleDeleteMultiple={handleDeleteMultiple}
            handleSelection={handleSelection}
            actions={[
              {
                label: showDeleted ? "Show Active" : "Show Deleted",
                handler: () => setShowDeleted(!showDeleted),
                isChecked: showDeleted,
              },
            ]}
            checkBoxSelection={true}
            paginationData={paginationData}
            rowCount={rowCount}
            setPaginationData={setPaginationData}
          />
        </div>
      )}

      {(queryString || Object.keys(user).length > 0) && (
        <div className="bg-white rounded-lg p-4">
          <div className="mt-5">
            <div className="relative w-[300px] sm:w-[500px]">
              {userData && userData.length > 0 && !isLoading && (
                <div className="h-[200px] text-sm shadow-lg overflow-y-auto w-full absolute z-[300] bg-white">
                  {userData.map((el, index) => (
                    <div key={index} className="w-full">
                      <button
                        onClick={() => handleShowUserRef(el.email, el.fullName)}
                        className="py-2 px-3 hover:bg-blue-gray-100 inline-block w-full text-left"
                      >
                        {el.fullName}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {isLoading && (
                <div className="w-full shadow-lg flex justify-center z-[400]">
                  <div className="h-10 w-10">
                    <FiLoader className="h-full w-full animate-spin text-gray-500" />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5">
              {user.email && (
                <Button
                  onClick={() => setUser({})}
                  className="rounded-lg capitalize bg-blue text-white py-1.5 px-3"
                >
                  Clear Query
                </Button>
              )}

              <div>
                <p className="my-5 text-2xl capitalize font-medium">
                  {user.fullName}
                </p>
                {user.email && <AdminUserReferralTable userData={user} />}
              </div>
            </div>

            <div className="mt-5 text-gray-600">
              {!user.email && <div>Search user to get referral</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReferralComponent;
