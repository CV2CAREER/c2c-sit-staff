"use client"
import { useAdminQueries } from "@/hooks/api/admin.api"
import PulseLoader from "../../_components/DropDown/loader"
import { GridToolbar } from "@mui/x-data-grid-pro"
import { useState } from "react"
import generateJobHistoryColumns from "./jobHistoryColumns"
import { StyledDataGridPro } from "@/utils/table"

const AdminUserJobPreferenceHistory = ({ userId }: { userId: string }) => {
    const [paginationModel, setPaginationModel] = useState({
        page: 0,
        pageSize: 20
    })
    const { profileHistoryDomain } = useAdminQueries({
        userId,
        fetchProfileHistory: true,
        profileHistorySkip: paginationModel.page * paginationModel.pageSize,
    });
    const profileHistoryData = profileHistoryDomain.data;
    const isLoading = profileHistoryDomain.isLoading;
    const rows = profileHistoryData?.data?.preferenceHistory || []
    const totalCount = profileHistoryData?.data?.totalCount || 0
    // console.log(profileHistoryData)
    return (
        <>
            <div className="mt-6">
                {isLoading ? (
                    <PulseLoader />
                ) : (
                    <>
                        <h3 className="text-lg md:text-2xl my-12 text-career-black-200 font-medium font-sharp-grotesk">
                            User Job Preference History
                        </h3>
                        <div className="h-fit w-[100%] mt-[2rem]">
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
                                // onColumnOrderChange={(e) => {
                                //     moveTo(tableName, e.column.field, e.targetIndex)
                                // }}
                                onPaginationModelChange={setPaginationModel}
                                paginationModel={paginationModel}
                                disableRowSelectionOnClick
                                getRowId={(row) => row._id}
                            />
                        </div>
                    </>
                )}
            </div>

        </>
    )
}

export default AdminUserJobPreferenceHistory