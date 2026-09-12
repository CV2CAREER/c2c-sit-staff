import { GridColDef } from "@mui/x-data-grid-pro";
import Tooltip from '@mui/material/Tooltip';

interface Columns {
    field: string
    headerName: string
}

const preferenceHistoryColumns: Columns[] = [
    {
        field: 'createdAt',
        headerName: 'Timestamp',
    },
    {
        field: 'role',
        headerName: 'Core Displine',
    },
    {
        field: 'keywords',
        headerName: 'Keywords',
    },
    {
        field: 'titles',
        headerName: 'Titles',
    },
    {
        field: 'titlesExcluded',
        headerName: 'Titles Excluded',
    },
    {
        field: 'maxSalary',
        headerName: 'Max Salary',
    },
    {
        field: 'minSalary',
        headerName: 'Min Salary',
    },
    {
        field: 'jobTypes',
        headerName: 'Job Type',
    },
    {
        field: 'workingRight',
        headerName: 'Working Right',
    },
    {
        field: 'advertisers',
        headerName: 'Advertisers',
    },
    {
        field: 'advertisersExcluded',
        headerName: 'Advertisers Excluded',
    },
    {
        field: 'classifications',
        headerName: 'Industries',
    },
    {
        field: 'classificationsExcluded',
        headerName: 'Industries Excluded',
    },
    {
        field: 'isAiForCriteriaSelectionAllowed',
        headerName: 'Allow AI for Criteria Selection',
    },
    {
        field: 'coverletterIncluded',
        headerName: 'Include Cover Letter',
    },
    {
        field: 'locations',
        headerName: 'Locations',
    }
]

const PreferenceToolTip = ({title}:{title:string}) => {
    return (
        <Tooltip title={title} arrow>
            <span
                style={{
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    maxWidth: '100%',
                    display: 'block',
                }}
            >
                {title}
            </span>
        </Tooltip>
    );
}

const generateJobHistoryColumns = () => {
    const columns = preferenceHistoryColumns.reduce((acc: GridColDef[], el: GridColDef) => {
        // Get value safely from preferenceSnapshot first, fallback to root
        const getFieldValue = (row: any, field: string) => {
            return row?.preferenceSnapshot?.[field] ?? row?.[field];
        };
        
        if (el.field === "createdAt") {
            const timestampEl:GridColDef = {
                ...el,
                width: 200,
                renderCell: (params: any) => {
                    const formatter = new Intl.DateTimeFormat('en-GB', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                    });
                    
                    const dateValue = getFieldValue(params.row, 'createdAt') ?? params.row?.preferenceSnapshot?.updatedAt;
                    
                    // Safely handle invalid or missing date values
                    if (!dateValue) {
                        return <PreferenceToolTip title="N/A" />;
                    }
                    
                    const date = new Date(dateValue);
                    
                    // Check if date is valid
                    if (isNaN(date.getTime())) {
                        return <PreferenceToolTip title="N/A" />;
                    }
                    
                    const formatted = formatter.format(date).replace(',', '');
                    return <PreferenceToolTip title={formatted} />
                },
            }
            return [...acc, timestampEl]
        } else if (
            el.field === "keywords" ||
            el.field === "titles" ||
            el.field === "titlesExcluded" ||
            el.field === "jobTypes" ||
            el.field === "workingRight" ||
            el.field === "advertisers" ||
            el.field === "advertisersExcluded" ||
            el.field === "classifications" ||
            el.field === "classificationsExcluded" ||
            el.field === "locations"
        ) {
            const arrayEl:GridColDef = {
                ...el,
                width: 200,
                sortable: false,
                renderCell: (params: any) => {
                    const arr = getFieldValue(params.row, el.field) as []
                    const arrData = arr && arr.length > 0 ? arr?.join(', ') : "No records"
                    if (el.field === "classifications" || el.field === "classificationsExcluded") {
                        const classificationsData = arr && arr.length > 0 ? arr.map((item:{name:string}) => item?.name || item).join(", ") : "No records"
                        return <PreferenceToolTip title={classificationsData}/>
                    }
                    return <PreferenceToolTip title={arrData} />
                }
            }
            return [...acc, arrayEl]
        }else if (
            el.field === "coverletterIncluded" ||
            el.field === "isAiForCriteriaSelectionAllowed"
        ) {
            const boolEl: GridColDef = {
                ...el,
                width: 100,
                sortable: false,
                renderCell: (params: any) => <PreferenceToolTip title={getFieldValue(params.row, el.field) ? "Yes" : "No" }/>
            }
            return [...acc, boolEl]
        }
        return [...acc, {
            ...el,
            width: 200,
            renderCell: (params: any) => {
                const value = getFieldValue(params.row, el.field);
                return <PreferenceToolTip title={value ?? "N/A"} />;
            }
        }]
    }, [])
    return columns
}

export default generateJobHistoryColumns