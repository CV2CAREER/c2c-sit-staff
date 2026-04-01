type PostDetailsHeroProps = {
  posts: any; 
};

const PostDetailsHero = ({ posts }: PostDetailsHeroProps) => {
  

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="mt-4">
      <div className="md:w-[1240px] w-full md:h-[180px] relative">
       
        <div className="md:absolute md:left-[168px] top-0 w-[110px]  md:h-[32px] h-auto rounded-lg text-white bg-[#008ED3] flex items-center justify-center">
          <p>{posts?.category || 'No category'}</p>
        </div>

       
        <div className="md:w-[1240px] w-full md:h-[128px] h-auto flex flex-col justify-center mt-8 md:absolute md:left-[168px]">
          <h6 className="text-black font-bold w-full item-center md:h-[70px]">
            {posts?.description ? posts?.description : 'No content available'}
          </h6>
        </div>

      
        <div className="flex justify-between md:absolute md:left-[168px] md:bottom-0 md:w-[324px] w-full md:h-[24px] h-auto">
          <img src="/a-author.svg" alt="Logo" className="w-auto h-auto" />
          <p className="ml-4 text-sm text-gray-500 w-auto h-auto">
            {posts?.createdAt ? formatDate(posts.createdAt) : 'No date available'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PostDetailsHero;
