import { SERVER_URI } from "@/constants/env";

export const isServerOnline = async (): Promise<boolean> => {
  try {
    const res = await fetch(`${SERVER_URI}/api/health`);
    return res.ok;
  } catch (error) {
    return false;
  }
};
