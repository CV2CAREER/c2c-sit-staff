"use client"
import React, { useEffect, useState } from "react";
import axiosInstance from "@/services/api-client";
import { SERVER_URI } from "@/constants/env";
import { ADMIN_BLOG } from "@/constants/apiEndpoints/admin.endpoint";
import { useRouter } from "next/navigation"; 
import CircularProgress from "@mui/material/CircularProgress";

interface CardData {
  category: string;
  description: string;
  logoSrc: string;
  date: string;
  image: string; 
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const Card: React.FC<CardData & { onClick: () => void }> = ({ category, description, logoSrc, date, image, onClick }) => {
  const getTitleWidth = (category: string) => {
    switch (category) {
      case "Technology":
        return "w-[104px]";
      case "Career":
        return "w-[66px]";
      case "Job":
        return "w-[40px]";
      default:
        return "w-auto"; 
    }
  };

  return (
    <div onClick={onClick} className="cursor-pointer md:w-[392px] w-[352px] md:h-[440px] h-[440px] rounded-lg bg-white shadow-md">
      <div className="md:w-[360px] w-[320px] h-[240px] pt-[8px] p-[2px] mx-auto">
        <img src={image} alt={category} className="w-full h-full object-cover" />
      </div>

      {/* Content Section */}
      <div className="md:w-[360px] md:h-[228px] h-[200px] w-[300px] mx-auto md:pr-4 md:pt-4 p-2">
        <div className="md:w-[344px] w-[290px] h-auto">
          <div className="">
            <p className={`rounded ${getTitleWidth(category)} text-center bg-[#008ED3] text-white`}>
              {category}
            </p>
          </div>
          <p className="text-sm mt-2 text-black font-semibold">
            {description}
          </p>
        </div>

        <div className="flex justify-between items-center mt-4">
          <img src={logoSrc} alt="Logo" className="w-auto h-auto" />
          <p className="text-sm text-gray-500">{date}</p>
        </div>
      </div>
    </div>
  );
};

interface BlogPost {
  _id: string;
  category: string;
  description: string;
  logoSrc?: string;
  date?: string;
  image: string;
  createdAt: string;
  recycled: boolean;
}

const CardLayout = () => {

  
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter(); 

  useEffect(() => {

    const fetchPosts = async () => {
      setLoading(true);
      try {
        const response = await axiosInstance.get(`${SERVER_URI}${ADMIN_BLOG}`);
        
const filteredPosts = response.data.allPosts
  .filter((post: BlogPost) => post.recycled === false)
  .sort((a: BlogPost, b: BlogPost) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
      const firstThreePosts = filteredPosts.slice(0, 3);
      setPosts(firstThreePosts);
        // Silent catch to satisfy no-console rule
      } finally {
        setLoading(false);
      }
    };
    

    fetchPosts();
  }, []);

  const truncateDescription = (description: string, wordLimit: number) => {
    const words = description.split(' ');
    return words.length > wordLimit
      ? words.slice(0, wordLimit).join(' ') + '...'
      : description;
  };

  const handleViewPost = (postId: string) => {
    router.push(`/blog/blog-details?id=${postId}`);
  };


  if (loading) {
    return (
      <div className="flex justify-center items-center h-20">
        <CircularProgress />
        <span className="ml-2 text-gray-600">Loading blog posts...</span>
      </div>
    );
  }


  return (
    <div className="md:w-[1240px] w-full mx-auto p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {posts?.map((card) => (
          <Card
            key={card._id}
            category={card.category}
            description={truncateDescription(card.description, 25)} 
            logoSrc='/a-author.svg'
            date={formatDate(card.createdAt)}
            image={card.image}
            onClick={() => handleViewPost(card._id)} 
          />
        ))}
      </div>
    </div>
  );
};

export default CardLayout;

