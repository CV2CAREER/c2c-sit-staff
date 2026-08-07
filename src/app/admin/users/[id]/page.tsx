"use client"
import React, { useState, useEffect } from "react";
import { motion, type Variants } from "framer-motion";
import { useAdminQueries } from "@/hooks/api/admin.api";
import AdminUserHeader from "../_components/AdminUserHeader";
import { AdminUserDetailProvider, useAdminUserDetailContext } from "../context/userDetailContext";
import TriggerApplicationAction from "../_components/ApplicationAction";
import ClientDocument from "../_components/ClientDocuments";
import AdminProfileInfo from "../_components/AdminUsersProfileInfo";
import AdminUserJobsiteCredential from "../_components/AdminUserJobsiteCredential";
import AdminUsersJobPreferences from "../_components/AdminUsersJobPreferences";
import AdminUserJobPreferenceHistory from "../_components/AdminUserJobPreferenceHistory";
import AdminUsersReferralHistory from "../_components/AdminUsersReferralHistory";
import AdminClientJourney from "../_components/AdminClientJourney";

type ClientPageParams = Promise<{ id: string }>;

const containerVariants: Variants = {
    hidden: {},
    show: {
        transition: { staggerChildren: 0.09, delayChildren: 0.05 },
    },
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 22 },
    show: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
    },
};

// Inner component that has access to context
function UserDetailsContent({ userId }: { userId: string }) {
    const { setUser } = useAdminUserDetailContext();
    const [isUserId, setIsUserId] = useState<string | null>(null);
    const currentUserId = isUserId || userId;

    const {
        userDetailDomain: userData,
    } = useAdminQueries({
        userId: currentUserId,
    });

    useEffect(() => {
        if (userData?.data) {
            setUser(userData.data);
        }
    }, [userData?.data, setUser]);

    if (userData?.isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative flex h-16 w-16 items-center justify-center">
                        <span className="absolute inset-0 animate-ping rounded-full bg-career-blue-800/25" />
                        <span className="relative h-14 w-14 animate-spin rounded-full border-4 border-career-blue-200 border-t-career-blue-800" />
                    </div>
                    <p className="text-sm font-medium text-career-gray-200">
                        Loading client profile…
                    </p>
                </div>
            </div>
        );
    }

    if (userData?.isError) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="rounded-2xl border border-red-100 bg-white px-8 py-10 text-center shadow-lg"
                >
                    <p className="text-lg font-semibold text-red-600">Unable to load user details</p>
                    <p className="text-sm text-gray-500 mt-2">
                        {userData?.error?.message || "Please refresh and try again."}
                    </p>
                </motion.div>
            </div>
        );
    }

    return (
        <motion.main
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="flex flex-col gap-6 mt-6 w-full pb-4"
        >
            <motion.div variants={itemVariants} className="flex flex-col lg:flex-row gap-4 items-stretch">
                <div className="min-w-0 flex-1">
                    <AdminUserHeader userId={currentUserId} setIsUserId={setIsUserId}/>
                </div>
                <div className="w-full shrink-0 lg:w-[340px]">
                    <TriggerApplicationAction/>
                </div>
            </motion.div>
            <motion.div variants={itemVariants}>
                <AdminClientJourney userId={currentUserId}/>
            </motion.div>
            <motion.div variants={itemVariants}>
                <ClientDocument userId={currentUserId} />
            </motion.div>
            <motion.div variants={itemVariants}>
                <AdminUserJobsiteCredential userId={currentUserId}/>
            </motion.div>
            <motion.div variants={itemVariants}>
                <AdminProfileInfo userId={currentUserId}/>
            </motion.div>
            <motion.div variants={itemVariants}>
                <AdminUsersJobPreferences userId={currentUserId}/>
            </motion.div>
            <motion.div variants={itemVariants}>
                <AdminUserJobPreferenceHistory userId={currentUserId} />
            </motion.div>
            <motion.div variants={itemVariants}>
                <AdminUsersReferralHistory userId={currentUserId} />
            </motion.div>
        </motion.main>
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
