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
      className="flex h-full flex-col justify-between rounded-xl border border-primary/15 bg-white p-4 shadow-[0_1px_10px_rgba(0,142,211,0.10)] transition-all duration-300 hover:border-primary/40 hover:shadow-[0_1px_14px_rgba(0,142,211,0.16)]"
    >
      {isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="bg-blue-100 h-10 w-10 rounded-full mx-auto"></div>
          <div className="h-4 bg-gray-300 rounded w-3/4 mx-auto"></div>
          <div className="h-8 bg-gray-300 rounded w-1/2 mx-auto mt-2"></div>
        </div>
      ) : (
        <>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[12px] font-medium text-gray-600 sm:text-sm">
              {title}
            </p>
            {icon ? (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                {icon}
              </span>
            ) : null}
          </div>
          <h1 className="text-3xl font-bold text-gray-800">
            {(value ?? 0).toLocaleString()}
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
