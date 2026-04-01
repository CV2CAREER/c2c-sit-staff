"use client"

import { Chip } from "@heroui/chip";
import { IoMdArrowDropdown, IoMdArrowDropup } from "react-icons/io";
import { Skeleton } from "@/components/ui/skeleton";
import { useBlogQueries } from "@/hooks/api/admin/blog";

const BlogStatCardsPage = () => {
  const { blogStatsDomain } = useBlogQueries();
  const stats = blogStatsDomain.data;

  const dashboardCardsData = [
    {
      title: "Followers",
      value: stats?.followers?.value || 0,
      trend: stats?.followers?.trend || 0,
    },
    {
      title: "Posts",
      value: stats?.posts?.value || 0,
      trend: stats?.posts?.trend || 0,
    },
    {
      title: "Comments",
      value: stats?.comments?.value || 0,
      trend: stats?.comments?.trend || 0,
    },
  ];

  if (blogStatsDomain.isLoading) {
    return (
      <section className="flex flex-col md:flex-row gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="w-full md:w-1/3 bg-white p-4 rounded-md shadow-md gap-3 flex flex-col">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-16" />
          </div>
        ))}
      </section>
    );
  }

  return (
    <section className="flex flex-col md:flex-row gap-4">
      {dashboardCardsData.map((card, idx) => {
        const trendChipStyles = card.trend > 0 ? "bg-green-100 text-green-600" : card.trend < 0 ? "bg-red-100 text-red-600" : "bg-gray-100 text-black";
          return (
            <div key={idx} className="w-full md:w-1/3 bg-white p-4 rounded-md shadow-md">
              <div className="flex justify-between items-center">
                <p className="text-[12px] sm:text-sm font-medium text-gray-600">
                  {card.title}
                </p>
                <div className="flex items-center gap-2">
                  <Chip className={trendChipStyles}>{card.trend}%</Chip>
                  {card.trend > 0 ? <IoMdArrowDropup color="green" /> : card.trend < 0 ? <IoMdArrowDropdown color="red" /> : null}
                </div>
              </div>
              <h1 className="text-3xl font-bold text-gray-800 mt-auto md:mt-0">
                {card.value}
              </h1>
            </div>
          )})}
    </section>
  );
};

export default BlogStatCardsPage;
