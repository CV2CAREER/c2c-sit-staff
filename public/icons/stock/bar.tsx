/* eslint-disable max-len */
import React from 'react';
/**
 *
 * @param {Object} props Component props
 * @return {React.Component} React component
 */
const SVG = (props: any): unknown => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <mask
      id="mask0_3010_5421"
      maskUnits="userSpaceOnUse"
      x="0"
      y="0"
      width="24"
      height="24"
    >
      <rect width="24" height="24" fill="#D9D9D9" />
    </mask>
    <g mask="url(#mask0_3010_5421)">
      <path
        d="M4 19H8V11H4V19ZM10 19H14V5H10V19ZM16 19H20V13H16V19ZM2 21V9H8V3H16V11H22V21H2Z"
        fill="#797979"
      />
    </g>
  </svg>
);

export default SVG;
