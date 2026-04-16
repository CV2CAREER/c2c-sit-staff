"use client"
import React, { useState, useEffect } from "react";
import { useAdminQueries } from "@/hooks/api/admin.api";
import {
  LucideIcon,
  ShieldUser,
  User,
  Users,
  BadgePercent,
  TestTubeDiagonal,
  Cog
} from "lucide-react";
import DateFilter from "@/components/reusable/DateFilter";

interface UsersCountData {
  adminPersonnaCount: number;
  guestPersonnaCount: number;
  clientPersonnaCount: number;
  coachesPersonnaCount: number;
  partnersPersonnaCount: number;
  salesPersonnaCount: number;
  csePersonnaCount: number;
  testPersonnaCount: number;
  loyalistsPersonnaCount: number;
  totalActiveUsersCount: number;
  bronzePlanCount: number;
  emeraldPlanCount: number;
  coralPlanCount: number;
  silverPlanCount: number;
  platinumPlanCount: number;
  goldPlanCount: number;
  totalPlanCount: number;
}

interface cardsDataProps {
  title: string,
  value: number,
  icon: {
    name: LucideIcon,
    bgColor: string,
    color: string,
  },
}

interface UserDataCardsProps {
  setUserType: (data: any) => void;
  userType: {
    user: string,
    usersDataState: string;
    plan: string;
  }
  scrollTotable: any
}

