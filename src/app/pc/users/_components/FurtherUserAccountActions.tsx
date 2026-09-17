"use client"

import Icon from "../../../../../public/icons";
import AppModal from "@/components/modals/AppModal";
import { Button } from "@/components/ui/button";
import { Menu, MenuHandler, MenuItem, MenuList } from "@material-tailwind/react";
import { useState } from "react";
import { useAdminMutations } from "@/hooks/api/admin.api";



const furtherAccountOptions = [
    {
        value: "Accept Account",
        className: "text-career-gray-200 hover:bg-primary/10",
        action: "account-mutate",
        actionText: "accept this account",
        modalButtonText: "Accept",
    },
    {
        value: "Suspend Account",
        className: "text-career-gray-200 hover:bg-primary/10",
        action: "account-mutate",
        actionText: "suspend this account",
        modalButtonText: "Suspend"
    },
    {
        value: "Restrict Account",
        className: "text-career-gray-200 hover:bg-primary/10",
        action: "account-mutate",
        actionText: "restrict this account",
        modalButtonText: "Restrict"
    },
    {
        value: "Dispatch Sample Results",
        className: "text-career-gray-200 hover:bg-primary/10"
    },
    {
        value: "Accept Documents",
        className: "text-career-gray-200 hover:bg-primary/10"
    },
    {
        value: "Reject Documents",
        className: "text-red-700 hover:bg-primary/10"
    },
    {
        value: "Delete Account",
        className: "hover:bg-black text-[#B61E1E]",
        action: "account-mutate",
        actionText: "delete this account",
        modalButtonText: "Delete"
    },
    {
        value: "Assign Referrer",
        className: "text-career-gray-200 hover:bg-primary/10"
    },
    {
        value: "Update Referral Numbers",
        className: "text-career-gray-200 hover:bg-primary/10"
    },
    {
        value: "Allow Free Before Referral",
        className: "text-career-gray-200 hover:bg-primary/10"
    }
]

const FurtherUserAccountActions = ({ userId }: { userId: string }) => {
    const [isAccountMutateModalOpen, setIsAccountMutateModalOpen] = useState(false)
    const [mutateActionText, setMutateActionText] = useState("")
    const [mutateButtonStyles, setMutateButtonStyles] = useState("")
    const [mutateButtonText, setMutateButtonText] = useState("")

    const handleMenuItemClick = (action: string, actionText: string, modalButtonText: string, mutateButtonStyles: string) => {
        if (action === "account-mutate") {
            setIsAccountMutateModalOpen(true)
            setMutateActionText(actionText)
            setMutateButtonText(modalButtonText)
            setMutateButtonStyles(mutateButtonStyles)
        }
    }
    return (
        <>
            <Menu placement="bottom-end">
                <MenuHandler>
                    <button className="bg-primary/10 flex items-center justify-center w-[2.75rem] h-[2.75rem] rounded-lg transition-colors hover:bg-primary/20">
                        <Icon name="more" />
                    </button>
                </MenuHandler>
                <MenuList
                    placeholder=""
                    onPointerEnterCapture={() => { }}
                    onPointerLeaveCapture={() => { }}
                    onResize={() => { }}
                    onResizeCapture={() => { }}
                    className="p-1 w-72 rounded-lg border border-primary/15 shadow-[0_1px_10px_rgba(0,142,211,0.10)] bg-white h-auto flex flex-col justify-center -ml-12 absolute z-50"
                >
                    {

                        furtherAccountOptions.map((option, indx) => (
                            <MenuItem
                            key={indx}
                                placeholder=""
                                onPointerEnterCapture={() => { }}
                                onPointerLeaveCapture={() => { }}
                                onResize={() => { }}
                                onResizeCapture={() => { }}
                                onClick={() => handleMenuItemClick(option.action as string, option.actionText as string, option.modalButtonText as string, "")}
                                className="!p-0 z-50"
                            >
                                <span className={`text-left w-full h-full py-3 px-4 block transition-all ease-in-out duration-200 font-medium ${option.className}`}>
                                    {option.value}
                                </span>
                            </MenuItem>
                        ))
                    }
                </MenuList>
            </Menu>
            <MutateAccountModal userId={userId} action={mutateButtonText} setIsOpen={setIsAccountMutateModalOpen} open={isAccountMutateModalOpen} actionText={mutateActionText} affirmButtonStyles={mutateButtonStyles} />
        </>
    )
}

export default FurtherUserAccountActions;


const MutateAccountModal = ({ open, setIsOpen, actionText, action, affirmButtonStyles, userId }: { open: boolean, setIsOpen: (open: boolean) => void, actionText: string, action: string, affirmButtonStyles: string, userId: string }) => {


    const { accountActionMutation: acceptMutation, permanentDeleteUserMutation: deleteMutation } = useAdminMutations();

    return (
        <AppModal
            isOpen={open}
            onClose={() => setIsOpen(false)}
            contentClassName="w-[200%]"
        >
            <div className="flex justify-center">
                <div className="bg-white rounded-xl border border-primary/15 shadow-[0_1px_10px_rgba(0,142,211,0.10)] p-4 w-72">
                    <h2 className="font-semibold text-lg text-gray-900">{`Are you sure you want to ${actionText}?`}</h2>
                    <div className="flex justify-between gap-3 mt-4">
                        <Button
                            variant="outline"
                            className="flex-1 border-primary/20 text-primary transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                            onClick={() => setIsOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="flex-1"
                            onClick={() => {
                                if (action === "Accept" || action === "Suspend" || action === "Restrict") {
                                    acceptMutation.mutate({ userId, action: action.toLowerCase() })
                                } else if (action === "Delete") {
                                    deleteMutation.mutate({ userId })
                                }
                                setIsOpen(false);
                            }}
                        >
                            {action}
                        </Button>
                    </div>
                </div>
            </div>
        </AppModal>
    )
}