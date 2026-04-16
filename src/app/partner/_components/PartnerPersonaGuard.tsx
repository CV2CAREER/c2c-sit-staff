"use client";

import { withPersonaGuard } from "@/utils/guards/withPersonaGuard";
import { ReactNode } from "react";

function Guard({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export default withPersonaGuard(Guard, ["partner", "test"]);
