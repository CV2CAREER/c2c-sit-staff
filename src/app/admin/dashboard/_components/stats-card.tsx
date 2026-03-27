"use client";
import { motion } from "framer-motion";
import Link from "next/link";

type StatCardProps = {
  title: string;
  value: number;
  icon?: React.ReactNode;
  isLoading: boolean;
  route?: string;
};

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  isLoading,
  route,
}) => {
  const content = (
    <motion.div
      whileHover={{ scale: 1.03 }}
      className="bg-white shadow-md p-4 rounded-md flex flex-col justify-between transition-all duration-300 hover:shadow-lg h-full"
    >
      {isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="bg-blue-100 h-10 w-10 rounded-full mx-auto"></div>
          <div className="h-4 bg-gray-300 rounded w-3/4 mx-auto"></div>
          <div className="h-8 bg-gray-300 rounded w-1/2 mx-auto mt-2"></div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-2">
            <p className="text-[12px] sm:text-sm font-medium text-gray-600">
              {title}
            </p>
            {icon ? <span className="text-blue">{icon}</span> : null}
          </div>
          <h1 className="text-3xl font-bold text-gray-800">
            {value.toLocaleString()}
          </h1>
        </>
      )}
    </motion.div>
  );

  if (route) {
    return (
      <Link href={route} className="block h-full">
        {content}
      </Link>
    );
  }

  return content;
};

export default StatCard;
