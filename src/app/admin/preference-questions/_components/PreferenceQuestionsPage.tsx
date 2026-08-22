"use client";

import { Accordion, AccordionDetails, AccordionSummary } from "@mui/material";
import { useMemo, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { FaChevronDown, FaPlus } from "react-icons/fa6";
import { Eye, Lock, Sparkles, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/PageHeader/PageHeader";
import {
  PreferenceQuestion,
  PreferenceQuestionVisibility,
  usePreferenceQuestions,
} from "@/hooks/api/preference-question.api";
import { CreateOrEditQuestionModal } from "../_modals/CreateOrEditQuestionModal";
import { DeleteQuestionModal } from "../_modals/DeleteQuestionModal";
import { RecycleBinModal } from "../_modals/RecycleBinModal";
import { GroupDropZone, QuestionMoveLocation, QuestionRow } from "./QuestionRow";

const VISIBILITY_META: Record<
  PreferenceQuestionVisibility,
  { label: string; badge: string; icon: React.ReactNode; headerTint: string }
> = {
  public: {
    label: "Public",
    badge: "bg-primary/10 text-primary ring-1 ring-inset ring-primary/20",
    icon: <Eye size={14} />,
    headerTint: "bg-gradient-to-r from-primary/5 to-white hover:from-primary/10",
  },
  private: {
    label: "Private",
    badge: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
    icon: <Lock size={14} />,
    headerTint: "bg-gradient-to-r from-amber-50 to-white hover:from-amber-100",
  },
};

export default function PreferenceQuestionsPage() {
  const [expandedGroups, setExpandedGroups] = useState<string[]>(["public", "private"]);
  const [selectedQuestion, setSelectedQuestion] = useState<PreferenceQuestion | null>(null);
  const [createEditOpen, setCreateEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [recycleBinOpen, setRecycleBinOpen] = useState(false);

  const { questionsDomain, deletedQuestionsDomain, actions } = usePreferenceQuestions({
    recycleBinOpen,
  });
  const questions = questionsDomain.data;
  const loading = questionsDomain.isLoading;

  const groupedQuestions = useMemo(() => {
    const groups: Record<PreferenceQuestionVisibility, PreferenceQuestion[]> = {
      public: [],
      private: [],
    };
    questions.forEach((q) => {
      groups[q.visibility]?.push(q);
    });
    (Object.keys(groups) as PreferenceQuestionVisibility[]).forEach((key) => {
      groups[key].sort((a, b) => a.sortOrder - b.sortOrder);
    });
    return groups;
  }, [questions]);

  const stats = useMemo(
    () => ({
      total: questions.length,
      public: groupedQuestions.public.length,
      private: groupedQuestions.private.length,
    }),
    [questions, groupedQuestions],
  );

  const handleAccordionChange = (group: string) =>
    setExpandedGroups((prev) => (prev.includes(group) ? prev.filter((p) => p !== group) : [...prev, group]));

  const handleToggleActive = async (question: PreferenceQuestion) => {
    setTogglingId(question.id);
    try {
      await actions.updateQuestion({ id: question.id, isActive: !question.isActive });
    } catch (e: any) {
      toast.error(e?.message || "Failed to update question.");
    } finally {
      setTogglingId(null);
    }
  };

  const handleMoveQuestion = async (from: QuestionMoveLocation, to: QuestionMoveLocation) => {
    const sourceList = [...groupedQuestions[from.group]];
    const [moved] = sourceList.splice(from.index, 1);
    if (!moved) return;

    const sameGroup = from.group === to.group;
    const targetList = sameGroup ? sourceList : [...groupedQuestions[to.group]];
    const insertIndex = Math.max(0, Math.min(to.index, targetList.length));
    targetList.splice(insertIndex, 0, moved);

    const items: { id: string; sortOrder: number; visibility?: PreferenceQuestionVisibility }[] =
      targetList.map((q, idx) => ({
        id: q.id,
        sortOrder: idx,
        visibility: q.id === moved.id && !sameGroup ? to.group : undefined,
      }));
    if (!sameGroup) {
      sourceList.forEach((q, idx) => items.push({ id: q.id, sortOrder: idx }));
    }

    try {
      await actions.reorderQuestions(items);
    } catch (e: any) {
      toast.error(e?.message || "Failed to reorder questions.");
    }
  };

  const handleSave = async (values: {
    label: string;
    fieldType: PreferenceQuestion["fieldType"];
    options: string[];
    visibility: PreferenceQuestionVisibility;
    isActive: boolean;
  }) => {
    const isEditing = !!selectedQuestion?.id;
    const toastId = toast.loading(isEditing ? "Updating question..." : "Creating question...");
    try {
      if (isEditing && selectedQuestion) {
        await actions.updateQuestion({ id: selectedQuestion.id, ...values });
      } else {
        await actions.createQuestion(values);
      }
      toast.dismiss(toastId);
      toast.success(isEditing ? "Question updated." : "Question created.");
      setCreateEditOpen(false);
    } catch (e: any) {
      toast.dismiss(toastId);
      toast.error(e?.message || "Failed to save question.");
    }
  };

  const handleDelete = async () => {
    if (!selectedQuestion?.id) return;
    setDeleteLoading(true);
    const toastId = toast.loading("Deleting question...");
    try {
      await actions.deleteQuestion(selectedQuestion.id);
      toast.dismiss(toastId);
      toast.success("Question deleted.");
      setDeleteOpen(false);
      setSelectedQuestion(null);
    } catch (e: any) {
      toast.dismiss(toastId);
      toast.error(e?.message || "Failed to delete question.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
    <div className="flex flex-col gap-5 p-5">
      <PageHeader
        title="Question Classification"
        description="Manage the Preference Questions shown to clients — label, field type, and public/private visibility"
        renderJSX={
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setRecycleBinOpen(true)}>
              <Trash2 size={15} /> Recycle Bin
            </Button>
            <Button
              className="gap-2"
              onClick={() => {
                setSelectedQuestion(null);
                setCreateEditOpen(true);
              }}
            >
              <FaPlus /> Create Question
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="relative overflow-hidden rounded-xl border border-primary/15 bg-white p-4 shadow-[0_1px_10px_rgba(0,142,211,0.10)]">
          <div className="relative flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-900 text-white">
              <Sparkles size={16} />
            </div>
            <div>
              <p className="text-xl font-semibold text-gray-900 leading-none">{stats.total}</p>
              <p className="text-xs text-gray-500 mt-1">Total questions</p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-xl border border-primary/15 bg-white p-4 shadow-[0_1px_10px_rgba(0,142,211,0.10)]">
          <div className="relative flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white">
              <Eye size={16} />
            </div>
            <div>
              <p className="text-xl font-semibold text-gray-900 leading-none">{stats.public}</p>
              <p className="text-xs text-gray-500 mt-1">Public questions</p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-xl border border-primary/15 bg-white p-4 shadow-[0_1px_10px_rgba(0,142,211,0.10)]">
          <div className="relative flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-amber-400 text-white">
              <Lock size={16} />
            </div>
            <div>
              <p className="text-xl font-semibold text-gray-900 leading-none">{stats.private}</p>
              <p className="text-xs text-gray-500 mt-1">Private questions</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-primary/15 shadow-[0_1px_10px_rgba(0,142,211,0.10)] p-5 flex flex-col gap-3">
        {loading ? (
          <div className="flex items-center justify-center bg-white p-6 h-[20vh]">
            <div className="h-8 w-8 rounded-full border-4 border-gray-200 border-t-blue-500 animate-spin" />
          </div>
        ) : (
          (["public", "private"] as PreferenceQuestionVisibility[]).map((group) => {
            const meta = VISIBILITY_META[group];
            const list = groupedQuestions[group];
            return (
              <Accordion
                key={group}
                expanded={expandedGroups.includes(group)}
                onChange={() => handleAccordionChange(group)}
                className="!shadow-none border border-primary/15 rounded-lg overflow-hidden"
                disableGutters
              >
                <AccordionSummary
                  expandIcon={<FaChevronDown className="text-gray-500" />}
                  className={`${meta.headerTint} transition-colors`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${meta.badge}`}>
                      {meta.icon} {meta.label} Questions
                    </span>
                    <span className="text-gray-500 text-sm">{list.length} question{list.length === 1 ? "" : "s"}</span>
                  </div>
                </AccordionSummary>
                <AccordionDetails className="p-3 bg-gray-50/50">
                  <GroupDropZone group={group} endIndex={list.length} onMove={(from, to) => void handleMoveQuestion(from, to)}>
                    <div className="grid gap-2.5">
                      {list.map((question, index) => (
                        <QuestionRow
                          key={question.id}
                          question={question}
                          index={index}
                          group={group}
                          onMove={(from, to) => void handleMoveQuestion(from, to)}
                          onToggleActive={(q) => void handleToggleActive(q)}
                          togglingActive={togglingId === question.id}
                          onEdit={(q) => {
                            setSelectedQuestion(q);
                            setCreateEditOpen(true);
                          }}
                          onDelete={(q) => {
                            setSelectedQuestion(q);
                            setDeleteOpen(true);
                          }}
                        />
                      ))}
                      {list.length === 0 && (
                        <p className="text-sm text-gray-500 py-6 text-center">
                          Drop a question here to make it {meta.label.toLowerCase()}.
                        </p>
                      )}
                    </div>
                  </GroupDropZone>
                </AccordionDetails>
              </Accordion>
            );
          })
        )}
      </div>

      <CreateOrEditQuestionModal
        open={createEditOpen}
        onClose={() => setCreateEditOpen(false)}
        question={selectedQuestion}
        onSave={handleSave}
        isSaving={actions.isMutating}
      />
      <DeleteQuestionModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        questionLabel={selectedQuestion?.label ?? ""}
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
      <RecycleBinModal
        open={recycleBinOpen}
        onClose={() => setRecycleBinOpen(false)}
        questions={deletedQuestionsDomain.data}
        loading={deletedQuestionsDomain.isLoading}
        onRestore={async (id) => {
          try {
            await actions.restoreQuestion(id);
            toast.success("Question restored.");
          } catch (e: any) {
            toast.error(e?.message || "Failed to restore question.");
          }
        }}
        onHardDelete={async (id) => {
          try {
            await actions.hardDeleteQuestion(id);
            toast.success("Question permanently deleted.");
          } catch (e: any) {
            toast.error(e?.message || "Failed to delete question.");
          }
        }}
      />
    </div>
    </DndProvider>
  );
}
