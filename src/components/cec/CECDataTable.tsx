"use client";

import React, { useState, useMemo } from "react";

interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  wide?: boolean;
}

interface FilterDef {
  key: string;
  label: string;
}

interface CECDataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  filters?: FilterDef[];
  activeFilter?: string;
  onFilterChange?: (key: string) => void;
  searchPlaceholder?: string;
  onRowClick?: (row: T) => void;
  selectedRow?: T | null;
  nameKey?: string;
  renderCell?: (key: string, row: T) => React.ReactNode;
  pageSize?: number;
  onAddRow?: () => void;
  totalCount?: number;
}

export default function CECDataTable<T extends Record<string, any>>({
  columns,
  data,
  filters,
  activeFilter = "all",
  onFilterChange,
  searchPlaceholder = "Search...",
  onRowClick,
  selectedRow,
  nameKey = "name",
  renderCell,
  pageSize = 50,
  onAddRow,
  totalCount,
}: CECDataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const filteredData = useMemo(() => {
    let rows = data;
    if (search) {
      rows = rows.filter((row) =>
        Object.values(row).some((val) =>
          String(val).toLowerCase().includes(search.toLowerCase())
        )
      );
    }
    return rows;
  }, [data, search]);

  const sortedData = useMemo(() => {
    const rows = [...filteredData];
    if (sortKey) {
      rows.sort((a, b) => {
        const aVal = a[sortKey] ?? "";
        const bVal = b[sortKey] ?? "";
        const comparison = String(aVal).localeCompare(String(bVal));
        return sortDir === "asc" ? comparison : -comparison;
      });
    }
    return rows;
  }, [filteredData, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedData = sortedData.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const btnBase: React.CSSProperties = {
    padding: "6px 12px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: 500,
    cursor: "pointer",
    border: "1px solid #E1E8EF",
    background: "#fff",
    color: "#55697D",
  };

  return (
    <div style={{ background: "#fff", border: "1px solid #E9EEF3", borderRadius: "12px", overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #E9EEF3", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          style={{
            height: "36px",
            width: "230px",
            padding: "0 12px",
            fontSize: "13px",
            border: "1px solid #E1E8EF",
            borderRadius: "9px",
            outline: "none",
            color: "#12202D",
            background: "#fff",
          }}
        />
        {filters && filters.map((f) => (
          <button
            key={f.key}
            onClick={() => { onFilterChange?.(f.key); setPage(1); }}
            style={{
              padding: "7px 12px",
              borderRadius: "9px",
              fontSize: "12.5px",
              fontWeight: 500,
              cursor: "pointer",
              border: `1px solid ${activeFilter === f.key ? "#008ED3" : "#E1E8EF"}`,
              background: activeFilter === f.key ? "rgba(0,142,211,0.08)" : "#fff",
              color: activeFilter === f.key ? "#004174" : "#55697D",
            }}
          >
            {f.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: "12.5px", color: "#8A9AAB", whiteSpace: "nowrap" }}>
          {totalCount != null ? totalCount : sortedData.length} of {totalCount != null ? totalCount : sortedData.length} rows
        </span>
        {onAddRow && (
          <button
            onClick={onAddRow}
            style={{
              height: "36px",
              display: "flex",
              alignItems: "center",
              padding: "0 14px",
              borderRadius: "9px",
              background: "#008ED3",
              color: "#fff",
              fontSize: "12.5px",
              fontWeight: 500,
              cursor: "pointer",
              border: "none",
              whiteSpace: "nowrap",
            }}
          >
            + New row
          </button>
        )}
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#FBFCFE" }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                  style={{
                    padding: "11px 14px",
                    textAlign: "left",
                    fontSize: "11px",
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase" as const,
                    color: "#8A9AAB",
                    borderBottom: "1px solid #E9EEF3",
                    cursor: col.sortable !== false ? "pointer" : "default",
                    whiteSpace: "nowrap",
                    userSelect: "none",
                  }}
                >
                  {col.label}
                  {sortKey === col.key && (
                    <span style={{ marginLeft: "4px" }}>{sortDir === "asc" ? "\u2191" : "\u2193"}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  style={{ padding: "32px 16px", textAlign: "center", fontSize: "13px", color: "#9AA5B4" }}
                >
                  No records found
                </td>
              </tr>
            ) : (
              pagedData.map((row, idx) => {
                const rowName = row[nameKey] || row.id || idx;
                const isSelected = selectedRow && (selectedRow[nameKey] || selectedRow.id) === rowName;
                return (
                  <tr
                    key={idx}
                    onClick={() => onRowClick?.(row)}
                    style={{
                      borderBottom: "1px solid #F1F5F9",
                      cursor: "pointer",
                      background: isSelected ? "#F2F8FC" : undefined,
                    }}
                    onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "#F7FAFD"; }}
                    onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = ""; }}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        style={{
                          padding: "11px 14px",
                          fontSize: "12.5px",
                          color: col.wide ? "#55697D" : "#12202D",
                          borderBottom: "1px solid #F1F5F9",
                          verticalAlign: "middle",
                          whiteSpace: col.wide ? "nowrap" : undefined,
                          maxWidth: col.wide ? "320px" : undefined,
                          overflow: col.wide ? "hidden" : undefined,
                          textOverflow: col.wide ? "ellipsis" : undefined,
                        }}
                      >
                        {col.render ? col.render(row) : renderCell ? renderCell(col.key, row) : (row[col.key] ?? "---")}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {sortedData.length > pageSize && (
        <div style={{ padding: "10px 16px", borderTop: "1px solid #E9EEF3", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", color: "#8A9AAB" }}>
          <span>{sortedData.length} total rows</span>
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <button
              disabled={safePage <= 1}
              onClick={() => setPage(safePage - 1)}
              style={{ ...btnBase, opacity: safePage <= 1 ? 0.4 : 1, cursor: safePage <= 1 ? "default" : "pointer" }}
            >
              Prev
            </button>
            <span style={{ fontWeight: 500, color: "#55697D" }}>{safePage} / {totalPages}</span>
            <button
              disabled={safePage >= totalPages}
              onClick={() => setPage(safePage + 1)}
              style={{ ...btnBase, opacity: safePage >= totalPages ? 0.4 : 1, cursor: safePage >= totalPages ? "default" : "pointer" }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
