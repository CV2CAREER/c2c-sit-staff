import PageHeader from "@/components/PageHeader/PageHeader";
import ReferralComponent from "./_components/ReferralComponents";

const Page = () => {

  return (
    <div className = 'flex flex-col mt-8 gap-8'>
      <PageHeader title="Referral Management" />
      <ReferralComponent/>
    </div>
  );
};

export default Page;
