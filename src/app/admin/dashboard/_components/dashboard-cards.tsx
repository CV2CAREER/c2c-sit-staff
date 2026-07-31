"use client";
import React, { useMemo } from "react";
import toast from "react-hot-toast";
import StatCard from "./stats-card";
import { useFilterStore } from "@/store/filterStore";
import { useAdminQueries } from "@/hooks/api/admin.api";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users,
  BadgeCheck,
  BadgeX,
  UserPlus,
  UserX,
  Server,
  ServerCog,
  ServerOff,
  FileText,
  CheckCircle2,
  XCircle,
  Heart,
  RotateCcw,
  UserRoundCheck,
} from "lucide-react";

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

  const usersData = useMemo(() => {
    return queryOverallStats.data?.breakdown?.users || { successful: 0, failed: 0 };
  }, [queryOverallStats.data]);

  const aggregatorsData = useMemo(() => {
    return queryAggregatorsCount.data || { total: 0, active: 0 };
  }, [queryAggregatorsCount.data]);


  const applicationsData = useMemo(() => {
    return queryOverallStats.data?.subscriptionTiers?.totals?.activeSubscriptions ?? 0;
  }, [queryOverallStats.data]);

  const applicationsBreakdown = useMemo(() => {
    return queryOverallStats.data?.breakdown?.applications || { successful: 0, failed: 0 };
  }, [queryOverallStats.data]);

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
      value: queryTotalUsersCount.data ?? 0,
      icon: <Users size={18} />,
      route: "/admin/users",
    },
    {
      title: "Active Subscriptions",
      value: applicationsData,
      icon: <BadgeCheck size={18} />,
    },
    {
      title: "Inactive Subscriptions",
      value: (queryTotalUsersCount.data ?? 0) - applicationsData,
      icon: <BadgeX size={18} />,
    },
    {
      title: "Guests",
      value: queryTotalGuestsCount.data ?? 0,
      icon: <UserPlus size={18} />,
      route: "/admin/users/?filter=guests",
    },
    {
      title: "Inactive Guest Subscriptions",
      value: queryTotalGuestsCount.data ?? 0, // Placeholder as v1 lacks specific inactive guest sub count
      icon: <UserX size={18} />,
    },
    {
      title: "Aggregators",
      value: aggregatorsData.total,
      icon: <Server size={18} />,
      route: "/admin/status-report",
    },
    {
      title: "Active Aggregators",
      value: aggregatorsData.active,
      icon: <ServerCog size={18} />,
      route: "/admin/status-report",
    },
    {
      title: "Inactive Aggregators",
      value: aggregatorsData.total - aggregatorsData.active,
      icon: <ServerOff size={18} />,
      route: "/admin/status-report",
    },
    {
      title: "Total Applications",
      value: (applicationsBreakdown?.successful || 0) + (applicationsBreakdown?.failed || 0),
      icon: <FileText size={18} />,
      route: "/admin/job-applications",
    },
    {
      title: "Successful Applications",
      value: applicationsBreakdown?.successful || 0,
      icon: <CheckCircle2 size={18} />,
      route: "/admin/job-applications",
    },
    {
      title: "Failed Applications",
      value: applicationsBreakdown?.failed || 0,
      icon: <XCircle size={18} />,
      route: "/admin/job-applications",
    },
    {
      title: "Loyalists",
      value: queryOverallStats.data?.loyalists ?? 0,
      icon: <Heart size={18} />,
    },
    {
      title: "Returnees",
      value: queryOverallStats.data?.returnees ?? 0,
      icon: <RotateCcw size={18} />,
      route: "/admin/users/?filter=returnees",
    },
    {
      title: "Followers",
      value: (queryFollowersCount.data as any)?.count || 0,
      icon: <UserRoundCheck size={18} />,
      route: "/admin/users/?filter=followers",
    },
  ];

  return (
    <Card className="rounded-xl border-primary/15 shadow-[0_1px_10px_rgba(0,142,211,0.10)]">
      <CardContent className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 p-4">
        {DASHBOARD_CARDS_DATA.map((card, idx) => (
          <StatCard
            key={idx}
            title={card.title}
            value={card.value}
            icon={card.icon}
            route={card.route}
            isLoading={isLoading}
          />
        ))}
      </CardContent>
    </Card>
  );
};

export default DashboardCards;
