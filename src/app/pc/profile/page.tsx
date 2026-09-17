import ProfileAvatarHeader from "./_components/ProfileAvatarHeader";
import EditProfile from "./_components/EditProfile";

const PartnerProfilePage = () => {
  return (
    <section className="flex flex-col gap-8 mt-8">
      <ProfileAvatarHeader />
      <EditProfile />
    </section>
  );
};

export default PartnerProfilePage;
