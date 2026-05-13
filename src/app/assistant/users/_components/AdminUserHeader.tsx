import { useAdminQueries } from "@/hooks/api/admin.api"
import UserAccountOptions from "./UserAccountOptions"
import { useEffect, useState } from "react"
import { useAdminUserDetailContext } from "../context/userDetailContext"
import { IoCaretDownSharp, IoCaretUp } from 'react-icons/io5';
import { usePathname } from 'next/navigation';
import { TableDropDownSearch } from "@/components/TableRedesign/TableHeader"

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

  const features = featureTitlesDomain?.data?.features || [];
  const userPlanId = userData?.data?.planId;
  const userPlan = features.find((f: any) => f.id === userPlanId);

  const { setUser } = useAdminUserDetailContext()

  useEffect(() => {
    if (userData?.data) {
      setUser(userData.data as any)
    }
  }, [userData?.data, setUser])

  useEffect(() => {
      if (allUserData?.data) {
        const users = Array.isArray(allUserData.data) ? allUserData.data : (allUserData.data.items ?? []);
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
    <div className="flex flex-col lg:flex-row -mt-6 items-center justify-between border-t bg-white p-8 rounded-b-2xl">
      <div className="flex flex-col mobile:flex-row w-full lg:w-auto justify-between lg:justify-normal lg:my-0 p-1.5 rounded-lg shadow-lg lg:shadow-none items-center">
        <div className="smallLaptop:h-24 smallLaptop:w-24 h-14 w-14  capitalize rounded-full text-xl smallLaptop:text-[57px] p-4 bg-career-blue-300 text-career-blue-500 flex items-center justify-center mr-2 font-medium">
          {userData?.data?.firstName?.charAt(0) || "U"}
        </div>
        <div className="flex flex-col items-center mobile:items-start w-full my-5 lg:my-0 lg:w-auto">
          <div className="flex flex-col mobile:flex-row items-center">
            <div>
              <div className="flex  items-center ">
                <h4 className="!font-medium  font-sharp-grotesk text-lg smallLaptop:text-32 text-career-black-200 capitalize">
                  {profileUser?.firstName ?? userData?.data?.firstName} {profileUser?.lastName ?? userData?.data?.lastName}
                </h4>

                {dropdownIsOpened ? (
                  <IoCaretUp
                    onClick={handleDropDownIsOpened}
                    className="ml-2 cursor-pointer"
                  />
                ) : (
                  <IoCaretDownSharp
                    onClick={handleDropDownIsOpened}
                    className="ml-2 cursor-pointer"
                  />
                )}
              </div>

                {dropdownIsOpened && (
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
                )}
            </div>

            <div className="rounded-full w-2 mx-4 h-2 bg-career-blue-800" />
            <p className="text-14 text-career-gray-200 capitalize">{profileUser?.plan ?? userData?.data?.plan}</p>
          </div>
          <p className="text-career-gray-200 mt-1 capitalize">{profileUser?.role ?? userData?.data?.role}</p>
        </div>
      </div>
      <UserAccountOptions
      userId={userId}
      // setShowModal={setShowModal} userData={userData} setPlan={setPlan} 
      />
    </div>
  )
}

export default AdminUserHeader