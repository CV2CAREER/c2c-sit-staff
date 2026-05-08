import * as React from "react";
const SVGComponent = (props: any) => (
    <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M3 5V20.7929C3 21.2383 3.53857 21.4614 3.85355 21.1464L7.70711 17.2929C7.89464 17.1054 8.149 17 8.41421 17H19C20.1046 17 21 16.1046 21 15V5C21 3.89543 20.1046 3 19 3H5C3.89543 3 3 3.89543 3 5Z"
       stroke="#9e9e9e"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M15 12C14.2005 12.6224 13.1502 13 12 13C10.8498 13 9.79952 12.6224 9 12"
       stroke="#9e9e9e"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9 8.01953V8"
        stroke="#9e9e9e"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M15 8.01953V8"
       stroke="#9e9e9e"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
export default SVGComponent;
