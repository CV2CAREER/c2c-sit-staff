// import { useAdminQueries, useAdminMutations } from "@/hooks/api/admin.api"
import React, { useState } from "react"
import { useAdminUserDetailContext } from "../context/userDetailContext"
import AdminJobsiteRowGeneratorModal from "./AdminJobsiteRowGeneratorModal"
import Table from "@/components/newTable/Table"
import CustomButton from "@/components/CustomButton/CustomButton"
import toast from 'react-hot-toast';
// import { useQueryClient } from '@tanstack/react-query'
// import UpdateJobsite from "./UpdateJobsite"


const AdminUsersJobSites = ({ userId }: { userId: string }) => {
    const [allowJobsiteEdit, setAllowJobsiteEdit] = useState(false)
    const [editingJobsite, setEditingJobsite] = useState<any>(null)
    const { user } = useAdminUserDetailContext()
    const aggregators: any[] = [];
    const isClientDataLoading = false;

    function triggerJobsite() {
        toast.success("Coming Soon! Jobsite feature is not available yet.")
    }

    function handleDeleteJobsite() {
        toast.success("Coming Soon! Jobsite feature is not available yet.")
    }

    function handleUpdateJobsite() {
        toast.success("Coming Soon! Jobsite feature is not available yet.")
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
                renderCell: () => {
                return (
                    <CustomButton customBtnClass='h-[45px]' isSubmitting={false} isDisabled={false} title="Trigger Jobsite" handleClick={() => {
                        triggerJobsite()
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
                            // onRowUpdate={handleUpdateJobsite}
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
                    // editingJobsite != null && (
                    //     <UpdateJobsite visibility={editingJobsite !== null} toggleVisibility={() => setEditingJobsite(null)} data={editingJobsite} handleSubmit={handleUpdateJobsite} />
                    // )
                }
            </div>
        </div>
    )
}

export default AdminUsersJobSites