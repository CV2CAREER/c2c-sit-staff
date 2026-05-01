import { useEffect, useState } from 'react';
import { useReferralQueries, useReferralMutations } from "@/hooks/api/admin/referral";
import { FiLoader } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import Table from "@/components/newTable/Table";

const AdminUserReferralTable = ({ userData }: { userData: any }) => {
  const [referralData, setReferralData] = useState([]);
  const [data, setData] = useState([]);
  const [partnerReferrals, setPartnerReferrals] = useState([]);
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [totalSuccessfulReferrals, setTotalSuccessfulReferrals] = useState(0);

  const { userReferralsDomain } = useReferralQueries({
    fetchUserReferrals: !!userData?.email,
    email: userData?.email,
  });

  const { updateReferralStatus } = useReferralMutations();

  const handleUpdateReferral = async (payload: { email: string; id: string; status: string }) => {
    try {
      const loadingToast = toast.loading('Loading...');
      await updateReferralStatus.mutateAsync({
        id: payload.id,
        status: payload.status,
        referrerEmail: payload.email,
      });
      toast.success(`Referral ${payload.status.toLowerCase()} successfully`, { id: loadingToast });
      userReferralsDomain.refetch();
    } catch {
      toast.error('Something went wrong');
      // console.log(error);
    }
  };

  useEffect(() => { 
    if (userReferralsDomain.data) {
      const resData = userReferralsDomain.data as any;
      setTotalReferrals(resData.totalReferrals || 0);
      setTotalSuccessfulReferrals(resData.totalSuccessfulReferrals || 0);
      setReferralData(resData.data || []);
      setData(resData.referrals || []);
      setPartnerReferrals(resData.partnerReferrals || []);
    }
  }, [userReferralsDomain.data]);

  const isLoading = userReferralsDomain.isLoading || userReferralsDomain.isFetching;

  function modifyArray(modifiedArr: any[]) {
    modifiedArr = modifiedArr.filter(
      (el) =>
        el.field !== 'isVerified' &&
        el.field !== 'aggregator' &&
        el.field !== '_id' &&
        el.field !== 'referrer'
    );

    modifiedArr.push(
      {
        field: 'Referral Status',
        headerName: 'Referral Status',
        width: 200,
        headerClassName: 'bg-[#80D7FF]',
      },
      {
        field: 'Approve Referral',
        headerName: 'Approve Referral',
        width: 200,
        headerClassName: 'bg-[#80D7FF]',
      }
    );

    return modifiedArr;
  }

  /*
  const columns = useMemo(() => {
    if (data && data.length > 0) {
        const firstItem = data[0];
        const columnDefs = Object.keys(firstItem).map(key => ({
            field: key,
            headerName: camelCaseToTitleCase(key),
            width: 150,
        }));
        return modifyArray(columnDefs);
    } else {
        return [];
    }
  }, [data]);
  */

  if (isLoading) {
    return (
      <tr>
        <td colSpan={4} className="text-center  bg-white p-20">
          <FiLoader className="animate-spin" />
        </td>
      </tr>
    );
  }

  if (!referralData?.length && !data?.length && !partnerReferrals?.length) {
    return (
      <tr>
        <td colSpan={4} className="text-center bg-white p-20">
          No referrals yet
        </td>
      </tr>
    );
  }

  return (
    <div className="mt-2 p-6 overflow-hidden bg-white flex flex-col gap-8">
      <div className="capitalize my-1 font-bold ">Total referrals : {totalReferrals}</div>
      <div className="capitalize my-1  font-bold ">
        Approved referrals : {totalSuccessfulReferrals}
      </div>
      <>
        {data?.length > 0 && (
          <Table
            allowDelete={false}
            data={data}
            helpers={{ handleUpdateReferral }}
            modifyArray={modifyArray}
            tableName='DEFAULT_REFERRAL'
          />
        )}
        {referralData?.length > 0 && (
          <Table
            allowDelete={false}
            data={referralData}
            helpers={{ handleUpdateReferral }}
            modifyArray={modifyArray}
            tableName='REFERRAL_DATA'
          />
        )}
        {partnerReferrals?.length > 0 && (
          <Table
            allowDelete={false}
            data={partnerReferrals}
            helpers={{ handleUpdateReferral }}
            modifyArray={modifyArray}
            tableName='PARTNER_REFERRAL'
          />
        )}
      </>
    </div>
  );
};

export default AdminUserReferralTable;