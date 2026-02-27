import crypto from "crypto";
import { exec } from "child_process";
// import path from "path"; // No longer needed
// import fs from "fs";     // No longer needed
import { getServiceLogger } from "../../utils/createLogger";
import { GITHUB_SECRET } from "../../config/env";

// 1. IMPORT THE CONFIG DIRECTLY
import { reposConfig } from "../../config/repos";

const logger = getServiceLogger("deploy-webhook-service");

export const verifyGithubSignature = (
  rawBody: string,
  signature: string,
): boolean => {
  const hmac = crypto.createHmac("sha256", GITHUB_SECRET);
  const digest = Buffer.from(
    "sha256=" + hmac.update(rawBody).digest("hex"),
    "utf8",
  );
  const checksum = Buffer.from(signature, "utf8");
  return (
    checksum.length === digest.length &&
    crypto.timingSafeEqual(digest, checksum)
  );
};

export const triggerDeployment = (initiative: string, branch: string) => {
  // 2. ACCESS THE CONFIG OBJECT DIRECTLY (No more JSON.parse)
  const repoConfig = reposConfig[initiative as keyof typeof reposConfig];

  if (!repoConfig || !repoConfig[branch as keyof typeof repoConfig]) {
    throw new Error(
      `Automation not configured for ${initiative} on branch ${branch}`,
    );
  }

  // Use the port from your repos.ts
  const port = repoConfig[branch as keyof typeof repoConfig];

  const isBackend = initiative.includes("backend");
  const scriptPath = isBackend
    ? "/opt/webhook/deploy-backend.sh"
    : "/opt/webhook/deploy-frontend.sh";

  const cmd = `${scriptPath} ${initiative} ${branch} ${port}`;

  logger.info(`🚀 Triggering command: ${cmd}`);

  exec(cmd, (err, stdout) => {
    if (err) logger.error(`❌ Deployment Failed: ${err.message}.`);
    else logger.info(`✅ Deployment Success: ${stdout}...`);
  });
};
