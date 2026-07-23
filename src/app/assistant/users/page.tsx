import PageHeader from "@/components/PageHeader/PageHeader";
import AddUserBtn from "./_components/add-user-btn";
import Users from "./_components/Users";

//user management
const UsersPage = () => {
  return (
    <section className="flex flex-col gap-3 mt-4">
      <PageHeader
        title="Users Management"
        description="Manage client, staff, and partner accounts across the platform."
        renderJSX={<AddUserBtn />}
        className="rounded-xl border border-primary/15 p-3 sm:p-3 shadow-[0_1px_10px_rgba(0,142,211,0.10)]"
      />
      <Users route="assistant"/>
    </section>
  );
};
export default UsersPage;
