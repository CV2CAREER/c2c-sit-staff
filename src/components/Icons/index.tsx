"use client";

import React from "react";
import MouseOverPopover from '../Popover/MouseHover';

/**
 * Icon component to get and render app icons
 * @param {Object} props Component properties
 * @return {React.Component} Icon component
 */
interface IconProps {
  name: string;
  className?: string;
  onClick?: () => void;
  text?: string;
  count?: number;
  color?: string,
}

const Icon: React.FC<IconProps> = ({
  name,
  className = "",
  onClick = () => { },
  text = "",
  color="",
  count = 0,
}) => {
  if (name === "") {
    return null;
  }
  try {
    const Image = require(`./stock/${name}`).default;
    if (Image) {
      const handleClick = () => {
        onClick();
      };

      // Render the image with a tooltip showing the count
      return (
        <div className={className} onClick={handleClick}>
          {count > 0 ? (
            <MouseOverPopover text={`${text}`}>
              <Image aria-label={name} title="" onClick={handleClick} />
              <span className="absolute top-0 right-0 mt-1 mr-1 bg-red-500 text-white text-xs px-1 rounded-full">
                {count}
              </span>
            </MouseOverPopover>
          ) : (
            <Image aria-label={name} title="" onClick={handleClick} />
          )}
        </div>
      );
    }
    return null;
  } catch (error: any) {
    return null;
  }
};

export default Icon;
