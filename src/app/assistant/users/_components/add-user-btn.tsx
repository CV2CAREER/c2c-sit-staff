"use client"
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const AddUserBtn = () => {
  // Disabled for Placement Controllers — this button never had an onClick
  // or modal behind it, so clicking it did nothing. Commented out rather
  // than wired up, since building the actual add-user flow for this role
  // wasn't requested.
  return null;

  // return (
  //   <Button className="flex gap-3">
  //     <Plus />
  //     Add Users
  //   </Button>
  // );
};
export default AddUserBtn;