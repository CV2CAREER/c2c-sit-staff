import { AuthStoreProvider } from "@/store/user.store";
import { Metadata } from "next";
import { DashboardProtectedGuard } from "@/components/guards/DashboardProtectedGuard";
import AdminDashboardClientLayout from "./_components/AdminDashboardClientLayout";

export const metadata: Metadata = {
  title: {
    default: "Admin Dashboard",
    template: "%s | CVtoCAREER Admin",
  },
  description:
    "CVtoCAREER admin dashboard for managing users, roles, content, and platform operations.",
  keywords:
    "CVtoCAREER admin, admin dashboard, platform management, user management, internal tools",
  robots: {
    index: false,
    follow: false,
  },
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
    title: "CVtoCAREER Admin Dashboard",
    description:
      "Internal administration panel for managing CVtoCAREER users, content, and system settings.",
    url: "https://admin.cvtocareer.com",
    images: [
      {
        url: "/images/h-logo.svg",
        width: 1200,
        height: 630,
        alt: "CVtoCAREER Admin Dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CVtoCAREER Admin Dashboard",
    description:
      "Internal administration panel for CVtoCAREER platform management.",
    images: ["/images/h-logo.svg"],
  },
};

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthStoreProvider user={null} accessToken={null}>
      <DashboardProtectedGuard>
        <AdminDashboardClientLayout>{children}</AdminDashboardClientLayout>
      </DashboardProtectedGuard>
    </AuthStoreProvider>
  );
}
