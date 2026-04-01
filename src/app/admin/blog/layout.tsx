import React from "react";
import BlogMenuBar from "./_components/menu-bar";
import PageHeader from "@/components/PageHeader/PageHeader";

export default function AdminAppBlogLayout({ children }: Readonly<{children: React.ReactNode;}>) {
  return (
    <section className="flex flex-col gap-8 mt-8">
      <PageHeader title="Blog Management" renderJSX={<BlogMenuBar />} />
      {children}
    </section>
  );
}