const UserDataCards = ({setUserType, userType, scrollTotable}: UserDataCardsProps) => {
  const [dateFilterData, setDateFilterData] = useState<{ startDate: string | null; endDate: string | null }>({
    startDate: null,
    endDate: null,
  });

  const { usersPersonaCountDomain } = useAdminQueries({
    fetchUsersPersonaCount: true,
    startDate: dateFilterData.startDate || undefined,
    endDate: dateFilterData.endDate || undefined,
  });

  // Transform API response to match expected structure
  const transformApiData = (apiData: any): UsersCountData => {
    // Default empty structure
    const defaultData: UsersCountData = {
      adminPersonnaCount: 0,
      guestPersonnaCount: 0,
      clientPersonnaCount: 0,
      coachesPersonnaCount: 0,
      partnersPersonnaCount: 0,
      salesPersonnaCount: 0,
      csePersonnaCount: 0,
      testPersonnaCount: 0,
      loyalistsPersonnaCount: 0,
      totalActiveUsersCount: 0,
      bronzePlanCount: 0,
      emeraldPlanCount: 0,
      coralPlanCount: 0,
      silverPlanCount: 0,
      platinumPlanCount: 0,
      goldPlanCount: 0,
      totalPlanCount: 0,
    };

    if (!apiData) return defaultData;

    // Map subscription tiers to plan counts
    const tiers = apiData.subscriptionTiers?.tiers || [];
    const bronzeTier = tiers.find((t: any) => t.key === "bronze");
    const silverTier = tiers.find((t: any) => t.key === "silver");
    const goldTier = tiers.find((t: any) => t.key === "gold");
    const platinumTier = tiers.find((t: any) => t.key === "platinum");
    const coralTier = tiers.find((t: any) => t.key === "coral");
    const emeraldTier = tiers.find((t: any) => t.key === "emerald");

    return {
      adminPersonnaCount: apiData.breakdown?.users?.successful || 0,
      guestPersonnaCount: 0, // Map from your API if available
      clientPersonnaCount: apiData.breakdown?.users?.successful || 0,
      coachesPersonnaCount: 0, // Map from your API if available
      partnersPersonnaCount: 0, // Map from your API if available
      salesPersonnaCount: 0, // Map from your API if available
      csePersonnaCount: 0, // Map from your API if available
      testPersonnaCount: apiData.breakdown?.applications?.failed || 0,
      loyalistsPersonnaCount: 0, // Map from your API if available
      totalActiveUsersCount: apiData.subscriptionTiers?.totals?.activeSubscribers || 0,
      bronzePlanCount: bronzeTier?.users || 0,
      emeraldPlanCount: emeraldTier?.users || 0,
      coralPlanCount: coralTier?.users || 0,
      silverPlanCount: silverTier?.users || 0,
      platinumPlanCount: platinumTier?.users || 0,
      goldPlanCount: goldTier?.users || 0,
      totalPlanCount: apiData.subscriptionTiers?.totals?.activeSubscriptions || 0,
    };
  };

  const personas: UsersCountData | undefined = usersPersonaCountDomain.data 
    ? transformApiData(usersPersonaCountDomain.data) 
    : undefined;
    
  const isLoading = usersPersonaCountDomain.isLoading;
  const isError = usersPersonaCountDomain.isError;
  const error = usersPersonaCountDomain.error;

  // Debug logging
  useEffect(() => {
    if (usersPersonaCountDomain.data) {
      console.log("Original API Data:", usersPersonaCountDomain.data);
      console.log("Transformed Persona Data:", personas);
    }
    if (isError) {
      console.error("Error fetching persona data:", error);
    }
  }, [usersPersonaCountDomain.data, isError, error, personas]);

  const userTypes = ["Admins", "Clients", "Coaches", "Guests", "Partners", "Sales", "CSE", "Test Users", "Total Users", "Loyalists"]
  const userPlans = ["Bronze", "Coral", "Emerald", "Silver", "Platinum", "Gold"]

  const cardsData: cardsDataProps[] = [
    {
      title: "Admins",
      value: personas?.adminPersonnaCount || 0,
      icon: {
        name: ShieldUser,
        bgColor: "bg-lightblue",
        color: "text-blue",
      },
    },
    {
      title: "Clients",
      value: personas?.clientPersonnaCount || 0,
      icon: {
        name: Users,
        bgColor: "bg-lightblue",
        color: "text-blue",
      },
    },
    {
      title: "Coaches",
      value: personas?.coachesPersonnaCount || 0,
      icon: {
        name: Users,
        bgColor: "bg-lightblue",
        color: "text-blue",
      },
    },
    {
      title: "Guests",
      value: personas?.guestPersonnaCount || 0,
      icon: {
        name: Users,
        bgColor: "bg-lightblue",
        color: "text-blue",
      },
    },
    {
      title: "Partners",
      value: personas?.partnersPersonnaCount || 0,
      icon: {
        name: User,
        bgColor: "bg-lightblue",
        color: "text-blue",
      },
    },
    {
      title: "Sales",
      value: personas?.salesPersonnaCount || 0,
      icon: {
        name: BadgePercent,
        bgColor: "bg-lightblue",
        color: "text-blue",
      },
    },
    {
      title: "CSE",
      value: personas?.csePersonnaCount || 0,
      icon: {
        name: Cog,
        bgColor: "bg-lightblue",
        color: "text-blue",
      },
    },
    {
      title: "Total Users",
      value: personas?.totalActiveUsersCount || 0,
      icon: {
        name: Users,
        bgColor: "bg-lightblue",
        color: "text-blue",
      },
    },
    {
      title: "Test Users",
      value: personas?.testPersonnaCount || 0,
      icon: {
        name: TestTubeDiagonal,
        bgColor: "bg-lightblue",
        color: "text-blue",
      },
    },
    {
      title: "Loyalists",
      value: personas?.loyalistsPersonnaCount || 0,
      icon: {
        name: User,
        bgColor: "bg-lightblue",
        color: "text-blue",
      },
    },
    {
      title: "Bronze",
      value: personas?.bronzePlanCount || 0,
      icon: {
        name: User,
        bgColor: "bg-orange-200",
        color: "text-orange-700",
      },
    },
    {
      title: "Emerald",
      value: personas?.emeraldPlanCount || 0,
      icon: {
        name: User,
        bgColor: "bg-green-200",
        color: "text-green-700",
      },
    },
    {
      title: "Coral",
      value: personas?.coralPlanCount || 0,
      icon: {
        name: User,
        bgColor: "bg-red-200",
        color: "text-red-700",
      },
    },
    {
      title: "Silver",
      value: personas?.silverPlanCount || 0,
      icon: {
        name: User,
        bgColor: "bg-gray-200",
        color: "text-gray-700",
      },
    },
    {
      title: "Platinum",
      value: personas?.platinumPlanCount || 0,
      icon: {
        name: User,
        bgColor: "bg-indigo-200",
        color: "text-indigo-700",
      },
    },
    {
      title: "Gold",
      value: personas?.goldPlanCount || 0,
      icon: {
        name: User,
        bgColor: "bg-yellow-200",
        color: "text-yellow-700",
      },
    },
    {
      title: "Total Plan",
      value: personas?.totalPlanCount || 0,
      icon: {
        name: User,
        bgColor: "bg-purple-200",
        color: "text-purple-700",
      },
    },
  ];

  if (isError) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
          <h3 className="text-red-800 font-semibold">Error Loading Data</h3>
          <p className="text-red-600">Failed to load user counts. Please try again.</p>
          <button 
            onClick={() => usersPersonaCountDomain.refetch?.()}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div>
        <h3 className="text-xl font-semibold mb-3">Date Filter</h3>
        <div className="flex flex-col lg:flex-row items-center mt-4 lg:mt-0 w-full lg:w-auto">
          <DateFilter onFilterDataChange={setDateFilterData} />
        </div>
      </div>
      <section className="flex flex-row flex-wrap justify-between lg:justify-start gap-4 *:w-[45%] lg:*:w-[18%]">
        {isLoading ? (
          Array(17).fill(0).map((_, idx) => (
            <div
              key={idx}
              className="flex items-center h-24 gap-3 bg-white p-4 rounded-md shadow-md animate-pulse"
            >
              <div className="bg-gray-300 w-10 h-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-24 bg-gray-300 rounded" />
                <div className="h-5 w-32 bg-gray-400 rounded" />
              </div>
            </div>
          ))
        ) : (
          cardsData.map((card, idx) => {
            const LIcon = card.icon.name;
            return (
              <div
                key={idx}
                className="flex items-center gap-3 bg-white p-4 rounded-md shadow-md hover:cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all"
                onClick={() => {
                  if(userTypes.includes(card.title)){
                    setUserType({
                      ...userType,
                      user: card.title === "Total Users" ? "all" : card.title === "Test Users" ? "test" : card.title.toLowerCase()
                    })
                  }
                  if(userPlans.includes(card.title)){
                    setUserType({
                      ...userType,
                      plan: card.title.toLowerCase()
                    })
                  }
                  scrollTotable()
                }}
              >
                <div className={`${card.icon.bgColor} w-fit p-2 rounded-full`}>
                  <LIcon className={card.icon.color} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
                  <h1 className="text-3xl font-bold text-gray-800">{card.value}</h1>
                </div>
              </div>
            );
          })
        )}
      </section>
    </>
  );
};

export default UserDataCards;
