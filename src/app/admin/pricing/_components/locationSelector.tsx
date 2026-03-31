import React from "react";
import { PricingLocation } from "@/types/pricing.types";

interface LocationSelectorProps {
  locations: PricingLocation[];
  activeLocationCode: string | null;
  onSelectLocation: (locationCode: string) => void;
  disabled?: boolean;
}

const LocationSelector: React.FC<LocationSelectorProps> = ({
  locations,
  activeLocationCode,
  onSelectLocation,
  disabled = false,
}) => {
  return (
    <div className="justify-start items-center">
      {locations.map((item) => (
        <button
          key={item._id}
          onClick={() =>
            onSelectLocation(item.currencyCode)
          }
          disabled={disabled}
          className={`px-4 py-2 mt-10 !text-sm font-medium tracking-wide text-white capitalize transition-colors transform rounded-md hover:bg-blue-600 focus:outline-none focus:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed ${
            item.currencyCode === activeLocationCode
              ? "bg-[#008ED3]"
              : "bg-gray-300"
          }`}
          style={{ marginRight: "0.5rem" }}
        >
          {item.currencyCode}
        </button>
      ))}
    </div>
  );
};

export default LocationSelector;
