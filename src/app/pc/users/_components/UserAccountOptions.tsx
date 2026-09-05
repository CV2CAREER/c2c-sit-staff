import Icon from "../../../../../public/icons"
import { Menu, MenuHandler, MenuItem, MenuList } from "@material-tailwind/react";
import { Download } from "lucide-react";
import { useState } from "react";
// import { useAdminUserDetailContext } from "../context/userDetailContext";
import { useAdminQueries } from "@/hooks/api/admin.api";
import AppModal from "@/components/modals/AppModal";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import FurtherUserAccountActions from "./FurtherUserAccountActions";
import { useMutateData } from "@/hooks/useApi";
import { useQueryClient } from "@tanstack/react-query";
import { ADMIN_USER_PLAN_UPGRADE } from "@/constants/apiEndpoints/admin.endpoint";

const UserAccountOptions = ({ userId }: { userId: string }) => {
    // const { user } = useAdminUserDetailContext()
    // const [showUpgradeOptions, setShowUpgradeOptions] = useState(false)
    const { featureTitlesDomain: planOptions } = useAdminQueries({
        fetchFeatureTitles: true,
    });
    const plans = planOptions?.data?.features || []
    const [showModal, setShowModal] = useState(false)
    const [selectedPlan, setSelectedPlan] = useState<string | undefined>(undefined)
    const [selectedFeatureId, setSelectedFeatureId] = useState<string | undefined>(undefined)

    return (
        <div
            className="relative rounded-lg w-full lg:w-auto"
        >
            <div className="flex flex-col mobile:flex-row items-center gap-2 cursor-pointer">
                <UpgradePlanOptions setSelectedPlan={setSelectedPlan} setSelectedFeatureId={setSelectedFeatureId} setShowModal={setShowModal} plans={plans} />
                <Button
                    variant="outline"
                    className="w-[90%] mobile:w-auto gap-2 border-primary/20 text-primary transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                >
                    <Download size={16} /> Export
                </Button>
                <FurtherUserAccountActions userId={userId}/>
            </div>
            {showModal && <UpgradeAccountModal isOpen={showModal} toggleOpen={setShowModal} tier={selectedPlan as string} featureId={selectedFeatureId as string} userId={userId} />}
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
            <div className="flex items-center gap-3 mt-6">
                <Button
                    variant="outline"
                    className="border-primary/20 text-primary transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                    onClick={() => toggleOpen(false)}
                >
                    Cancel
                </Button>
                <Button onClick={upgradePlan}>
                    Continue
                </Button>
            </div>
        </AppModal>
    )
}

const UpgradePlanOptions = (
    {plans, setShowModal, setSelectedPlan, setSelectedFeatureId}
    :{plans: any[], setShowModal: (show:boolean)=> void, setSelectedPlan: (plan: string) => void, setSelectedFeatureId: (id: string) => void}) => {
        // console.log("plans", plans)
    return (
        <Menu placement="bottom-start">
            <MenuHandler>
                <Button className="w-[90%] mobile:w-auto gap-2 justify-between lg:justify-normal">
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
                className="p-1 w-72 rounded-lg border border-primary/15 shadow-[0_1px_10px_rgba(0,142,211,0.10)] bg-white h-auto flex flex-col justify-center -ml-16 absolute z-50"
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
                            className="!p-0 z-50 rounded-md hover:bg-primary/10"
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
