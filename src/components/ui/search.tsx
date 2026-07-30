import React from 'react';
import { FaSearch } from 'react-icons/fa';
import { cn } from '@/lib/utils';

type SearchInputProps = {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  placeholder?: string;
  className?: string;
};

const SearchInput: React.FC<SearchInputProps> = ({ searchQuery, setSearchQuery, placeholder = "Search", className }) => {
  return (
    <div className={cn("flex items-center gap-3 w-[14rem] text-[15px] sm:text-[17px] md:w-96 rounded-3xl px-4 py-2 bg-white shadow-md", className)}>
      <FaSearch className="text-gray-400" />

      <input
        type="text"
        placeholder={placeholder}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="border-none bg-transparent w-[150px] sm:flex-1  focus:border-none py-0 placeholder:text-gray-400 focus:outline-none placeholder:text-[14px] sm:placeholder:text-[16px]"
      />
    </div>
  );
};

export default SearchInput;
