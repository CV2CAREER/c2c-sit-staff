import { GridColDef } from "@mui/x-data-grid-pro";

const jobApplicationsColumns: GridColDef[] = [
  { field: "id", headerName: "ID", flex: 1, minWidth: 200 },
  { field: "Client", headerName: "Client", flex: 1, minWidth: 200 },
  { field: "client_id", headerName: "Client Id", flex: 1, minWidth: 200 },
  { field: "Requestor", headerName: "Requestor", flex: 1, minWidth: 200 },
  { field: "Timestamp", headerName: "Timestamp", flex: 1, minWidth: 200 },
  { field: "Internal_Jobsite", headerName: "Internal Jobsite", flex: 1, minWidth: 200 },
  { field: "External_Jobsite", headerName: "External Jobsite", flex: 1, minWidth: 200 },
  { field: "Country", headerName: "Country", flex: 1, minWidth: 200 },
  { field: "All_Words", headerName: "All Words", flex: 1, minWidth: 200 },
  { field: "Application_Source", headerName: "Application Source", flex: 1, minWidth: 200 },
  { field: "Status", headerName: "Status", flex: 1, minWidth: 200 },
  { field: "Application_Mode", headerName: "Application Mode", flex: 1, minWidth: 200 },
  { field: "Sample_Type", headerName: "Sample Type", flex: 1, minWidth: 200 },
  { field: "Category", headerName: "Category", flex: 1, minWidth: 200 },
  {
    field: "Job_Title",
    headerName: "Job Title",
    flex: 1,
    minWidth: 200,
    renderCell: (params) => {
      const value = String(params.value ?? "");
      if (value.includes("<a href")) {
        const urlMatch = value.match(/href="([^"]*)"/);
        const textMatch = value.match(/<a[^>]*>(.*?)<\/a>/);
        const url = urlMatch ? urlMatch[1] : "";
        const text = textMatch ? textMatch[1] : value.replace(/<[^>]*>/g, "");

        if (url) {
          return (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "#1976d2",
                textDecoration: "underline",
                cursor: "pointer",
                width: "100%",
                display: "block",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {text}
            </a>
          );
        }
      }

      return (
        <div
          style={{
            width: "100%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {value}
        </div>
      );
    },
  },
  { field: "Location", headerName: "Location", flex: 1, minWidth: 200 },
  { field: "JobId", headerName: "Job Id", flex: 1, minWidth: 300 },
  { field: "Advertiser", headerName: "Advertiser", flex: 1, minWidth: 300 },
  { field: "Screenshot", headerName: "Screenshot", flex: 1, minWidth: 300 },
  { field: "Classification", headerName: "Classification", flex: 1, minWidth: 300 },
  { field: "Date_Advertised", headerName: "Date Advertised", flex: 1, minWidth: 200 },
  { field: "Run_Source", headerName: "Run Source", flex: 1, minWidth: 200 },
  { field: "SeekAnswersSource", headerName: "Seek Answers Source", flex: 1, minWidth: 200 },
  { field: "updateBy", headerName: "Update By", flex: 1, minWidth: 200 },
  { field: "ApplicationSubmittedBy", headerName: "Application Submitted By", flex: 1, minWidth: 200 },
  { field: "isDeleted", headerName: "Is Deleted", flex: 1, minWidth: 200 },
  { field: "MatchLevel", headerName: "Match Level", flex: 1, minWidth: 200 },
];

export default jobApplicationsColumns;
