import { Dispatch, SetStateAction, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import toast from "react-hot-toast";

export default function CreateModal({
  isOpen,
  onClose,
  setNewRowData,
  newRowData,
  user,
  activeCoach,
  processRowUpdate,
  sessionNumber,
}: {
  isOpen: boolean;
  onClose: () => void;
  setNewRowData: Dispatch<SetStateAction<any>>;
  newRowData: any;
  user: any[];
  activeCoach: any[] | null;
  processRowUpdate: any;
  sessionNumber: number | null;
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handleAddRowSubmit = async () => {
    if (
      !newRowData.traineeId ||
      !newRowData.coachId ||
      !newRowData.date ||
      !newRowData.status
    ) {
      toast.error("Please fill all required fields.");
      return;
    }

    setIsLoading(true);
    try {
      // Call processRowUpdate directly, passing a temporary ID and marking as new
      const result = await processRowUpdate(
        { ...newRowData, isNew: true },
      );
      if (result) {
        onClose();
        // Reset form data after successful submission
        setNewRowData({
          traineeId: "",
          coachId: "",
          sessionNumber: sessionNumber ?? 1,
          date: new Date().toISOString().split("T")[0],
          status: "Pending",
          notes: "",
          progress: "Pro-Bono",
          reworkType: "Nil",
          preferredCraft: "",
          undergrad: "",
          postgrad: "",
          training: "",
          experience: "",
          overarchingRoleAndIndustryIdentified: false,
          personalDataGrouping: false,
          narrativeBasedGroupings: false,
          professionalSummary: false,
          technicalSkills: false,
          softSkills: false,
          jobDescriptionModification: false,
          factBasedGroupings: false,
          businessNameBusinessLocation: false,
          roleTitle: false,
          dateFormat: false,
          educationFormat: false,
          additionals: false,
          colourHighlightNewText: false,
          layoutModification: false,
          findReplaceAnd: false,
          paragraphing: false,
          alignment: false,
          textSpacing: false,
          differentiationOfEachRoleTitle: false,
          roleNarrativeDifferentiation: false,
          dateSerializationRationalization: false,
          roleSegmentation: false,
          developmentStatus: "Not-Reviewed",
          reviewer1: "Not-Reviewed",
          grammerreadabilityEase: false,
          smeTechnicalContent: false,
          reviewer2: "Not-Reviewed",
          clientRequirementsAssessment: false,
          reviewer3: "Not-Reviewed",
          dispatchToClient: false,
          coachingContact: "",
          coachingBooking: "",
          start: "00.00",
          duration: 30,
          sessionType: "Screening",
          surveyvideo: "NO",
          wmtycDecomposition: 0,
          smeTechnicalDepth: 0,
          deliverablesQuantification: 0,
          locationYearroleInTimeExample: 0,
          selfPronounUsage: 0,
          businessDeliverables: 0,
          grammardictioncommunication: 0,
          personabilitylikeabilityhumor: 0,
          respectcurtesy: 0,
          appearance: 0,
          pleasantriessmallTalk: 0,
          sessionObjectives: 0,
          professionIntroduction: 0,
          kpiDescriptionWithExamples: 0,
          cvresumeRendition: 0,
          respectcourtesyempathyhumility: 0,
          kpiCollaborativeScoring: 0,
          recordingAvailabilitySurvey: 0,
          maximumNumberOfQuestions: 0,
          complementingpositiveFeedback: 0,
          clientMultipleGosOnAllQs: 0,
          timeUtilization: 0,
          clientStoryResponses: 0,
          partingQuestions: 0,
          timeKeeping: 0,
          fillerPhrases: 0,
          intermittentClarificationRequest: 0,
        });
      }
    } catch{
      toast.error("Failed to add new record.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Add New Training Record
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Fill in the details for the new training session.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="traineeId" className="text-right">
              Trainee Name
            </Label>
            <Select
              onValueChange={(value) =>
                setNewRowData({ ...newRowData, traineeId: value })
              }
              value={newRowData.traineeId}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select Trainee" />
              </SelectTrigger>
              <SelectContent>
                {user
                  .sort((a: any, b: any) =>
                    `${a.firstName} ${a.lastName}`.localeCompare(
                      `${b.firstName} ${b.lastName}`
                    )
                  )
                  .map((u: any) => (
                    <SelectItem key={u._id} value={u._id}>
                      {`${u.firstName} ${u.lastName}`}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="coachId" className="text-right">
              Coach
            </Label>
            <Select
              onValueChange={(value) =>
                setNewRowData({ ...newRowData, coachId: value })
              }
              value={newRowData.coachId}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select Coach" />
              </SelectTrigger>
              <SelectContent>
                {activeCoach
                  ?.sort((a, b) => a.fullName.localeCompare(b.fullName))
                  .map((coach) => (
                    <SelectItem key={coach._id} value={coach._id}>
                      {coach.fullName}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="date" className="text-right">
              Date
            </Label>
            <Input
              id="date"
              type="date"
              value={newRowData.date}
              onChange={(e) =>
                setNewRowData({ ...newRowData, date: e.target.value })
              }
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">
              Status
            </Label>
            <Select
              onValueChange={(value) =>
                setNewRowData({ ...newRowData, status: value })
              }
              value={newRowData.status}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent>
                {["Completed", "Pending", "In Progress", "Cancelled"]
                  .sort((a, b) => a.localeCompare(b))
                  .map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="notes" className="text-right">
              Notes
            </Label>
            <Input
              id="notes"
              value={newRowData.notes}
              onChange={(e) =>
                setNewRowData({ ...newRowData, notes: e.target.value })
              }
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="sessionNumber" className="text-right">
              Session Number
            </Label>
            <Select
              onValueChange={(value) =>
                setNewRowData({
                  ...newRowData,
                  sessionNumber: parseInt(value, 10),
                })
              }
              value={String(newRowData.sessionNumber)}
            >
              <SelectTrigger className="col-span-3">
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
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="progress" className="text-right">
              Progress
            </Label>
            <Select
              onValueChange={(value) =>
                setNewRowData({ ...newRowData, progress: value })
              }
              value={newRowData.progress}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select Progress" />
              </SelectTrigger>
              <SelectContent>
                {["Pro-Bono", "Prospects", "Onboarding", "in-Flight"]
                  .sort((a, b) => a.localeCompare(b))
                  .map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="reworkType" className="text-right">
              Rework Type
            </Label>
            <Select
              onValueChange={(value) =>
                setNewRowData({ ...newRowData, reworkType: value })
              }
              value={newRowData.reworkType}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select Rework Type" />
              </SelectTrigger>
              <SelectContent>
                {["Light-Touch", "Partial", "Complete", "Nil"]
                  .sort((a, b) => a.localeCompare(b))
                  .map((rt) => (
                    <SelectItem key={rt} value={rt}>
                      {rt}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="submit"
            onClick={handleAddRowSubmit}
            disabled={isLoading}
          >
            {isLoading ? "Adding..." : "Add Record"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
