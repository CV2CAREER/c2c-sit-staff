import Image from "next/image";
import hlogo from "@/assets/svg/h-logo.svg";

interface LoadingSpinnerProps {
  text?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  text = "Loading...",
}) => {
  return (
    <div className="flex flex-col items-center justify-center bg-white p-6 h-[20vh]">
      <div className="h-[200px] flex items-center justify-center animate-pulse">
        <Image src={hlogo} alt="Loading logo" />
      </div>
      <p className="text-gray-600 mt-4">{text}</p>
    </div>
  );
};

export default LoadingSpinner;
