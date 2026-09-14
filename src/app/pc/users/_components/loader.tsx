'use client';
import hlogo from "../../../../../public/svg/h-logo.svg";
import Image from 'next/image';

function PulseLoader() {
  return (
    <div className="flex items-center justify-center bg-white p-6 h-[20vh]">
      <div className="h-[200px] flex items-center justify-center animate-pulse">
        <Image className="w-[194px] h-[42px]" src={hlogo} alt="Laigus logo" />
      </div>
    </div>
  );
}

export default PulseLoader;
