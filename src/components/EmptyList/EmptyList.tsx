import React from "react";
import Image from "next/image";
import noItem from "../../../public/svg/pana.svg";

interface EmptyListProps {
  listName: string;
  msgHeader: string;
  descr?: string;
}

const EmptyList: React.FC<EmptyListProps> = ({listName, msgHeader, descr}) => (
  <section>
    <div className="flex flex-col justify-center w-auto mr-4 items-center space-y-2">
      <div className="flex flex-col justify-center text-center mt-6">
        <Image
          alt={`Empty ${listName}`}
          src={noItem}
          width={265}
          height={247.71}
        />
        <p>{msgHeader}</p>
        <span>{descr}</span>
      </div>
    </div>
  </section>
);

export default EmptyList;
