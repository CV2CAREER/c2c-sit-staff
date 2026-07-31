/* eslint-disable no-console */
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CircleAlert } from "lucide-react"; 
import { useAuthStore } from "@/store/user.store";
import { useUserQueries } from "@/hooks/api/user.api";
import { getRoleRoute } from "@/hooks/api/auth.api";
import { setSessionHint } from "@/lib/auth-session";
import toast from "react-hot-toast";

export default function AuthInitiateContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    // RFT Store actions
    const { setAccessToken, setUser } = useAuthStore((state) => ({
        setAccessToken: state.setAccessToken,
        setUser: state.setUser
    }));

    const [status, setStatus] = useState("Initiating Staff User session...");
    const [error, setError] = useState<string | null>(null);
    const [shouldFetchUser, setShouldFetchUser] = useState(false);

    // RFT User Profile Query
    const { userDomain: { userData, userSuccess, userError } } = useUserQueries({
        fetchUserData: shouldFetchUser
    });

    // 1. Initial Token Check & Access Token Setup
    useEffect(() => {
        const token = searchParams?.get("token");

        if (!token) {
            setError("Authentication token missing. Please try again from the admin panel.");
            setStatus("Error");
            return;
        }

        setStatus("Verifying token and setting up your session...");
        
        // In RFT, we manually bootstrap by setting the token provided by the admin panel
        setAccessToken(token);
        
        // Trigger profile fetch to validate the token and get user role
        setShouldFetchUser(true);
    }, [searchParams, setAccessToken]);

    // 2. Handle Profile Fetch Results
    useEffect(() => {
        if (userSuccess && userData?.user) {
            const user = userData.user;
            setUser(user);

            // Mirror the session for the middleware, so /login now redirects away
            const token = searchParams?.get("token");
            if (token) setSessionHint(user.role, token);

            // Centralized RFT role-based redirect
            const destination = getRoleRoute(user.role);
            router.push(destination);
        }

        if (userError) {
            setError("Session verification failed. Your token may be invalid or expired.");
            setStatus("Authentication Failed");
            // Optional: redirect to login after a delay
            setTimeout(() => router.push("/login"), 3000);
        }
    }, [userSuccess, userError, userData, setUser, router, searchParams]);

  // Render UI based on status and error
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md w-full">
        {error ? (
          <>
            <CircleAlert className="text-red-500 mx-auto mb-4" size={48} />
            <h1 className="text-2xl font-bold text-red-600 mb-2">Error!</h1>
            <p className="text-gray-700 mb-4">{error}</p>
            <button
              onClick={() => router.push("/login")}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              Back to Login
            </button>
          </>
        ) : (
          <>
            <Loader2
              className="animate-spin text-blue-500 mx-auto mb-4"
              size={48}
            />
            <h1 className="text-2xl font-bold text-gray-800 mb-2">{status}</h1>
            <p className="text-gray-600">
              Please wait while we set up your session.
            </p>
            <p className="text-sm text-gray-500 mt-4">
              You will be redirected shortly.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
