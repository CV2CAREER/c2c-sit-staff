"use client"
import { useAdminQueries } from "@/hooks/api/admin.api"
import PulseLoader from "../../_components/DropDown/loader"
import { GridToolbar } from "@mui/x-data-grid-pro"
import { useState } from "react"
import generateJobHistoryColumns from "./jobHistoryColumns"
import { StyledDataGridPro } from "@/utils/table"
import { HiOutlineClock } from "react-icons/hi"

const AdminUserJobPreferenceHistory = ({ userId }: { userId: string }) => {
    const [paginationModel, setPaginationModel] = useState({
        page: 0,
        pageSize: 20
    })
    const { userPreferencesHistoryDomain } = useAdminQueries({
        userId,
        fetchUserPreferencesHistory: true,
        profileHistorySkip: paginationModel.page * paginationModel.pageSize,
    });
    const profileHistoryData = userPreferencesHistoryDomain.data;
    const isLoading = userPreferencesHistoryDomain.isLoading;
    const rows = profileHistoryData?.history || []
    const totalCount = profileHistoryData?.history?.length || 0
    // console.log(profileHistoryData)
    return (
        <>
            <div className="relative mt-6 w-full overflow-hidden rounded-3xl border border-career-gray-300/60 bg-white p-4 shadow-sm md:p-8">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-career-blue-800 via-career-blue-300 to-career-blue-800" />
                {isLoading ? (
                    <PulseLoader />
                ) : (
                    <>
                        <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-career-blue-800/10 text-career-blue-800">
                                <HiOutlineClock size={20} />
                            </span>
                            <h3 className="text-lg md:text-2xl text-career-black-200 font-medium font-sharp-grotesk">
                                User Job Preference History
                            </h3>
                        </div>
                        <div className="h-fit w-[100%] mt-8">
                            <StyledDataGridPro
                                rows={rows}
                                columns={generateJobHistoryColumns()}
                                // getRowClassName={getRowClassName}
                                paginationMode="server"
                                rowCount={totalCount}
                                pagination
                                rowBufferPx={100}
                                columnBufferPx={5}
                                rowReordering
                                slots={{
                                    toolbar: GridToolbar,
                                }}
                                showToolbar={true}
                                // onColumnOrderChange={(e) => {
                                //     moveTo(tableName, e.column.field, e.targetIndex)
                                // }}
                                onPaginationModelChange={setPaginationModel}
                                paginationModel={paginationModel}
                                disableRowSelectionOnClick
                                getRowId={(row) => row.id}
                            />
                        </div>
                    </>
                )}
            </div>

        </>
    )
}

export default AdminUserJobPreferenceHistory