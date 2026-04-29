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
  const [isVarianceAll, setIsVarianceAll] = useState<boolean>(false);
  const [clickedUserRefs, setClickedUserRefs] = useState("");
  const [clickedUserId, setClickedUserId] = useState("");

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
        ? usersArray.filter((u: any) => u.details !== null)
        : [];

      const filteredByDeletedState = normalizedUsers.filter((u: any) =>
        showDeleted ? isDeletedReferral(u) : !isDeletedReferral(u)
      );

      setIsVarianceAll(variance === "all");
      setUsers(filteredByDeletedState);
      setRowCount(
        typeof totalCount === "number" && filteredByDeletedState.length > 0
          ? totalCount
          : filteredByDeletedState.length
      );
    }
  }, [referralsListDomain.data, variance, showDeleted, referralsListDomain.isLoading, referralsListDomain.isFetching]);

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

  useEffect(() => {
    // console.log("isvarianceAll", isVarianceAll);
  }, [isVarianceAll]);

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
        el.field !== "createdAt" &&
        el.field !== "isActive" &&
        el.field !== "progress" &&
        el.field !== "promotionalCount" &&
        el.field !== "numberOfFreePromo" &&
        el.field !== "numberOfReferralsBeforePromo" &&
        el.field !== "numberOfFreePromoCount" &&
        el.field !== "status" &&
        el.field !== "note" &&
        el.field !== "nominatedDeveloper" &&
        el.field !== "lastUpdatedBy" &&
        el.field !== "source"
    );

    if (variance == "all" && isVarianceAll) {

      // Referrer Name field
      const referrerField = modifiedArr.find(
        (field) => field.field === "referrerName"
      );
      if (referrerField) {
        referrerField.headerName = "Referrer Name";
        referrerField.width = 200;
        referrerField.renderCell = (props) => {
          const name = props.row.referrerName;
          const isEmail = name && name.includes('@');

          // ✅ FIX: Handle both string IDs and populated objects
          let linkId = null;
          if (props.row.userId) {
            // If userId is an object (populated), get its _id
            linkId = typeof props.row.userId === 'object'
              ? props.row.userId._id || props.row.userId.id
              : props.row.userId;
          }

          // Fallback to _id if userId doesn't exist
          if (!linkId) {
            linkId = props.row.id;
          }

          /*
          console.log("Referrer link debug:", {
            name,
            linkId,
            rawUserId: props.row.userId,
            rowId: props.row.id
          });
          */

          // ✅ Create link if we have a valid linkId
          if (linkId) {
            return (
              <Link
                href={`/admin/users/${linkId}`}
                className="text-blue-600 font-medium hover:underline cursor-pointer"
              >
                {isEmail ? "Unknown User" : name || "N/A"}
              </Link>
            );
          } else {
            // If no userId, display as plain text
            return (
              <div className="text-gray-600">
                {isEmail ? "Unknown User" : name || "N/A"}
              </div>
            );
          }
        };
      }

      // 3. ✅ UPDATED: Referral Code field (was Referrer Email)
      const referralCodeField = modifiedArr.find(
        (field) => field.field === "referralCode"
      );
      if (referralCodeField) {
        referralCodeField.headerName = "Referral Code";
        referralCodeField.width = 200;
        referralCodeField.renderCell = (props) => {
          return (
            <div className="text-blue-600 font-medium cursor-pointer">
              {props.row.referralCode || "N/A"}
            </div>
          );
        };
      }

      const userIdField = modifiedArr.find(
        (field) => field.field === "userId"
      );
      if (userIdField) {
        userIdField.headerName = "User ID";
        userIdField.width = 200;
        userIdField.renderCell = (props) => {
          let userId = props.row.userId;

          // Handle both string IDs and populated objects
          if (typeof userId === 'object' && userId !== null) {
            userId = userId._id || userId.id;
          }

          return (
            <div className="font-mono text-sm text-gray-700">
              {userId || "N/A"}
            </div>
          );
        };
      }

      // ✅ NEW: Business Name field
      const businessNameField = modifiedArr.find(
        (field) => field.field === "businessName"
      );
      if (businessNameField) {
        businessNameField.headerName = "Business Name";
        businessNameField.width = 200;
        businessNameField.renderCell = (props) => {
          return (
            <div className="truncate">
              {props.row.businessName || "N/A"}
            </div>
          );
        };
      }

      // 4. ✅ NEW: Referrer Email field
      const referrerEmailField = modifiedArr.find(
        (field) => field.field === "referrerEmail"
      );
      if (referrerEmailField) {
        referrerEmailField.headerName = "Referrer Email";
        referrerEmailField.width = 250;
        referrerEmailField.renderCell = (props) => {
          const email = props.row.referrerEmail;

          // Only display if it's actually an email (contains @)
          if (!email || !email.includes('@')) {
            return <div className="text-gray-400 text-center">-</div>;
          }

          return (
            <div className="text-blue-600 font-medium">
              {email}
            </div>
          );
        };
      }

      // ✅ NEW: Payment Status field
      const paymentStatusField = modifiedArr.find(
        (field) => field.field === "paymentStatus"
      );
      if (paymentStatusField) {
        paymentStatusField.headerName = "Payment Status";
        paymentStatusField.width = 150;
        paymentStatusField.renderCell = (props) => {
          const status = props.row.paymentStatus || "unpaid";
          const colorClass =
            status === "paid" ? "bg-green-100 text-green-800" :
              status === "pending" ? "bg-yellow-100 text-yellow-800" :
                "bg-red-100 text-red-800";

          return (
            <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${colorClass}`}>
              {status}
            </span>
          );
        };
      }

      // Referral Count field
      const countField = modifiedArr.find((field) => field.field === "count");
      if (countField) {
        countField.headerName = "Referral Count";
        countField.width = 120;
        countField.renderCell = (props) => {
          return (
            <div className="font-semibold text-center w-full text-blue-600">
              {props.row.count || 0}
            </div>
          );
        };
      }

      // ✅ UPDATED: Total Amount Owed field (changed header name)
      const amountField = modifiedArr.find(
        (field) => field.field === "totalAmountOwed"
      );
      if (amountField) {
        amountField.headerName = "Total Amount Owed"; // ✅ Changed from "Amount Owed"
        amountField.width = 150;
        amountField.renderCell = (props) => {
          const amount = props.row.totalAmountOwed || 0;
          return (
            <div className="font-semibold text-green-600">
              ${amount.toFixed(2)}
            </div>
          );
        };
      }

      // Type field
      const typeField = modifiedArr.find((field) => field.field === "type");
      if (typeField) {
        typeField.headerName = "Referral Type";
        typeField.width = 150;
        typeField.renderCell = (props) => {
          const type = props.row.type;

          // Map the type to display labels
          const typeLabels: Record<string, string> = {
            PARTNER_REFERRAL: "Partner",
            SALES_REFERRAL: "Sales Consultant",
            CLAIM_REFERRAL: "Claim",
            REGULAR_REFERRAL: "User",
            USER_REFERRAL: "User",
          };

          const displayType = typeLabels[type] || type || "N/A";

          return (
            <span className={`px-2 py-1 rounded text-xs font-medium ${displayType === 'Partner' ? 'bg-purple-100 text-purple-800' :
                displayType === 'Sales Consultant' ? 'bg-blue-100 text-blue-800' :
                  displayType === 'Claim' ? 'bg-orange-100 text-orange-800' :
                    displayType === 'User' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
              }`}>
              {displayType}
            </span>
          );
        };
      }

      // Status field
      const statusField = modifiedArr.find((field) => field.field === "status");
      if (statusField) {
        statusField.headerName = "Status";
        statusField.width = 130;
        statusField.renderCell = (props) => {
          const status = props.row.status || "AGGREGATED";
          const colorClass =
            status === "APPROVED" ? "bg-green-100 text-green-800" :
              status === "PENDING" ? "bg-yellow-100 text-yellow-800" :
                status === "REJECTED" ? "bg-red-100 text-red-800" :
                  "bg-blue-100 text-blue-800";

          return (
            <span className={`px-2 py-1 rounded text-xs font-medium ${colorClass}`}>
              {status}
            </span>
          );
        };
      }

      // Referred Users field
      const usersReferred = modifiedArr.find(
        (field) => field.field === "usersReferred" || field.field === "referredUsers"
      );

      if (usersReferred) {
        usersReferred.field = "referredUsers";
        usersReferred.headerName = "Referred Users";
        usersReferred.width = 200;
        usersReferred.renderCell = (props) => {
          const referredUsers = props.row.referredUsers || [];
          const userId = props.row.userId;

          return (
            <>
              <div
                onClick={() => {
                  if (clickedUserRefs === props.row.id) {
                    setClickedUserRefs("");
                    setDetailedReferredUsers([]);
                  } else {
                    setClickedUserRefs(props.row.id);
                    // Fetch detailed information when modal opens
                    if (userId) {
                      fetchReferredUsersDetails(userId);
                    }
                  }
                }}
                className="cursor-pointer text-blue-600 hover:underline font-medium"
              >
                {Array.isArray(referredUsers) && referredUsers.length > 0
                  ? `${referredUsers.length} user${referredUsers.length > 1 ? 's' : ''}`
                  : "No users"}
              </div>

              <Dialog
                open={clickedUserRefs === props.row.id}
                onOpenChange={(open: boolean) => {
                  if (!open) {
                    setClickedUserRefs("");
                    setDetailedReferredUsers([]);
                  }
                }}
              >
                <DialogContent className="max-w-3xl max-h-[80vh]">
                  <DialogTitle className="text-lg font-semibold border-b pb-3">
                    Referred Users - {props.row.referrerName}
                  </DialogTitle>

                  {loadingDetails ? (
                    <div className="flex justify-center items-center py-10">
                      <FiLoader className="animate-spin h-8 w-8 text-blue-600" />
                    </div>
                  ) : (
                    <List
                      sx={{
                        maxHeight: "500px",
                        overflowY: "auto",
                      }}
                    >
                      {detailedReferredUsers.length > 0 ? (
                        detailedReferredUsers.map((user: any, i: number) => (
                          <div
                            key={i}
                            className="p-4 border-b hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="font-semibold text-base text-gray-900">
                                  {user.fullName}
                                </div>
                                <div className="text-sm text-gray-600 mt-1">
                                  {user.email}
                                </div>
                                <div className="flex gap-2 mt-2">
                                  {/* Referral Type Badge */}
                                  <span className={`inline-block px-2 py-1 text-xs rounded font-medium ${user.referralType === 'PARTNER_REFERRAL' ? 'bg-purple-100 text-purple-800' :
                                    user.referralType === 'SALES_REFERRAL' ? 'bg-indigo-100 text-indigo-800' :
                                      user.referralType === 'CLAIM_REFERRAL' ? 'bg-blue-100 text-blue-800' :
                                        user.referralType === 'REGULAR_REFERRAL' ? 'bg-teal-100 text-teal-800' :
                                          'bg-green-100 text-green-800'
                                    }`}>
                                    {user.referralType.replace('_', ' ')}
                                  </span>

                                  {/* Status Badge */}
                                  <span className={`inline-block px-2 py-1 text-xs rounded font-medium ${user.referralStatus === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                    user.referralStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                      user.referralStatus === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                        'bg-gray-100 text-gray-800'
                                    }`}>
                                    {user.referralStatus}
                                  </span>

                                  {/* Role Badge */}
                                  {user.role && (
                                    <span className="inline-block px-2 py-1 text-xs rounded font-medium bg-gray-100 text-gray-800 capitalize">
                                      {user.role}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* User Link */}
                              {user.id && (
                                <Link
                                  href={`/admin/users/${user.id}`}
                                  className="ml-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
                                >
                                  View Profile →
                                </Link>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-10 text-gray-500">
                          No referred users found
                        </div>
                      )}
                    </List>
                  )}
                </DialogContent>
              </Dialog>
            </>
          );
        };
      }

      // 🚫 ONLY SHOW DELETE/RESTORE/APPROVE ACTIONS FOR NON-AGGREGATED VIEWS
    }

    if (variance !== "all") {
        // Restore button for deleted items
        if (showDeleted) {
          modifiedArr.unshift({
            field: "restore",
            headerName: "Restore",
            width: 100,
            headerClassName: "bg-[#80D7FF]",
            renderCell: (params: any) => {
              return (
                <div
                  onClick={() => {
                    handleRestore(params.row["id"] || params.row["_id"]);
                  }}
                  className="cursor-pointer hover:text-blue-600 transition-colors"
                >
                  <RestoreFromTrashIcon />
                </div>
              );
            },
          });
        }

        // Approve/Decline buttons for claim referrals
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
              renderCell: (params: any) => {
                return (
                  <button
                    onClick={() =>
                      handleDeclineClaim(params.row["id"] || params.row["_id"])
                    }
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded w-full transition-colors"
                  >
                    Decline
                  </button>
                );
              },
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

  const handleDelete = async (id: string) => {
    // Safety check for aggregated view
    if (variance === "all") {
      toast.error("Delete not available in aggregated view. Switch to individual tabs.");
      return;
    }

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
    if (variance === "all") {
      toast.error("Bulk delete is unavailable in aggregated view.");
      return;
    }

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
            allowDelete={variance !== "all"} // Disable delete for aggregated view
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            data={users}
            setEditMode={setEditMode}
            helpers={{ handleUpdateReferral, variance }}
            modifyArray={modifyArray}
            tableName={tableName}
            editMode={editMode}
            handleDelete={variance !== "all" ? (showDeleted ? handleHardDelete : handleDelete) : undefined} // Only pass handler for non-aggregated
            handleDeleteMultiple={handleDeleteMultiple}
            handleSelection={handleSelection}
            actions={[
              {
                label: showDeleted ? "Show Active" : "Show Deleted",
                handler: () => {
                  setShowDeleted(!showDeleted);
                },
                isChecked: showDeleted,
              },
            ]}
            checkBoxSelection={variance !== "all"}
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
