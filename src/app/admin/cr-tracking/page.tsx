import React from "react";
import PageHeader from "@/components/PageHeader/PageHeader";
import CRTrackingDataTable from "./_components/data-table";

const CRTrackingPage = async ({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {
  const params = await searchParams;
  const id = params?.id;

  return (
    <section className="flex flex-col gap-8 mt-8">
      <PageHeader title="Change Request Tracking" />
      <CRTrackingDataTable id={id as string} />
    </section>
  );
};

export default CRTrackingPage;
