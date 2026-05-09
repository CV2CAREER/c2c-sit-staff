import { GridColDef } from "@mui/x-data-grid-pro";

const questionsColumns: GridColDef[] = [
  { field: "id", headerName: "ID", flex: 1, minWidth: 280 },
  { field: "userName", headerName: "User Name", flex: 1, minWidth: 180 },
  { field: "userEmail", headerName: "User Email", flex: 1, minWidth: 230 },
  {
    field: "jobLink",
    headerName: "Job Link",
    flex: 1,
    minWidth: 200,
    renderCell: (params) => {
      const url = String(params.value ?? "");
      return url && url !== "N/A" ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#1976d2", textDecoration: "underline", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block", width: "100%" }}
        >
          {url}
        </a>
      ) : (
        <span>N/A</span>
      );
    },
  },
  {
    field: "questionCount",
    headerName: "Questions",
    width: 110,
    renderCell: (params) => (
      <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
        {params.value ?? 0}
      </span>
    ),
  },
  {
    field: "documentCount",
    headerName: "Documents",
    width: 110,
    renderCell: (params) => (
      <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
        {params.value ?? 0}
      </span>
    ),
  },
  {
    field: "isEmailSent",
    headerName: "Email Sent",
    width: 110,
    renderCell: (params) => (
      <span className={`px-2 py-1 rounded text-xs font-medium ${params.value ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
        {params.value ? "Yes" : "No"}
      </span>
    ),
  },
  {
    field: "userRole",
    headerName: "Client",
    flex: 1,
    minWidth: 130,
    renderCell: (params) => (
      <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800 capitalize">
        {String(params.value || "client")}
      </span>
    ),
  },
  {
    field: "isDeleted",
    headerName: "Deleted",
    width: 90,
    renderCell: (params) => (
      <span className={`px-2 py-1 rounded text-xs font-medium ${params.value ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
        {params.value ? "Yes" : "No"}
      </span>
    ),
  },
  {
    field: "createdAt",
    headerName: "Created",
    width: 130,
    renderCell: (params) => (
      <span>{params.value ? new Date(String(params.value)).toLocaleDateString() : "N/A"}</span>
    ),
  },
  {
    field: "updatedAt",
    headerName: "Updated",
    width: 130,
    renderCell: (params) => (
      <span>{params.value ? new Date(String(params.value)).toLocaleDateString() : "N/A"}</span>
    ),
  },
];

export default questionsColumns;
