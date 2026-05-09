'use client'
import {  Select, MenuItem } from '@mui/material';

interface FilterComponentProps {
    setSelectedJobsite: any;
    jobsiteOptions: any[];
    setSelectedEnv: any;
    envOptions: any[];
}

const FilterComponent = ({setSelectedJobsite, jobsiteOptions, setSelectedEnv, envOptions} : FilterComponentProps) => {
    return (
        <div className = 'flex flex-row gap-4'>
            <div className="flex flex-wrap items-center gap-4 py-2 px-4 bg-gray-50 rounded-md shadow-sm">
                {/* Filters Header */}
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <span>Filters:</span>
                    <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4 text-gray-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L15 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 019 21v-7.586L3.293 6.707A1 1 0 013 6V4z"
                    />
                    </svg>
                </div>
            </div>

            <div className='flex flex-row gap-2'>
                {/* Jobsite Selector */}
                <div className="flex flex-col">
                    <label htmlFor="jobsite" className="text-xs text-gray-600 mb-1">
                    Select Jobsite
                    </label>
                    <Select
                    id="jobsite"
                    onChange={(e) =>{
                        if(e.target.value.toLowerCase() == 'all') {
                        setSelectedJobsite('')
                        return
                        }
                        setSelectedJobsite(e.target.value)
                        }}
                    defaultValue="All"
                    className="w-48 h-8 bg-white text-xs md:text-sm text-gray-700"
                    >
                    {jobsiteOptions.map((j: any, i: number) => (
                        <MenuItem key={i} value={j.value} className="text-gray-700">
                        {j.label}
                        </MenuItem>
                    ))}
                    </Select>
                </div>

                {/* Environment Selector */}
                <div className="flex flex-col">
                    <label htmlFor="environment" className="text-xs text-gray-600 mb-1">
                    Select Environment
                    </label>
                    <Select
                    id="environment"
                    onChange={(e) => {
                        if(e.target.value.toLowerCase() == 'all') {
                        setSelectedEnv('')
                        return
                        }
                        setSelectedEnv(e.target.value)
                    }}
                    defaultValue="All"
                    className="w-48 h-8 bg-white text-xs md:text-sm text-gray-700"
                    >
                    {envOptions.map((en: any, i: number) => (
                        <MenuItem key={i} value={en.value} className="text-gray-700">
                        {en.label}
                        </MenuItem>
                    ))}
                    </Select>
                </div>
            </div>
        </div>
    )
}

export default FilterComponent