
'use client'
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation'; 
import BlogListingNavbar from './Navbar'
import PostDetailsHero from '../_components/PostDetailsHero'
import StorySection from './StorySection'
import CircularProgress from '@mui/material/CircularProgress';

type Post = {
  title: string;
  body: string; 
};


const ContentDisplay = () => {
  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<Post | null>(null);
  
  const searchParams = useSearchParams(); 
  const id = searchParams?.get('id');

  useEffect(() => {
    const fetchPost = async () => {
      if (id) {
        try {
          const response = await fetch(`/api/blog/${id}`);
          const data = await response.json();

          setPost(data);
        } catch {
          // Error handled silently
        } finally {
          setLoading(false);
        }
      }
    };

    fetchPost();
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '20vh' }}>
        <CircularProgress />
        <span style={{ marginLeft: '10px', color: '#555' }}>Loading content...</span>
      </div>
    );
  }


  if (!post) {
    return <div>No content available.</div>;
  }

  return (
    <div className="max-w-full md:w-[1240px] w-full h-auto md:flex inline-block md:flex-col bg-[#EDFFFF] px-2 md:px-8 box-border gap-4">
      <BlogListingNavbar />
      <PostDetailsHero posts={post} />
  
      <div className="relative mt-8 mb-6 md:left-[168px]">
        <h1 className="text-xl sm:text-2xl font-bold mb-2">{post.title}</h1>
        <div className="prose" dangerouslySetInnerHTML={{ __html: post.body }} />
      </div>
  
      <div className="w-full">
        <StorySection posts={post} />
      </div>
    </div>
  );
  

  
}

export default ContentDisplay;

