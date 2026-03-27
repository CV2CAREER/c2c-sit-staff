"use client";
import React from "react";
import { Tabs, Tab } from "@heroui/tabs";
import DashboardSkeleton from "@/components/reusable/DashboardLoadingSkeleton";
import moment from "moment";
import { useAdminQueries } from "@/hooks/api/admin.api";

const DashboardCardsApplication: React.FC = () => {
  const [selected, setSelected] = React.useState("six-months");

  // Calculate startDate and endDate based on selected period
  const { startDate, endDate } = React.useMemo(() => {
    const now = moment();
    let start: moment.Moment;

    switch (selected) {
      case "last-24-hrs":
        start = now.clone().subtract(1, "days");
        break;
      case "last-week":
        start = now.clone().subtract(7, "days");
        break;
      case "last-month":
        start = now.clone().subtract(1, "months");
        break;
      case "six-months":
      default:
        start = now.clone().subtract(6, "months");
        break;
    }

    return {
      startDate: start.format("YYYY-MM-DD"),
      endDate: now.format("YYYY-MM-DD"),
    };
  }, [selected]);

  const { applicationsCountDomain } = useAdminQueries({
    fetchApplicationsCount: true,
    startDate,
    endDate
  });

  const queryJobAppsCount = applicationsCountDomain;
  const isLoading = queryJobAppsCount.isLoading;

  const dashboardData = [
    {
      title: "Total Applications",
      data: (queryJobAppsCount.data?.data.successCount || 0) + (queryJobAppsCount.data?.data.failedCount || 0),
    },
    {
      title: "Successful Applications",
      data: queryJobAppsCount.data?.data.successCount || 0,
    },
    {
      title: "Failed Applications",
      data: queryJobAppsCount.data?.data.failedCount || 0,
    }
  ];
  

  return (
    <section>
      <div className="w-fit ml-auto">
        <Tabs
          aria-label="Options"
          color="primary"
          size="sm"
          radius="full"
          selectedKey={selected}
          onSelectionChange={(key) => setSelected(key.toString())}
        >
          <Tab key="last-24-hrs" title="Last 24hrs" />
          <Tab key="last-week" title="Last Week" />
          <Tab key="last-month" title="Last Month" />
          <Tab key="six-months" title="Six Months" />
        </Tabs>
      </div>

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
