import { redirect } from "next/navigation";

export default function RefereeBuilderPage({ params }: any) {
  redirect(`/admin/missing-info-templates/builder/${params.templateId}`);
}
