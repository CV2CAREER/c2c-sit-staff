import { SERVER_URI } from "@/constants/env";

export const isServerOnline = async (): Promise<{
  online: boolean;
  message: string;
}> => {
  try {
    const res = await fetch(`${SERVER_URI}/api/v1/health`);
    return { online: res.ok, message: "Server is alive" };
  } catch (error) {
    // Here we "use" the error by capturing its message
    const message = error instanceof Error ? error.message : "Unknown error";

    // console.error("Health check failed:", message);
    return { online: false, message };
  }
};
