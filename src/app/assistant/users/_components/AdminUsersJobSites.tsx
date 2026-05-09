import React, { useState } from "react"
import { useAdminQueries, useAdminMutations } from "@/hooks/api/admin.api"
import { useAdminUserDetailContext } from "../context/userDetailContext"
import AdminJobsiteRowGeneratorModal from "./AdminJobsiteRowGeneratorModal"
import Table from "@/components/newTable/Table"
import toast from 'react-hot-toast';


const AdminUsersJobSites = ({ userId }: { userId: string }) => {
    const [allowJobsiteEdit, setAllowJobsiteEdit] = useState(false)
    const [editingJobsite, setEditingJobsite] = useState<any>(null)
    const { user } = useAdminUserDetailContext()

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

    const setupAliasmail = (username: string) => {
        const emailPart = username?.split("@")[0];
        const domain = username?.split("@")[1]?.split(".")[0];
        const aliasEmail = emailPart + domain + "@cvtocareer.com";
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
                renderCell: (params: any) => params?.row?.aggregator?.name ?? '-',
            },
            {
                field: 'generatedEmail',
                headerName: 'Generated Email',
                width: 300,
                type: 'generatedEmail',
                cellClassName: 'el',
                headerClassName: 'bg-[#80D7FF]',
                renderCell: (params: any) => {
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
                            {isClientDataLoading ? "Loading..." : <p className="text-blue-400 text-lg font-medium">No job sites available</p>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default AdminUsersJobSites
