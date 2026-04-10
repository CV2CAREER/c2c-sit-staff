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
    overallStatsDomain,
    followersCountDomain,
    dashboardAggregatorsCountDomain,
    totalUsersCountDomain,
    totalGuestsCountDomain
  } = useAdminQueries({
    fetchOverallStats: true,
    fetchFollowersCount: true,
    fetchAggregatorsCount: true,
    fetchTotalUsersCount: true,
    fetchTotalGuestsCount: true,
    startDate,
    endDate
  });

  const queryOverallStats = overallStatsDomain;
  const queryFollowersCount = followersCountDomain;
  const queryAggregatorsCount = dashboardAggregatorsCountDomain;
  const queryTotalUsersCount = totalUsersCountDomain;
  const queryTotalGuestsCount = totalGuestsCountDomain;

  const applicationsData = useMemo(() => {
    return queryOverallStats.data?.breakdown?.applications || { successful: 0, failed: 0 };
  }, [queryOverallStats.data]);

  const usersData = useMemo(() => {
    return queryOverallStats.data?.breakdown?.users || { successful: 0, failed: 0 };
  }, [queryOverallStats.data]);

  const aggregatorsData = useMemo(() => {
    return queryAggregatorsCount.data || { total: 0, active: 0 };
  }, [queryAggregatorsCount.data]);


  if (queryOverallStats.isError) {
    toast.error("Could not load analytics data");
    return null;
  }

  const isLoading = 
    queryOverallStats.isLoading || 
    queryFollowersCount.isLoading || 
    queryAggregatorsCount.isLoading ||
    queryTotalUsersCount.isLoading ||
    queryTotalGuestsCount.isLoading;
  const DASHBOARD_CARDS_DATA = [
    {
      title: "Users",
      value: (queryTotalUsersCount.data as number) || 0,
      linkIcon: true,
      route: "/admin/users",
    },
    {
      title: "Active Subscriptions",
      value: applicationsData?.successful || 0, // Proxy from plans.successful
      linkIcon: false,
    },
    {
      title: "Inactive Subscriptions",
      value: (queryTotalUsersCount.data as number || 0) - (applicationsData?.successful || 0),
      linkIcon: false,
    },
    {
      title: "Guests",
      value: (queryTotalGuestsCount.data as number) || 0,
      linkIcon: true,
      route: "/admin/users/?filter=guests",
    },
    {
      title: "Inactive Guest Subscriptions",
      value: (queryTotalGuestsCount.data as number) || 0, // Placeholder as v1 lacks specific inactive guest sub count
      linkIcon: false,
    },
    {
      title: "Aggregators",
      value: aggregatorsData.total,
      linkIcon: true,
      route: "/admin/status-report",
    },
    {
      title: "Active Aggregators",
      value: aggregatorsData.active,
      linkIcon: true,
      route: "/admin/status-report",
    },
    {
      title: "Inactive Aggregators",
      value: aggregatorsData.total - aggregatorsData.active,
      linkIcon: true,
      route: "/admin/status-report",
    },
    {
      title: "Total Applications",
      value: (applicationsData?.successful || 0) + (applicationsData?.failed || 0),
      linkIcon: true,
      route: "/admin/job-applications",
    },
    {
      title: "Successful Applications",
      value: applicationsData?.successful || 0,
      linkIcon: true,
      route: "/admin/job-applications",
    },
    {
      title: "Failed Applications",
      value: applicationsData?.failed || 0,
      linkIcon: true,
      route: "/admin/job-applications",
    },
    {
      title: "Loyalists",
      value: usersData?.successful || 0, // Proxy from users.successful (Commenced)
      linkIcon: false,
    },
    {
      title: "Returnees",
      value: usersData?.failed || 0, // Proxy from users.failed (Expired)
      linkIcon: true,
      route: "/admin/users/?filter=returnees",
    },
    {
      title: "Followers",
      value: (queryFollowersCount.data as any)?.count || 0,
      linkIcon: true,
      route: "/admin/users/?filter=followers",
    },
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
