"use client";
import React from "react";
import DashboardSkeleton from "@/components/reusable/DashboardLoadingSkeleton";
import { useAdminQueries } from "@/hooks/api/admin.api";

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
    <section>
      <div className="flex flex-col md:flex-row flex-wrap gap-3 mt-4">
        {
          isLoading
            ? [1, 2, 3].map((index) => (
                <DashboardSkeleton key={index} />
              ))
            : dashboardData.map(({ title, data }, idx) => (
                <div
                  key={idx}
                  className="w-full lg:w-[32%] h-[150px] bg-white rounded-md p-4 flex flex-col justify-between shadow"
                >
                  <h3>{title}</h3>
                  <h2 className="text-2xl font-bold">{data}</h2>
                </div>
              ))
        }
      </div>
    </section>
  );
};

export default DashboardCardsApplication;
