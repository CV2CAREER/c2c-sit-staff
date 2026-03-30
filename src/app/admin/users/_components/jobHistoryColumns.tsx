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
        if (el.field === "createdAt") {
            const timestampEl:GridColDef = {
                ...el,
                width: 200,
                headerClassName: 'bg-[#80D7FF]',
                renderCell: (params: any) => {
                    const formatter = new Intl.DateTimeFormat('en-GB', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                    });
                    const formatted = formatter.format(new Date(params.value)).replace(',', '');
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
                headerClassName: 'bg-[#80D7FF]',
                sortable: false,
                renderCell: (params: any) => {
                    const arr = params.value as []
                    const arrData = arr && arr.length > 0 ? arr?.join(', ') : "No records"
                    if (el.field === "classifications") {
                        const classificationsData = arr && arr.length > 0 ? arr.map((item:{name:string}) => item.name).join(", ") : "No records"
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
                headerClassName: 'bg-[#80D7FF]',
                sortable: false,
                renderCell: (params: any) => <PreferenceToolTip title={params.value ? "Yes" : "No" }/>
            }
            return [...acc, boolEl]
        }
        return [...acc, {
            ...el,
            width: 200,
            headerClassName: 'bg-[#80D7FF]',
        }]
    }, [])
    return columns
}

export default generateJobHistoryColumns