"use client";

import { useMemo, useState } from "react";
import { FaPlus } from "react-icons/fa6";
import { ListChecks, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/PageHeader/PageHeader";
import {
  DROPDOWN_OPTION_LIST_KEYS,
  DROPDOWN_OPTION_LIST_KEY_LABELS,
  GROUPED_LIST_KEYS,
  DropdownOptionListKey,
  DropdownOptionRow,
  useDropdownOptions,
} from "@/hooks/api/dropdown-option.api";
import { CreateOrEditOptionModal, OptionFormValues } from "../_modals/CreateOrEditOptionModal";
import { DeleteOptionModal } from "../_modals/DeleteOptionModal";
import { RecycleBinModal } from "../_modals/RecycleBinModal";
import { OptionRow } from "./OptionRow";
import { AdvertisersPanel } from "./AdvertisersPanel";

const findSiblings = (items: DropdownOptionRow[], id: string): DropdownOptionRow[] | null => {
  if (items.some((i) => i.id === id)) return items;
  for (const item of items) {
    if (item.children && item.children.length > 0) {
      const found = findSiblings(item.children, id);
      if (found) return found;
    }
  }
  return null;
};

const countAll = (items: DropdownOptionRow[]): number =>
  items.reduce((sum, item) => sum + 1 + (item.children ? countAll(item.children) : 0), 0);

export default function DropdownOptionsPage() {
  const [activeTab, setActiveTab] = useState<DropdownOptionListKey>("job_types");
  const [selectedOption, setSelectedOption] = useState<DropdownOptionRow | null>(null);
  const [createParent, setCreateParent] = useState<DropdownOptionRow | null>(null);
  const [createEditOpen, setCreateEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [recycleBinOpen, setRecycleBinOpen] = useState(false);

  const isAdvertisers = activeTab === "advertisers";
  const allowChildren = GROUPED_LIST_KEYS.includes(activeTab);

  const { listDomain, deletedDomain, actions } = useDropdownOptions(activeTab, { recycleBinOpen });
  const items = useMemo(() => [...listDomain.items].sort((a, b) => a.sortOrder - b.sortOrder), [listDomain.items]);

  const stats = useMemo(
    () => ({
      total: isAdvertisers ? listDomain.total : countAll(items),
      topLevel: items.length,
    }),
    [items, listDomain.total, isAdvertisers],
  );

  const handleToggleActive = async (option: DropdownOptionRow) => {
    setTogglingId(option.id);
    try {
      await actions.updateOption({ id: option.id, isActive: !option.isActive });
    } catch (e: any) {
      toast.error(e?.message || "Failed to update option.");
    } finally {
      setTogglingId(null);
    }
  };

  const handleMove = async (option: DropdownOptionRow, direction: "up" | "down") => {
    const siblings = findSiblings(items, option.id);
    if (!siblings) return;
    const sorted = [...siblings].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex((s) => s.id === option.id);
    const swapWith = direction === "up" ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= sorted.length) return;

    const reordered = [...sorted];
    [reordered[idx], reordered[swapWith]] = [reordered[swapWith], reordered[idx]];

    try {
      await actions.reorderOptions(reordered.map((s, index) => ({ id: s.id, sortOrder: index })));
    } catch (e: any) {
      toast.error(e?.message || "Failed to reorder options.");
    }
  };

  const handleSave = async (values: OptionFormValues) => {
    const isEditing = !!selectedOption?.id;
    const toastId = toast.loading(isEditing ? "Updating option..." : "Creating option...");
    try {
      if (isEditing && selectedOption) {
        await actions.updateOption({ id: selectedOption.id, ...values });
      } else {
        await actions.createOption({ ...values, parentId: createParent?.id ?? null });
      }
      toast.dismiss(toastId);
      toast.success(isEditing ? "Option updated." : "Option created.");
      setCreateEditOpen(false);
    } catch (e: any) {
      toast.dismiss(toastId);
      toast.error(e?.message || "Failed to save option.");
    }
  };

  const handleDelete = async () => {
    if (!selectedOption?.id) return;
    setDeleteLoading(true);
    const toastId = toast.loading("Deleting option...");
    try {
      await actions.deleteOption(selectedOption.id);
      toast.dismiss(toastId);
      toast.success("Option deleted.");
      setDeleteOpen(false);
      setSelectedOption(null);
    } catch (e: any) {
      toast.dismiss(toastId);
      toast.error(e?.message || "Failed to delete option.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 p-5">
      <PageHeader
        title="Dropdown Options"
        description="Manage the Job Types, Advertisers, Industries, Situation, Salary, and Working Rights options shown on the onboarding wizard and Job Preferences dashboard"
        renderJSX={
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setRecycleBinOpen(true)}>
              <Trash2 size={15} /> Recycle Bin
            </Button>
            {!isAdvertisers && (
              <Button
                className="gap-2"
                onClick={() => {
                  setSelectedOption(null);
                  setCreateParent(null);
                  setCreateEditOpen(true);
                }}
              >
                <FaPlus /> Create Option
              </Button>
            )}
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DropdownOptionListKey)}>
        <TabsList className="flex-wrap h-auto">
          {DROPDOWN_OPTION_LIST_KEYS.map((key) => (
            <TabsTrigger key={key} value={key}>
              {DROPDOWN_OPTION_LIST_KEY_LABELS[key]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-md">
        <div className="relative overflow-hidden rounded-xl border border-primary/15 bg-white p-4 shadow-[0_1px_10px_rgba(0,142,211,0.10)]">
          <div className="relative flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-900 text-white">
              <ListChecks size={16} />
            </div>
            <div>
              <p className="text-xl font-semibold text-gray-900 leading-none">{stats.total}</p>
              <p className="text-xs text-gray-500 mt-1">Total options</p>
            </div>
          </div>
        </div>
        {allowChildren && (
          <div className="relative overflow-hidden rounded-xl border border-primary/15 bg-white p-4 shadow-[0_1px_10px_rgba(0,142,211,0.10)]">
            <div className="relative flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white">
                <ListChecks size={16} />
              </div>
              <div>
                <p className="text-xl font-semibold text-gray-900 leading-none">{stats.topLevel}</p>
                <p className="text-xs text-gray-500 mt-1">Groups</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-primary/15 shadow-[0_1px_10px_rgba(0,142,211,0.10)] p-5">
        {isAdvertisers ? (
          <AdvertisersPanel
            togglingId={togglingId}
            onToggleActive={(o) => void handleToggleActive(o)}
            onEdit={(o) => {
              setSelectedOption(o);
              setCreateParent(null);
              setCreateEditOpen(true);
            }}
            onDelete={(o) => {
              setSelectedOption(o);
              setDeleteOpen(true);
            }}
          />
        ) : listDomain.isLoading ? (
          <div className="flex items-center justify-center bg-white p-6 h-[20vh]">
            <div className="h-8 w-8 rounded-full border-4 border-gray-200 border-t-blue-500 animate-spin" />
          </div>
        ) : (
          <div className="grid gap-2.5">
            {items.map((option, index) => (
              <OptionRow
                key={option.id}
                option={option}
                depth={0}
                isFirst={index === 0}
                isLast={index === items.length - 1}
                allowChildren={allowChildren}
                togglingId={togglingId}
                onMoveUp={(o) => void handleMove(o, "up")}
                onMoveDown={(o) => void handleMove(o, "down")}
                onToggleActive={(o) => void handleToggleActive(o)}
                onEdit={(o) => {
                  setSelectedOption(o);
                  setCreateParent(null);
                  setCreateEditOpen(true);
                }}
                onDelete={(o) => {
                  setSelectedOption(o);
                  setDeleteOpen(true);
                }}
                onAddChild={(parent) => {
                  setSelectedOption(null);
                  setCreateParent(parent);
                  setCreateEditOpen(true);
                }}
              />
            ))}
            {items.length === 0 && (
              <p className="text-sm text-gray-500 py-6 text-center">No options in this category yet.</p>
            )}
          </div>
        )}
      </div>

      <CreateOrEditOptionModal
        open={createEditOpen}
        onClose={() => setCreateEditOpen(false)}
        option={selectedOption}
        parentLabel={createParent?.label ?? null}
        onSave={handleSave}
        isSaving={actions.isMutating}
      />
      <DeleteOptionModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        optionLabel={selectedOption?.label ?? ""}
        hasChildren={!!selectedOption?.children?.length}
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
      <RecycleBinModal
        open={recycleBinOpen}
        onClose={() => setRecycleBinOpen(false)}
        options={deletedDomain.data}
        loading={deletedDomain.isLoading}
        onRestore={async (id) => {
          try {
            await actions.restoreOption(id);
            toast.success("Option restored.");
          } catch (e: any) {
            toast.error(e?.message || "Failed to restore option.");
          }
        }}
        onHardDelete={async (id) => {
          try {
            await actions.hardDeleteOption(id);
            toast.success("Option permanently deleted.");
          } catch (e: any) {
            toast.error(e?.message || "Failed to delete option.");
          }
        }}
      />
    </div>
  );
}
