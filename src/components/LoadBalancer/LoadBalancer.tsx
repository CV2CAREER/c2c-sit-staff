import { useEffect, useState } from 'react';
import { GridToolbar } from '@mui/x-data-grid-pro';
import { Box, Link, MenuItem, Select } from '@mui/material'; // Assuming you meant MUI's Box, not Lucide-react
import { StyledDataGridPro } from '@/components/newTable/Table';
import hlogo from '../../../public/svg/h-logo.svg';
import Image from 'next/image';
import toast from 'react-hot-toast';

const LoadBalancerList = () => {
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const [queues] = useState([
  'seek',
  'adzuna',
  'careerone',
  'jobserve',
  'jora',
  'linkedin',
  'reed',
]);
const [discoveryQueue, setDiscoveryQueue] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedJobsite, setSelectedJobsite] = useState<string>('All');
  
   const OGColumns = [
      {
        field: 'id',
        headerName: 'Queue SN',
        headerClassName: 'bg-[#80D7FF]',
        flex: 1,
        renderCell: (params: any) => <span> Queue #{params.row.id}</span>,
        minWidth: 100,
        maxWidth: 150,
      },
      {
        field: 'name',
        headerName: 'Name',
        renderCell: (params: any) => (
          <Link className="text-blue-600" href={`/admin-dashboard/users/${params.row.uid}`}>
            {params.value}
          </Link>
        ),
        headerClassName: 'bg-[#80D7FF]',
        flex: 1,
        minWidth: 250,
        maxWidth: 300,
      },
      {
        field: 'email',
        headerName: 'Email',
        headerClassName: 'bg-[#80D7FF]',
        flex: 1,
        minWidth: 200,
        maxWidth: 300,
      },
      {
        field: 'jobsiteEmail',
        headerName: 'Jobsite Email',
        headerClassName: 'bg-[#80D7FF]',
        flex: 1,
        minWidth: 200,
        maxWidth: 300,
      },
      {
        field: 'aggregator',
        headerName: 'Aggregator',
        headerClassName: 'bg-[#80D7FF]',
        flex: 1,
        minWidth: 150,
        maxWidth: 250,
      },
     
      {
        field: 'startTime',
        headerName: 'Start Time',
        headerClassName: 'bg-[#80D7FF]',
        flex: 1,
        minWidth: 150,
        maxWidth: 250,
      },
      {
        field: 'endTime',
        headerName: 'End Time',
        headerClassName: 'bg-[#80D7FF]',
        flex: 1,
        minWidth: 150,
        maxWidth: 250,
      },
      {
        field: 'progress',
        headerName: 'Progress',
        renderCell: (params: any) => <span>{params.value}%</span>,
        headerClassName: 'bg-[#80D7FF]',
        flex: 1,
        minWidth: 100,
        maxWidth: 200,
      },
      {
        field: 'status',
        headerName: 'Status',
        renderCell: (params: any) => (
          <span
            className={`px-2 py-1 rounded-md ${
              params.value === 'Success'
                ? 'bg-[#D7FDD7] text-[#1EB62D]'
                : 'bg-[#FFE4E4] text-[#B61E1E]'
            }`}
          >
            {params.value}
          </span>
        ),
        headerClassName: 'bg-[#80D7FF]',
        flex: 1,
        minWidth: 100,
        maxWidth: 200,
      }
      
    ];
 // eslint-disable-next-line @typescript-eslint/no-unused-vars
 const [columns, setColumns] = useState(
    OGColumns.filter(
      (column) =>
        column.field !== 'progress' &&
        column.field !== 'startTime' &&
        column.field !== 'endTime' &&
        column.field !== 'status'
    )
  );

 
  const getQueues = async (selectedJobsite: string) => {
    try {
      setIsLoading(true);
      // Fetch queues based on the selected jobsite
      setDiscoveryQueue([]); // Reset discoveryQueue before fetching new data
      const url = selectedJobsite === 'All' ? '/api/admin/client-sample/loadBalancer' : `/api/admin/client-sample/loadBalancer?jobsite=${selectedJobsite}`;
      const res = await fetch(url);
      const result = await res.json();
      if (result.success) {
        const queuesData = result.data.map((item: any, index: number) => ({
          id: index + 1,
          credentialId: item.credentialId,
          uid: item.uid,
          name: item.name,
          aggregator: item.aggregator,
          email: item.email,
          jobsiteEmail: item.jobsiteEmail,
        }));
        setDiscoveryQueue(queuesData); // Assuming discoveryQueue is similar for now
      }
    } catch{
      // console.error('Error fetching queues:', error);
      toast.error('Failed to fetch queues. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const convertArrayToObject = (arr: any[], ind: number) => ({
    id: ind + 1,
    name: arr[0],
    timestamp: arr[1],
  });

 const jobsiteOptions = [
    {
      label: 'Adzuna',
      value: 'Adzuna'
    },
    {
      label: 'All',
      value: 'All'
    },
    {
      label: 'CareerOne',
      value: 'CareerOne',
    },
    {
      label: 'Jora',
      value: 'Jora'
    },
    {
      label: 'Jobserve',
      value: 'Jobserve'
    },
    {
      label: 'LinkedIn',
      value: 'LinkedIn'
    },
    {
      label: 'MichaelPage',
      value: 'MichaelPage'
    },
    {
      label: 'Randstad',
      value: 'Randstad'
    },
    {
      label: 'Reed',
      value: 'Reed'
    },
    {
      label: 'Seek',
      value: 'SEEK'
    },
     {
      label: 'Adecco',
      value: 'Adecco'
    },
    {
      label: 'Jobank',
      value: 'Jobank'
    }


  ]

  useEffect(() => {
    getQueues(selectedJobsite);
  }, [selectedJobsite]);

  return (

    <div className='p-4 mt-4  min-h-screen'>


      <p className="text-2xl font-semibold text-gray-800 mb-4">
        Perpetual Discovery Queue
      </p>
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
                {jobsiteOptions.map((j, i) => (
                  <MenuItem key={i} value={j.value} className="text-gray-700">
                    {j.label}
                  </MenuItem>
                ))}
              </Select>
            </div>
          </div>
      
      {isLoading ? (
         <div className="flex items-center justify-center bg-white p-6 h-[20vh]">
                  <div className="h-[200px] flex items-center justify-center animate-pulse">
                    <Image className="" src={hlogo} alt="Laigus logo" />
                  </div>
                </div>
      ) : (
        <Box className="h-[700px] mt-4">
          <StyledDataGridPro
            rows={discoveryQueue} // You can toggle this with discoveryQueue if needed
            columns={columns}
            initialState={{ pagination: { paginationModel: { pageSize: 5 } } }}
            checkboxSelection={false}
            disableRowSelectionOnClick
            className="bg-white shadow-md rounded-lg"
            paginationMode="server"
            pageSizeOptions={[500, 1000, 3000]}
            rowBufferPx={100}
            columnBufferPx={5}
            slots={{
              toolbar: GridToolbar,
            }}
            slotProps={{
              toolbar: {
                showQuickFilter: true,
                quickFilterProps: { debounceMs: 500 },
              } as any,
            }}
            sx={{ overflow: 'visible' }}
          />
        </Box>
      )}
    </div>
  );
};

export default LoadBalancerList;
