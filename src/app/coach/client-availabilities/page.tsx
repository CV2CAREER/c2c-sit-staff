"use client";
import React from "react";
import ClientAvailabilities from "./_components/client-availabilities";

const ClientAvailabilitiesPage = () => {
  return (
    <section className="flex flex-col gap-6 mt-6">
      <ClientAvailabilities />
    </section>
  );
};

export default ClientAvailabilitiesPage;
