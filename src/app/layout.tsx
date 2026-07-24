import type { Metadata } from "next";
import type { ReactNode } from "react";
import AppProvider from "@/providers/app.provider";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import MuiXLicense from "./muiXLicense";

export const metadata: Metadata = {
  title: {
    default: "CVtoCAREER Admin",
    template: "%s | CVtoCAREER Admin",
  },
  description: "Admin access portal for CVtoCAREER.",
  icons: {
    icon: "/svg/logoMobile.png",
    shortcut: "/svg/logoMobile.png",
    apple: "/svg/logoMobile.png",
  },
  authors: [{ name: "CVtoCAREER" }],
  creator: "CVtoCAREER",
  metadataBase: new URL("https://admin.cvtocareer.com"),
  openGraph: {
    type: "website",
    siteName: "CVtoCAREER Admin",
    title: "CVtoCAREER Admin",
    description: "Admin access portal for CVtoCAREER.",
    url: "https://admin.cvtocareer.com",
    images: [
      {
        url: "/images/h-logo.svg",
        width: 1200,
        height: 630,
        alt: "CVtoCAREER Admin",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CVtoCAREER Admin",
    description: "Admin access portal for CVtoCAREER.",
    images: ["/images/h-logo.svg"],
  },
};


// Set the license key OUTSIDE of your React component
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <MuiXLicense />
        <Toaster 
          position="top-right" 
          reverseOrder={false}
          gutter={12}
          toastOptions={{
            duration: 4000,
            style: {
              marginTop: '64px',
            },
          }}
        />
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
