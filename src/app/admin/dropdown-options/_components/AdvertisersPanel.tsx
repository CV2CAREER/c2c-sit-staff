"use client";

import { useEffect, useState } from "react";
import { Pencil, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useDropdownOptions, DropdownOptionRow } from "@/hooks/api/dropdown-option.api";

interface AdvertisersPanelProps {
  onEdit: (option: DropdownOptionRow) => void;
  onDelete: (option: DropdownOptionRow) => void;
  onToggleActive: (option: DropdownOptionRow) => void;
  togglingId: string | null;
}

const PAGE_SIZE = 50;

export function AdvertisersPanel({ onEdit, onDelete, onToggleActive, togglingId }: AdvertisersPanelProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { listDomain } = useDropdownOptions("advertisers", {
    q: debouncedSearch || undefined,
    page,
    limit: PAGE_SIZE,
  });

  const totalPages = Math.max(1, Math.ceil(listDomain.total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-3">
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search advertisers..."
          className="pl-9"
        />
      </div>

      {listDomain.isLoading ? (
        <div className="flex items-center justify-center bg-white p-6 h-[20vh]">
          <div className="h-8 w-8 rounded-full border-4 border-gray-200 border-t-blue-500 animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid gap-2">
            {listDomain.items.map((option) => (
              <div
                key={option.id}
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-2.5"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{option.label}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {togglingId === option.id ? (
                    <div className="h-4 w-4 rounded-full border-2 border-gray-300 border-t-primary animate-spin" />
                  ) : (
                    <Switch checked={option.isActive} onCheckedChange={() => onToggleActive(option)} />
                  )}
                  <button
                    title="Edit"
                    onClick={() => onEdit(option)}
                    className="p-1.5 text-gray-500 hover:text-blue-700 rounded-full hover:bg-blue-50"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    title="Delete"
                    onClick={() => onDelete(option)}
                    className="p-1.5 text-gray-500 hover:text-red-600 rounded-full hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            {listDomain.items.length === 0 && (
              <p className="text-sm text-gray-500 py-6 text-center">No advertisers match your search.</p>
            )}
          </div>

          {!debouncedSearch && totalPages > 1 && (
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-gray-500">
                Page {page} of {totalPages} · {listDomain.total} advertisers
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
