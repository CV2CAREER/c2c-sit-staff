/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { IoMdTime } from "react-icons/io";
import { HiOutlineChartBar } from "react-icons/hi";
import { Stepper, Step } from "@material-tailwind/react";
import { Chip } from "@heroui/chip";
import { LucideVerified } from "lucide-react";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useAdminUserDetailContext } from "../context/userDetailContext";
import { useAdminQueries } from "@/hooks/api/admin.api";

const milestoneLabels = [
  { id: 0, label: "Email Verification" },
  { id: 1, label: "Document Accepted" },
  { id: 2, label: "Service Selection" },
  { id: 3, label: "Payment Confirmation" },
  { id: 4, label: "Social Follow Verification" },
  { id: 5, label: "Jobsite Verification" },
  { id: 6, label: "Preference Update" },
  { id: 7, label: "CV Variant Dispatch" },
  { id: 8, label: "Sample Results Review" },
  { id: 9, label: "Preparatory Session" },
  { id: 10, label: "Job Applications" },
];

export default function OnBoardingProgress({ userId }: { userId: string }) {
  const { user } = useAdminUserDetailContext();
  const { userProgressDomain } = useAdminQueries({ userId, fetchUserProgress: true });
  const progressData = userProgressDomain?.data;

  const userInfoForStepper = React.useMemo(() => ({
    ...(user as any),
    progress: progressData?.progress ?? (user as any)?.progress,
    updatedAt: progressData?.updatedAt ?? (user as any)?.updatedAt,
  }), [user, progressData]);

  const formattedUpdatedAt = progressData?.updatedAt
    ? new Date(progressData.updatedAt).toLocaleString()
    : null;

  return (
    <section className="relative overflow-hidden flex flex-col gap-3 bg-white rounded-2xl p-4 md:p-6 shadow-lg border border-career-gray-300/60">
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        style={{ originX: 0 }}
        className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-career-blue-800 via-career-blue-300 to-career-blue-800"
      />

      <div className="flex flex-wrap gap-2 justify-between items-center">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-career-blue-800/10 text-career-blue-800">
            <HiOutlineChartBar size={16} />
          </span>
          <h2 className="text-lg md:text-xl font-semibold">Onboarding Progress</h2>
          {formattedUpdatedAt && (
            <span className="text-xs text-gray-400">Updated: {formattedUpdatedAt}</span>
          )}
        </div>
        {/* @ts-ignore - API response structure has nested user property */}
        {(user as any)?.user?.isEmailVerified ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Chip
              size="sm"
              color="success"
              className="*:flex items-center gap-1 font-semibold capitalize text-white"
            >
              <LucideVerified size={13} />
              <span>Verified</span>
            </Chip>
          </motion.div>
        ) : (
          <Chip
            size="sm"
            color="warning"
            className="*:flex *:items-center *:gap-1 *:font-semibold *:capitalize *:text-white"
          >
            <IoMdTime />
            <span>Unverified</span>
          </Chip>
        )}
      </div>

      <div className="">
        <OnboardingStatusBarStepper userInfo={userInfoForStepper} />
      </div>
    </section>
  );
}

