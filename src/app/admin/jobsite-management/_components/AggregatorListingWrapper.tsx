'use client';
import React, { useState } from 'react';
import AggregatorListing from './AggregatorListing';
import AddNewAggregator from '@/components/modals/AddNewAggregator';
import { range } from 'lodash';
import { Button } from '@material-tailwind/react';
import { FiPlus } from 'react-icons/fi';
import toast from 'react-hot-toast';

interface AggregatorListingWrapperProps {
  data: any;
  loading: boolean;
}
const AggregatorListingWrapper: React.FC<AggregatorListingWrapperProps> = ({
  data,
  loading,
}) => {
  const [showModal, setShowModal] = useState<boolean>(false);

  return (
    <>
      <div className="w-full bg-white p-6 rounded-2xl mt-6">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-24 !font-medium font-sharp-grotesk text-career-black-200 capitalize mr-auto">
            Jobsite
          </h3>
          <div className="flex items-center gap-3 flex-col md:flex-row">
            <Button
              placeholder=""
              onPointerEnterCapture={() => {}}
              onResize={() => {}}
              onResizeCapture={() => {}}
              onPointerLeaveCapture={() => {}}
              onClick={() => {
                toast('Coming Soon');
              }}
              variant="outlined"
              color="blue"
              className="!capitalize !font-normal !text-inherit !rounded !text-sm flex items-center gap-3"
            >
              <FiPlus className="text-blue-600 text-sm sm:text-xs" />
              <span className="hidden md:inline text-sm sm:text-xs">Add Recruiter site</span>
            </Button>

            <Button
              className="!h-[2.75rem] !text-14 !rounded-[0.25rem] bg-primary flex gap-3"
              onClick={() => setShowModal(true)}
              onPointerEnterCapture={() => {}}
              onResize={() => {}}
              onResizeCapture={() => {}}
              onPointerLeaveCapture={() => {}}
              placeholder=""
            >
              <FiPlus className="text-blue-600 text-sm sm:text-xs" />  
              <span className=" hidden md:inline text-sm sm:text-xs">Add Jobsite</span>  
            </Button>
          </div>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6 mt-6">
            {range(6).map((agg, index) => (
              <div
                className="flex bg-gray-400 animate-pulse items-center w-full h-[88px] rounded-[8px] p-4 cursor-pointer"
                key={index}
              >
                <input name="agg" type="checkbox" className="w-4 h-4 animate-pulse bg-gray-300" />
                <div className="animate-pulse bg-gray-300 rounded-full flex items-center justify-center w-[56px] h-[56px] mx-4" />
                <p className="text-career-gray-200 w-12 h-4 animate-pulse bg-gray-300 text-14" />
              </div>
            ))}
          </div>
        ) : (
          <AggregatorListing data={data} />
        )}
      </div>

      {showModal ? <AddNewAggregator setShowModal={setShowModal} /> : null}
    </>
  );
};

export default AggregatorListingWrapper;
