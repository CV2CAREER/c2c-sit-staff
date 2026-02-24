"use client";

import { useAuthStore } from "@/store/user.store";
import { useRef, useState } from "react";

type SessionState = "checking" | "valid" | "invalid" | "noToken";

export function useAuth() {
  const setUser = useAuthStore((s) => s.setUser);
  const [sessionState, setSessionState] = useState<SessionState>("checking");
  const sessionLocked = useRef(false);

  // 1️⃣ Validate session on mount
  //   useEffect(() => {
  //     if (sessionLocked.current) return;

  //     (async () => {
  //       try {
  //         // const res = await validateSession();

  //         if (res === "no-token") {
  //           // 🚫 No cookie/token → skip everything, no spinner
  //           setSessionState("noToken");
  //           return;
  //         }

  //         if (res === "valid") {
  //           // ✅ Valid session → proceed to user fetch
  //           setSessionState("valid");
  //           sessionLocked.current = true;
  //         } else {
  //           setSessionState("invalid");
  //         }
  //       } catch (err) {
  //         console.error("Session validation failed:", err);
  //         setSessionState("invalid");
  //       }
  //     })();
  //   }, []);

  // 4️⃣ Fetch user data once session is valid
  //   const { userData, userLoading, userError } = useUserQueries({
  //     fetchUserData: sessionState === "valid",
  //   }).userDomain;

  //   console.log("USER DATA", userData);

  // Sync Zustand with fetched user
  //   useEffect(() => {
  //     if (userData) setUser(userData.user);
  //   }, [userData, setUser]);

  //   const noToken = sessionState === "noToken";
  //   const checking = sessionState === "checking";
  //   const valid = sessionState === "valid";

  //   const isLoading = checking || (valid && userLoading);
  //   const isAuthenticated = valid && !!userData?.user && !userError;

  // 5️⃣ Return clean shape
  return {
    // user: userData?.user ?? null,
    // token: userData?.token ?? null,
    // isLoading: noToken ? false : isLoading, // ✅ no spinner for noToken
    // isAuthenticated,
    // isError: !!userError,
    // error: userError,
  };
}
