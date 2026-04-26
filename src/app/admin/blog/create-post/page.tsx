"use client"
import React, {useState, useEffect} from "react";
import { IoCloudDone } from "react-icons/io5";
import { GoBell } from "react-icons/go";
import { TiEye } from "react-icons/ti";
import { RiArrowDownSFill } from "react-icons/ri";
import { RxDividerVertical } from "react-icons/rx";
import { IoSendSharp } from "react-icons/io5";
import { RiArrowDownSLine } from "react-icons/ri"; 
import { useAuthStore } from "@/store/user.store";
import { useBlogMutations } from "@/hooks/api/admin/blog";
import { toast } from "react-hot-toast";
import TiptapEditor from "../_components/TiptapEditor";
import { useRouter } from "next/navigation";
import FeaturedImagePicker from "../_components/FeaturedImagePicker";

const CreateBlogPostPage = () => {
  const [showDate, setShowDate] = useState(false);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const user = useAuthStore((state) => state.user);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedOption, setSelectedOption] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isOpenOption, setIsOpenOption] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [description, setDescription] = useState("");
  const [featuredImage, setFeaturedImage] = useState<string | null>(null);

  const { createPost } = useBlogMutations();
  const router = useRouter();

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setIsOpen(false);
  };

  const handleOPtionChange = (option: string) => {
    setSelectedOption(option);
    setIsOpenOption(false);
  };

  const toggleDropdownCategory = () => {
    setIsOpen((prev) => !prev);
  }

  const toogleDropDownOption = () => {
    setIsOpenOption((prev) => !prev);
  }

  const role = user?.role;
  const userId = user?._id || (user as any)?.id || "";
  const name = ((user?.firstName || "") + " " + (user?.lastName || "")).trim() || "Unknown";

  const handleCreateContent = async () => {
    if (!userId || !title.trim() || !content.trim() || !selectedCategory.trim() || !selectedOption.trim()) {
      toast.error("Please fill all required fields and make sure you are logged in.");
      return;
    }

    const postData = {
      title: title.trim(),
      body: content,
      author: name,
      userId,
      option: selectedOption,
      category: selectedCategory,
      description,
      featuredImage: featuredImage || undefined,
      status: (selectedDate && new Date(selectedDate) > new Date() ? 'Scheduled' : 'Published') as any,
      scheduledDate: selectedDate || undefined,
    };

    toast.promise(createPost.mutateAsync(postData), {
      loading: "Publishing post...",
      success: () => {
        setTitle("");
        setContent("");
        setDescription("");
        setSelectedCategory("");
        setSelectedOption("");
        router.push("/admin/blog");
        return "Post published successfully!";
      },
      error: (err) => err?.message || "Failed to publish post",
    });
  };

  useEffect(() => {
    const toolbarButtons = document.querySelectorAll('.ql-toolbar button');
    toolbarButtons.forEach(button => {
      const formatType = button.classList[0].split('-')[1];
      button.setAttribute('title', formatType); 
    });
  }, []);

  const handleDateClick = () => {
    setShowDate((prev) => !prev); 
  };
    
  const handleDateChange = (event: { target: { value: React.SetStateAction<string>; }; }) => {
    setSelectedDate(event.target.value); 
  };

  return (
    <div className="w-full h-auto bg-[#C1C1C1] flex flex-col">
      <div className="flex flex-col w-full h-[240px] bg-white relative right-1000">
        <div className="flex flex-col sm:text-left md:flex-row parent justify-between rounded-t-lg w-full h-[80px] bg-white p-4 items-center ml-4">
          <div className="flex items-center w-[300px] h-[40px] bg-white  text-F3F3F3 p-2">
            <div className='flex mr-4 items-center space-x-1 w-[133px] h-[40px] rounded text-black border border-[#A3A3A3] text-center'> 
              <span className='pl-1'><TiEye/></span>
              <span>preview</span>
              <span className='text-sm text-[#A3A3A3]'><RxDividerVertical/></span>
              <span><RiArrowDownSFill/></span>
            </div>

            <div className='flex space-x-1 bg-[#008ED3] hover:bg-blue-800 items-center text-white md:w-[95px] w-auto rounded p-2 h-40px text-center mr-4'>
              <span><IoSendSharp/></span>
              <span className='cursor-pointer' onClick={handleCreateContent}> {createPost.isPending ? 'Publishing...' : 'Publish'}</span>
            </div>
            <span className='text-[#A3A3A3] items-center'> <IoCloudDone/></span>
          </div>

          <div className="flex items-center mr-8">
            <GoBell className="text-black bg-[#F3F3F3] p-2 rounded-full mr-4 text-4xl" />
            <div className="flex items-center justify-center w-[40px] h-[40px] bg-[#88D0FF] text-black font-bold rounded-full mr-4">
              {name ? name.charAt(0).toUpperCase() : 'A'}
            </div>

            <div className="flex flex-col">
              <p className="font-semibold">{name || 'Unknown'}</p>
              <span className="text-gray-500 bg-[#F3F3F3] inline-block w-16 rounded text-center">{role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Unknown'}</span>
            </div>
          </div>
        </div>

        <div className="w-full ml-8">
          <div className="mr-2">
            <div>
              <input
                type="text"
                className="my-2 sm:w-[400px] md:w-[600px] lg:w-[800px] xl:w-[1250px] w-full  border-t-0 border-b-2 border-l-0 border-r-0 border-b-[#008ED3]"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title"
              />
            </div>
            <div>
              <textarea
                className="w-full h-[60px] sm:w-[400px] md:w-[600px] lg:w-[800px] border-t-0 border-b-2 border-l-0 border-r-0 border-b-[#008ED3] xl:w-[1250px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Short Description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}    
              />
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col-reverse md:flex-row justify-between w-full">
        <div className="quill-editor  w-[85%] mr-12 ml-12 bg-white mt-0">       
          <TiptapEditor content={content} setContent={setContent} />
        </div>
        
        <div className="w-[100%] md:w-[15%] bg-white flex flex-col md:h-[1200px] h-[80%]  flex-start left-20 right-5 pl-4 pr-4">
          <p className="font-bold mt-4">Post settings</p>
          <hr className="border-0 h-[1px] bg-gray-400 mb-2 mt-4" />
          <div className="flex flex-col mb-2">
            <div 
              className="flex items-center cursor-pointer" 
              onClick={toggleDropdownCategory}
            >
              <p className="mr-1 text-black"><RiArrowDownSLine /></p>
              <p>{selectedCategory || 'Category'}</p>
            </div>
            {isOpen && (
              <div className="mt-1 bg-white border border-gray-300 rounded shadow-lg">
                <p className="p-2 cursor-pointer hover:bg-gray-200" onClick={() => handleCategoryChange('Technology')}>Technology</p>
                <p className="p-2 cursor-pointer hover:bg-gray-200" onClick={() => handleCategoryChange('Job')}>Job</p>
                <p className="p-2 cursor-pointer hover:bg-gray-200" onClick={() => handleCategoryChange('Career')}>Career</p>
              </div>
            )}
          </div>
          <hr className="border-0 h-[1px] bg-gray-400 mb-2" />

          <div className="flex mb-2 ">
            <p className="mr-1 text-black"><RiArrowDownSLine /></p>
            <p>Location</p>
          </div>

          <hr className="border-0 h-[1px] bg-gray-400 mb-2" />

          <div className="flex flex-col mb-2">
            <div className="flex items-center cursor-pointer" onClick={toogleDropDownOption}>
              <p className="mr-1 text-black"><RiArrowDownSLine /></p>
              <p>{selectedOption || 'Options'}</p>
            </div>
            {isOpenOption && (
              <div className="mt-1 bg-white border border-gray-300 rounded shadow-lg">
                <p className="p-2 cursor-pointer hover:bg-gray-200" onClick={() => handleOPtionChange('Interview')}>Interview</p>
                <p className="p-2 cursor-pointer hover:bg-gray-200" onClick={() => handleOPtionChange('Resume')}>Resume</p>
                <p className="p-2 cursor-pointer hover:bg-gray-200" onClick={() => handleOPtionChange('Career Transition')}>Career Transition</p>
              </div>
            )}
          </div>

          <hr className="border-0 h-[1px] bg-gray-400 mb-2" />

          <div className="flex  mb-2 cursor-pointer" onClick={handleDateClick}>
            <p className="mr-1 text-black"><RiArrowDownSLine /></p>
            <p>Published on</p>
          </div>

          {showDate && (
            <div className="text-gray-600 ml-6 md:ml-0 mr-8 flex flex-col">
              <input
                type="datetime-local"
                onChange={handleDateChange}
                value={selectedDate ? new Date(selectedDate).toISOString().slice(0, 16) : ''} 
                className="border border-gray-300 rounded p-2 w-full md:w-auto" 
              />
            </div>
          )}
          <hr className="border-0 h-[1px] bg-gray-400 mb-2 mt-4" />
          <FeaturedImagePicker onImageChange={(base64) => setFeaturedImage(base64)} />
        </div>
      </div>
    </div>
  );
};

export default CreateBlogPostPage;
