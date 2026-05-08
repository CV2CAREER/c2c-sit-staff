import React from 'react';

/**
 *
 * @param {Object} props Component props
 * @return {React.Component} React component
 */
const BagIcon = (props: any): unknown => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M6 6V8H5C3.89543 8 3 8.89543 3 10V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V10C21 8.89543 20.1046 8 19 8H18V6C18 3.79086 16.2091 2 14 2H10C7.79086 2 6 3.79086 6 6ZM10 4H14C15.1046 4 16 4.89543 16 6V8H8V6C8 4.89543 8.89543 4 10 4ZM5 10H19V19H5V10Z"
      fill="currentColor"
    />
  </svg>
);

export default BagIcon;

