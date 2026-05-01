"use client";
import React, { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { useFetchData } from "@/hooks/useApi";
import { useAuthStore } from "@/store/authStore";

export interface IReferralPerson {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  referralStatus: "PENDING" | "APPROVED" | "REJECTED" | "CLAIMED";
  isUserSubscribed?: boolean;
}

export interface IGetReferralsByEmailResponse {
  referrals: IReferralPerson[];
  partnerReferrals: any[] | null;
  totalReferrals: number;
  totalSuccessfulReferrals: number;
  claimReferrals: IReferralPerson[];
  data: IReferralPerson[];
}

// Table Column
const referralTableColumns: GridColDef[] = [
  {
    field: "email",
    headerName: "Email",
    flex: 1,
  },
  {
    field: "referralStatus",
    headerName: "Status",
    flex: 1,
  },
];

const CoachReferrals = () => {
  const user = useAuthStore((state) => state.user);

  /*---- Queries ----*/
  const { data, isLoading } = useFetchData<IGetReferralsByEmailResponse>({
    queryKey: ["coach-referrals", user?.id],
    url: `/api/v1/coach/referrals`,
    method: "GET",
    enabled: !!user?.id,
  });

  const referralsData = data?.data?.data || [];
  const statsCardsData = [
    {
      title: "Approved referrals",
      value:
        referralsData?.filter((ref) => ref.referralStatus === "APPROVED")
          .length || 0,
    },
    {
      title: "Pending referrals",
      value:
        referralsData?.filter((ref) => ref.referralStatus === "PENDING")
          .length || 0,
    },
    {
      title: "Rejected referrals",
      value:
        referralsData?.filter((ref) => ref.referralStatus === "REJECTED")
          .length || 0,
    },
  ];

  return (
    <section>
      <section className="flex flex-col md:flex-row gap-4">
        {isLoading
          ? [1, 2, 3].map((_, i) => (
              <div
                key={i}
                className="w-full md:w-1/3 bg-white rounded-md p-4 shadow-md"
              >
                <Skeleton className="h-[20px] w-[180px] rounded-md mb-4" />
                <Skeleton className="h-[50px] w-[80px] rounded-md" />
              </div>
            ))
          : statsCardsData.map((card, idx) => (
              <div
                key={idx}
                className="w-full md:w-1/3 bg-white rounded-md p-4 shadow-md"
              >
                <p className="text-[12px] sm:text-sm font-medium text-gray-600 mb-5">
                  {card.title}
                </p>
                <h1 className="text-4xl font-bold text-gray-800 mt-auto md:mt-0">
                  {card.value}
                </h1>
              </div>
            ))}
      </section>

      <section>
        <section className="mt-10 bg-white rounded-md p-4">
          <DataGrid
            initialState={{
              pagination: {
                paginationModel: { pageSize: 20 },
              },
            }}
            rows={referralsData}
            getRowId={(row) => row._id}
            disableRowSelectionOnClick
            columns={referralTableColumns}
            loading={isLoading}
            pageSizeOptions={[20, 50, 100]}
            sx={{
              border: "none",
              "& .MuiDataGrid-cell": {
                borderBottom: "1px solid #f0f0f0",
              },
              "& .MuiDataGrid-columnHeaders": {
                backgroundColor: "#f5f5f5",
                borderBottom: "2px solid #e0e0e0",
              },
            }}
          />
        </section>
      </section>
    </section>
  );
};

export default CoachReferrals;
