"use client"
import { useAdminQueries } from "@/hooks/api/admin.api";
import PulseLoader from '../../_components/DropDown/loader';
import AdminUsersJobPreferencesCard from './AdminUsersJobPreferencesCard';
import { Alert } from '@material-tailwind/react';

const AdminUsersJobPreferences = ({ userId }: { userId: string }) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { userPreferencesDomain, jobPreferencesOptionsDomain } = useAdminQueries({
        userId,
        fetchUserPreferences: true,
        fetchJobPreferences: true,
    });

    const userPreferencesData = userPreferencesDomain.data;
    const isUserPreferencesLoading = userPreferencesDomain.isLoading;
    const isJobPreferencesLoading = jobPreferencesOptionsDomain.isLoading;

    const loading = isUserPreferencesLoading || isJobPreferencesLoading;
    return (
        <>
            {
                loading ? <PulseLoader /> :
                    (userPreferencesData?.data?.userPreference ? <AdminUsersJobPreferencesCard preferences={userPreferencesData?.data?.userPreference} userId={userId}/> : <Alert color="red" variant="ghost">
                        This user has not filled out their job preferences.
                    </Alert>)
            }
        </>
    )
}

export default AdminUsersJobPreferences
