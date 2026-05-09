/* eslint-disable @typescript-eslint/ban-ts-comment */
"use client"
import UserDataCards from "./UserDataCards";
import UsersDataTable from "./UsersDataTable";
import { useRef, useState } from "react";
import { IDateFilter } from "@/types/common";

interface UserProp {
    route: string;
}
const Users = ({route} : UserProp) => {
    const tableRef = useRef(null);

    const scrollTotable = () => {
        // @ts-ignore
        tableRef?.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const [userType, setUserType] = useState<any>({
        user: "all",
        usersDataState: "active",
        plan: "all",
    })
    const [dateFilterData, setDateFilterData] = useState<IDateFilter>({
      startDate: null,
      endDate: null,
    });

  return (
    <section className="flex flex-col gap-8 mt-8">
      <UserDataCards
        setUserType={setUserType}
        userType={userType}
        scrollTotable={scrollTotable}
        dateFilterData={dateFilterData}
        setDateFilterData={setDateFilterData}
      />
      <UsersDataTable
        userType={userType}
        setUserType={setUserType}
        route={route}
        tableRef={tableRef}
        dateFilterData={dateFilterData}
      />
    </section>
  );
};
export default Users;
