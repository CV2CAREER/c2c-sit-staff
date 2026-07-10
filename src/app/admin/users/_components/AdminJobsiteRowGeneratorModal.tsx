'use strict';

import { useState } from "react";
import { useAdminMutations } from "@/hooks/api/admin.api";
import { FiUser, FiMail, FiCheck, FiAlertTriangle } from "react-icons/fi";
import useModal from "@/hooks/useModal";
import AnimatedButton from "@/components/ui/animated-button";
import { CloseButton } from "@headlessui/react";
import toast from "react-hot-toast";

interface AdminJobsiteRowGeneratorModalProps {
    user: any;
    userId: string;
    missingJobsiteRows: boolean;
}

const AdminJobsiteRowGeneratorModal = ({ user, userId, missingJobsiteRows = false }: AdminJobsiteRowGeneratorModalProps) => {
    const { isOpen, setIsOpen, handleClose, modalRef } = useModal();
    const { generateJobsiteRowsMutation } = useAdminMutations();
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerateJobsiteRows = async () => {
        setIsSuccess(false);
        setError(null);

        generateJobsiteRowsMutation.mutate(
            { userId },
            {
                onSuccess: (response: any) => {
                    if (response.success) {
                        setIsSuccess(true);
                        toast.success("Jobsite rows generated successfully");
                    } else {
                        setError(response.message || 'Failed to generate jobsite rows');
                        toast.error(response.message || 'Failed to generate jobsite rows');
                    }
                },
                onError: (err: any) => {
                    setError(err.message || 'An unexpected error occurred');
                    toast.error(err.message || 'An unexpected error occurred');
                }
            }
        );
    };

    return (
        <div className="my-5">
            <AnimatedButton
                onClick={() => setIsOpen(true)}
                label="Generate Jobsite Rows"
                variant={missingJobsiteRows ? "primary" : "secondary"}
                className="px-4 py-2 text-sm font-medium !rounded-full"
                loadingLabel="Please Wait..."
                isLoading={!user}
                disabled={!missingJobsiteRows}
                tooltip={!missingJobsiteRows ? "This user has jobsite data" : undefined}
            />

            {isOpen && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div
                        ref={modalRef}
                        className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-gray-200" >
                        <div className="flex justify-between items-center p-6 border-b border-gray-100">
                            <div>
                                <h3 className="text-xl font-semibold text-gray-800">Generate Jobsite Rows</h3>
                                <p className="text-sm text-gray-500 mt-1">Administrative Action</p>
                            </div>
                            <CloseButton
                                onClick={handleClose}
                            />
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <div className="flex items-center space-x-4">
                                    <div className="bg-blue-100 p-3 rounded-full">
                                        <FiUser className="text-blue-600 text-lg" />
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-gray-800">{`${user?.user?.firstName ?? user?.firstName ?? ''} ${user?.user?.lastName ?? user?.lastName ?? ''}`}</h4>
                                        <div className="flex items-center text-sm text-gray-500 mt-1">
                                            <FiMail className="mr-2" />
                                            {user?.user?.email ?? user?.email}
                                        </div>
                                        {(user?.user?.country ?? user?.country) && (
                                            <div className="text-sm text-gray-500 mt-1">
                                                Country: {user?.user?.country ?? user?.country}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                                <h4 className="text-sm font-medium text-blue-800 mb-2">What this will do:</h4>
                                <ul className="space-y-2 text-sm text-blue-600">
                                    <li className="flex items-start">
                                        <FiCheck className="text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                                        Create missing jobsite rows for this user
                                    </li>
                                    <li className="flex items-start">
                                        <FiCheck className="text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                                        Populate all required client input tables
                                    </li>
                                    <li className="flex items-start">
                                        <FiCheck className="text-blue-500 mr-2 mt=0.5 flex-shrink-0" />
                                        Trigger sample results generation
                                    </li>
                                    <li className="flex items-start">
                                        <FiCheck className="text-blue-500 mr-2 mt=0.5 flex-shrink-0" />
                                        Send completion notifications
                                    </li>
                                </ul>
                            </div>

                            {isSuccess && (
                                <div className="bg-green-50/80 p-4 rounded-lg border border-green-100">
                                    <div className="flex items-center">
                                        <FiCheck className="text-green-500 mr-3 text-xl" />
                                        <div>
                                            <h4 className="font-medium text-green-800">Success!</h4>
                                            <p className="text-sm text-green-600 mt-1">
                                                Jobsite rows created successfully for {`${user?.user?.firstName ?? user?.firstName ?? ''} ${user?.user?.lastName ?? user?.lastName ?? ''}`}.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="bg-red-50/80 p-4 rounded-lg border border-red-100">
                                    <div className="flex items-center">
                                        <FiAlertTriangle className="text-red-500 mr-3 text-xl" />
                                        <div>
                                            <h4 className="font-medium text-red-800">Error</h4>
                                            <p className="text-sm text-red-600 mt-1">{error}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-3 p-6 border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
                            <AnimatedButton
                                onClick={handleClose}
                                label="Cancel"
                                variant="secondary"
                                className="px-5 py-2.5 text-sm flex-1"
                                disabled={generateJobsiteRowsMutation.isPending}
                            />
                            <AnimatedButton
                                onClick={() => {isSuccess ? window.location.reload() : handleGenerateJobsiteRows()}}
                                isLoading={generateJobsiteRowsMutation.isPending}
                                isSuccess={isSuccess}
                                label="Generate Rows"
                                loadingLabel="Processing..."
                                successLabel="Completed!"
                                disabled={generateJobsiteRowsMutation.isPending}
                                variant="primary"
                                className="flex-1"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminJobsiteRowGeneratorModal;