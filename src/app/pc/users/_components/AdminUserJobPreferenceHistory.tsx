"use client";

import { useAdminQueries } from "@/hooks/api/admin.api";
import PulseLoader from "./loader";
import { useState, useMemo } from "react";
import { HiOutlineClock } from "react-icons/hi";
import { Download, Search, ChevronLeft, ChevronRight } from "lucide-react";

interface PreferenceHistoryRow {
  id: string;
  userId?: string;
  fieldChanged: string;
  prevValues: string[];
  newValues: string[];
  formattedTimestamp: string;
  rawTimestamp: string;
}

export const formatPreferenceTimestamp = (dateInput: any): string => {
  if (!dateInput) return "Recently";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "Recently";

  const day = d.getDate();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
};

export const normalizePreferenceValue = (val: any): string[] => {
  if (val === null || val === undefined) return [];
  if (Array.isArray(val)) {
    return val
      .map((item) => {
        if (item === null || item === undefined) return "";
        if (typeof item === "object") {
          return item.name || item.title || item.label || item.value || JSON.stringify(item);
        }
        return String(item).trim();
      })
      .filter((s) => s.length > 0);
  }
  if (typeof val === "boolean") {
    return [val ? "Yes" : "No"];
  }
  if (typeof val === "number") {
    return [String(val)];
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed || trimmed.toLowerCase() === "n/a") return [];
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        return normalizePreferenceValue(parsed);
      } catch {
        return [trimmed];
      }
    }
    return [trimmed];
  }
  if (typeof val === "object") {
    if (val.name || val.title || val.label) {
      return [val.name || val.title || val.label];
    }
    return [JSON.stringify(val)];
  }
  return [];
};

const ValueCell = ({
  values,
  isNew,
  rowKey,
  isExpanded,
  onToggleExpand,
}: {
  values: string[];
  isNew: boolean;
  rowKey: string;
  isExpanded: boolean;
  onToggleExpand: (key: string) => void;
}) => {
  if (!values || values.length === 0) {
    return <span className="text-[#6b7686] italic text-xs font-normal">Not set</span>;
  }

  const limit = 4;
  const showAll = isExpanded;
  const displayValues = showAll ? values : values.slice(0, limit);
  const remainingCount = values.length - limit;

  return (
    <div className="flex flex-wrap items-center gap-1 max-w-[360px]">
      {displayValues.map((val, idx) => (
        <span
          key={`${val}-${idx}`}
          className={`inline-flex items-center text-[11.5px] px-2 py-0.5 rounded font-normal transition-colors ${
            isNew
              ? "bg-[#e8f3fb] text-[#0a5b8f] border border-[#cae5f5]"
              : "bg-[#eef3f7] text-[#2d3a4a] border border-[#e2e8f0]"
          }`}
        >
          {val}
        </span>
      ))}
      {values.length > limit && (
        <button
          type="button"
          onClick={() => onToggleExpand(rowKey)}
          className="text-[#0b7fc4] hover:underline font-normal text-[11.5px] px-1 py-0.5 cursor-pointer transition-colors"
        >
          {showAll ? "Show less" : `+${remainingCount} more`}
        </button>
      )}
    </div>
  );
};

const AdminUserJobPreferenceHistory = ({ userId }: { userId: string }) => {
  const { userPreferencesHistoryDomain } = useAdminQueries({
    userId,
    fetchUserPreferencesHistory: true,
  });

  const profileHistoryData = userPreferencesHistoryDomain.data;
  const isLoading = userPreferencesHistoryDomain.isLoading;
  const rawRows: any[] = profileHistoryData?.history || [];

  const [selectedField, setSelectedField] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 20;

  // Process raw rows into standardized 4-column format
  const processedRows = useMemo<PreferenceHistoryRow[]>(() => {
    return rawRows.map((row: any, index: number) => {
      const fieldChanged =
        row.fieldChanged ||
        row.field ||
        (row.preferenceSnapshot ? "Preferences Snapshot" : "Job Preference");
      const prevValues = normalizePreferenceValue(row.previousValue);
      const newValues = normalizePreferenceValue(row.newValue);
      const rawTimestamp = row.saveTimestamp || row.createdAt || new Date().toISOString();
      const formattedTimestamp = formatPreferenceTimestamp(rawTimestamp);

      return {
        id: row.id || `hist-${index}`,
        userId: row.userId,
        fieldChanged,
        prevValues,
        newValues,
        formattedTimestamp,
        rawTimestamp,
      };
    });
  }, [rawRows]);

  // Unique fields for the filter dropdown
  const availableFields = useMemo(() => {
    const set = new Set<string>();
    processedRows.forEach((r) => {
      if (r.fieldChanged) set.add(r.fieldChanged);
    });
    return Array.from(set).sort();
  }, [processedRows]);

  // Filtered rows matching selected field and search query
  const filteredRows = useMemo(() => {
    return processedRows.filter((r) => {
      const matchesField = selectedField === "all" || r.fieldChanged === selectedField;
      if (!matchesField) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      const fieldText = r.fieldChanged.toLowerCase();
      const prevText = r.prevValues.join(" ").toLowerCase();
      const newText = r.newValues.join(" ").toLowerCase();
      const timestampText = r.formattedTimestamp.toLowerCase();

      return (
        fieldText.includes(q) ||
        prevText.includes(q) ||
        newText.includes(q) ||
        timestampText.includes(q)
      );
    });
  }, [processedRows, selectedField, searchQuery]);

  // Pagination
  const totalRows = filteredRows.length;
  const totalPages = Math.ceil(totalRows / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const startCount = totalRows === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endCount = totalRows === 0 ? 0 : Math.min(currentPage * pageSize, totalRows);
  const countText = totalRows === 0 ? "0–0 of 0" : `${startCount}–${endCount} of ${totalRows}`;

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleFieldChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedField(e.target.value);
    setCurrentPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleExport = () => {
    const headers = ["Timestamp", "Field changed", "Previous value", "New value"];
    const csvRows = [headers.join(",")];
    for (const row of filteredRows) {
      const prevStr = row.prevValues.length > 0 ? row.prevValues.join("; ") : "Not set";
      const newStr = row.newValues.length > 0 ? row.newValues.join("; ") : "Not set";
      const escaped = [
        `"${row.formattedTimestamp.replace(/"/g, '""')}"`,
        `"${row.fieldChanged.replace(/"/g, '""')}"`,
        `"${prevStr.replace(/"/g, '""')}"`,
        `"${newStr.replace(/"/g, '""')}"`,
      ];
      csvRows.push(escaped.join(","));
    }
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `preference_history_${userId}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-primary/15 bg-white p-4 shadow-[0_1px_10px_rgba(0,142,211,0.10)] md:p-8">
      {isLoading ? (
        <PulseLoader />
      ) : (
        <>
          <div className="flex items-center gap-3 mb-6">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <HiOutlineClock size={20} />
            </span>
            <h3 className="text-lg md:text-2xl text-career-black-200 font-medium font-sharp-grotesk">
              User Job Preference History
            </h3>
          </div>

          <div className="rounded-xl border border-[#e4eaf0] bg-white overflow-hidden shadow-xs">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 p-3.5 border-b border-[#e4eaf0] bg-white">
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={handleExport}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e4eaf0] bg-white text-[#0b7fc4] hover:bg-[#f5f8fa] font-medium transition-colors cursor-pointer"
                >
                  <Download size={14} />
                  <span>Export</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <select
                  id="field-filter-select-pc"
                  aria-label="Filter by field"
                  value={selectedField}
                  onChange={handleFieldChange}
                  className="border border-[#e4eaf0] rounded-lg px-3 py-1.5 text-xs text-[#1c2533] bg-white hover:border-[#cbd5e1] focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="all">All fields</option>
                  {availableFields.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:ml-auto flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex items-center w-full sm:w-60">
                  <Search size={14} className="absolute left-3 text-[#6b7686] pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search changes"
                    aria-label="Search changes"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="w-full pl-8 pr-3 py-1.5 border border-[#e4eaf0] rounded-lg text-xs text-[#1c2533] placeholder:text-[#6b7686] focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* Desktop Table */}
            <div className="overflow-x-auto hidden md:block">
              {paginatedRows.length > 0 ? (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[#e4eaf0] bg-[#fafcfd]">
                      <th className="py-3 px-4 text-left text-[11px] font-semibold text-[#1f3550] uppercase tracking-wider whitespace-nowrap w-[200px]">
                        Timestamp
                      </th>
                      <th className="py-3 px-4 text-left text-[11px] font-semibold text-[#1f3550] uppercase tracking-wider whitespace-nowrap w-[240px]">
                        Field changed
                      </th>
                      <th className="py-3 px-4 text-left text-[11px] font-semibold text-[#1f3550] uppercase tracking-wider min-w-[260px]">
                        Previous value
                      </th>
                      <th className="py-3 px-4 text-left text-[11px] font-semibold text-[#1f3550] uppercase tracking-wider min-w-[260px]">
                        New value
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-[#e4eaf0] even:bg-[#fafcfd] hover:bg-[#f5f8fa] transition-colors"
                      >
                        <td className="py-3.5 px-4 text-xs text-[#3c4656] align-top whitespace-nowrap">
                          {row.formattedTimestamp}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-medium text-[#1c2533] align-top whitespace-nowrap">
                          {row.fieldChanged}
                        </td>
                        <td className="py-3.5 px-4 align-top">
                          <ValueCell
                            values={row.prevValues}
                            isNew={false}
                            rowKey={`d-p-${row.id}`}
                            isExpanded={expandedKeys.has(`d-p-${row.id}`)}
                            onToggleExpand={toggleExpand}
                          />
                        </td>
                        <td className="py-3.5 px-4 align-top">
                          <ValueCell
                            values={row.newValues}
                            isNew={true}
                            rowKey={`d-n-${row.id}`}
                            isExpanded={expandedKeys.has(`d-n-${row.id}`)}
                            onToggleExpand={toggleExpand}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-12 px-4 text-center text-[#6b7686]">
                  {processedRows.length === 0 ? (
                    <>
                      <b className="block text-sm font-medium text-[#1c2533] mb-1">
                        No preference changes yet
                      </b>
                      <span>
                        A row appears here each time the client saves a change on their Preferences
                        page.
                      </span>
                    </>
                  ) : (
                    <>
                      <b className="block text-sm font-medium text-[#1c2533] mb-1">
                        No matching changes
                      </b>
                      <span>Try another field or search term.</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Mobile Card List (< md) */}
            <div className="block md:hidden p-3 divide-y divide-[#e4eaf0]">
              {paginatedRows.length > 0 ? (
                paginatedRows.map((row) => (
                  <div key={row.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="border border-[#e4eaf0] rounded-xl p-3.5 bg-white shadow-xs">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="font-medium text-[13px] text-[#1c2533]">
                          {row.fieldChanged}
                        </span>
                      </div>
                      <div className="text-[11.5px] text-[#6b7686] mb-3">
                        {row.formattedTimestamp}
                      </div>

                      <div className="text-[10.5px] text-[#6b7686] mb-1 font-medium uppercase tracking-wider">
                        Previous value
                      </div>
                      <div className="mb-2.5">
                        <ValueCell
                          values={row.prevValues}
                          isNew={false}
                          rowKey={`m-p-${row.id}`}
                          isExpanded={expandedKeys.has(`m-p-${row.id}`)}
                          onToggleExpand={toggleExpand}
                        />
                      </div>

                      <div className="text-[10.5px] text-[#6b7686] mb-1 font-medium uppercase tracking-wider">
                        New value
                      </div>
                      <div>
                        <ValueCell
                          values={row.newValues}
                          isNew={true}
                          rowKey={`m-n-${row.id}`}
                          isExpanded={expandedKeys.has(`m-n-${row.id}`)}
                          onToggleExpand={toggleExpand}
                        />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-10 px-4 text-center text-[#6b7686]">
                  {processedRows.length === 0 ? (
                    <>
                      <b className="block text-sm font-medium text-[#1c2533] mb-1">
                        No preference changes yet
                      </b>
                      <span className="text-xs">
                        A row appears here each time the client saves a change on their Preferences
                        page.
                      </span>
                    </>
                  ) : (
                    <>
                      <b className="block text-sm font-medium text-[#1c2533] mb-1">
                        No matching changes
                      </b>
                      <span className="text-xs">Try another field or search term.</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Pagination / Count Footer */}
            <div className="flex items-center justify-end gap-3 p-3 border-t border-[#e4eaf0] text-xs text-[#6b7686] bg-white">
              <span>{countText}</span>
              <button
                type="button"
                aria-label="Previous page"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1 || totalRows === 0}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                aria-label="Next page"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages || totalRows === 0}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminUserJobPreferenceHistory;
