import BlogCards from './Cards';

type PostDetailsHeroProps = {
  posts: any; 
};


const StorySection = ({ posts: _posts }: PostDetailsHeroProps) => {
    return (
      <div className="mt-4 w-full relative flex justify-center md:left-[168px] ">
        {/* Flexbox column to align items vertically */}
        <div className="flex flex-col md:w-[1240px] w-full">
  
         <div className="md:w-[1216px] w-full h-[26px] text-black md:left-[168px] mb-6 ml-2 mt-12">
        <h1 className='text-lg font-semibold'>Related posts</h1>
   
    </div>
    <BlogCards/>
  
        </div>
      </div>
    );
  };
  
  
  export default StorySection;
  



