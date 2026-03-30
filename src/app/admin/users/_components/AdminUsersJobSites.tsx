import { useAdminQueries, useAdminMutations } from "@/hooks/api/admin.api"
import React, { useState } from "react"
import { useAdminUserDetailContext } from "../context/userDetailContext"
import AdminJobsiteRowGeneratorModal from "./AdminJobsiteRowGeneratorModal"
import Table from "@/components/newTable/Table"
import CustomButton from "@/components/CustomButton/CustomButton"
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query'
import UpdateJobsite from "./UpdateJobsite"


const AdminUsersJobSites = ({ userId }: { userId: string }) => {
    const [allowJobsiteEdit, setAllowJobsiteEdit] = useState(false)
    const [editingJobsite, setEditingJobsite] = useState<any>(null)
    const { user } = useAdminUserDetailContext()
    const [triggeredJobsite, setTriggeredJobsite] = useState(null)
    const queryClient = useQueryClient();

    const { clientJobsiteDomain: aggregatorsData } = useAdminQueries({
        userId,
        fetchClientJobsite: true,
    });
    const aggregators = aggregatorsData.data || [];
    const isClientDataLoading = aggregatorsData.isLoading;

    const { triggerJobsiteMutation, deleteJobsiteMutation, updateJobsiteMutation } = useAdminMutations();

    async function triggerJobsite(agg: any) {
        try {
            setTriggeredJobsite(agg.aggregator?._id)
            await triggerJobsiteMutation.mutateAsync({ aggId: agg.aggregator?._id, userId });
            toast.success('Jobsite triggered successfully.')
        } catch (err: any) {
            toast.error(err.response?.data?.message ?? "Trigger jobsite failed")
        } finally {
            setTriggeredJobsite(null)
        }
    }

    async function handleDeleteJobsite(agg: any) {
        try {
            toast.loading('deleting')
            await deleteJobsiteMutation.mutateAsync({ aggId: agg.aggregator?._id, userId });
            toast.success('Jobsite deleted successfully.')
            
            // Invalidate search query
            queryClient.invalidateQueries({ queryKey: ["admin-client-jobsite", userId]});
        } catch (err: any) {
            toast.error(err.response?.data?.message ?? "Delete jobsite failed")
        } finally {
            setTriggeredJobsite(null)
        }
    }

    async function handleUpdateJobsite(agg: any) {
        if (!editingJobsite) return

        const tId = toast.loading('Updating jobsite...')

        try {
            const payload = { username: agg.username, password: agg.password, userId: userId, aggId: agg?.id, generatedEmail: agg.generatedEmail }
            await updateJobsiteMutation.mutateAsync(payload);
            toast.success('Jobsite updated.', { id: tId })
            queryClient.invalidateQueries({ queryKey: ["admin-client-jobsite", userId]});
        } catch (err:any) {
            toast.error(err.response?.data?.message ?? 'Failed to update jobsite', { id: tId })
        }
    }

    const setupAliasmail = (username: string) => {
        const emailPart = username?.split("@")[0]; // separate the email from the domain
        const domain = username?.split("@")[1]?.split(".")[0]; // get the domain
        const aliasEmail = emailPart + domain + "@cvtocareer.com"; // combine the email with the alias domain
        return aliasEmail
    }

    function modifyArray(modifiedArr: any[]) {
        modifiedArr = modifiedArr.filter(
        (el) => el.field !== 'isVerified' && el.field !== 'aggregator' && el.field !== '_id' && el.field !== 'nominatedDeveloper' && el.field !== 'updatedBy' && el.field !== 'note',
        );

        modifiedArr.push(
            {
                field: 'jobsite',
                headerName: 'jobsite',
                width: 300,
                type: 'jobsite',
                cellClassName: 'el',
                headerClassName: 'bg-[#80D7FF]',
            },
            {
                field: 'generatedEmail',
                headerName: 'Generated Email',
                width: 300,
                type: 'generatedEmail',
                cellClassName: 'el',
                headerClassName: 'bg-[#80D7FF]',
                renderCell: (params: any) => {
                    // console.log(params, "Jobsite table params")
                    return setupAliasmail(params?.row?.username)
                }
            },
            {
                field: 'isVerified',
                headerName: 'status',
                width: 300,
                type: 'status',
                cellClassName: 'el',
                headerClassName: 'bg-[#80D7FF]',
            },
            {
                field: 'triggerJobsite',
                headerName: 'Trigger Jobsite',
                width: 300,
                type: 'triggerJobsite',
                cellClassName: 'el',
                headerClassName: 'bg-[#80D7FF] text-black font-semibold',
                renderCell: (params: any) => {
                return (
                    <CustomButton customBtnClass='h-[45px]' isSubmitting={params.row?.aggregator?._id && params.row?.aggregator?._id == triggeredJobsite} isDisabled={params.row?.aggregator?._id == triggeredJobsite} title="Trigger Jobsite" handleClick={async () => {
                        await triggerJobsite(params.row)
                    }} />
                );
                }
            },
        );
        return modifiedArr;
    }

    return (
        <div className="bg-white shadow-sm rounded-sm mb-8">
            <div className="p-6 pt-2">
                <div className="flex items-center justify-between gap-4 mb-6">
                    <h3 className="text-2xl font-semibold">Job Sites</h3>
                    <AdminJobsiteRowGeneratorModal
                        missingJobsiteRows={!aggregators?.length}
                        user={user}
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
                                id: p.aggregator?._id
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
                            {isClientDataLoading ? "Loading" : <p className="text-blue-400 text-lg font-medium">No job sites available</p>}
                        </div>
                    )}
                </div>
                {
                    editingJobsite != null && (
                        <UpdateJobsite visibility={editingJobsite !== null} toggleVisibility={() => setEditingJobsite(null)} data={editingJobsite} handleSubmit={handleUpdateJobsite} />
                    )
                }
            </div>
        </div>
    )
}

export default AdminUsersJobSites