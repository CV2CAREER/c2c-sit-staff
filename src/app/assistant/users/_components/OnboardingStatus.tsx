/* eslint-disable @typescript-eslint/ban-ts-comment */
"use client"
import UnVerifiedTag from "@/components/UnVerifiedTag/UnVerifiedTag"
import VerifiedTag from "@/components/VerifiedTag/VerifiedTag"
import { useAdminUserDetailContext } from "../context/userDetailContext"
import React, { useMemo } from "react";
import { Stepper, Step } from '@material-tailwind/react';
import toast from "react-hot-toast";
import { DeferModal, WaiveModal } from "./WaiveAndDeferModals";


const validStatuses = [
    'Payment Confirmed',
    'Login Credentials Verified',
    'Sample Results Accepted',
    'Sample Results Dispatched',
    'Preparatory Session Declined',
    'Jobsite Confirmation',
    'Preparatory Session Accepted',
    'Application Hold',
    'Application Expired',
    'Application Commenced',
    'Offer Notification Received',
];

const milestoneLabels = [
    { id: 1, label: ['Email', 'Verification'] },
    { id: 2, label: ['Document', 'Accepted'] },
    { id: 3, label: ['Service', 'Selection'] },
    { id: 4, label: ['Payment', 'Confirmation'] },
    { id: 5, label: ['Social Follow', 'Verification'] },
    { id: 6, label: ['Jobsite', 'Verification'] },
    { id: 7, label: ['Preference', 'Update'] },
    { id: 8, label: ['CV Variant', 'Dispatch'] },
    { id: 9, label: ['Sample Results', 'Review'] },
    { id: 10, label: ['Preparatory', 'Session'] },
    { id: 11, label: ['Job', 'Applications'] },
];

// Map progress states to step numbers
const progressSteps: Record<string, number> = {
    'Email Verified': 0,
    'Documents Accepted': 1,
    'Plan Selected': 2,
    'Payment Confirmed': 3,
    'Social Media Followed': 4,
    'Login Credentials Verified': 5,
    'Preferences Updated': 6,
    'CV/Resume Uplifted': 7,
    'Sample Results Accepted': 8,
    'Preparatory Session Accepted': 9,
    'Application Commenced': 10,
    'Documents Declined': 0,
    'Sample Results Dispatched': 8,
    'Preparatory Session Declined': 8,
    'Application Hold': 10
};


const OnboardingStatus = () => {
    const { user } = useAdminUserDetailContext()
    const [activeStep, setActiveStep] = React.useState(0);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [activeCarouselItem, _setActiveCarouselItem] = React.useState(0);
    const [isDeferModalOpen, setIsDeferModalOpen] = React.useState(false)
    const [isWaiveModalOpen, setIsWaiveModalOpen] = React.useState(false)
    const milestones = user?.userSessionsMilestones || []
    const isVerified = useMemo(() => {
        if (user) {
            if (
                user.emailVerified &&
                user.isDocumentUploaded &&
                user.isDocumentApproved &&
                user.isUserSubscribed &&
                user.plan &&
                isAnyAggregatorVerified(user?.profile?.aggregators)
            ) {
                return true
            }
        }
        return false
    }, [user])
    // console.log(user)
    const isProgressValid = useMemo(() => {
        if (user) {
            return validStatuses.includes(user.progress)
        }
        return false
    }, [user])

    React.useEffect(() => {
        setActiveStep(activeStepSetter(user,))
    }, [user])

    const isAdmin = user?.role === "admin" ? true : false
    // console.log(isAdmin)

    return (
        <div className="w-full mt-3">
            <WaiveModal open={isWaiveModalOpen} setIsOpen={setIsWaiveModalOpen} />
            <DeferModal open={isDeferModalOpen} setIsOpen={setIsDeferModalOpen} />
            <div className="flex items-center justify-between flex-col gap-y-6 sm:gap-y-8 bg-white py-6 sm:py-8 px-6 sm:px-10 mobile:rounded-3xl w-full">
                <div className="flex items-center justify-between w-full">
                    <h2 className="text-[16px] font-medium text-[#131414] font-sharp-grotesk">
                        Onboarding Progress
                    </h2>

                    {(!user?.userSessionsMilestones && isVerified) ||
                        isProgressValid ||
                        (user?.userSessionsMilestones && user?.userSessionsMilestones?.reverse()[
                            activeCarouselItem > 0 ? activeCarouselItem - 1 : activeCarouselItem
                        ]?.documentAccepted) ? (
                        <div className="py-2 pl-2 pr-3 flex items-center justify-center bg-career-blue-200 rounded-2xl">
                            <VerifiedTag />
                        </div>
                    ) : (
                        <div className="py-2 pl-2 pr-3 flex items-center justify-center bg-warning-light rounded-2xl">
                            <UnVerifiedTag />
                        </div>
                    )}
                </div>

                <main className="w-full px-4 mb-4 mobile:px-0 min-h-[100px] relative">
                    <div className="h-56 sm:h-64 xl:h-80 2xl:h-96 flex flex-col items-center justify-center">
                        {milestones.length > 1 ? (
                            <div className="w-full flex flex-col items-center space-y-8">
                                {milestones.reverse().map((milestone, index) => (
                                    <MilestoneStepper activeStep={activeStep} key={index} />
                                ))}
                            </div>
                        ) : (
                            <MilestoneStepper activeStep={activeStep} />
                        )}
                    </div>
                </main>
                <div className="flex justify-end w-full gap-2">

                    <button
                        onClick={() => (isAdmin ? toast.error('Admin not allowed') : setIsDeferModalOpen(true))}
                        type="button"
                        className="defer-modal border border-career-blue-800 bg-white text-career-blue-800 capitalize whitespace-nowrap px-3 py-1.5 sm:px-6 sm:py-3 h-[2.75rem] rounded-[0.25rem] text-14 font-medium flex items-center justify-center hover:bg-career-blue-50 transition-colors"
                    >
                        Defer Session
                    </button>

                    <button
                        onClick={() => (isAdmin ? toast.error('Admin not allowed') : setIsWaiveModalOpen(true))}
                        type="button"
                        className="border border-career-blue-800 bg-career-blue-800 text-white capitalize whitespace-nowrap px-3 py-1.5 sm:px-6 sm:py-3 h-[2.75rem] rounded-[0.25rem] text-14 font-medium flex items-center justify-center hover:bg-career-blue-700 transition-colors"
                    >
                        Decline Session with Coach
                    </button>
                </div>
            </div>
        </div>
    )
}

