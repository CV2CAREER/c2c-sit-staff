/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import { useRef, useEffect } from "react";

// use clickoutside hooks
const useClickOutside = (handler: Function) => {
  const domNode: any = useRef();

  useEffect(() => {
    const maybeHandler = (event: any) => {
      if (domNode.current && !domNode.current.contains(event.target)) {
        handler();
      }
    };
    document.addEventListener("mousedown", maybeHandler);

    return () => {
      document.removeEventListener("mousedown", maybeHandler);
    };
  });

  return domNode;
};

export default useClickOutside;



