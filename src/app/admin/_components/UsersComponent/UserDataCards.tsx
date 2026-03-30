"use client"
import React, { useState } from "react";
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

  const personas: UsersCountData | undefined = usersPersonaCountDomain.data?.data;
  const isLoading = usersPersonaCountDomain.isLoading;

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
 


  return (
    <>
     <div>
        <h3 className="text-xl font-semibold mb-3">Date Filter</h3>
        <div className="flex flex-col lg:flex-row items-center mt-4 lg:mt-0 w-full lg:w-auto">
          <DateFilter onFilterDataChange={setDateFilterData} />
        </div>
      </div>
    <section className="flex flex-row flex-wrap justify-between lg:justify-start gap-4 *:w-[45%] lg:*:w-[18%]">
     {isLoading
  ? Array(17).fill(0).map((_, idx) => (
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
  : cardsData.map((card, idx) => {
      const LIcon = card.icon.name;
      return (
        <div
          key={idx}
          className="flex items-center gap-3 bg-white p-4 rounded-md shadow-md hover:cursor-pointer hover:ring-blue"
          onClick={() => {

            if(userTypes.includes(card.title)){
              setUserType({
                ...userType,
                user: card.title === "Total Users"? "all" : card.title === "Test Users"? "test" : card.title.toLowerCase()
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
    })}

    </section>
    </>
  );
};

export default UserDataCards;
