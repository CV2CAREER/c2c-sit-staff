"use client"
import { DataGridPro, GridColDef } from "@mui/x-data-grid-pro";
import { styled } from "@mui/material/styles";

interface ColumnHeader {
  field: string;
  // add other properties as needed
}

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

const setToStorage = (key: string, item: any) => {
  if (!item || !isBrowser) return null;
  try {
    const jsned = JSON.stringify(item);
    localStorage.setItem(key, jsned);
    return item;
  } catch {
    // console.warn('Failed to save to localStorage:', error);
    return null;
  }
};

const getFromStorage = (key: string) => {
  if (!isBrowser) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return raw;
    const parsed = JSON.parse(raw);
    return parsed;
  } catch {
    // console.warn('Failed to read from localStorage:', error);
    return null;
  }
};

const getFieldsFromHeaders = (headers: any[]) => headers.map((h) => h.field);

/**
 * Orders the provided column headers based on a stored column order in localStorage.
 *
 * @param tableName - The key used to store and retrieve the column order.
 * @param columnHeaders - An array of objects representing the column headers. Each object must contain a "field" property.
 * @returns The column headers ordered according to the stored order. If a stored order is not found, the current order is saved and returned.
 *
 * @remarks
 * The function retrieves the stored column order from localStorage using the given tableName as the key.
 * If no stored order exists, it saves the current order (obtained by mapping the "field" properties) to localStorage.
 * If a stored order exists, it reorders the provided columnHeaders by matching each stored field with the corresponding
 * header in the array. Any new columns not present in the stored order are appended to the end of the ordered list.
 *
 * @example
 * const headers = [
 *   { field: "id" },
 *   { field: "name" },
 *   { field: "email" }
 * ];
 *
 * const orderedHeaders = orderTable("userTable", headers);
 * // orderedHeaders is now ordered based on the stored order in localStorage, with any new fields appended.
 */
export const orderTable = <T extends ColumnHeader>(
  tableName: string,
  columnHeaders: T[]
): T[] => {
  const newOrder: T[] = [];


  const storedOrders: string[] | null = getFromStorage(tableName);
  
  if (!storedOrders) {
    // Only save to storage if we're in the browser
    if (isBrowser) {
      setToStorage(tableName, getFieldsFromHeaders(columnHeaders));
    }
    return columnHeaders;
  }
  
  for (const columnName of storedOrders) {
    //sort existing column in localstorage and present in columnheader
    const column = columnHeaders.find((ch) => ch.field == columnName);
    if (!column) continue;
    newOrder.push(column);
  }
  
  //handle newly added columns
  for (const ch of columnHeaders) {
    const target = newOrder.find((c) => c.field == ch.field);
    if (!target) {
      newOrder.push(ch);
    }
  }
  
  // Only save to storage if we're in the browser
  if (isBrowser) {
    setToStorage(tableName, getFieldsFromHeaders(newOrder));
  }
  
  return newOrder;
};

export const moveTo = (tableName: string, field: string, target: number) => {
  // Return early if not in browser environment
  if (!isBrowser) return false;
  
  target = target - 1;
  
  // Get the current order from storage
  const currentOrder = [...(getFromStorage(tableName) || [])];
  const currentIndex = currentOrder.findIndex((c) => c === field);

  // Validate indices and field existence
  if (currentIndex === -1) return false; // Field not found
  if (target < 0 || target >= currentOrder.length) return false; // Target index out of bounds

  // Remove the element from the current position
  const [removedItem] = currentOrder.splice(currentIndex, 1);
  
  // Insert the element at the target position
  currentOrder.splice(target, 0, removedItem);

  // Save the new order back to storage
  setToStorage(tableName, currentOrder);

  return true; // Indicate successful operation
};

/**
 * StyledDataGridPro is a customized version of the DataGridPro component.
 *
 * @description
 * This component applies a series of custom styles to the default DataGridPro, including:
 * - No border and rounded corners.
 * - A white background with subtle box shadows for a lifted effect.
 * - Customized cell border styling.
 * - A bold and colored header with a distinct background.
 * - Zebra striping for rows to improve readability and a hover state with a different background color.
 * - A styled footer with a top border.
 *
 * @example
 * // Import and use the styled component in a React component:
 * import { StyledDataGridPro } from './path/to/table';
 *
 * const MyComponent = () => (
 *   <StyledDataGridPro
 *     rows={myRowData}
 *     columns={myColumnData}
 *     // ... other props
 *   />
 * );
 */
