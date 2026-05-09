"use client"
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const AddUserBtn = () => {
  return (
    <Button className="flex gap-3">
      <Plus />
      Add Users
    </Button>
  );
};
export default AddUserBtn;