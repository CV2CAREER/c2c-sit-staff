"use client"
import { useAdminQueries } from "@/hooks/api/admin.api";
import PulseLoader from './loader';
import AdminUsersJobPreferencesCard from './AdminUsersJobPreferencesCard';
import { Alert } from '@material-tailwind/react';

const AdminUsersJobPreferences = ({ userId }: { userId: string }) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { userPreferencesV2Domain, jobPreferencesOptionsDomain } = useAdminQueries({
        userId,
        fetchUserPreferencesV2: true,
        fetchJobPreferences: true,
    });

    const userPreferencesData = userPreferencesV2Domain.data;
    const isUserPreferencesLoading = userPreferencesV2Domain.isLoading;
    const isJobPreferencesLoading = jobPreferencesOptionsDomain.isLoading;

    const loading = isUserPreferencesLoading || isJobPreferencesLoading;
    return (
        <>
            {
                loading ? <PulseLoader /> :
                    (userPreferencesData?.primary ? <AdminUsersJobPreferencesCard preferences={userPreferencesData?.primary} userId={userId} secondary={userPreferencesData?.secondary} /> : <Alert color="red" variant="ghost">
                        This user has not filled out their job preferences.
                    </Alert>)
            }
        </>
    )
}

export default AdminUsersJobPreferences
