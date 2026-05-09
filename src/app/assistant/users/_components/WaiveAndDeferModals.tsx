"use client"
import AppModal from "@/components/modals/AppModal"
import { useAdminUserDetailContext } from "../context/userDetailContext"
import { useAdminMutations } from "@/hooks/api/admin.api"
import toast from "react-hot-toast"

export const WaiveModal = ({ open, setIsOpen }: { open: boolean, setIsOpen: (value: boolean) => void }) => {
    const { user } = useAdminUserDetailContext()
    const { coachingSessionMutation } = useAdminMutations()

    const isLoading = coachingSessionMutation.isPending
    return (
        <AppModal
            isOpen={open}
            onClose={() => setIsOpen(false)}
        >
            <div className="bg-white h-96 p-6 rounded-2xl">
                <h2 className="text-24 font-bold  font-sharp-grotesk">CONFIRMATION</h2>
                <br />
                <br />
                <p>
                    You've made the decision to waive your right to access the discretionary complementary
                    Screening /Interview Preparatory Sessions and Post Market Entry Status Investigations.
                    With that noted, we're pleased to advance your profile to the next stage. It's
                    important to remember that foregoing these preparatory sessions may impact your
                    interview performance during the application process, we cannot be held responsible
                    for your performance during interviews within the applications campaign as it could
                    result in delayed conversions to offer letters. Kindly confirm with YES/NO to proceed?
                </p>

                <div className="flex items-center gap-4 my-2 justify-center">
                    <button
                        className={`mr-2 border w-[90%] mobile:w-auto flex justify-between lg:justify-normal items-center text-white border-career-blue-800 bg-career-blue-800 capitalize px-6 py-3 h-[2.75rem] rounded-[0.25rem] text-14 font-medium ${isLoading ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                        color="blue"
                        onClick={() => {
                            toast.loading("Processing request")
                            coachingSessionMutation.mutate({
                                action: "waive",
                                email: user?.email as string,
                                lastName: user?.lastName as string,
                                firstName: user?.firstName as string
                            },
                            {
                                onSuccess(){
                                    toast.success("Session waived")
                                },
                                onError(){
                                    toast.error("Unable to waive session")
                                }
                            }
                            )
                        }}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Loading...' : 'Yes'}
                    </button>

                    <button
                        className={`mr-2 border my-4 mobile:my-0 w-[90%] mobile:w-auto flex items-center bg-white border-career-blue-800 text-career-blue-800 capitalize px-6 py-3 h-[2.75rem] rounded-[0.25rem] text-14 font-medium ${isLoading ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                        color="blue"
                        onClick={() => setIsOpen(false)}
                        disabled={isLoading}
                    >
                        No
                    </button>
                </div>
            </div>
        </AppModal>
    )
}

export const DeferModal = ({ open, setIsOpen }: { open: boolean, setIsOpen: (value: boolean) => void }) => {
    const { user } = useAdminUserDetailContext()
    const { coachingSessionMutation } = useAdminMutations()
    const isLoading = coachingSessionMutation.isPending
    return (
        <AppModal
            isOpen={open}
            onClose={() => setIsOpen(false)}
        >
            <div className="bg-white p-6 rounded-2xl max-w-md">
                <h2 className="text-24 font-medium font-sharp-grotesk">DEFER SESSION</h2>
                <br />
                <p className="mb-4">
                    By deferring, you're keeping your session credit for future use. You can schedule this
                    session whenever you're ready.
                </p>

                <p className="mb-4 font-medium">Are you sure you want to defer this session?</p>

                <div className="flex items-center gap-4 justify-center">
                    <button
                        className={`mr-2 border w-[90%] mobile:w-auto flex justify-between lg:justify-normal items-center text-white border-career-blue-800 bg-career-blue-800 capitalize px-6 py-3 h-[2.75rem] rounded-[0.25rem] text-14 font-medium ${isLoading ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                        onClick={() => {
                            toast.loading("Processing request")
                            coachingSessionMutation.mutate({
                                action: "defer",
                                email: user?.email as string,
                                lastName: user?.lastName as string,
                                firstName: user?.firstName as string
                            },
                            {
                                onSuccess(){
                                    toast.success("Session deferred.")
                                },
                                onError(){
                                    toast.error("Unable to defer session")
                                }
                            }
                            )
                        }}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Processing...' : 'Confirm Deferral'}
                    </button>

                    <button
                        className={`mr-2 border my-4 mobile:my-0 w-[90%] mobile:w-auto flex items-center bg-white border-career-blue-800 text-career-blue-800 capitalize px-6 py-3 h-[2.75rem] rounded-[0.25rem] text-14 font-medium ${isLoading ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                        onClick={() => setIsOpen(false)}
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </AppModal>
    )
}