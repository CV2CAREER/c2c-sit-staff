import React, { useState } from "react"
import { useAdminQueries, useAdminMutations } from "@/hooks/api/admin.api"
import { useAdminUserDetailContext } from "../context/userDetailContext"
import AdminJobsiteRowGeneratorModal from "./AdminJobsiteRowGeneratorModal"
import Table from "@/components/newTable/Table"
import toast from 'react-hot-toast';
import CustomButton from "@/components/CustomButton/CustomButton"
import { HiOutlineGlobeAlt } from "react-icons/hi"


const AdminUsersJobSites = ({ userId }: { userId: string }) => {
    const [allowJobsiteEdit, setAllowJobsiteEdit] = useState(false)
    const [editingJobsite, setEditingJobsite] = useState<any>(null)
    const { user } = useAdminUserDetailContext()
    const [triggeredJobsite, setTriggeredJobsite] = useState(null)

    const { clientJobsiteDomain } = useAdminQueries({ userId, fetchClientJobsite: true })
    const { deleteJobsiteMutation, updateJobsiteMutation } = useAdminMutations()

    const rawAggregators: any[] = clientJobsiteDomain?.data?.aggregators || []
    const aggregators = rawAggregators.map((agg: any) => ({
        ...agg,
        id: agg.aggregatorId,
    }))
    const isClientDataLoading = clientJobsiteDomain?.isLoading

    function handleDeleteJobsite(aggId: string) {
        if (!aggId || deleteJobsiteMutation.isPending) return
        
        const loadingToast = toast.loading("Deleting jobsite...")
        
        deleteJobsiteMutation.mutate(
            { userId, aggId },
            {
                onSuccess: () => {
                    toast.success("Jobsite deleted successfully", { id: loadingToast })
                },
                onError: (err: any) => {
                    toast.error(err?.message || "Failed to delete jobsite", { id: loadingToast })
                },
            }
        )
    }

    function handleUpdateJobsite(updatedRow: any) {
        updateJobsiteMutation.mutate(
            { userId, aggId: updatedRow.aggregatorId, ...updatedRow },
            {
                onSuccess: () => toast.success("Jobsite updated successfully"),
                onError: (err: any) => toast.error(err?.message || "Failed to update jobsite"),
            }
        )
        return updatedRow
    }

    async function triggerJobsite(agg: any) {
        const loadingToast = toast.loading('Triggering jobsite...');

        try {
            await new Promise((resolve) => setTimeout(resolve, 2000));

            toast.dismiss(loadingToast);
            toast.success('Jobsite triggered successfully.');
        } catch (err: any) {
            toast.dismiss(loadingToast);

            toast.error(
                err.response?.data?.message ?? "Trigger jobsite failed"
            );
        } finally {
            setTriggeredJobsite(null);
        }
    }

    const setupAliasmail = (username: string) => {
        const emailPart = username?.split("@")[0];
        const domain = username?.split("@")[1]?.split(".")[0];
        const aliasEmail = emailPart + domain + "@cvtocareer.com";
        return aliasEmail
    }

    function modifyArray(modifiedArr: any[]) {
        // Remove unwanted columns
        const excludedFields = [
            'id',
            'aggregatorId',
            'isVerified',
            'aggregator',
            'nominatedDeveloper',
            'updatedBy',
            'note',
            "email",
        ];

        modifiedArr = modifiedArr.filter(
            (el) => el.field !== 'id'
        );

        modifiedArr = modifiedArr.filter(
            (el) => !excludedFields.includes(el.field)
        );

        // Move username to first column and display the real email
        const usernameIndex = modifiedArr.findIndex(
            (el) => el.field === 'username'
        );

        if (usernameIndex > -1) {
            const [usernameColumn] = modifiedArr.splice(usernameIndex, 1);
            modifiedArr.unshift({
                ...usernameColumn,
                renderCell: (params: any) =>
                    params?.row?.email || params?.row?.username || '-',
            });
        }

        modifiedArr.push(
            {
                field: 'jobsite',
                headerName: 'Jobsite',
                width: 300,
                type: 'jobsite',
                cellClassName: 'el',
                renderCell: (params: any) =>
                    params?.row?.aggregator.name ?? '-',
            },
            {
                field: 'generatedEmail',
                headerName: 'Generated Email',
                width: 300,
                type: 'generatedEmail',
                cellClassName: 'el',
                renderCell: (params: any) => {
                    return setupAliasmail(params?.row?.username);
                },
            },
            // {
            //     field: 'isVerified',
            //     headerName: 'status',
            //     width: 300,
            //     type: 'status',
            //     cellClassName: 'el',
            //     headerClassName: 'bg-[#80D7FF]',
            //     renderCell: (params: any) => {
            //         return setupAliasmail(params?.isEnabled);
            //     },
            // },
            {
                field: 'triggerJobsite',
                headerName: 'Trigger Jobsite',
                width: 300,
                type: 'triggerJobsite',
                cellClassName: 'el',
                renderCell: (params: any) => {
                    return (
                        <CustomButton
                            customBtnClass="h-[45px]"
                            isSubmitting={
                                params.row?.id &&
                                params.row?.id === triggeredJobsite
                            }
                            isDisabled={
                                params.row?.id === triggeredJobsite
                            }
                            title="Trigger Jobsite"
                            handleClick={async () => {
                                await triggerJobsite(params.row?.id);
                            }}
                        />
                    );
                },
            },
        );

        return modifiedArr;
    }

    return (
        <div className="relative overflow-hidden rounded-xl border border-primary/15 bg-white shadow-[0_1px_10px_rgba(0,142,211,0.10)] mb-8">
            <div className="p-4 md:p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <HiOutlineGlobeAlt size={20} />
                        </span>
                        <h3 className="text-xl md:text-2xl font-semibold">Job Sites</h3>
                    </div>
                    <AdminJobsiteRowGeneratorModal
                        missingJobsiteRows={!aggregators?.length}
                        user={user}
                        userId={userId}
                    />
                </div>

                <div className='bg-white p-4 rounded-xl'>
                    {!!aggregators?.length ? (
                        <Table
                            allowDelete={true}
                            data={aggregators}
                            helpers={{}}
                            modifyArray={modifyArray}
                            tableName="ADMIN_USER_DETAIL_JOB_SITE"
                            editMode={allowJobsiteEdit}
                            setEditMode={setAllowJobsiteEdit}
                            onRowClick={({ row: p }: any) => {
                            allowJobsiteEdit && setEditingJobsite({
                                name: p.aggregator?.name,
                                password: p?.password,
                                username: p?.username,
                                generatedEmail: p?.generatedEmail,
                                id: p.aggregator?.id
                            })
                            }}
                            checkBoxSelection={false}
                            handleDelete={handleDeleteJobsite}
                            onRowUpdate={handleUpdateJobsite}
                            isLoading={isClientDataLoading}
                            hideXFlow={true}
                        />
                    ) : (
                        <div className="text-center py-8">
                            {isClientDataLoading ? "Loading..." : <p className="text-primary text-lg font-medium">No job sites available</p>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default AdminUsersJobSites