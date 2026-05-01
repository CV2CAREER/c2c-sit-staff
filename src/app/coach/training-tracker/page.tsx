"use client";
import React from "react";
import TrainingTrackerDatagrid from "../../admin/training-tracker/_components/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PageHeader from "@/components/PageHeader/PageHeader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

const CoachTrainingTrackerPage = () => {
  const [sessionNumber, setSessionNumber] = React.useState(1);
  const [isDeleted, setIsDeleted] = React.useState(false);
  const [allowEdit, setAllowEdit] = React.useState<boolean>(false);

  const handleSessionChange = (value: string) => {
    setSessionNumber(parseInt(value, 10));
  };

  const handleToggleDeleted = () => {
    setIsDeleted((prev) => !prev);
  };

  return (
    <section className="flex flex-col gap-[2rem] p-4 md:p-6 lg:p-8">
      <PageHeader
        title={`Training Tracker [${isDeleted ? "Deleted" : "Active"}]`}
      />
      <div className="bg-white p-4 mobile:p-[3rem] rounded-3xl shadow-md">
        <div className="flex flex-col sm:flex-row gap-[1rem] my-[1rem] items-start sm:items-center">
          <Select
            value={String(sessionNumber)}
            onValueChange={handleSessionChange}
          >
            <SelectTrigger className="w-[220px] text-black">
              <SelectValue placeholder="Select Session" />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4].map((session) => (
                <SelectItem key={session} value={String(session)}>
                  Session {session}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            className="bg-blue text-white px-4 py-2 rounded-md shadow-sm"
            onClick={handleToggleDeleted}
          >
            {isDeleted ? "View Active" : "View Recycle Bin"}
          </Button>
        </div>
        <section className="flex justify-end mb-4">
          <div className="w-[180px] bg-lightblue shadow-md rounded-md text-black p-2 flex items-center gap-2">
            <Checkbox
              className="bg-white"
              onCheckedChange={(checked) => setAllowEdit(!!checked)}
              checked={allowEdit}
            />{" "}
            Allow Editing
          </div>
        </section>
        <TrainingTrackerDatagrid 
          allowEdit={allowEdit} 
          sessionNumber={sessionNumber} 
          isDeleted={isDeleted} 
        />
      </div>
    </section>
  );
};

export default CoachTrainingTrackerPage;
