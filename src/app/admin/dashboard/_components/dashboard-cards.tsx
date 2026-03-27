"use client";
import React, { useMemo } from "react";
import { FaArrowRight } from "react-icons/fa6";
import toast from "react-hot-toast";
import StatCard from "./stats-card";
import { useFilterStore } from "@/store/filterStore";
import { useAdminQueries } from "@/hooks/api/admin.api";

const DashboardCards = () => {
  const { startDate, endDate } = useFilterStore();
  
  const {
    usersCountDomain,
    aggregatorsCountDomain,
    applicationsCountDomain,
    followersCountDomain
  } = useAdminQueries({
    fetchUsersCount: true,
    fetchAggregatorsCount: true,
    fetchApplicationsCount: true,
    fetchFollowersCount: true,
    startDate,
    endDate
  });

  const queryUsersCount = usersCountDomain;
  const queryAggrsCount = aggregatorsCountDomain;
  const queryApplicationsCount = applicationsCountDomain;
  const queryFollowersCount = followersCountDomain;


  const inActiveAggregators = useMemo(() => {
    const data = queryAggrsCount.data as any;
    return (
      (data?.count || 0) -
      (data?.active || 0)
    );
  }, [queryAggrsCount.data]);

  if (queryUsersCount.isError) {
    return toast.error("Could not load users data");
  }
  if (queryAggrsCount.isError) {
    return toast.error("Could not load aggregators data");
  }
  if (queryApplicationsCount.isError) {
    return toast.error("Could not load applications data");
  }
 const isLoading =
   queryUsersCount.isLoading ||
   queryAggrsCount.isLoading ||
   queryApplicationsCount.isLoading ||
   queryFollowersCount.isLoading;
  const DASHBOARD_CARDS_DATA = [
    {
      title: "Users",
      value: (queryUsersCount.data as any)?.totalCount || 0,
      linkIcon: true,
      route: "/admin/users",
    },
    {
      title: "Active Subscriptions",
      value: (queryUsersCount.data as any)?.activeSubscribers || 0,
      linkIcon: false,
    },
    {
      title: "Inactive Subscriptions",
      value:
        ((queryUsersCount.data as any)?.totalCount || 0) -
        ((queryUsersCount.data as any)?.activeSubscribers || 0),
      linkIcon: false,
    },
    {
      title: "Guests",
      value: (queryUsersCount.data as any)?.guestCount || 0,
      linkIcon: true,
      route: "/admin/users/?filter=guests",
    },
    {
      title: "Inactive Guest Subscriptions",
      value: (queryUsersCount.data as any)?.inActiveGuestCount || 0,
      linkIcon: false,
    },
    {
      title: "Aggregators",
      value: (queryAggrsCount.data as any)?.count || 0,
      linkIcon: true,
      route: "/admin/status-report",
    },
    {
      title: "Active Aggregators",
      value: (queryAggrsCount.data as any)?.active || 0,
      linkIcon: true,
      route: "/admin/status-report",
    },
    {
      title: "Inactive Aggregators",
      value: inActiveAggregators,
      linkIcon: true,
      route: "/admin/status-report",
    },
    {
      title: "Total Applications",
      value:
        ((queryApplicationsCount.data as any)?.failedCount || 0) +
        ((queryApplicationsCount.data as any)?.successCount || 0),
      linkIcon: true,
      route: "/admin/job-applications",
    },
    {
      title: "Successful Applications",
      value: (queryApplicationsCount.data as any)?.successCount || 0,
      linkIcon: true,
      route: "/admin/job-applications",
    },
    {
      title: "Failed Applications",
      value: (queryApplicationsCount.data as any)?.failedCount || 0,
      linkIcon: true,
      route: "/admin/job-applications",
    },
    {
      title: "Loyalists",
      value: (queryUsersCount.data as any)?.loyalistsCount || 0,
      linkIcon: false,
    },
    {
      title: "Returnees",
      value: (queryUsersCount.data as any)?.returneesCount || 0,
      linkIcon: true,
      route: "/admin/users/?filter=returnees",
    },
    {
      title: "Followers",
      value: (queryFollowersCount.data as any)?.count || 0,
      linkIcon: true,
      route: "/admin/users/?filter=followers",
    },

    // {
    //   title: "Total Jobsites",
    //   value: queryAggrsCount.data?.data.count || 0,
    //   linkIcon: false,
    // },
  ];

  return (
    <section className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-6">
      {DASHBOARD_CARDS_DATA.map((card, idx) => (
        <StatCard
          key={idx}
          title={card.title}
          value={card.value}
          icon={<FaArrowRight/>}
          route={card.route}
          isLoading={isLoading}
        />
      ))}
    </section>
  );
};

export default DashboardCards;
