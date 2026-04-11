'use client';
import React, { Fragment, useEffect, useState } from 'react';
import { Transition } from '@headlessui/react';
import axiosInstance from '@/services/api-client';
import { SERVER_URI } from '@/constants/env';
import { ClipLoader } from 'react-spinners';

interface IUserData {
  fullName: string;
  id: string;
  role: string;
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const roleMap: Record<
  string,
  {
    urlKey: string;
    label: string;
  }
> = {
  guest: {
    urlKey: 'users',
    label: 'Guest',
  },
  client: {
    urlKey: 'users',
    label: 'Client',
  },
  coach: {
    urlKey: 'coach',
    label: 'Coach',
  },
  partner: {
    urlKey: 'partners',
    label: 'Partner',
  },
  admin: {
    urlKey: 'users',
    label: 'Admin',
  },
  sales: {
    urlKey: 'sales',
    label: 'Sales Consultant',
  },
  cse: {
    urlKey: 'customer',
    label: 'Customer Support Executive',
  },
};

const DropDownFilter = ({ updateUser, activeUser, isUser }: { updateUser: (fullName: string) => void; user: string; activeUser: (isActive: boolean) => void; isUser: boolean; }) => {
  const [queryString, setQueryString] = useState<string>('');
  const [isLoading, setisLoading] = useState<boolean>(false);
  const [userData, setUserData] = useState<IUserData[]>([]);
  const [dropdownIsOpened, setDropdownIsOpened] = useState<boolean>(false);

  const handleDropDown = (fullName: string) => {
    setDropdownIsOpened(false)
    updateUser(fullName)
    activeUser(true)
    setQueryString("")
  }

  useEffect(() => {
    let timer: string | number | NodeJS.Timeout | undefined;
    if (queryString) {
      setisLoading(true);
      timer = setTimeout(() => {
        axiosInstance
          .get(`${SERVER_URI}/api/v1/admin/users?q=${queryString}`)
          .then((res) => {
            const data = res.data.filteredData.map((el:any) => ({
              id: el._id,
              role: el.role,
              fullName: `${el.firstName} ${el.middleName} ${el.lastName}`,
            }));
            setUserData(data);
          })
          // eslint-disable-next-line no-console
          .catch((err) => console.log(err))
          .finally(() => setisLoading(false));
      }, 1000);
    } else {
      setUserData([]);
      setisLoading(false);
    }
    return () => clearTimeout(timer);
  }, [queryString]);

  return (
    <Transition show={true}>
      <Transition.Child
        as={Fragment}
        enter="ease-out duration-300"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="ease-in duration-200"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <div className={`relative`}>
          <input
            placeholder="Search All Text"
            className={`border-1 bg-gray-100 rounded-lg w-full px-4 py-2 focus:outline-none text-sm ${isUser? "hidden":"flex"}`}
            onChange={(e) => setQueryString(e.target.value)}
            value={queryString}
            onClick={() => setDropdownIsOpened(true)}
          />
          {dropdownIsOpened && userData && userData.length > 0 && !isLoading && (
            <div className="h-[200px] text-sm shadow-lg overflow-scroll absolute z-[300] bg-white">
              {userData.map((el) => (
                <div key={el.id} onClick={() => handleDropDown(el.fullName)}>
                  <p
                    className="py-2 px-3 hover:bg-blue-gray-100 hover:cursor-pointer inline-block w-full"
                  >
                    {el.fullName}
                  </p>
                </div>
              ))}
            </div>
          )}
          {isLoading && (
            <div className="w-full shadow-lg flex justify-center z-[400]">
              <ClipLoader size={14} />
            </div>
          )}
        </div>
      </Transition.Child>
    </Transition>
  );
};

export default DropDownFilter;
