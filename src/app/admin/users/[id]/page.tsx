"use client"
import React, { useState, useEffect } from "react";
import { useAdminQueries } from "@/hooks/api/admin.api";
import AdminUserHeader from "../_components/AdminUserHeader";
import { AdminUserDetailProvider, useAdminUserDetailContext } from "../context/userDetailContext";
import TriggerApplicationAction from "../_components/ApplicationAction";
import ClientDocument from "../_components/ClientDocuments";
import AdminUsersJobSites from "../_components/AdminUsersJobSites";
import AdminProfileInfo from "../_components/AdminUsersProfileInfo";
import AdminUsersJobPreferences from "../_components/AdminUsersJobPreferences";
import AdminUserJobPreferenceHistory from "../_components/AdminUserJobPreferenceHistory";
import AdminUsersReferralHistory from "../_components/AdminUsersReferralHistory";
import OnBoardingProgress from "../_components/onboarding-progress";

type ClientPageParams = Promise<{ id: string }>;

// Inner component that has access to context
function UserDetailsContent({ userId }: { userId: string }) {
    const { setUser } = useAdminUserDetailContext();
    const [isUserId, setIsUserId] = useState<string | null>(null);
    const currentUserId = isUserId || userId;

    const { userDetailDomain: userData } = useAdminQueries({
        userId: currentUserId,
        fetchUserDetail: true,
    });

    useEffect(() => {
        if (userData?.data) {
            setUser(userData.data);
        }
    }, [userData?.data, setUser]);

    if (userData?.isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }


    return (
        <main className="flex flex-col gap-6 mt-6 w-full">
            <AdminUserHeader userId={currentUserId} setIsUserId={setIsUserId}/>
            <OnBoardingProgress/>
            {/* <OnboardingStatus/> */}
            <TriggerApplicationAction/>
            <ClientDocument userId={currentUserId} />
            <AdminUsersJobSites userId={currentUserId}/>
            <AdminProfileInfo/>
            <AdminUsersJobPreferences userId={currentUserId}/>
            <AdminUserJobPreferenceHistory userId={currentUserId} />
            <AdminUsersReferralHistory/>
        </main>
    );
}

export default function Page(props: { params: ClientPageParams }) {
    const params = React.use(props.params);
    const userId = params.id;

    return (
        <AdminUserDetailProvider>
            <UserDetailsContent userId={userId} />
        </AdminUserDetailProvider>
    );
}