"use client"
import { useAdminQueries } from "@/hooks/api/admin.api";
import { useAdminUserDetailContext } from "../context/userDetailContext"
import { StyledDataGridPro } from "@/utils/table"
import { GridColDef, GridRowClassNameParams, GridValidRowModel } from "@mui/x-data-grid-pro";
import { HiOutlineGift } from "react-icons/hi";

const columns:GridColDef[] = [
    { field: 'firstName', headerName: 'First Name', flex: 1, headerClassName:"font-medium"},
    { field: 'lastName', headerName: 'Last Name', flex: 1, },
    { field: 'email', headerName: 'Email', flex: 1, },
    { field: 'phoneNumber', headerName: 'Phone Number', flex: 1, },
    { field: 'referralStatus', headerName: 'Referral Status', flex: 1, },
];


const AdminUsersReferralHistory = ({ userId }: { userId: string }) => {
    const { userReferralsDomain } = useAdminQueries({
        userId,
        fetchUserReferrals: true,
    });
    const referralHistory = userReferralsDomain.data;
    const getRowClassName = (params: GridRowClassNameParams<GridValidRowModel>) => {
        return params.indexRelativeToCurrentPage % 2 !== 0 ? 'bg-career-gray-400' : 'bg-white';
    };
    return (
        <div className="relative w-full overflow-hidden rounded-xl border border-primary/15 bg-white p-4 shadow-[0_1px_10px_rgba(0,142,211,0.10)] md:p-8">
            <div className="flex items-center gap-3 mb-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <HiOutlineGift size={20} />
                </span>
                <h2 className="text-xl md:text-2xl font-medium">Referrals</h2>
            </div>
            <div style={{ height: 400, width: '100%' }}>
                <StyledDataGridPro
                    columns={columns}
                    showToolbar={true}
                    rows={referralHistory?.referrals?.map((row: any) => ({
                        ...row.user,
                        referralStatus: row.status,
                        id: row.id
                    })) || []}
                    getRowId={(row: any) => row.id}
                    getRowClassName={getRowClassName}
                />
            </div>
        </div>
    )
}

export default AdminUsersReferralHistory