"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";

import AuditTrailHeader from "./_components/AuditTrailHeader";
import AuditTrailTable from "./_components/AuditTrailTable";
import AuthorizationModal from "./_components/AuthorizationModal";
import LoadingSpinner from "./_components/LoadingSpinner";

import {
  fetchAuditTrails,
  fetchStaffUsers,
  sendNotification,
  AdminUser,
} from "./_utils/api";
import { toURLParams } from "@/utils/table";
import { PaginationData } from "./_components/types";

const queryClient = new QueryClient();

const initialPagination: PaginationData = {
  page: 0,
  pageSize: 100,
  search: "",
};

const AuditTrailPageContent = () => {
  const searchParams = useSearchParams();
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [selectedUserEmail, setSelectedUserEmail] = useState<string>("");
  const [editMode, setEditMode] = useState(false);
  const scrollPositionRef = useRef<number | null>(null);
  const [showAuthorizationPrompt, setShowAuthorizationPrompt] =
    useState<boolean>(true);

  const initialSearchQuery = searchParams?.get("query") || "";
  const [paginationData, setPaginationData] = useState<PaginationData>(
    {
      ...initialPagination,
      search: initialSearchQuery,
    },
  );

  const auditTrailQueryString = useMemo(() => {
    const queryObject = {
      ...paginationData,
      page: paginationData.page + 1,
      search: selectedUserEmail || paginationData.search,
    };

    return toURLParams(queryObject);
  }, [paginationData, selectedUserEmail]);

  const { data: staffUsers, isLoading: isLoadingStaffUsers } = useQuery<
    AdminUser[] | undefined
  >({
    queryKey: ["staffUsers"],
    queryFn: fetchStaffUsers,
    staleTime: 1000 * 60 * 5,
    enabled: !showAuthorizationPrompt,
  });

  const handleSelectedUserChange = (user: AdminUser | null) => {
    setSelectedUser(user);
    setSelectedUserEmail(user?.email || "");
    setPaginationData((prev) => ({
      ...prev,
      page: 0,
    }));
  };

  const {
    data: auditTrailsResponse,
    isLoading: isLoadingAuditTrails,
    isFetching: isFetchingAuditTrails,
    isError: isErrorAuditTrails,
    error: auditTrailsError,
  } = useQuery({
    queryKey: ["auditTrails", auditTrailQueryString],
    queryFn: () => fetchAuditTrails(auditTrailQueryString),
    enabled: !showAuthorizationPrompt,
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 60 * 15,
    gcTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const auditTrailsData = useMemo(() => {
    return auditTrailsResponse?.data || [];
  }, [auditTrailsResponse]);

  const totalTrailsCount = useMemo(() => {
    return auditTrailsResponse?.pagination?.totalTrails || 0;
  }, [auditTrailsResponse]);

  const handleScrollRestore = () => {
    if (!showAuthorizationPrompt && scrollPositionRef.current !== null) {
      window.scrollTo({
        top: scrollPositionRef.current,
        behavior: "auto",
      });
    }
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScrollRestore, { passive: true });
    return () => window.removeEventListener("scroll", handleScrollRestore);
  }, [showAuthorizationPrompt]);

  useEffect(() => {
    sendNotification();
  }, [auditTrailsData]);

  const handleAuthorizationSuccess = () => {
    setShowAuthorizationPrompt(false);
    queryClient.invalidateQueries({ queryKey: ["staffUsers"] });
    queryClient.invalidateQueries({ queryKey: ["auditTrails"] });
  };

  const handleSetPassKeySuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["auditTrails"] });
  };

  return (
    <>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: "none",
        }}
      >
        <AuthorizationModal
          visibility={showAuthorizationPrompt}
          onAuthorizationSuccess={handleAuthorizationSuccess}
        />
      </div>

      {!showAuthorizationPrompt && (
        <>
          <AuditTrailHeader
            staffUsers={staffUsers as AdminUser[]}
            selectedUser={selectedUser}
            setSelectedUser={handleSelectedUserChange}
            onSetPassKeySuccess={handleSetPassKeySuccess}
            isLoading={isLoadingStaffUsers}
          />

          {selectedUser?.id && (
            <div className="mb-4 text-sm text-gray-700">
              Showing logs for: <strong>{selectedUser.Full_Name || `${selectedUser.firstName ?? ""} ${selectedUser.lastName ?? ""}`}</strong>
            </div>
          )}

          {isLoadingAuditTrails || isFetchingAuditTrails ? (
            <LoadingSpinner text="Loading Audit Trails..." />
          ) : isErrorAuditTrails ? (
            <div className="flex items-center justify-center h-[20vh] text-red-600">
              Error: {auditTrailsError?.message || "Could not load audit trails."}
            </div>
          ) : (
            <AuditTrailTable
              auditTrailsData={auditTrailsData}
              totalCount={totalTrailsCount}
              paginationData={paginationData}
              setPaginationData={setPaginationData}
              editMode={editMode}
            />
          )}
        </>
      )}
    </>
  );
};

const AuditTrailPage = () => (
  <QueryClientProvider client={queryClient}>
    <AuditTrailPageContent />
  </QueryClientProvider>
);

export default AuditTrailPage;
