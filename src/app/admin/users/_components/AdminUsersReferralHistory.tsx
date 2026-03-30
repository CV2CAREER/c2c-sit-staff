"use client"
import { useAdminQueries } from "@/hooks/api/admin.api";
import { useAdminUserDetailContext } from "../context/userDetailContext"
import { StyledDataGridPro } from "@/utils/table"
import { GridColDef, GridRowClassNameParams, GridValidRowModel } from "@mui/x-data-grid-pro";

const columns:GridColDef[] = [
    { field: 'firstName', headerName: 'First Name', flex: 1, headerClassName:"font-medium"},
    { field: 'lastName', headerName: 'Last Name', flex: 1, },
    { field: 'email', headerName: 'Email', flex: 1, },
    { field: 'phoneNumber', headerName: 'Phone Number', flex: 1, },
    { field: 'referralStatus', headerName: 'Referral Status', flex: 1, },
];


const AdminUsersReferralHistory = () => {
    const { user } = useAdminUserDetailContext()
    const { referralHistoryDomain } = useAdminQueries({
        fetchReferralHistory: true,
        referralEmail: user?.email,
    });
    const referralHistory = referralHistoryDomain.data;
    const getRowClassName = (params: GridRowClassNameParams<GridValidRowModel>) => {
        return params.indexRelativeToCurrentPage % 2 !== 0 ? 'bg-career-gray-400' : 'bg-white';
    };
    return (
        <>
            <div className="h-24" />
            <h2 className="mb-4 text-2xl">Referrals</h2>
            <div style={{ height: 400, width: '100%' }}>
                <StyledDataGridPro
                    columns={columns}
                    rows={referralHistory?.data?.map((row: any) => ({
                        ...((row._doc ?? row) as object),
                        referralStatus: row.referralStatus,
                        id: row._doc?._id ?? row._id
                    })) || []}
                    getRowId={(row: any) => row.id}
                    getRowClassName={getRowClassName}
                />
            </div>
        </>
    )
}

export default AdminUsersReferralHistory