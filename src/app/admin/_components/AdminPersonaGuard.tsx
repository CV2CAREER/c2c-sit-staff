"use client";

import { withPersonaGuard } from "@/utils/guards/withPersonaGuard";
import { ReactNode } from "react";

function Guard({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

// Wrap the simple Guard component with the existing persona guard HOC
export default withPersonaGuard(Guard, ["admin", "assistant", "tpc", "pc", "test"]);
