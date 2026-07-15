import { Button } from "@/components/ui/button"
import { GridColDef } from "@mui/x-data-grid"
import DocumentTableActions from "./client-document-actions"

const clientDocumentsColumns = [
    {
        field: "actions",
        headerName: "Actions",
        width: 100,
    },
    {
        field: "fileName",
        headerName: "File Name"
    },
    {
        field: "type",
        headerName: "Type"
    },
    {
        field: "source",
        headerName: "Source"
    },
    {
        field: "dateUpdated",
        headerName: "Date Updated"
    }, {
        field: "extractionType",
        headerName: "Extraction Type"
    }, {
        field: "dataPoints",
        headerName: "Data Points"
    },
    {
        field: "suggestedKeywords",
        headerName: "Suggested Keywords"
    },
    {
        field: "suggestedJobTitles",
        headerName: "Suggested Job Titles"
    },
    {
        field: "populateKeywords",
        headerName: "Populate Keywords"
    },
    {
        field: "viewRevampedVersions",
        headerName: "View Revamped Versions"
    }
]


export const generateClientDocumentsColumns = (rows: any[]) => {
    const columns = clientDocumentsColumns.reduce((acc: GridColDef[], el: GridColDef) => {
        if (el.field === "actions") {    
            const actionsEl: GridColDef = { 
                ...el,
                renderCell: (params: any) => (
                    <DocumentTableActions
                        document_={params.row}
                        allDocuments = {rows}
                        actions={["download", "default", "keywords", "role-titles"]}
                    />
                )
            }
            return [...acc, actionsEl]
        }

        if (el.field === "fileName") {
            return [
                ...acc, {
                    ...el,
                    width: 280,
                    headerClassName: "bg-[#D4FFFF]",
                    renderCell: (params:any) => (
                        <p>{params.value}</p>
                    )
                }
            ]
        }
        if (
            el.field === "suggestedKeywords" ||
            el.field === "suggestedJobTitles"){
                return [
                    ...acc,{
                        ...el,
                        // Support documents (role titles, images, spreadsheets)
                        // have no keywords/job titles — show a dash, not a link.
                        renderCell: (params:any) => params.value
                            ? <p className="text-blue hover:underline hover:cursor-pointer">{params.value}</p>
                            : <p className="text-career-gray-200">—</p>
                    }
                ]
        }
        if (
            el.field === "populateKeywords" ||
            el.field === "viewRevampedVersions"
        ) {
            const buttonEl:GridColDef = {
                ...el,
                width: 250,
                headerClassName: "bg-[#D4FFFF]",
                renderCell: (params: any) => {
                    if (!params.value) return <p className="text-career-gray-200">—</p>
                    return <Button className="bg-[#0D9F6E] border-slate-400 rounded-none hover:bg-white hover:text-blue hover:border hover:border-blue shadow-none hover:shadow-none">{params.value}</Button>
                }
            }
            return [
                ...acc,
                buttonEl
            ]
        }
        return [
            ...acc,
            {
                ...el,
                width: 200,
                headerClassName: "bg-[#D4FFFF]"
            }
        ]
    }, [])
    return columns
}

export const generateClientDocumentRows = (rows: any[]) => {
    return rows.map(row => {
        return ({
        id: row.id || row._id || `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        fileName: row.document?.name ?? row.document?.[0]?.filename ?? "Unknown File",
        type: row.type,
        source: row.source,
        dateUpdated: row.updatedAt,
        extractionType: row.cvDataPoints?.cvType ?? "N/A",
        dataPoints: "No data",
        suggestedKeywords: "View",
        suggestedJobTitles: "View",
        populateKeywords:"Populate Keywords",
        viewRevampedVersions:"View Revamped Versions"
    })})
}
