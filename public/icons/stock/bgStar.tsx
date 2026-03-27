/* eslint-disable max-len */
import React from 'react';
/**
 *
 * @param {Object} props Component props
 * @return {React.Component} React component
 */
const SVG = (props: any): unknown => (
  <svg
    width="64"
    height="64"
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M32 0L40.6429 23.3571L64 32L40.6429 40.6429L32 64L23.3571 40.6429L0 32L23.3571 23.3571L32 0Z"
      fill="#A4EDFF"
    />
  </svg>
);

export default SVG;
