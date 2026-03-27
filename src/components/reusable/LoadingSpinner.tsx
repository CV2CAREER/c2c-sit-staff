import React from "react";
import Image from "next/image";
import hlogo from "../../../public/svg/h-logo.svg"; 
import { styled } from '@mui/material/styles';

const StyledGridOverlay = styled('div')(({ theme } : any) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  backgroundColor: 'rgba(18, 18, 18, 0.9)',
  ...theme.applyStyles('light', {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  }),
}));

const LoadingSpinner = () => {
  return (
    <StyledGridOverlay>
      <div className="flex flex-col items-center justify-center animate-pulse">
        <Image src={hlogo} alt="Loading logo" width={300} height={300} />{" "}
        {/* Add dimensions */}
        <p className="text-sm mt-4 text-gray-600">
          Please wait while we retrieve your data...
        </p>
      </div>
    </StyledGridOverlay>
  );
};

export default LoadingSpinner;
