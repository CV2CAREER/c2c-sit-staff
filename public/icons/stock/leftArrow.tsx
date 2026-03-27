/* eslint-disable max-len */
import React from 'react';
/**
 *
 * @param {Object} props Component props
 * @return {React.Component} React component
 */
const SVG = (props: any): unknown => (
  <svg
    width="48"
    height="48"
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <rect width="48" height="48" rx="24" fill="#F3F3F3" />
    <mask
      id="mask0_2155_4148"
      maskUnits="userSpaceOnUse"
      x="12"
      y="12"
      width="24"
      height="24"
    >
      <rect x="12" y="12" width="24" height="24" fill="#D9D9D9" />
    </mask>
    <g mask="url(#mask0_2155_4148)">
      <path
        d="M19.825 25L25.425 30.6L24 32L16 24L24 16L25.425 17.4L19.825 23H32V25H19.825Z"
        fill="#131414"
      />
    </g>
  </svg>
);

export default SVG;
