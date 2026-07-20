"use client"

import { motion, type Variants } from "framer-motion";
import { HiOutlineUserCircle } from "react-icons/hi";
import { useAdminQueries } from "@/hooks/api/admin.api";
import PlanTransition from "./ServiceHistory";

const containerVariants: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.04 } },
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

const AdminProfileInfo = ({ userId }: { userId: string }) => {
    const { userProfileSafeDomain } = useAdminQueries({
        userId,
        fetchUserProfileSafe: true,
    });
    const user = userProfileSafeDomain?.data?.profile;
    const loading = userProfileSafeDomain.isLoading;
    const getReferrer = () => {
        return userProfileSafeDomain?.data?.referrerEmail ?? 'N/A';
    };
    const data = [
        {
            id: 1,
            key: 'First Name',
            value: !!user?.firstName ? user?.firstName : 'N/A',
        },
        {
            id: 2,
            key: 'Middle Name',
            value: !!user?.middleName ? user?.middleName : 'N/A',
        },
        {
            id: 3,
            key: 'Last Name',
            value: !!user?.lastName ? user?.lastName : 'N/A',
        },
        {
            id: 4,
            key: 'Email',
            value: user?.email ?? 'N/A',
        },
        {
            id: 5,
            key: 'Phone Number',
            value: user?.phoneNumber ?? 'N/A',
        },
        {
            id: 6,
            key: 'Referrer',
            value: getReferrer(),
        },
        {
            id: 7,
            key: 'Country',
            value: user?.country ?? 'N/A',
        },
        {
            id: 8,
            key: 'Current City of Residence',
            value: user?.currentCityOfResidence ?? 'N/A'
        },
        {
            id: 9,
            key: 'Gender',
            value: capsFirstLetter(user?.gender ?? 'N/A')
        },
        {
            id: 10,
            key: 'Heritage',
            value: user?.heritage ?? 'N/A'
        },
        {
            id: 11,
            key: 'Communication',
            value: 'N/A'
        }
    ];
    function capsFirstLetter(str: string): string {
        if (!str) return str; // Check if the string is empty
        return str.charAt(0).toUpperCase() + str.slice(1); // Capitalize the first letter and append the rest
    }
    // console.log("reff", user?.referrer)

    return (
        <>
            {loading ? (
                <div className="mt-6 w-full p-4 md:p-8 rounded-3xl bg-slate-100 animate-pulse">
                    <div className="flex items-center justify-between">
                        <div className="bg-gray-300 animate-pulse w-full max-w-72 h-12 rounded-md mr-4" />
                    </div>
                    <div className="grid grid-cols-2 mobile:grid-cols-4 bigLaptop:grid-cols-5 gap-4 mt-8">
                        {data.map((profile) => (
                            <div key={profile.id}>
                                <div className="bg-gray-300 mb-4 animate-pulse w-28 h-9 rounded-md" />
                                <div className="bg-gray-300 animate-pulse w-28 h-9 rounded-md" />
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="relative mt-6 w-full overflow-hidden rounded-3xl border border-career-gray-300/60 bg-white p-4 shadow-sm md:p-8">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-career-blue-800 via-career-blue-300 to-career-blue-800" />

                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-career-blue-800/10 text-career-blue-800">
                                <HiOutlineUserCircle size={20} />
                            </span>
                            <h3 className="text-xl md:text-2xl font-poppins !font-medium font-sharp-grotesk text-career-black-200">
                                Profile Information
                            </h3>
                        </div>
                    </div>
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                        className="grid grid-cols-1 place-content-center mobileSM:grid-cols-2 gap-4 mobile:gap-4 mobile:grid-cols-4 bigLaptop:grid-cols-5 mt-8"
                    >
                        {data.map((profile) => (
                            <motion.div
                                key={profile.id}
                                variants={itemVariants}
                                className="rounded-xl p-3 transition-colors duration-200 hover:bg-career-blue-100/50"
                            >
                                <h3 className="text-14 text-career-gray-200 mb-2">
                                    {profile.key}
                                </h3>
                                <p className="text-career-black-200 font-medium truncate" title={`${profile.value}`}>
                                    {profile.value}
                                </p>
                            </motion.div>
                        ))}
                    </motion.div>
                    <PlanTransition
                        plans={user?.serviceHistory}
                    />
                </div>
            )}
        </>
    );
};

export default AdminProfileInfo;
