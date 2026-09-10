/* eslint-disable @typescript-eslint/ban-ts-comment */
"use client"
import UserDataCards from "./UserDataCards";
import UsersDataTable from "./UsersDataTable";
import { useRef, useState } from "react";
import { IDateFilter } from "@/types/common";
import { EMPTY_FILTERS, UserFilterState } from "@/app/admin/users/hooks/user-filters";

interface UserProp {
    route: string;
}
const Users = ({route} : UserProp) => {
    const tableRef = useRef(null);

    const scrollTotable = () => {
        // @ts-ignore
        tableRef?.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const [filters, setFilters] = useState<UserFilterState>(EMPTY_FILTERS);
    const [dateFilterData, setDateFilterData] = useState<IDateFilter>({
      startDate: null,
      endDate: null,
    });

  return (
    <section className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <UserDataCards
        filters={filters}
        setFilters={setFilters}
        scrollTotable={scrollTotable}
      />
      <UsersDataTable
        filters={filters}
        setFilters={setFilters}
        route={route}
        tableRef={tableRef}
        dateFilterData={dateFilterData}
        setDateFilterData={setDateFilterData}
      />
    </section>
  );
};
export default Users;
