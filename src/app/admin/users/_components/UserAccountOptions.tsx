import Icon from "../../../../../public/icons"
import { Menu, MenuHandler, MenuItem, MenuList } from "@material-tailwind/react";
import { useState } from "react";
// import { useAdminUserDetailContext } from "../context/userDetailContext";
import { useAdminQueries, useAdminMutations } from "@/hooks/api/admin.api";
import AppModal from "@/components/modals/AppModal";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import FurtherUserAccountActions from "./FurtherUserAccountActions";

const UserAccountOptions = ({ userId }: { userId: string }) => {
    // const { user } = useAdminUserDetailContext()
    // const [showUpgradeOptions, setShowUpgradeOptions] = useState(false)
    const { plansDomain: planOptions } = useAdminQueries({
        fetchPlans: true,
    });
    const plans = planOptions?.data || []
    const [showModal, setShowModal] = useState(false)
    const [selectedPlan, setSelectedPlan] = useState<string | undefined>(undefined)

    return (
        <div
            className="relative p-1.5 shadow-lg lg:shadow-none rounded-lg w-full lg:w-auto"
        >
            <div className="flex flex-col mobile:flex-row items-center cursor-pointer p-2">
                <UpgradePlanOptions setSelectedPlan={setSelectedPlan} setShowModal={setShowModal} plans={plans} />
                <button
                    className="mr-2 border my-4 mobile:my-0 w-[90%] mobile:w-auto flex items-center bg-white border-career-blue-800 text-career-blue-800 capitalize px-6 py-3 h-[2.75rem] rounded-[0.25rem] text-14 font-medium"
                >
                    Export
                </button>
                <FurtherUserAccountActions userId={userId}/>
            </div>
            <UpgradeAccountModal isOpen={showModal} toggleOpen={setShowModal} tier={selectedPlan as string} userId={userId} />
        </div>
    )
}

export default UserAccountOptions

const UpgradeAccountModal = ({ isOpen, toggleOpen, tier, userId }: { isOpen: boolean, toggleOpen: (value: boolean) => void, tier: string, userId: string }) => {
    const { upgradePlanMutation } = useAdminMutations()
    const upgradePlan = () => {
        toast.loading("Updating user plan")
        upgradePlanMutation.mutate({
            plan: tier,
            userId: userId
        }, {
            onError(error : {response: {data: {message: string | undefined} | undefined} | undefined} | any) {
                if (error?.response?.data.message) {
                    toast.error(error.response.data.message)
                }
            },
            onSuccess() {
                toast.success("User plan upgraded successfully")
            }
        })
        toggleOpen(false)
    }

    return (
        <AppModal
            isOpen={isOpen}
            onClose={() => toggleOpen(false)}
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

const UpgradePlanOptions = (
    {plans, setShowModal, setSelectedPlan}
    :{plans: any[], setShowModal: (show:boolean)=> void, setSelectedPlan: (plan: string) => void}) => {
        // console.log("plans", plans)
    return (
        <Menu placement="bottom-start">
            <MenuHandler>
                <Button className="text-white mr-2 border w-[90%] mobile:w-auto flex justify-between lg:justify-normal items-center border-career-blue-800 bg-career-blue-300 capitalize px-6 py-3 h-[2.75rem] rounded-[0.25rem] text-14 font-medium">
                    {/* TODO: Add types for the icon name prop */}
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
