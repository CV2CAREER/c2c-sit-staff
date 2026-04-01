import React from 'react';
import { MdOutlineKeyboardArrowRight } from "react-icons/md";
import Link from 'next/link'

const Navbar: React.FC = () => {
  return (


    <div className="mt-10">
  <div className="mt-16">
    <div className="h-[80px] relative">
      <div className="flex items-center justify-start space-x-2 w-full h-[24px] md:absolute md:left-[168px] md:top-[20px]">
        <Link href='/'>
          <p className="text-[#334335] text-sm sm:text-normal hover:text-[#00bede]">Home</p>
        </Link>
        <MdOutlineKeyboardArrowRight className="text-sm sm:text-normal text-[#334335]" />
        <Link href='/blogging'>
          <p className="text-[#334335] text-sm sm:text-normal hover:text-[#00bede]">Blog</p>
        </Link>
        
        <MdOutlineKeyboardArrowRight className="text-sm sm:text-normal text-black" />
        <Link href='/blogging'>
          <p className="text-black text-sm sm:text-normal hover:text-[#00bede]">Blog listing</p>
        </Link>

        <MdOutlineKeyboardArrowRight className="text-sm sm:text-normal text-[#00bede]" />
        <p className="text-[#00bede] text-sm sm:text-normal">Post details</p>
      </div>
    </div>
  </div>
</div>
  )
};

export default Navbar;
