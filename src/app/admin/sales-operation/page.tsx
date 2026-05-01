import React from "react";
import PageHeader from "@/components/PageHeader/PageHeader";
import SalesOperationComponent from "./_components/SalesOperationComponent";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sales Operation | Career Coaching Admin",
  description: "Manage sales operation entries for the platform.",
};

const SalesOperationPage = () => {
  return (
    <section className="flex flex-col gap-8 mt-8">
      <PageHeader title="Sales Operation" />
      <SalesOperationComponent />
    </section>
  );
};

export default SalesOperationPage;
