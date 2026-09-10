import ProfileAvatarHeader from "../../admin/profile/_components/ProfileAvatarHeader";
import EditProfile from "../../admin/profile/_components/EditProfile";

const CECProfilePage = () => {
  return (
    <section className="flex flex-col gap-8 mt-8">
      <ProfileAvatarHeader />
      <EditProfile />
    </section>
  );
};

export default CECProfilePage;
