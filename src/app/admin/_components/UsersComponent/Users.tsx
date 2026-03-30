/* eslint-disable @typescript-eslint/ban-ts-comment */
"use client"
import UserDataCards from "./UserDataCards";
import UsersDataTable from "./UsersDataTable";
import { useRef, useState } from "react";

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

  return (
    <section className="flex flex-col gap-8 mt-8">
      <UserDataCards setUserType={setUserType} userType={userType} scrollTotable={scrollTotable}/>
      <UsersDataTable userType={userType} setUserType={setUserType} route={route} tableRef={tableRef}/>
    </section>
  );
};
export default Users;