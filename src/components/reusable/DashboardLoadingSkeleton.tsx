import React from "react";

const DashboardSkeleton: React.FC = () => {
  return (
    <div className="w-full lg:w-[32%] h-[150px] bg-gray-300 rounded-md p-4 flex flex-col justify-between shadow animate-pulse"></div>
  );
};

export default DashboardSkeleton;
