'use client';
import Image from 'next/image';
import React, { useState } from 'react';
import { ImSpinner2 } from 'react-icons/im';
import toast from 'react-hot-toast';
import { useAdminMutations } from "@/hooks/api/admin.api";

interface AggregatorListingProps {
  data: any;
}

const AggregatorListing: React.FC<AggregatorListingProps> = ({ data }) => {
  const { toggleAggregatorMutation } = useAdminMutations();
  const [active, setActive] = useState<string>('');

  const getAggregatorId = (agg: any) => agg?._id ?? agg?.id ?? '';

  const toggleAggregator = async (agg: any) => {
    const aggId = getAggregatorId(agg);
    if (!aggId) {
      toast.error('Aggregator ID is missing');
      return;
    }

    try {
      setActive(aggId);
      await toggleAggregatorMutation.mutateAsync({
        aid: aggId,
        body: { isEnabled: !agg?.isEnabled }
      });
      toast.success(`${agg?.name} has been ${agg?.isEnabled ? 'disabled' : 'enabled'}`);
    } catch {
      toast.error('An error occurred');
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6 mt-6">
      {data.map((agg: any) => {
        const aggId = getAggregatorId(agg);
        return (
          <div
            className="flex items-center w-full h-[88px] bg-[#F9F9F9] rounded-[8px] p-4"
            key={aggId || agg?.name}
          >
            {toggleAggregatorMutation.isPending && active === aggId ? (
              <ImSpinner2 className="animate-spin text-base" />
            ) : (
              <input
                name="agg"
                checked={agg.isEnabled}
                type="checkbox"
                disabled={!aggId}
                onChange={() => toggleAggregator(agg)}
              />
            )}
            <div className="bg-white rounded-full flex items-center justify-center w-[56px] h-[56px] mx-4">
              <Image
                src={agg?.picture?.url}
                alt=""
                width={48}
                height={18}
                className="!rounded-full w-[20px] h-auto"
              />
            </div>
            <p className="text-career-gray-200 text-14">{agg.name}</p>
          </div>
        );
      })}
    </div>
  );
};

export default AggregatorListing;
