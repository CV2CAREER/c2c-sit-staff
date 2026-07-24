"use client";
import React from "react";
import DashboardSkeleton from "@/components/reusable/DashboardLoadingSkeleton";
import { useAdminQueries } from "@/hooks/api/admin.api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";

const DashboardCardsApplication: React.FC = () => {
  const {
    totalApplicationsCard,
    successfulApplicationsCard,
    failedApplicationsCard,
    applicationsCountDomain
  } = useAdminQueries({
    fetchApplicationsCount: true,
  });

  const isLoading = applicationsCountDomain.isLoading;

  const dashboardData = [
    {
      title: totalApplicationsCard.title,
      data: totalApplicationsCard.data,
    },
    {
      title: successfulApplicationsCard.title,
      data: successfulApplicationsCard.data,
    },
    {
      title: failedApplicationsCard.title,
      data: failedApplicationsCard.data,
    }
  ];

  return (
    <Card className="rounded-xl border-primary/15 shadow-[0_1px_10px_rgba(0,142,211,0.10)]">
      <CardHeader className="border-b border-gray-100 p-4">
        <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ClipboardList size={18} />
          </span>
          Applications Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3 p-4 md:grid-cols-3">
        {
          isLoading
            ? [1, 2, 3].map((index) => (
                <DashboardSkeleton key={index} />
              ))
            : dashboardData.map(({ title, data }, idx) => (
                <div
                  key={idx}
                  className="w-full h-[150px] bg-gray-50 rounded-xl p-4 flex flex-col justify-between"
                >
                  <h3 className="text-gray-600">{title}</h3>
                  <h2 className="text-2xl font-bold text-gray-900">{data}</h2>
                </div>
              ))
        }
      </CardContent>
    </Card>
  );
};

export default DashboardCardsApplication;
