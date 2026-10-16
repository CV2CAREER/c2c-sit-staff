/* eslint-disable @typescript-eslint/ban-ts-comment */
"use client";
import UserFiltersCard from "./UserFiltersCard";
import UsersDataTable from "./UsersDataTable";
import { useRef, useState } from "react";
import { IDateFilter } from "@/types/common";
import { DEFAULT_FILTERS, UserFilterState } from "@/app/admin/users/hooks/user-filters";
import { useGetAllUsers } from "@/app/admin/users/hooks/users-all";

interface UserProp {
  route: string;
}

const Users = ({ route }: UserProp) => {
  const tableRef = useRef(null);

  const [filters, setFilters] = useState<UserFilterState>(DEFAULT_FILTERS);
  const [dateFilterData, setDateFilterData] = useState<IDateFilter>({
    startDate: null,
    endDate: null,
  });

  const allUsers = useGetAllUsers({ enabled: true, active: true });

  return (
    <section className="flex flex-col gap-4 w-full">
      <UserFiltersCard
        filters={filters}
        setFilters={setFilters}
        users={allUsers.users || []}
        isLoading={allUsers.isLoading}
        isError={allUsers.isError}
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
