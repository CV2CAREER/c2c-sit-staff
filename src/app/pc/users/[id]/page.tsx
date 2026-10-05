"use client"
import React, { useState, useEffect, Suspense } from "react";
import { motion, type Variants } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useAdminQueries } from "@/hooks/api/admin.api";
import AdminUserHeader from "../_components/AdminUserHeader";
import UserAccountOptions from "../_components/UserAccountOptions";
import { AdminUserDetailProvider, useAdminUserDetailContext } from "../context/userDetailContext";
import ClientDocument from "../_components/ClientDocuments";
import AdminProfileInfo from "../_components/AdminUsersProfileInfo";
// AdminUsersJobSites: unused now, see comment where it was rendered below.
// import AdminUsersJobSites from "../_components/AdminUsersJobSites";
import AdminUserJobsiteCredential from "../_components/AdminUserJobsiteCredential";
import AdminUsersJobPreferences from "../_components/AdminUsersJobPreferences";
import AdminUserJobPreferenceHistory from "../_components/AdminUserJobPreferenceHistory";
import AdminUsersReferralHistory from "../_components/AdminUsersReferralHistory";
import AdminClientJourney from "../../../admin/users/_components/AdminClientJourney";
import AdminMissingInfoRequests from "../../../admin/users/_components/AdminMissingInfoRequests";
import AdminUserVerification from "../../../admin/users/_components/AdminUserVerification";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";


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

const DEFAULT_TAB = "documents";

const TAB_TRIGGER_CLASS =
    "relative whitespace-nowrap px-4 py-2.5 text-[13px] font-medium text-[#475569] transition-colors hover:text-[#10365A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B96D6]/40 data-[state=active]:text-[#0B96D6] data-[state=active]:font-semibold data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-[#0B96D6] rounded-none";

const TAB_DEFS = [
    { value: "documents", label: "Documents" },
    { value: "jobsite-credential", label: "Jobsite Credential" },
    { value: "missing-info", label: "Missing Info" },
    { value: "verification", label: "Verification" },
    { value: "job-preferences", label: "Job Preferences" },
    { value: "preference-history", label: "Preference History" },
    { value: "referral-history", label: "Referral History" },
];


// Inner component that has access to context
function UserDetailsContent({ userId }: { userId: string }) {
    const { setUser } = useAdminUserDetailContext();
    const [isUserId, setIsUserId] = useState<string | null>(null);
    const currentUserId = isUserId || userId;

    const router = useRouter();
    const searchParams = useSearchParams();
    const activeTab = searchParams.get("tab") || DEFAULT_TAB;

    const setActiveTab = (value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value === DEFAULT_TAB) {
            params.delete("tab");
        } else {
            params.set("tab", value);
        }
        router.replace(`?${params.toString()}`, { scroll: false });
    };

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
            {/* SPR-21-02-006: the standalone Trigger Action card is gone —
                Commence/End now live in their phase headers inside
                AdminClientJourney below (admin tree). */}
            <motion.div variants={itemVariants}>
                <AdminUserHeader userId={currentUserId} setIsUserId={setIsUserId}/>
            </motion.div>
            {/* Simulation order: identity card -> Upgrade/Export btnrow ->
                journey. UserAccountOptions no longer lives inside the
                identity header; same card chrome as its neighbours so the
                row is centred/full-width like the other sections. */}
            <motion.div variants={itemVariants} className="rounded-xl border border-primary/15 bg-white p-4 shadow-[0_1px_10px_rgba(0,142,211,0.10)] md:p-6">
                <UserAccountOptions userId={currentUserId} />
            </motion.div>
            <motion.div variants={itemVariants}>
                <AdminClientJourney userId={currentUserId}/>
            </motion.div>
            <motion.div variants={itemVariants}>
                <AdminProfileInfo userId={currentUserId}/>
            </motion.div>
            <motion.div variants={itemVariants}>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="flex h-auto w-full items-center gap-0 border-b border-gray-200 bg-transparent p-0 text-muted-foreground">
                        {TAB_DEFS.map((t) => (
                            <TabsTrigger key={t.value} value={t.value} className={TAB_TRIGGER_CLASS}>{t.label}</TabsTrigger>
                        ))}
                    </TabsList>
                    <TabsContent value="documents">
                        <ClientDocument userId={currentUserId} />
                    </TabsContent>
                    <TabsContent value="jobsite-credential">

                        {/* AdminUsersJobSites replaced — its "Generated
                            Email" column was rendering NaN@cvtocareer.com
                            on every row; AdminUserJobsiteCredential is the
                            working implementation staff have access to. */}
                        <AdminUserJobsiteCredential userId={currentUserId}/>
                    </TabsContent>
                    <TabsContent value="missing-info">
                        <AdminMissingInfoRequests userId={currentUserId} />
                    </TabsContent>
                    <TabsContent value="verification">
                        <AdminUserVerification userId={currentUserId} />
                    </TabsContent>
                    <TabsContent value="job-preferences">
                        <AdminUsersJobPreferences userId={currentUserId}/>
                    </TabsContent>
                    <TabsContent value="preference-history">
                        <AdminUserJobPreferenceHistory userId={currentUserId} />
                    </TabsContent>
                    <TabsContent value="referral-history">
                        <AdminUsersReferralHistory userId={currentUserId} />
                    </TabsContent>
                </Tabs>
            </motion.div>
        </motion.main>
    );
}

export default function Page(props: { params: ClientPageParams }) {
    const params = React.use(props.params);
    const userId = params.id;

    return (
        <AdminUserDetailProvider>
            <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-gray-500">Loading client profile…</div>}>
                <UserDetailsContent userId={userId} />
            </Suspense>
        </AdminUserDetailProvider>
    );
}
