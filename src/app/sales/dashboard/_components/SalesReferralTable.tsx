"use client";

import { useEffect, useState } from 'react';
import { useReferralQueries } from "@/hooks/api/admin/referral";
import { FiLoader } from 'react-icons/fi';
import Table from "@/components/newTable/Table";
import { GridColDef } from '@mui/x-data-grid-pro';

const SalesReferralTable = ({ userEmail }: { userEmail: string }) => {
  const [data, setData] = useState([]);

  const { userReferralsDomain } = useReferralQueries({
    fetchUserReferrals: !!userEmail,
    email: userEmail,
  });

  useEffect(() => { 
    if (userReferralsDomain.data) {
      const resData = userReferralsDomain.data as any;
      setData(resData.referrals || []);
    }
  }, [userReferralsDomain.data]);

  const isLoading = userReferralsDomain.isLoading || userReferralsDomain.isFetching;

  function modifyArray(modifiedArr: GridColDef<any>[]) {
    // Filter out internal fields
    return modifiedArr.filter(
      (el) =>
        !['_id', 'referrer', 'isDeleted', 'archived', 'deletedAt', 'userId'].includes(el.field)
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20 bg-white rounded-lg shadow">
        <FiLoader className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="text-center bg-white p-20 rounded-lg shadow text-gray-500">
        No referrals yet. Share your referral link to get started!
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800">My Referrals</h3>
      </div>
      <Table
        allowDelete={false}
        data={data}
        helpers={{}}
        modifyArray={modifyArray}
        tableName='SALES_PERSONAL_REFERRALS'
      />
    </div>
  );
};

export default SalesReferralTable;
