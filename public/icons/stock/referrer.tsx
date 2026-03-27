import React from 'react';

/**
 *
 * @param {Object} props Component props
 * @return {React.Component} React component
 */
const PromotionIcon = (props: any): unknown => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M4 12H2V16H4L7 18V6L4 8H2V12H4ZM22 8C22 5.8 20.2 4 18 4H10C9.45 4 9 4.45 9 5V19C9 19.55 9.45 20 10 20H18C20.2 20 22 18.2 22 16V8ZM18 18H11V6H18C19.1 6 20 6.9 20 8V16C20 17.1 19.1 18 18 18Z"
      fill="#808080"
    />
    <circle cx="8" cy="12" r="1.5" fill="#808080" />
    <path
      d="M10 19.5C9.45 19.5 9 19.95 9 20.5C9 21.05 9.45 21.5 10 21.5C10.55 21.5 11 21.05 11 20.5C11 19.95 10.55 19.5 10 19.5Z"
      fill="#808080"
    />
  </svg>
);

export default PromotionIcon;
