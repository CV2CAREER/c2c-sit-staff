import React from "react";
import { FaSpinner } from "react-icons/fa"; // Make sure you have react-icons installed: npm install react-icons

interface SpinnerProps {
  size?: string; // e.g., '1em', '24px', 'w-6 h-6'
  color?: string; // e.g., 'text-blue-500', 'text-white'
  className?: string; // Additional Tailwind classes
}

const Spinner: React.FC<SpinnerProps> = ({
  size = "w-8 h-8",
  color = "text-blue-500",
  className = "",
}) => {
  // The 'size' prop can be a Tailwind class like 'w-6 h-6' or a direct CSS value like '24px'.
  // We'll prioritize Tailwind classes if provided in 'size', otherwise use direct style.
  const isTailwindSize = size.startsWith("w-") || size.startsWith("h-");
  const style = isTailwindSize ? {} : { width: size, height: size };

  return (
    <div
      className={`flex items-center justify-center ${size} ${color} ${className}`}
    >
      <FaSpinner className="animate-spin" style={style} />
    </div>
  );
};

export default Spinner;
