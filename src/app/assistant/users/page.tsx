import PageHeader from "@/components/PageHeader/PageHeader";
import AddUserBtn from "./_components/add-user-btn";
import Users from "./_components/Users";

//user management
const UsersPage = () => {
  return (
    <section className="flex flex-col gap-8 mt-8">
      <PageHeader title="Users Management" renderJSX={<AddUserBtn />} />
      <Users route="assistant"/>
    </section>
  );
};
export default UsersPage;
