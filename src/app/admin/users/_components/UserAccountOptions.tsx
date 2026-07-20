import Icon from "../../../../../public/icons"
import { Menu, MenuHandler, MenuItem, MenuList } from "@material-tailwind/react";
import { useState } from "react";
import { useAdminQueries } from "@/hooks/api/admin.api";
import AppModal from "@/components/modals/AppModal";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import FurtherUserAccountActions from "./FurtherUserAccountActions";
import { useMutateData } from "@/hooks/useApi";
import { useQueryClient } from "@tanstack/react-query";
import { ADMIN_USER_PLAN_UPGRADE, ADMIN_ACTIVATE_CORAL, ADMIN_DEACTIVATE_CORAL } from "@/constants/apiEndpoints/admin.endpoint";

const UserAccountOptions = ({ userId }: { userId: string }) => {
    const { featureTitlesDomain: planOptions, userDetailDomain: userData } = useAdminQueries({
        fetchFeatureTitles: true,
        userId,
        fetchUserDetail: true,
    });
    const plans = planOptions?.data?.features || []
    const user = userData?.data?.user;
    const isAmbassador = user?.isAmbassador === true;
    const hasCoralActive = isAmbassador && user?.plan?.toLowerCase() === "coral" && user?.isUserSubscribed === true;
    const activePlan = user?.activePlan as any;

    const [showModal, setShowModal] = useState(false)
    const [showCoralModal, setShowCoralModal] = useState(false)
    const [showDeactivateModal, setShowDeactivateModal] = useState(false)
    const [selectedPlan, setSelectedPlan] = useState<string | undefined>(undefined)
    const [selectedFeatureId, setSelectedFeatureId] = useState<string | undefined>(undefined)

    return (
        <div
            className="relative p-1.5 shadow-lg lg:shadow-none rounded-lg w-full lg:w-auto"
        >
            {/* Coral plan details card — only visible when ambassador has active Coral */}
            {isAmbassador && hasCoralActive && activePlan && (
                <div className="mb-3 p-3 rounded-lg border border-orange-200 bg-orange-50 text-sm">
                    <p className="font-semibold text-orange-800 mb-1">Coral Plan Active</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-orange-700">
                        {activePlan.validityPeriod && (
                            <span>Duration: <span className="font-medium">{activePlan.validityPeriod}</span></span>
                        )}
                        {activePlan.expiresAt && (
                            <span>Expires: <span className="font-medium">
                                {new Date(activePlan.expiresAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                            </span></span>
                        )}
                        {activePlan.expiresAt && (() => {
                            const days = Math.ceil((new Date(activePlan.expiresAt).getTime() - Date.now()) / 86400000);
                            return days > 0
                                ? <span className="font-medium text-green-700">{days} day{days !== 1 ? "s" : ""} remaining</span>
                                : <span className="font-medium text-red-600">Expired</span>;
                        })()}
                    </div>
                </div>
            )}

            <div className="flex flex-col mobile:flex-row items-center cursor-pointer p-2 gap-2">
                <UpgradePlanOptions setSelectedPlan={setSelectedPlan} setSelectedFeatureId={setSelectedFeatureId} setShowModal={setShowModal} plans={plans} />

                {isAmbassador && (
                    hasCoralActive ? (
                        <button
                            onClick={() => setShowDeactivateModal(true)}
                            className="mr-2 border my-4 mobile:my-0 w-[90%] mobile:w-auto flex items-center bg-red-600 border-red-600 text-white capitalize px-6 py-3 h-[2.75rem] rounded-[0.25rem] text-14 font-medium hover:bg-red-700 transition-colors"
                        >
                            Deactivate Coral
                        </button>
                    ) : (
                        <button
                            onClick={() => setShowCoralModal(true)}
                            className="mr-2 border my-4 mobile:my-0 w-[90%] mobile:w-auto flex items-center bg-orange-500 border-orange-500 text-white capitalize px-6 py-3 h-[2.75rem] rounded-[0.25rem] text-14 font-medium hover:bg-orange-600 transition-colors"
                        >
                            Activate Coral
                        </button>
                    )
                )}

                <button
                    className="mr-2 border my-4 mobile:my-0 w-[90%] mobile:w-auto flex items-center bg-white border-career-blue-800 text-career-blue-800 capitalize px-6 py-3 h-[2.75rem] rounded-[0.25rem] text-14 font-medium"
                >
                    Export
                </button>
                <FurtherUserAccountActions userId={userId}/>
            </div>

            {showModal && <UpgradeAccountModal isOpen={showModal} toggleOpen={setShowModal} tier={selectedPlan as string} featureId={selectedFeatureId as string} userId={userId} />}
            {showCoralModal && <ActivateCoralModal isOpen={showCoralModal} toggleOpen={setShowCoralModal} userId={userId} />}
            {showDeactivateModal && <DeactivateCoralModal isOpen={showDeactivateModal} toggleOpen={setShowDeactivateModal} userId={userId} />}
        </div>
    )
}

export default UserAccountOptions

const UpgradeAccountModal = ({ isOpen, toggleOpen, tier, featureId, userId }: { isOpen: boolean, toggleOpen: (value: boolean) => void, tier: string, featureId: string, userId: string }) => {
    const queryClient = useQueryClient();
    const upgradePlanMutation = useMutateData<any, { featureId: string }>({
        method: "PATCH",
        url: ADMIN_USER_PLAN_UPGRADE(userId),
        mutationKey: ["admin-upgrade-plan-modal"],
        onSuccess: () => {
            toast.success("User plan upgraded successfully");
            queryClient.invalidateQueries({ queryKey: ["admin-fetch-plans"] });
            queryClient.invalidateQueries({ queryKey: ["admin-feature-titles"] });
            queryClient.invalidateQueries({ queryKey: ["admin-user-detail"] });
        },
        onError: () => {
            toast.error("Failed to upgrade user plan");
        },
    })
    const upgradePlan = () => {
        toast.loading("Updating user plan")
        upgradePlanMutation.mutate({
            featureId: featureId,
        }, {
            onError(error: any) {
                if (error?.response?.data?.message) {
                    toast.error(error.response.data.message)
                }
            },
        })
        toggleOpen(false)
    }

    return (
        <AppModal
            isOpen={isOpen}
            onClose={() => toggleOpen(false)}
            title={`Upgrade Account`}
        >
            <h1 className="!font-medium font-sharp-grotesk text-career-black-200 text-32 my-4">
                Account Upgrade
            </h1>
            <p className="text-career-gray-200">
                Confirm account upgrade to {tier}
            </p>
            <div className="flex items-center mt-6">
                <Button
                    className={`!h-[2.75rem] mr-4 !w-[113px] !rounded-[0.25rem] bg-white !text-career-blue-800 !border !border-career-blue-800 hover:!bg-career-blue-500 hover:!text-white`}
                    onClick={upgradePlan}
                >
                    Continue
                </Button>
                <Button
                    className="!h-[2.75rem] !w-[113px] !rounded-[0.25rem] mr-4"
                    onClick={() => toggleOpen(false)}
                >Cancel</Button>
            </div>
        </AppModal>
    )
}

const ActivateCoralModal = ({ isOpen, toggleOpen, userId }: { isOpen: boolean, toggleOpen: (value: boolean) => void, userId: string }) => {
    const queryClient = useQueryClient();
    const activateCoralMutation = useMutateData<any, Record<string, never>>({
        method: "POST",
        url: ADMIN_ACTIVATE_CORAL(userId),
        mutationKey: ["admin-activate-coral", userId],
        onSuccess: () => {
            toast.success("Coral plan activated — 30 days added");
            queryClient.invalidateQueries({ queryKey: ["admin-user-detail"] });
        },
        onError: () => {
            toast.error("Failed to activate Coral plan");
        },
    });

    const handleActivate = () => {
        toast.loading("Activating Coral plan...");
        activateCoralMutation.mutate({}, {
            onError(error: any) {
                if (error?.response?.data?.message) {
                    toast.error(error.response.data.message);
                }
            },
        });
        toggleOpen(false);
    };

    return (
        <AppModal
            isOpen={isOpen}
            onClose={() => toggleOpen(false)}
            title="Activate Coral Plan"
        >
            <h1 className="!font-medium font-sharp-grotesk text-career-black-200 text-32 my-4">
                Activate Coral Plan
            </h1>
            <p className="text-career-gray-200">
                This will grant the ambassador 30 days of Coral access. A confirmation email will be sent to them.
            </p>
            <div className="flex items-center mt-6">
                <Button
                    className="!h-[2.75rem] mr-4 !w-[113px] !rounded-[0.25rem] bg-orange-500 !text-white hover:bg-orange-600"
                    onClick={handleActivate}
                >
                    Activate
                </Button>
                <Button
                    className="!h-[2.75rem] !w-[113px] !rounded-[0.25rem] mr-4"
                    onClick={() => toggleOpen(false)}
                >
                    Cancel
                </Button>
            </div>
        </AppModal>
    );
};

const DeactivateCoralModal = ({ isOpen, toggleOpen, userId }: { isOpen: boolean, toggleOpen: (value: boolean) => void, userId: string }) => {
    const queryClient = useQueryClient();
    const deactivateCoralMutation = useMutateData<any, Record<string, never>>({
        method: "DELETE",
        url: ADMIN_DEACTIVATE_CORAL(userId),
        mutationKey: ["admin-deactivate-coral", userId],
        onSuccess: () => {
            toast.success("Coral plan deactivated");
            queryClient.invalidateQueries({ queryKey: ["admin-user-detail"] });
        },
        onError: () => {
            toast.error("Failed to deactivate Coral plan");
        },
    });

    const handleDeactivate = () => {
        toast.loading("Deactivating Coral plan...");
        deactivateCoralMutation.mutate({}, {
            onError(error: any) {
                if (error?.response?.data?.message) {
                    toast.error(error.response.data.message);
                }
            },
        });
        toggleOpen(false);
    };

    return (
        <AppModal
            isOpen={isOpen}
            onClose={() => toggleOpen(false)}
            title="Deactivate Coral Plan"
        >
            <h1 className="!font-medium font-sharp-grotesk text-career-black-200 text-32 my-4">
                Deactivate Coral Plan
            </h1>
            <p className="text-career-gray-200">
                This will immediately revoke the ambassador's Coral access. This action cannot be undone — you will need to activate Coral again to restore access.
            </p>
            <div className="flex items-center mt-6">
                <Button
                    className="!h-[2.75rem] mr-4 !w-[113px] !rounded-[0.25rem] !bg-red-600 !text-white hover:!bg-red-700"
                    onClick={handleDeactivate}
                >
                    Deactivate
                </Button>
                <Button
                    className="!h-[2.75rem] !w-[113px] !rounded-[0.25rem] mr-4"
                    onClick={() => toggleOpen(false)}
                >
                    Cancel
                </Button>
            </div>
        </AppModal>
    );
};

const UpgradePlanOptions = (
    {plans, setShowModal, setSelectedPlan, setSelectedFeatureId}
    :{plans: any[], setShowModal: (show:boolean)=> void, setSelectedPlan: (plan: string) => void, setSelectedFeatureId: (id: string) => void}) => {
    return (
        <Menu placement="bottom-start">
            <MenuHandler>
                <Button className="text-white mr-2 border w-[90%] mobile:w-auto flex justify-between lg:justify-normal items-center border-career-blue-800 bg-career-blue-300 capitalize px-6 py-3 h-[2.75rem] rounded-[0.25rem] text-14 font-medium">
                    <p>Upgrade Account</p>
                    <Icon name="caretDown" />
                </Button>
            </MenuHandler>
            <MenuList
                placeholder=""
                onPointerEnterCapture={() => { }}
                onPointerLeaveCapture={() => { }}
                onResize={() => { }}
                onResizeCapture={() => { }}
                className="p-0 w-72 rounded-[4px] bg-white h-auto flex flex-col justify-center -ml-16 absolute z-50"
            >
                {
                    plans.map((plan) => (
                        <MenuItem
                            placeholder=""
                            onPointerEnterCapture={() => { }}
                            onPointerLeaveCapture={() => { }}
                            onResize={() => { }}
                            onResizeCapture={() => { }}
                            onClick={() => {
                                setSelectedPlan(plan.title)
                                setSelectedFeatureId(plan.id)
                                setShowModal(true);
                            }}
                            className="!p-0 z-50 hover:bg-career-blue-300"
                            key={plan.id}
                        >
                            <span className={`text-left w-full h-full py-3 px-4 block transition-all ease-in-out duration-200 font-medium`}>
                                {plan.title}
                            </span>
                        </MenuItem>
                    ))
                }
            </MenuList>
        </Menu>
    )
}
