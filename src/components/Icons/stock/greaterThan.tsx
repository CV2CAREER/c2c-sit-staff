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
      id="mask0_1962_1556"
      maskUnits="userSpaceOnUse"
      x="0"
      y="0"
      width="24"
      height="24"
    >
      <rect
        x="-0.5"
        y="0.5"
        width="23"
        height="23"
        transform="matrix(-1 0 0 1 23 0)"
        fill="#D9D9D9"
        stroke="#131414"
      />
    </mask>
    <g mask="url(#mask0_1962_1556)">
      <path
        d="M8 21.9823L17.9823 12L8 2.01768L6.24268 3.775L14.4588 11.9912L14.4677 12L14.4588 12.0088L6.24268 20.225L8 21.9823Z"
        fill="#797979"
        stroke="#797979"
        strokeWidth="0.025"
      />
    </g>
  </svg>
);

export default SVG;
