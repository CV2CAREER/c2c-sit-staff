import { redirect } from "next/navigation";

export default function FreeFormBuilderPage({ params }: any) {
  redirect(`/admin/missing-info-templates/builder/${params.templateId}`);
}
