import { GridColDef } from "@mui/x-data-grid"

// Raw upload `type` values are lowercase, single-word ("resume",
// "coverletter"); ClientSupportDocument rows already arrive pre-labeled
// ("Role Title Recommendations", etc.) via CATEGORY_LABELS. This normalizes
// the column display for both.
const TYPE_LABELS: Record<string, string> = {
    resume: "Resume",
    coverletter: "Cover Letter",
}
const formatTypeLabel = (value: unknown) => {
    const raw = typeof value === "string" ? value : ""
    if (!raw) return ""
    return TYPE_LABELS[raw] ?? raw.charAt(0).toUpperCase() + raw.slice(1)
}
import DocumentTableActions from "./client-document-actions"
import GenerateCoverLetterButton from "./GenerateCoverLetterButton"
import GenerateRoleTitlesButton from "./GenerateRoleTitlesButton"
import GenerateCvVariantButton from "./GenerateCvVariantButton"
import GenerateInterviewPackButton from "./GenerateInterviewPackButton"

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
        field: "activeStatus",
        headerName: "Status"
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
        field: "generateRTR",
        headerName: "Generate RTR"
    },
    {
        field: "generateCvVariant",
        headerName: "Generate CV Variant"
    },
    {
        field: "generateInterviewPack",
        headerName: "Generate Interview Pack"
    },
    {
        field: "generateCoverLetter",
        headerName: "Generate Cover Letter"
    }
]


export const generateClientDocumentsColumns = (rows: any[], userId?: string) => {
    const columns = clientDocumentsColumns.reduce((acc: GridColDef[], el: GridColDef) => {
        if (el.field === "actions") {
            const actionsEl: GridColDef = {
                ...el,
                renderCell: (params: any) => (
                    <DocumentTableActions
                        document_={params.row}
                        allDocuments = {rows}
                        actions={["download", "default", "keywords", "role-titles", "activate"]}
                    />
                )
            }
            return [...acc, actionsEl]
        }

        if (el.field === "activeStatus") {
            return [
                ...acc,
                {
                    ...el,
                    width: 120,
                    renderCell: (params: any) => {
                        // Only admin-generated documents (Upload rows and
                        // ClientSupportDocument rows both use source: "admin")
                        // carry this gate — client uploads show a dash instead.
                        if (params.row.source !== "admin") return <p className="text-career-gray-200">—</p>
                        return params.row.isActive ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                Active
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                                Inactive
                            </span>
                        )
                    }
                }
            ]
        }

        if (el.field === "fileName") {
            return [
                ...acc, {
                    ...el,
                    width: 280,
                    renderCell: (params:any) => (
                        <p>{params.value}</p>
                    )
                }
            ]
        }
        if (el.field === "type") {
            return [
                ...acc, {
                    ...el,
                    renderCell: (params: any) => (
                        <p>{formatTypeLabel(params.value)}</p>
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
        if (el.field === "generateCoverLetter") {
            const buttonEl: GridColDef = {
                ...el,
                width: 190,
                renderCell: (params: any) => {
                    // Blank means "not applicable to this document" (e.g. not
                    // a resume) — the cell renders as a dash instead.
                    if (!params.value) return <p className="text-career-gray-200">—</p>
                    return (
                        <GenerateCoverLetterButton
                            userId={userId ?? ""}
                            resumeUploadId={params.row.id}
                        />
                    )
                }
            }
            return [
                ...acc,
                buttonEl
            ]
        }
        if (el.field === "generateRTR") {
            const buttonEl: GridColDef = {
                ...el,
                width: 190,
                renderCell: (params: any) => {
                    // Blank means "not applicable to this document" (e.g. not
                    // a resume) — the cell renders as a dash instead.
                    if (!params.value) return <p className="text-career-gray-200">—</p>
                    return (
                        <GenerateRoleTitlesButton
                            userId={userId ?? ""}
                            resumeUploadId={params.row.id}
                        />
                    )
                }
            }
            return [
                ...acc,
                buttonEl
            ]
        }
        if (el.field === "generateCvVariant") {
            const buttonEl: GridColDef = {
                ...el,
                width: 190,
                renderCell: (params: any) => {
                    // Blank means "not applicable to this document" (e.g. not
                    // a resume) — the cell renders as a dash instead.
                    if (!params.value) return <p className="text-career-gray-200">—</p>
                    return (
                        <GenerateCvVariantButton
                            userId={userId ?? ""}
                            resumeUploadId={params.row.id}
                        />
                    )
                }
            }
            return [
                ...acc,
                buttonEl
            ]
        }
        if (el.field === "generateInterviewPack") {
            const buttonEl: GridColDef = {
                ...el,
                width: 190,
                renderCell: (params: any) => {
                    // Blank means "not applicable to this document" (e.g. not
                    // a resume) — the cell renders as a dash instead.
                    if (!params.value) return <p className="text-career-gray-200">—</p>
                    return (
                        <GenerateInterviewPackButton
                            userId={userId ?? ""}
                            resumeUploadId={params.row.id}
                        />
                    )
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
            }
        ]
    }, [])
    return columns
}

export const generateClientDocumentRows = (rows: any[]) => {
    return rows.map(row => {
        // The generate actions (RTR / CV variant / interview pack / cover
        // letter) only make sense off a resume — other upload types (cover
        // letters, certificates) show a dash in those cells instead.
        const isResume = row.type === "resume";
        return ({
        id: row.id || row._id || `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        fileName: row.document?.name ?? row.document?.[0]?.filename ?? "Unknown File",
        type: row.type,
        source: row.source,
        // Distinguishes this row from a ClientSupportDocument row for the
        // shared DocumentTableActions component — the two record types
        // live in different tables with different activate endpoints.
        recordType: "upload",
        isActive: row.isActive,
        userId: row.userId,
        dateUpdated: row.updatedAt,
        extractionType: row.cvDataPoints?.cvType ?? "N/A",
        dataPoints: "No data",
        suggestedKeywords: "View",
        suggestedJobTitles: "View",
        generateRTR: isResume ? "Generate RTR" : "",
        generateCvVariant: isResume ? "Generate CV Variant" : "",
        generateInterviewPack: isResume ? "Generate Interview Pack" : "",
        generateCoverLetter: isResume ? "Generate Cover Letter" : "",
    })})
}
