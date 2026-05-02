import React from "react";
import PageHeader from "@/components/PageHeader/PageHeader";
import SendReferralBtns from "./_components/send-referral-btns";
import CoachReferrals from "./_components/coach-referrals";

const CoachReferralsPage = () => {
  return (
    <section className="flex flex-col gap-8 mt-8">
      <PageHeader title="Referrals" renderJSX={<SendReferralBtns />} />
      <CoachReferrals />
    </section>
  );
};

export default CoachReferralsPage;
