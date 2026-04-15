"use client";

import { Select } from "antd";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlacementDashboard } from "@/hooks/usePlacementDashboard";

const AssistantDashboardComponent = () => {
  const {
    placementDashboardDomain: { data, isLoading },
  } = usePlacementDashboard();

  const dashboardCardsData = [
    {
      title: "Total Assigned Clients",
      value: data?.clients?.length ?? 0,
    },
    {
      title: "Total Unattended Clients",
      value: data?.totalUnattended ?? 0,
    },
    {
      title: "Total Applications",
      value: data?.totalApplications ?? 0,
    },
  ];

  return (
    <section className="flex flex-col gap-4">
      <section className="flex flex-wrap justify-between gap-3">
        {dashboardCardsData.map((card) => (
          <div
            key={card.title}
            className="w-[45%] rounded-md bg-white p-4 shadow-md duration-300 hover:scale-105 hover:shadow-xl lg:w-[29%]"
          >
            <div className="mb-4 flex items-center justify-between">
              {isLoading ? (
                <Skeleton className="h-[20px] w-[180px] rounded-md" />
              ) : (
                <p className="text-[12px] font-medium text-gray-600 sm:text-sm">
                  {card.title}
                </p>
              )}
            </div>
            {isLoading ? (
              <Skeleton className="h-[50px] w-[80px] rounded-md" />
            ) : (
              <h1 className="mt-auto text-3xl font-bold text-gray-800 md:mt-0">
                {card.value}
              </h1>
            )}
          </div>
        ))}
      </section>

      <section className="mt-12">
        <h2 className="mb-8 text-xl font-semibold">Clients Assigned</h2>
        <Select
          id="assigned-clients"
          className="w-full xl:w-1/2"
          placeholder="Select assigned client"
          options={(data?.clients ?? []).map((client) => ({
            label: client,
            value: client,
          }))}
          loading={isLoading}
        />
      </section>
    </section>
  );
};

export default AssistantDashboardComponent;
