"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Chip } from "@material-tailwind/react";
import { HiOutlineX, HiOutlineSearch } from "react-icons/hi";

interface ViewAllRoleTitlesModalProps {
  isOpen: boolean;
  onClose: () => void;
  titles: string[];
}

export const ViewAllRoleTitlesModal: React.FC<ViewAllRoleTitlesModalProps> = ({
  isOpen,
  onClose,
  titles,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      // Auto-focus search input when modal opens
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onClose();
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  const filteredTitles = useMemo(() => {
    if (!searchQuery.trim()) return titles;
    const query = searchQuery.toLowerCase().trim();
    return titles.filter((t) => (typeof t === "string" ? t : String(t)).toLowerCase().includes(query));
  }, [titles, searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 transition-opacity backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-label="All role titles"
    >
      <div className="relative flex max-h-[85vh] w-full max-w-xl flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between pb-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Role Titles</h2>
            <p className="text-xs text-gray-500">
              <span className="font-semibold text-gray-700">{titles.length}</span> selected
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-500 transition hover:bg-gray-200 hover:text-gray-800"
          >
            <HiOutlineX size={18} />
          </button>
        </div>

        {/* Search Input */}
        <div className="relative my-3">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
            <HiOutlineSearch size={16} />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search role titles…"
            className="w-full rounded-lg border border-gray-200 bg-gray-50/50 py-2 pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Scrollable Chip Grid */}
        <div className="flex-1 overflow-y-auto pr-1 max-h-[50vh] min-h-[120px] [scrollbar-width:thin]">
          {filteredTitles.length > 0 ? (
            <div className="flex flex-wrap gap-2 content-start py-1">
              {filteredTitles.map((title, idx) => (
                <Chip
                  key={`${title}-${idx}`}
                  value={title}
                  variant="ghost"
                  size="sm"
                  className="!whitespace-normal !break-words max-w-full !text-xs text-career-blue-800 !font-medium !capitalize !bg-career-blue-800/10"
                />
              ))}
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-center">
              <p className="text-sm italic text-gray-400">No role titles match that search.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewAllRoleTitlesModal;
