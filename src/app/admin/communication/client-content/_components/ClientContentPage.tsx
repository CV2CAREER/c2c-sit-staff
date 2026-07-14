"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { FaEdit, FaEye, FaSearch } from "react-icons/fa";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/PageHeader/PageHeader";
import { useClientContent } from "@/hooks/useClientContent";
import type {
  ClientContentSection,
  ClientContentStatus,
} from "@/types/clientContent.types";
import { EditContentModal } from "../_modals/EditContentModal";
import { PreviewContentModal } from "../_modals/PreviewContentModal";
import { toPlainText } from "../_utils/isContentEmpty";

const formatUpdatedAt = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

function StatusBadge({ status }: { status: ClientContentStatus }) {
  const isPublished = status === "published";
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isPublished
          ? "bg-green-50 text-green-700 border border-green-200"
          : "bg-amber-50 text-amber-700 border border-amber-200"
      }`}
    >
      {isPublished ? "Published" : "Draft"}
    </span>
  );
}

export default function ClientContentPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSection, setSelectedSection] =
    useState<ClientContentSection | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const { sectionsDomain, actions } = useClientContent();
  const { data: sections, grouped, isLoading, isError, error, refetch } = sectionsDomain;

  const filteredGroups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return grouped;
    return grouped
      .map((entry) => ({
        ...entry,
        sections: entry.sections.filter(
          (section) =>
            section.name.toLowerCase().includes(query) ||
            section.description.toLowerCase().includes(query) ||
            section.placement.toLowerCase().includes(query) ||
            toPlainText(section.body).toLowerCase().includes(query),
        ),
      }))
      .filter((entry) => entry.sections.length > 0);
  }, [grouped, searchQuery]);

  const visibleCount = filteredGroups.reduce(
    (total, entry) => total + entry.sections.length,
    0,
  );

  const handleSave = async (values: {
    body: string;
    status: ClientContentStatus;
  }) => {
    if (!selectedSection) return;
    const toastId = toast.loading("Saving content...");
    try {
      await actions.updateSection({ id: selectedSection.id, ...values });
      toast.dismiss(toastId);
      toast.success(`${selectedSection.name} saved.`);
      setEditOpen(false);
      setSelectedSection(null);
    } catch (e) {
      toast.dismiss(toastId);
      toast.error(e instanceof Error ? e.message : "Failed to save content.");
    }
  };

  return (
    <div className="bg-white flex flex-col gap-6 p-5">
      <PageHeader
        title="Client Content"
        description="Update the copy clients read at each step of their journey."
        renderJSX={
          <Button
            variant="outline"
            className="text-sm"
            onClick={() => void refetch()}
            disabled={isLoading}
          >
            <RotateCw className={isLoading ? "animate-spin" : ""} />
            Refresh
          </Button>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-96 rounded-3xl px-4 py-2 bg-gray-100">
          <FaSearch className="text-gray-400" />
          <input
            type="text"
            placeholder="Search content"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-none bg-transparent flex-1 text-[15px] sm:text-[17px] text-gray-600 py-0 placeholder:text-gray-400 focus:outline-none placeholder:text-[14px] sm:placeholder:text-[16px]"
          />
        </div>
        <p className="text-gray-500 text-sm">
          Showing {visibleCount} of {sections.length} content sections
        </p>
      </div>

      {/* Sections */}
      {isLoading ? (
        <div className="flex items-center justify-center bg-white p-6 h-[20vh]">
          <div className="h-8 w-8 rounded-full border-4 border-gray-200 border-t-blue-500 animate-spin" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-red-200 bg-red-50 py-10 text-center">
          <p className="text-sm text-red-700">
            {error?.message || "We could not load the content sections."}
          </p>
          <Button variant="outline" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="py-10 text-center text-sm text-gray-500">
          No content sections match your search.
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {filteredGroups.map(({ group, sections: groupSections }) => (
            <section key={group} className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                {group}
              </h3>
              <div className="grid gap-3">
                {groupSections.map((section) => (
                  <article
                    key={section.id}
                    className="rounded-lg border border-gray-200 p-4 shadow-sm transition-colors hover:bg-gray-50"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-medium break-words">{section.name}</h4>
                          <StatusBadge status={section.status} />
                        </div>
                        <p className="mt-1 text-sm text-gray-600">
                          {section.description}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          {section.placement}
                        </p>
                        <p className="mt-2 line-clamp-2 text-sm text-gray-500">
                          {toPlainText(section.body) || "No content yet."}
                        </p>
                        <p className="mt-2 text-xs text-gray-400">
                          Version {section.version} &middot; Updated{" "}
                          {formatUpdatedAt(section.updatedAt)} by {section.updatedBy}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedSection(section);
                            setPreviewOpen(true);
                          }}
                        >
                          <FaEye /> Preview
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedSection(section);
                            setEditOpen(true);
                          }}
                        >
                          <FaEdit /> Edit
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <PreviewContentModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        section={selectedSection}
      />
      <EditContentModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        section={selectedSection}
        onSave={handleSave}
        isSaving={actions.isSaving}
      />
    </div>
  );
}
