import PageHeader from "@/components/PageHeader/PageHeader";
import AddUserBtn from "./_components/add-user-btn";
import Users from "../_components/UsersComponent/Users";

//user management
const UsersPage = () => {
  return (
    <section className="flex flex-col gap-8 mt-8">
      <PageHeader title="Users Management" renderJSX={<AddUserBtn />} />
        <div style={{ height: "calc(100vh - 180px)", width: "100%" }}>
          <Users route="admin"/>
        </div>
    </section>
  );
};
export default UsersPage;
