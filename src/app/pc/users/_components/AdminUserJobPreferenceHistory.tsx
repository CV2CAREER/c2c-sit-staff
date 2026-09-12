"use client"
import { useAdminQueries } from "@/hooks/api/admin.api"
import PulseLoader from "./loader"
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
            <div className="relative w-full overflow-hidden rounded-xl border border-primary/15 bg-white p-4 shadow-[0_1px_10px_rgba(0,142,211,0.10)] md:p-8">
                {isLoading ? (
                    <PulseLoader />
                ) : (
                    <>
                        <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
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