export default OnboardingStatus



const isAnyAggregatorVerified = (aggregators: Array<{ isVerified: boolean }> | undefined) => {
    if (!aggregators || aggregators?.length < 1) return false;
    return aggregators.some((aggregator) => aggregator.isVerified === true);
};

function renderStep({ labels, index }: { labels: string[], index: number }) {
    return (
        <Step
            key={index}
            placeholder=""
            onPointerEnterCapture={() => { }}
            onResize={() => { }}
            onResizeCapture={() => { }}
            onPointerLeaveCapture={() => { }}
            className="w-3 h-3 !bg-[#E5E5E5] text-[#666] !font-medium"
            activeClassName="!bg-career-blue-800 !text-career-blue-800"
            completedClassName="!text-career-blue-800 !bg-career-blue-800"
        >
            <div className="absolute -bottom-[3rem] flex flex-col items-center text-xs font-poppins">
                {labels.map((line, i) => (
                    <span key={i}>{line}</span>
                ))}
            </div>
        </Step>
    );
}

function MilestoneStepper({ activeStep }: { activeStep: number }) {
    return (
        <div className="w-full h-[70px] flex justify-center items-center overflow-x-auto lg:overflow-x-visible scroll-smooth pb-4 [550px]:h-[80px] mobile:px-6 mobile:h-[100px]">
            {
                //@ts-ignore
                <Stepper
                    placeholder=""
                    activeStep={activeStep}
                    lineClassName="bg-[#E5E5E5] h-[5px]"
                    activeLineClassName="!bg-career-blue-800 !text-career-blue-800"
                    className="!text-neutral text-center !text-xs !font-medium mobile:full mx-8 ms-96 md:ms-0 min-w-[180%] md:min-w-full mobile:ml-0 mobile:w-full"
                >
                    {milestoneLabels.map((milestone) => renderStep({ labels: milestone.label, index: milestone.id }))}
                </Stepper>
            }
        </div>
    );
}

function activeStepSetter(userData: any) {
    if (userData?.isPreferenceUpdated && userData?.isDocumentApproved) {
        return progressSteps['Preferences Updated']
    } else if (userData?.isDocumentApproved) {
        return progressSteps['Documents Accepted']
    }
    else if (userData?.progress === "Email Verified" && !userData?.isDocumentApproved) {
        return progressSteps[userData?.progress]
    }
    else if (Object.keys(progressSteps).includes(userData?.progress)) {
        return progressSteps[userData?.progress]
    } else {
        return 0
    }
}