import type { Metadata } from "next";
import DropdownOptionsPage from "./_components/DropdownOptionsPage";

export const metadata: Metadata = {
  title: "Dropdown Options",
};

export default function AdminDropdownOptionsPage() {
  return <DropdownOptionsPage />;
}
