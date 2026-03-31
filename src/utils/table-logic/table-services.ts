import { toast } from "react-hot-toast";

export const getCountries = async () => {
  const response = await fetch("/api/newCountryInfo?type=countries");
  const data = await response.json();

  const formattedData = data && data.data.map((item: any) => item.value);

  return formattedData || [];
};

export const getAdvertisers = async () => {
  const response = await fetch("/api/advertisers?");
  const data = await response.json();
  const formattedData = data && data.data;

  return formattedData || [];
};

export const getStatesAndCities = async (country: string) => {
  const response = await fetch(
    `/api/newCountryInfo?type=region&country=${country}`
  );
  const data = await response.json();

  const formattedData = data && data.data.map((item: any) => item.value);

  return formattedData || [];
};

export const updateAggregator = async (aggregatorName: any) => {
  if (aggregatorName) {
    toast.success("Notification sent to admin");
    try {
      await fetch(`/api/aggregator`, {
        method: "PUT",
        body: JSON.stringify({
          profileCreated: true,
          name: aggregatorName,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (error: any) {
      toast.error(error);
    }
  }
};
