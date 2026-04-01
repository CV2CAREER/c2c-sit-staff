import PageHeader from "@/components/PageHeader/PageHeader";
import PromotionsClient from "./_components/PromotionsClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Promotions | Admin",
  description: "Manage global promotions and refer-a-friend bonuses",
};

export default function PromotionsPage() {
  return (
    <main className="flex flex-col gap-8 mt-8">
      <PageHeader title="Promotions" />
      <PromotionsClient />
    </main>
  );
}

