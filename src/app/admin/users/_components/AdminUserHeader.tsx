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
    <div className="relative flex h-full flex-col lg:flex-row items-center justify-between overflow-hidden rounded-xl border border-primary/15 bg-white p-4 shadow-[0_1px_10px_rgba(0,142,211,0.10)] md:p-8">

      <div className="relative flex flex-col mobile:flex-row w-full lg:w-auto justify-between lg:justify-normal lg:my-0 p-1.5 rounded-lg shadow-lg lg:shadow-none items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, ease: "backOut" }}
          whileHover={{ scale: 1.05 }}
          className={`smallLaptop:h-24 smallLaptop:w-24 h-14 w-14 shrink-0 rounded-full ${avatarColorClass} flex items-center justify-center mr-2 font-semibold tracking-wide shadow-sm ring-4 ring-white text-lg smallLaptop:text-3xl`}
        >
          {initials}
        </motion.div>
        <div className="flex flex-col items-center mobile:items-start w-full my-5 lg:my-0 lg:w-auto">
          <div className="flex flex-col mobile:flex-row items-center">
            <div>
              <div className="flex  items-center ">
                <h4 className="!font-medium  font-sharp-grotesk text-lg smallLaptop:text-32 text-career-black-200 capitalize">
                  {profileUser?.firstName ?? userData?.data?.user?.firstName} {profileUser?.lastName ?? userData?.data?.user?.lastName}
                </h4>
                {userData?.data?.user?.isAmbassador && (
                  <span className="ml-3 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200">
                    <Star className="w-3 h-3 fill-orange-400 text-orange-400" />
                    Ambassador
                  </span>
                )}

                <motion.span
                  animate={{ rotate: dropdownIsOpened ? 180 : 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="ml-2 cursor-pointer"
                  onClick={handleDropDownIsOpened}
                >
                  {dropdownIsOpened ? <IoCaretUp /> : <IoCaretDownSharp />}
                </motion.span>
              </div>

              <AnimatePresence>
                {dropdownIsOpened && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: -6 }}
                    animate={{ opacity: 1, height: "auto", y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -6 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="overflow-hidden"
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

            {(profileUser?.plan ?? userData?.data?.user?.plan) && (
              <>
                <div className="rounded-full w-2 mx-4 h-2 bg-career-blue-800" />
                <p className="inline-flex items-center gap-1 text-14 text-career-gray-200 capitalize px-3 py-1 rounded-full bg-career-blue-800/10">
                  <Crown className="w-3 h-3 text-career-blue-800" />
                  {profileUser?.plan ?? userData?.data?.user?.plan}
                </p>
              </>
            )}
          </div>
          <p className="inline-flex items-center gap-1.5 text-career-gray-200 mt-1 capitalize">
            <Briefcase className="w-3.5 h-3.5 text-career-gray-200" />
            {profileUser?.role ?? userData?.data?.user?.role}
          </p>
        </div>
      </div>
      <div className="relative">
        <UserAccountOptions
        userId={userId}
        // setShowModal={setShowModal} userData={userData} setPlan={setPlan}
        />
      </div>
    </div>
  )
}

export default AdminUserHeader