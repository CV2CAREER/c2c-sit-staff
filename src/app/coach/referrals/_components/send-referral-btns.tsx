"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useFetchData } from "@/hooks/useApi";
import { useAuthStore } from "@/store/user.store";

/*---- Interfaces & Types ----*/
interface ICoachUserData {
  numberOfReferralsBeforePromo: any;
  promotionalCount: any;
  numberOfFreePromo: any;
  allowFreeBeforeReferral: any;
  promotionRefCount: any;
}

interface ICoachResponse {
  user: ICoachUserData;
}

const SendReferralBtns = () => {
  const user = useAuthStore((state) => state.user);
  const referralLink = `${process.env.NEXT_PUBLIC_CLIENT_URL}/register?ref=${user?.email}-coach`;

  /*---- Coach Context Data & State ----*/
  const [isBusinessPromo, setIsBusinessPromo] = useState<boolean>(false);
  const [isPromotionalButtonActive, setIsPromotionalButtonActive] =
    useState(false);
  const [referralFormDialogIsOpen, setReferalFormDialogIsOpen] =
    useState(false);

  /*---- Queries ----*/
  const { data: coachUserResponse } = useFetchData<ICoachResponse>({
    queryKey: ["CoachUserData", user?._id],
    url: "/api/v1/users",
    method: "GET",
    enabled: !!user?._id,
    params: { userId: user?._id },
  });

  const {
    promotionalCount,
    numberOfReferralsBeforePromo,
    numberOfFreePromo,
    allowFreeBeforeReferral,
    promotionRefCount,
  } = coachUserResponse?.data?.user || {};

  useEffect(() => {
    if (numberOfReferralsBeforePromo == null) return;

    if (allowFreeBeforeReferral) {
      setIsPromotionalButtonActive(true);
    } else if (
      promotionalCount === numberOfReferralsBeforePromo &&
      promotionRefCount < numberOfFreePromo
    ) {
      setIsPromotionalButtonActive(true);
    } else {
      setIsPromotionalButtonActive(false);
    }
  }, [
    promotionalCount,
    numberOfReferralsBeforePromo,
    numberOfFreePromo,
    allowFreeBeforeReferral,
    promotionRefCount,
    setIsPromotionalButtonActive,
  ]);

  const handleSendReferral = () => {
    // TODO: Implement SendReferralModal or referral sending logic
    // For now, just copy the referral link to clipboard
    navigator.clipboard.writeText(referralLink);
    alert(`Referral link copied to clipboard: ${referralLink}`);
  };

  return (
    <section>
      {isPromotionalButtonActive ? (
        <Button
          onClick={() => {
            setIsBusinessPromo(true);
            handleSendReferral();
          }}
        >
          Send Promo Referral
        </Button>
      ) : (
        <Button onClick={handleSendReferral}>Send Referral</Button>
      )}
    </section>
  );
};

export default SendReferralBtns;
