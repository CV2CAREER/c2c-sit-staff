import { range } from 'lodash';
import Link from 'next/link';
import React from 'react';

interface AdminStatisticsCardProps {
  statisticsData: Array<{
    id: number;
    label: string;
    value: any;
    route?: string;
    routeName?: string;
  }>;
  loading?: boolean;
}
const ApplicationStats: React.FC<AdminStatisticsCardProps> = ({
  statisticsData,
  loading = false,
}) => {
  return (
    <div className="flex flex-col w-full xl:w-[800px] lg:flex-row mt-6 justify-between gap-8">
      {loading
        ? range(2).map((data, index) => (
            <div
              key={index}
              className="flex flex-col relative p-6 w-full h-[152px] rounded-2xl bg-gray-300 animate-pulse"
            >
              <h3 className="text-career-gray-200 font-medium text-14 w-24 h-8 animate-pulse bg-gray-100 rounded-md" />
              <p className="absolute bottom-0 text-[57px] font-medium text-career-black-200 w-16 rounded-md h-6 mb-4 animate-pulse bg-gray-100" />
            </div>
          ))
        : statisticsData.map((data, i) => (
            <div
              className={`flex ${
                i % 2 !== 0 && 'lg:ml-5 mt-5 lg:mt-0'
              }   flex-col relative p-6 bg-career-blue-200 w-full h-[152px] rounded-2xl shadow-xl border `}
              key={data.id}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-career-blue-800 font-medium text-14">{data.label}</h3>
                {data.route && (
                  <Link className="text-career-blue-800 font-medium text-14" href={data.route}>
                    {data.routeName}
                  </Link>
                )}
              </div>
              <p className="absolute bottom-4 text-32 bigLaptop:text-[57px] !font-medium font-sharp-grotesk text-career-blue-800">
                {Number(data.value).toLocaleString()}
              </p>
            </div>
          ))}
    </div>
  );
};

export default ApplicationStats;