/* Internal Components */
function OnboardingStatusBarStepper({ userInfo }: { userInfo: any }) {
  const [currentStep, setCurrentStep] = React.useState<number>(0);
  const isMobile = useMediaQuery("(max-width: 768px)");
  const mobileScrollRef = React.useRef<HTMLDivElement | null>(null);

  const getMobileMilestoneLabel = (label: string) => {
    const mobileLabels: Record<string, string> = {
      "Email Verification": "Email",
      "Document Accepted": "Docs",
      "Service Selection": "Service",
      "Payment Confirmation": "Payment",
      "Social Follow Verification": "Social",
      "Jobsite Verification": "Jobsite",
      "Preference Update": "Prefs",
      "CV Variant Dispatch": "CV",
      "Sample Results Review": "Samples",
      "Preparatory Session": "Prep",
      "Job Applications": "Apply",
    };

    return mobileLabels[label] || label;
  };

  const isAnyAggregatorVerified = (aggregators: any[] | undefined): boolean => {
    if (!aggregators || !Array.isArray(aggregators)) return false;
    return aggregators.some((agg) => agg?.isVerified === true);
  };

  useEffect(() => {
    if (userInfo) {
      handleActiveStep();
    }
  }, [userInfo]);

  useEffect(() => {
    if (isMobile && mobileScrollRef.current) {
      mobileScrollRef.current.scrollLeft = 0;
    }
  }, [isMobile, userInfo]);

  const handleActiveStep = () => {
    if (userInfo) {
      const emailVerified = userInfo?.isEmailVerified;
      const documentUploaded = userInfo?.isDocumentUploaded ?? false;
      const documentApproved = userInfo?.isDocumentApproved ?? false;
      const userSubscribed = userInfo?.isUserSubscribed ? true: userInfo?.plan ? true : false;
      const planChosen = userInfo?.selectedPlan ? true : false;
      const isAggregatorVerified: boolean = isAnyAggregatorVerified(
        userInfo?.profile && typeof userInfo.profile === "object"
          ? (userInfo.profile as any)?.aggregators
          : []
      );
      const prepSession = userInfo?.prepSessionStatus ?? 0;
      const applicationStarted: boolean =
        userInfo?.isApplicationStarted ?? false;

      if (
        userInfo.progress === "Application Commenced" || userInfo.progress === "Application Hold" || userInfo.progress === "Application Expired"
      ) {
        setCurrentStep(10)
      } else if(
        userInfo.progress === "Preparatory Session Accepted" || userInfo.progress === "Preparatory Session Declined"
      ){
        setCurrentStep(9)
      } else if(
        userInfo.progress === "Sample Results Dispatched" || userInfo.progress === "Sample Results Accepted"
      ){
        setCurrentStep(8)
      } else if(
        userInfo.progress === "CV/Resume Uplifted"
      ){
        setCurrentStep(7)
      } else if(
        userInfo.progress === "Preference Inserted" || userInfo.progress === "Preferences Updated"
      ){
        setCurrentStep(6)
      } else if(
        userInfo.progress === "Login Credentials Verified"
      ){
        setCurrentStep(5)
      }else if (
        userInfo.progress === "Followed on Socials"
      ) {
        setCurrentStep(4);
      } else if (
        userSubscribed || userInfo.progress === "Payment Confirmed"
      ) {
        setCurrentStep(3);
      } else if (
        planChosen || userInfo.progress === "Plan Selected"
      ) {
        setCurrentStep(2);
      } else if (documentUploaded && documentApproved) {
        setCurrentStep(1);
      } else if (emailVerified) {
        setCurrentStep(0);
      }
    }
  };

  return (
    <div
      ref={mobileScrollRef}
      className={
        isMobile
          ? "w-full overflow-x-auto px-2 py-2"
          : "w-full h-[150px] flex justify-center items-center overflow-x-auto px-8"
      }
    >
      <div className={isMobile ? "min-w-[760px] px-6 pt-1 pb-9" : "w-full"}>
      {
        // @ts-ignore
        <Stepper
          placeholder=""
          activeStep={currentStep}
          lineClassName="bg-[#E5E5E5] h-[5px]"
          className="w-full flex justify-between items-center"
          onPointerEnterCapture={() => {}}
          onPointerLeaveCapture={() => {}}
        >
          {milestoneLabels.map((milestone, index) => (
            // @ts-ignore
            <Step
              key={index}
              className="w-3 h-3 !bg-[#E5E5E5] text-[#666] !font-medium"
              activeClassName="!bg-blue !text-blue"
              completedClassName="!text-blue !bg-blue"
              placeholder=""
              onPointerEnterCapture={() => {}}
              onPointerLeaveCapture={() => {}}
            >
              <div
                className={
                  isMobile
                    ? "absolute -bottom-7 w-16 text-center text-[10px] leading-tight"
                    : "absolute -bottom-[3rem] flex flex-col items-center text-xs"
                }
              >
                <span>
                  {isMobile
                    ? getMobileMilestoneLabel(milestone.label)
                    : milestone.label}
                </span>
              </div>
            </Step>
          ))}
        </Stepper>
      }
      </div>
    </div>
  );
}
