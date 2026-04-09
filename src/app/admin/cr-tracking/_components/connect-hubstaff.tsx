import { Button } from "@/components/ui/button";
import { Issuer, Client, generators } from "openid-client";
import { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { getCookie } from "cookies-next/client";

export default function ConnectToHubStaff() {
  const [hubstaffClient, setHubstaffClient] = useState<Client | null>(null);
  const [isHubStaffAuth, setIsHubStaffAuth] = useState(false);

  const initiateHubstaffLogin = () => {
    if (hubstaffClient) {
      try {
        const nonce = generators.nonce();
        const state = generators.state();

        if (typeof hubstaffClient.client_id !== "string") {
          throw new Error("Invalid client_id");
        }

        const params = new URLSearchParams({
          client_id: hubstaffClient.client_id,
          response_type: "code",
          scope: "openid profile email hubstaff:read hubstaff:write",
          redirect_uri: `${process.env.NEXT_PUBLIC_ZOHO_REDIRECT_URI || "http://localhost:3000"}/admin/hubstaff/oauth`,
          nonce: nonce,
          state: state,
        });

        const authorizationEndpoint =
          hubstaffClient.issuer.authorization_endpoint;
        const authUrl = `${authorizationEndpoint}?${params.toString()}`;


        if (authUrl.startsWith("http")) {
          window.location.href = authUrl;
        } else {
          toast.error("Failed to generate login URL");
        }
      } catch {
        toast.error("An error occurred while initiating login");
      }
    } else {
      toast.error("Login service is not ready. Please try again later.");
    }
  };

  useEffect(() => {
    const checkHubstaffAuth = async () => {
      try {
        const token = getCookie("hubstaff_access_token");
        const refreshToken = getCookie("hubstaff_refresh_token");

        if (token && refreshToken) {
          setIsHubStaffAuth(true);
        } else {
          setIsHubStaffAuth(false);
        }
      } catch {
        setIsHubStaffAuth(false);
      }
    };

    checkHubstaffAuth();
  }, []);

  useEffect(() => {
    const setupHubstaffClient = async () => {
      try {
        // Manually fetch the OpenID configuration
        const response = await axios.get(
          "https://account.hubstaff.com/.well-known/openid-configuration"
        );
        const issuerMetadata = response.data;

        // Create the issuer manually
        const hubstaffIssuer = new Issuer(issuerMetadata);


        // Create a client
        const client = new hubstaffIssuer.Client({
          client_id: process.env.NEXT_PUBLIC_HUBSTAFF_CLIENT_ID as string,
          client_secret: process.env.NEXT_PUBLIC_HUBSTAFF_CLIENT_SECRET,
          redirect_uris: [
            `${process.env.NEXT_PUBLIC_ZOHO_REDIRECT_URI || "http://localhost:3000"}/admin/hubstaff/oauth`,
          ],
          response_types: ["code"],
          scopes: [
            "openid",
            "profile",
            "email",
            "hubstaff:read",
            "hubstaff:write",
          ],
        });

        // hubstaff:write
        // hubstaff:read

        setHubstaffClient(client);
      } catch {
      }
    };

    setupHubstaffClient();
  }, []);

  return (
    <Button onClick={initiateHubstaffLogin} disabled={isHubStaffAuth}>
      {isHubStaffAuth ? (
        <>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
              clipRule="evenodd"
            />
          </svg>
          <span className="hidden md:block">Connected to Hubstaff</span>
        </>
      ) : (
        <>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="size-6 mr-2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
            />
          </svg>
          <span className="hidden md:block">Connect to Hubstaff</span>
        </>
      )}
    </Button>
  );
}
