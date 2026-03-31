"use client";
import { LicenseInfo } from "@mui/x-license";

const LicenseKey = "9c02498698339bfc2026107e924f1e99Tz0xMTQ4OTEsRT0xNzgxOTEzNTk5MDAwLFM9cHJvLExNPXN1YnNjcmlwdGlvbixQVj1RMy0yMDI0LEtWPTI="

if (!LicenseKey) {
    throw new Error("MUI X license key is missing. Please set NEXT_PUBLIC_MUI_X_LICENSE_KEY.");
}
LicenseInfo.setLicenseKey(LicenseKey);

export default function MuiXLicense() {
  return null;
}
