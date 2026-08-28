import { useAdminQueries } from "@/hooks/api/admin.api"
import UserAccountOptions from "./UserAccountOptions"
import { useEffect, useState } from "react"
import { useAdminUserDetailContext } from "../context/userDetailContext"
import { IoCaretDownSharp, IoCaretUp } from 'react-icons/io5';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from "framer-motion";
import { TableDropDownSearch } from "@/components/TableRedesign/TableHeader"
import { getAvatarColorClass } from "@/utils/avatarColor"
import { Briefcase, Crown, Star } from "lucide-react"

const AdminUserHeader = ({ userId, setIsUserId }: { userId: string, setIsUserId: (id: string) => void }) => {

  const [dropdownIsOpened, setDropdownIsOpened] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string | undefined>('');
  const [allData, setAllData] = useState<any[any]>([]);
  // const router = useRouter();
  const pathName = usePathname();

   const { userDetailDomain: userData, usersListDomain: allUserData, featureTitlesDomain, userProfileSafeDomain } = useAdminQueries({
     userId,
     fetchUserDetail: true,
     fetchUsersList: true,
     fetchFeatureTitles: true,
     fetchUserProfileSafe: true,
   });

   const profileUser = userProfileSafeDomain?.data?.profile;

   const displayFirstName = profileUser?.firstName ?? userData?.data?.firstName;
   const displayLastName = profileUser?.lastName ?? userData?.data?.lastName;
   const initials =
     `${displayFirstName?.charAt(0) ?? ""}${displayLastName?.charAt(0) ?? ""}`.toUpperCase() ||
     "U";
   const avatarColorClass = getAvatarColorClass(
     `${displayFirstName ?? ""}${displayLastName ?? ""}` || userId,
   );

  const features = featureTitlesDomain?.data?.features || [];
  const userPlanId = userData?.data?.user?.planId;
  const userPlan = features.find((f: any) => f.id === userPlanId);

  const { setUser } = useAdminUserDetailContext()

  useEffect(() => {
    if (userData?.data) {
      setUser(userData.data as any)
    }
  }, [userData?.data, setUser])

  useEffect(() => {
    if (allUserData?.data) {
      const rawData = allUserData.data;
      const users = Array.isArray(rawData)
        ? rawData
        : rawData.users
          ?? rawData.items
          ?? [];
      setAllData((prev: any[]) => {
        const processedData = users
              ?.map((data: any) => ({
                Full_Name: `${data.firstName} ${data.lastName}`,
                email: data.email,
                id: data.id,
              }))
              .sort((a: any, b: any) => a.Full_Name.localeCompare(b.Full_Name));
        // Only update if data actually changed
        if (JSON.stringify(prev) === JSON.stringify(processedData)) {
          return prev;
        }
        return processedData;
      });
    }
  }, [allUserData?.data]);

  const handleDropDownIsOpened = () => {
    setDropdownIsOpened((prev) => !prev);
  };


  return (
    <div className="relative flex h-full flex-col gap-6 overflow-hidden rounded-xl border border-primary/15 bg-white p-4 shadow-[0_1px_10px_rgba(0,142,211,0.10)] md:p-6 lg:flex-row lg:items-center lg:justify-between lg:gap-4">

      <div className="flex w-full flex-col items-center gap-4 text-center sm:flex-row sm:text-left lg:w-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, ease: "backOut" }}
          whileHover={{ scale: 1.05 }}
          className={`h-16 w-16 shrink-0 rounded-full ${avatarColorClass} flex items-center justify-center font-semibold tracking-wide shadow-sm ring-4 ring-white text-xl sm:h-20 sm:w-20 sm:text-2xl lg:h-24 lg:w-24 lg:text-3xl`}
        >
          {initials}
        </motion.div>

        <div className="relative flex min-w-0 flex-1 flex-col items-center gap-2 sm:items-start">
          <button
            type="button"
            onClick={handleDropDownIsOpened}
            className="inline-flex items-center gap-2 rounded-lg transition-colors hover:text-primary focus:outline-none"
          >
            <h4 className="!font-medium font-sharp-grotesk text-xl text-career-black-200 capitalize md:text-2xl lg:text-32">
              {profileUser?.firstName ?? userData?.data?.user?.firstName} {profileUser?.lastName ?? userData?.data?.user?.lastName}
            </h4>
            <motion.span
              animate={{ rotate: dropdownIsOpened ? 180 : 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="text-career-gray-200"
            >
              {dropdownIsOpened ? <IoCaretUp /> : <IoCaretDownSharp />}
            </motion.span>
          </button>

          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            {userData?.data?.user?.isAmbassador && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                <Star className="h-3 w-3 fill-orange-400 text-orange-400" />
                Ambassador
              </span>
            )}
            {(profileUser?.plan ?? userData?.data?.user?.plan) && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-career-blue-800/10 px-3 py-1 text-xs font-semibold capitalize text-career-blue-800">
                <Crown className="h-3 w-3" />
                {profileUser?.plan ?? userData?.data?.user?.plan}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-career-gray-300/60 px-3 py-1 text-xs font-medium capitalize text-career-gray-200">
              <Briefcase className="h-3 w-3" />
              {profileUser?.role ?? userData?.data?.user?.role}
            </span>
          </div>

          <AnimatePresence>
            {dropdownIsOpened && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -6 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: -6 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="w-full overflow-hidden"
              >
                <TableDropDownSearch
                  listOfDisplayValues={
                    userData && allData.length > 0
                      ? ['All Users', ...allData.map((value: any) => value.Full_Name)]
                      : ['Loading...']
                  }
                  listOfValues={
                    userData && allData.length > 0
                      ? ['', ...allData.map((value: any) => String(value.email))]
                      : ['']
                  }
                  defaultValue={userEmail}
                  onChange={(e: any) => {
                    const pathArray = pathName?.split('/');
                    if (pathArray && pathArray.length > 0) {
                      pathArray[pathArray.length - 1] = e.id;
                    }
                    // console.log(e,"Data selected")
                    // router.push(pathArray?.join('/') ?? '/');
                    setUserEmail(e.email);
                    setIsUserId(e.id);
                    window.location.href = `/admin/users/${e.id}`;
                  }}
                  values={
                    userData && allData.length > 0
                      ? [{ Full_Name: 'All User', email: '' }, ...allData]
                      : [{ Full_Name: 'Loading...', id: '' }]
                  }
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="w-full border-t border-gray-100 pt-4 lg:w-auto lg:border-t-0 lg:pt-0">
        <UserAccountOptions
        userId={userId}
        // setShowModal={setShowModal} userData={userData} setPlan={setPlan}
        />
      </div>
    </div>
  )
}

export default AdminUserHeader