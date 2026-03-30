import React from 'react'

const VerifiedTag = () => {
  return (
    <div className="flex items-center ">
      <span className="w-5 h-5 flex items-center justify-center">
        <svg
          width="17"
          height="16"
          viewBox="0 0 17 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className='!w-full !h-full'
        >
          <mask
            id="mask0_4312_25978"
            style={{
              maskType: 'alpha',
            }}
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="17"
            height="16"
          >
            <rect x="0.75" width="16" height="16" fill="#D9D9D9" />
          </mask>
          <g mask="url(#mask0_4312_25978)">
            <path
              d="M6.53411 14.7992L5.28411 12.7326L2.93411 12.1992L3.15078 9.79922L1.55078 7.99922L3.15078 6.19922L2.93411 3.79922L5.28411 3.26589L6.53411 1.19922L8.75078 2.14922L10.9674 1.19922L12.2174 3.26589L14.5674 3.79922L14.3508 6.19922L15.9508 7.99922L14.3508 9.79922L14.5674 12.1992L12.2174 12.7326L10.9674 14.7992L8.75078 13.8492L6.53411 14.7992ZM7.90078 10.3992L11.8674 6.44922L11.0174 5.59922L7.90078 8.69922L6.48411 7.29922L5.63411 8.14922L7.90078 10.3992Z"
              fill="#008ED3"
            />
          </g>
        </svg>
      </span>
      &nbsp;
      <span className="text-xs font-poppins text-career-blue-800 font-normal">Verified</span>
    </div>
  )
}

export default VerifiedTag