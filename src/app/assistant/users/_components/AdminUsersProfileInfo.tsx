"use client"

import { useAdminQueries } from "@/hooks/api/admin.api";
import PlanTransition from "./ServiceHistory";

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
                <div className="mt-6 w-full p-8 rounded-3xl bg-gray-400 animate-pulse">
                    <div className="flex items-center justify-between">
                        <div className="bg-gray-300 animate-pulse w-72 h-12 rounded-md mr-4" />
                    </div>
                    <div className="grid grid-cols-4 bigLaptop:grid-cols-5 mt-8">
                        {data.map((profile) => (
                            <div key={profile.id}>
                                <div className="bg-gray-300 mb-4 animate-pulse w-28 h-9 rounded-md" />
                                <div className="bg-gray-300 animate-pulse w-28 h-9 rounded-md" />
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="mt-6 w-full p-8 rounded-3xl bg-white">
                    <div className="flex items-center justify-between">
                        <h3 className="text-2xl font-poppins !font-medium font-sharp-grotesk text-career-black-200">
                            Profile Information
                        </h3>
                    </div>
                    <div className="grid grid-cols-1 place-content-center mobileSM:grid-cols-2 gap-4 mobile:gap-0 mobile:grid-cols-4 bigLaptop:grid-cols-5 mt-8">
                        {data.map((profile) => (
                            <div key={profile.id}>
                                <h3 className="text-14 text-career-black-200 mb-4 mt-6 bigLaptop:mt-0">
                                    {profile.key}
                                </h3>
                                <p className="text-career-gray-200 mt-2 truncate" title={`${profile.value}`}>
                                    {profile.value}
                                </p>
                            </div>
                        ))}
                    </div>
                    <PlanTransition
                        plans={user?.serviceHistory}
                    />
                </div>
            )}
        </>
    );
};

export default AdminProfileInfo;