export const StyledDataGridPro = styled(DataGridPro)(() => ({
  "& .MuiDataGrid-root": {
    border: "none",
    backgroundColor: "#fefefe",
    boxShadow:
      "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    borderRadius: "8px",
  },
  "& .MuiDataGrid-cell": {
    borderBottom: "1px solid #f0f0f0",
  },
  "& .MuiDataGrid-columnHeaders": {
    backgroundColor: "#fefefe",
    color: "#333333",
    fontWeight: "bold",
  },
  "& .MuiDataGrid-columnHeaderTitle": {
    fontWeight: "bold",
  },
  "& .MuiDataGrid-row:nth-of-type(even)": {
    backgroundColor: "#f8f8f8",
  },
  "& .MuiDataGrid-row:hover": {
    backgroundColor: "#e6f7ff",
  },
  "& .MuiDataGrid-footer": {
    borderTop: "1px solid #e0e0e0",
  },
}));

/**
 * Polished sx overrides for the admin/assistant Users table — scoped to this
 * table only (not the shared StyledDataGridPro base, which many other tables
 * across the app also use). Crisp uppercase header labels, subtle zebra
 * striping, a brand-tinted hover/selected state, and a shadow separator on
 * pinned columns so they read as "frozen" against the horizontally
 * scrolling rest of the row.
 */
export const usersGridSx = {
  border: "1px solid #eef1f5",
  borderRadius: "12px",
  backgroundColor: "#fff",
  boxShadow: "none",
  "& .MuiDataGrid-columnHeaders": {
    backgroundColor: "#f8fafc",
    borderBottom: "1px solid #e7ebf0",
  },
  "& .MuiDataGrid-columnHeaderTitle": {
    fontSize: "11px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: "#64748b",
  },
  "& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within": {
    outline: "none",
  },
  "& .MuiDataGrid-columnSeparator": {
    color: "#e7ebf0",
  },
  "& .MuiDataGrid-cell": {
    borderBottom: "1px solid #f1f5f9",
    fontSize: "13px",
    color: "#334155",
    display: "flex",
    alignItems: "center",
  },
  "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within": {
    outline: "none",
  },
  "& .MuiDataGrid-row": {
    transition: "background-color 120ms ease",
  },
  "& .MuiDataGrid-row:nth-of-type(even)": {
    backgroundColor: "#fafbfc",
  },
  "& .MuiDataGrid-row:hover": {
    backgroundColor: "rgba(0, 142, 211, 0.06)",
  },
  "& .MuiDataGrid-row.Mui-selected": {
    backgroundColor: "rgba(0, 142, 211, 0.10)",
  },
  "& .MuiDataGrid-row.Mui-selected:hover": {
    backgroundColor: "rgba(0, 142, 211, 0.14)",
  },
  "& .MuiDataGrid-cell--pinnedLeft:last-of-type, & .MuiDataGrid-columnHeader--pinnedLeft:last-of-type": {
    boxShadow: "2px 0 4px -2px rgba(15, 23, 42, 0.12)",
  },
  "& .MuiDataGrid-footerContainer": {
    borderTop: "1px solid #e7ebf0",
    backgroundColor: "#f8fafc",
  },
  "& .MuiDataGrid-virtualScroller": {
    scrollbarWidth: "thin",
  },
  "& .MuiDataGrid-toolbarContainer": {
    padding: "10px 12px",
    borderBottom: "1px solid #eef1f5",
    gap: "8px",
  },
} as const;

export const applyHeaderClassName = (
  columns: GridColDef<any>[],
  className = "bg-[#80D7FF]"
): GridColDef<any>[] => {
  return columns.map((column) => ({
    ...column,
    headerClassName: className,
  }));
};

// Helper function to convert camelCase to Sentence Case
export function camelCaseToSentenceCase(str: string) {
  if (!str) return "";
  if (!str.includes("_")) {
    return str
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/^./, function (match) {
        return match.toUpperCase();
      });
  } else {
    return str.replace(/_/g, " ");
  }
}

// Helper function to add description to audit trail row
export function addDescription(row: any): any {
  return {
    ...row,
    description: row.description || "N/A",
  };
}

// Utility functions for URL parameters
export function omitEmpty(obj: Record<string, any>) {
  const newObj: Record<string, any> = {};
  Object.keys(obj).forEach((key) => {
    if (!!obj[key]) {
      newObj[key] = obj[key];
    }
  });
  return Object.keys(newObj).length > 0 ? newObj : undefined;
}

export function toURLParams(
  obj: Record<
    string,
    string | number | boolean | undefined | null | Record<string, any>
  >
) {
  const newObj: Record<string, string> = {};

  Object.keys(obj).forEach((key) => {
    if (!obj[key]) {
    } else if (typeof obj[key] === "object") {
      const value = omitEmpty(obj[key] as any);
      if (value) {
        newObj[key] = JSON.stringify(value);
      }
    } else {
      newObj[key] = String(obj[key]);
    }
  });
  return new URLSearchParams(newObj).toString();
}
