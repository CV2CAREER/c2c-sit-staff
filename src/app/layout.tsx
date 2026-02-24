import type { Metadata } from "next";
import type { ReactNode } from "react";
import AppProvider from "@/providers/app.provider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "CVtoCAREER Admin",
    template: "%s | CVtoCAREER Admin",
  },
  description: "Admin access portal for CVtoCAREER.",
  icons: {
    icon: "/images/h-logo.svg",
    shortcut: "/images/h-logo.svg",
    apple: "/images/h-logo.svg",
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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
