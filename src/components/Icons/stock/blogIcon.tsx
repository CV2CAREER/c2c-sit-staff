/* eslint-disable max-len */
import React from 'react';

/**
 *
 * @param {Object} props Component props
 * @return {React.Component} React component
 */
const BlogIcon = (props: any): unknown => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    {/* <rect width="24" height="24" rx="3" fill="currentColor" /> */}
    <path
      d="M7 4H17C17.55 4 18 4.45 18 5V19C18 19.55 17.55 20 17 20H7C6.45 20 6 19.55 6 19V5C6 4.45 6.45 4 7 4ZM16 18V6H8V18H16Z"
      fill="currentColor"
    />
    <path
      d="M9 8H15V9H9V8ZM9 11H15V12H9V11ZM9 14H12V15H9V14Z"
      fill="currentColor"
    />
    <path
      d="M19 9L20 10L17 13L16 12L19 9Z"
      fill="currentColor"
    />
    <path
      d="M17 14L18 15L14 19H13V18L17 14Z"
      fill="currentColor"
    />
  </svg>
);

export default BlogIcon;
