/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { Switch, Input, DatePicker} from 'antd';
import moment from 'moment';
import { countries } from '../../../data/countries';
import {
  seekConstants,
  jobserveConstants,
  joraConstants,
  linkedinConstants,
  reedConstants,
  workforceAustraliaConstants,
  escapeCityConstants,
} from '@/constants';
import { getStatesAndCities } from '../../../utils/newTableFunc';
import { getAdvertisers } from '../../../utils/newTableFunc';
// import MultiSelectComponent from './MultipleSelect';
import toast from 'react-hot-toast';
import { ClassificationSelect, LocationSelect } from './Selects/AllSelects';

import industries from '../../../data/industry.json';
import { diff } from 'deep-object-diff';
import AppModal from '../AppModal';
import { useAdminQueries } from '@/hooks/api/admin.api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EditRoleModalProps {
  visible: boolean;
  onClose: () => void;
  rowData: any;
  isAssistant?: boolean;
  table: any;
  columnHeaders: any[];
  onRowClick: any;
  handleEditRowsModelChange: any;
}

const EditRowModal: React.FC<EditRoleModalProps> = ({
  visible,
  onClose,
  rowData,
  isAssistant,
  table,
  columnHeaders,
  handleEditRowsModelChange,
}) => {
  const [editedData, setEditedData] = React.useState(rowData);
  const [loading, setLoading] = useState(false);
  const [locationOptions, setLocationOptions] = useState<any[]>([]);
  const [advertiserList, setAdvertiserList] = useState<string[]>([]);
  const [dbOptions, setdbOptions] = useState<any>([]);
  const [isValidMapping, setVlidMapping] = useState(false);

  const assistantHeaders = ['Application Mode', 'Status'];

  const sampleConstants = {
    Mode: ['Manual', 'Automated', 'Unattended'],
    Status: ['Failed', 'Successful', 'Unattended']
  }

 const getConstantsByTable = (table: string) => {
  const t = table?.toLowerCase();

  if (t.includes('seek')) return seekConstants;
  if (t.includes('jobserve')) return jobserveConstants || seekConstants;
  if (t.includes('workforceaustralia')) return workforceAustraliaConstants;
  if (t.includes('escapecity')) return escapeCityConstants;
  if (t.includes('jora')) return joraConstants;
  if (t.includes('linkedin')) return linkedinConstants;
  if (t.includes('reed')) return reedConstants;
  if (t.includes('sample results')) return sampleConstants;

  return {};
};

  const mapping: Record<string, string[]> = {
    Unattended: ['Unattended'],
    Failed: ['Manual', 'Automated'],
    Successful: ['Manual', 'Automated'],
  };

  const validateMapping = (status: string, mode: string) => {
    if (mapping[status]?.includes(mode)) {
      // console.log(`Valid mapping: ${status} - ${mode}`);
      // We will use this to update the satet to determine if the user can save if it is a valid or invalid mapping
      setVlidMapping(false);
      toast.success('Valid mapping selected!');
    } else {
      setVlidMapping(true);
      toast.error('Invalid mapping selected! Please select valid options');
    }
  };

  const handleStatusChange = (field: string, value: any) => {
    handleInputChange(field, value);
    validateMapping(value, editedData['Application_Mode']);
  };

  const handleModeChange = (field: string, value: any) => {
    handleInputChange(field, value);
    validateMapping(editedData['Status'], value);
  };

  const getCountryByTable = () => {
    switch (table) {
      case 'seek':
      case 'jobserve':
        return 'Australia';
      case 'reed':
        return 'UK';
      case 'jora':
        return 'Canada';
      case 'linkedin':
        return 'USA';
      case 'jobbak':
        return 'Canada';
      case 'Adecco':
        return 'Canada';
      default:
        return 'Australia';
    }
  };

  const tableConstants: Record<string, string[]> = getConstantsByTable(table) as Record<string, string[]>;

  const getAggName = (tableName: string | undefined): string | undefined => {
    const t = tableName?.toLowerCase();
    if (!t) return undefined;
    if (t.includes('seek')) return 'seek_locations';
    if (t.includes('reed')) return 'reed_locations';
    if (t.includes('jora')) return 'jora_locations';
    if (t.includes('jobserve')) return 'reed_locations';
    return undefined;
  };

  const aggName = getAggName(table);

  const {
    aggregatorLocationsDomain: { data: locationsData },
    adminDropdownsDomain: { data, error }
  } = useAdminQueries({
    fetchAggregatorLocations: true,
    aggregatorName: aggName,
    fetchAdminDropdowns: true,
  });

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const fetchedOptions = locationsData || [];
        const country = getCountryByTable();
        const allOptions = await getStatesAndCities(country);
        
        const combinedOptions = [...new Set([...fetchedOptions, ...allOptions])];

        setLocationOptions(combinedOptions);
      } catch {
        // console.error('Error fetching location options:', error);
      }
    };

    if (locationsData) {
      fetchOptions();
    }
  }, [table, locationsData]);

  useEffect(() => {
    getAdvertisers().then((advertisers: string[]) => setAdvertiserList(advertisers));
  }, []);

// Filter and store dropdown options when data is ready
useEffect(() => {
  if (data && columnHeaders.length > 0) {
     const dropDownList = data?.dropdowns || []

    const arr = dropDownList.filter((d: { title: string }) =>
      columnHeaders.some((col) => col.headerName === d.title)
    );
    setdbOptions(arr);
  }
}, [data, columnHeaders]);

// Handle fetch error
useEffect(() => {
  if (error instanceof Error) {
    toast.error(error.message);
  } else if (error) {
    toast.error("An error occurred");
  }
}, [error]);

  const handleInputChange = (field: string, value: any) => {
    setEditedData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (editedData: any) => {
    setLoading(true);

    try {
        //differentiate between editeddata and rowData
          const differences: Record<string, any> = diff(rowData, editedData);

          if (differences['Status'] === 'Successful') {

            editedData['Application_Mode'] = 'Manual';
          }
      await handleEditRowsModelChange(editedData, rowData);
    } catch {
      toast.error('Error saving changes');
    } finally {
      setLoading(false);
      onClose();
    }
  };

interface CleanOptionsFn {
    (options: string[]): string[];
}

const cleanOptions: CleanOptionsFn = (options) => {
    return options.map((option) => option.replace(/<<|>>|\|\|/g, '').trim());
};

  // Options data for "Min"
  const minOptions = cleanOptions([
    '30000',
    '40000',
    '50000',
    '60000',
    '70000',
    '80000',
    '100000',
    '120000',
    '150000',
    '200000',
  ]);
  const maxOptions = [
  '30000',
  '40000',
  '50000',
  '60000',
  '70000',
  '80000',
  '100000',
  '120000',
  '150000',
  '200000',
  '999999',
];

interface DbOption {
    title: string;
    options?: string[];
}

type GetOptionsFn = (headerName: string) => string[] | null ;

const getOptions: GetOptionsFn = (headerName) => {
    const dataItem: DbOption | undefined = dbOptions.find((item: DbOption) => item.title === headerName);
    return dataItem && Array.isArray(dataItem.options) && dataItem.options.length > 0 ? dataItem.options : null;
};

  // console.log('col-h', columnHeaders);

  // This is where columns that are system defined are set. If theres is a column on the aggregator tables that you don't want to be edited add them here (field name)
  const systemColumns = [
    'id',
    'actions',
    'updatedAt',
    'createdAt',
    'Master_Credential_Id',
    'updateBy',
    'isDeleted',
  ];

  const sampleTableCoulmns = [
    'id',
    'actions',
    'updatedAt',
    'createdAt',
    'Master_Credential_Id',
    'updateBy',
    'isDeleted',
    'Client',
    'Timestamp',
    'Internal_Jobsite',
    'External_Jobsite',
    'Category',
    "All_Words",
    "Job_Title",
    "JobId",
    "Location",
    "Job_Type",
    "Date_Advertised",
    "Requestor",
    "Sample_Type",
    "ApplicationSubmittedBy",
    "MatchLevel"
  ];

  const columnsToExclude = table === "sample_results" || table === "job_applications" ? sampleTableCoulmns : systemColumns

  return (
    <AppModal
      isOpen={visible}
      onClose={onClose}
      contentClassName="w-full max-w-xs sm:max-w-md md:max-w-lg lg:max-w-2xl h-auto max-h-[90vh] flex flex-col overflow-hidden "
      title={
        `Edit ${table.charAt(0).toUpperCase() + table.slice(1).replace("_", " ")} Table`
      }
    >
      <div className="">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave(editedData);
          }}
          className="w-full flex flex-col overflow-y-auto max-h-[70vh] px-4"
        >
          <div className="mb-8 grid gap-y-4 gap-x-6 grid-cols-1 md:grid-cols-2 items-center justify-center">
                {columnHeaders
                  .filter((column) => !columnsToExclude.includes(column.field))
                  .map((column) => (
                    <div key={column.field} className="space-y-2 w-full">
                      <label
                        htmlFor={column.field}
                        className="block text-lg font-medium text-gray-700"
                      >
                        {column.headerName}{' '}
                        {column.required && <span className="text-red-500">*</span>}
                      </label>

                      {/* Reverted: DatePicker format and value/onChange to old code (YYYY-MM-DD) */}
                      {/* Old:
                      <DatePicker
                          className="w-full p-2"
                          format="DD-MM-YYYY"
                          value={editedData[column.field] ? moment(editedData[column.field], "DD-MM-YYYY") : null}
                          onChange={(dateMoment) => handleInputChange(column.field, dateMoment ? dateMoment.format("DD-MM-YYYY") : null)}
                        />
                      */}
                      {column.type === 'date' ? (
                        <DatePicker
                          className="w-full p-2"
                          format="DD-MM-YYYY" // Updated to DD-MM-YYYY as per backend expectation
                          value={editedData[column.field] ? moment(editedData[column.field], "DD-MM-YYYY") : null}
                          onChange={(dateMoment) => handleInputChange(column.field, dateMoment ? dateMoment.format("DD-MM-YYYY") : null)}
                        />
                      ) : column.headerName === 'Keyword Type' ? (
                        <Select
                          
                          value={editedData[column.field]}
                          onValueChange={(value) => handleInputChange(column.field, value)}
                        >
                         <SelectTrigger>
                            <SelectValue placeholder={`Select ${column.headerName}`} />

                          </SelectTrigger>
                          <SelectContent>
                          {(getOptions(column.headerName) ?? ['Unique', 'Generic', 'Unique Hybrid', 'Generic Hybrid'])
                            .map((option, idx) => (
                              <SelectItem key={idx} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                      ) : column.headerName === 'Requestor' ? (
                        <Select
                          value={editedData[column.field]}
                          onValueChange={(value) => handleInputChange(column.field, value)}

                        >
                       
                         <SelectTrigger>
                            <SelectValue placeholder={`Select ${column.headerName}`} />

                          </SelectTrigger>
                          <SelectContent>
                          {((getOptions(column.headerName) ?? ['C2C', 'Client']) as string[]).map((option, idx) => (
                            <SelectItem key={idx} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                          </SelectContent>
                        </Select>
                      ) : column.headerName === 'Classification' ? (
                        <ClassificationSelect
                          tableConstants={tableConstants}
                          editedData={editedData}
                          column={column}
                          handleInputChange={handleInputChange}
                        />
                      ) : column.headerName === 'Jobs Type' ? (
                        <Select
                          value={
                            editedData[column.field] &&
                            [
                              'Any',
                              'Full-time',
                              'Permanent',
                              'Contract',
                              'Internship',
                              'Part-time',
                            ].includes(editedData[column.field])
                              ? editedData[column.field]
                              : undefined
                          }
                          key="Select job type"
                          onValueChange={(value) => handleInputChange(column.field, value)}
                        >
                         <SelectTrigger>
                            <SelectValue placeholder={`Select ${column.headerName}`} />
                          </SelectTrigger>
                          <SelectContent>
                          {[
                            'Any',
                            'Full-time',
                            'Permanent',
                            'Contract',
                            'Internship',
                            'Part-time',
                          ].map((option, idx) => (
                            <SelectItem key={idx} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : column.headerName === 'Posted By' ? (
                      <Select
                        value={
                          editedData[column.field] &&
                            ['Any', 'Reed', 'Agency', 'Employer'].includes(editedData[column.field])
                              ? editedData[column.field]
                              : undefined
                          }
                          key="Select posted by"
                          onValueChange={(value) => handleInputChange(column.field, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={`Select ${column.headerName}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {['Any', 'Reed', 'Agency', 'Employer'].map((option, idx) => (
                            <SelectItem key={idx} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : column.headerName === 'Type' ? (
                      <Select
                        key="Select Type"
                        value={
                            editedData[column.field] &&
                            (tableConstants['Type'] || []).includes(editedData[column.field])
                              ? editedData[column.field]
                              : undefined
                          }
                          onValueChange={(value) => handleInputChange(column.field, value)}
                        >

                       <SelectTrigger>
                            <SelectValue placeholder={`Select ${column.headerName}`} />

                          </SelectTrigger>
                          <SelectContent>
                          {(
                            getOptions(column.headerName) ??
                            tableConstants['Type'] ??
                            []
                          ).map((option: string, idx: number) => (
                            <SelectItem key={idx} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : column.headerName === 'Listed' ? (
                      <Select
                        key="Select Listed Status"
                          value={
                            editedData[column.field] &&
                            (tableConstants['Listed'] || []).includes(editedData[column.field])
                              ? editedData[column.field]
                              : undefined
                          }
                          onValueChange={(value) => handleInputChange(column.field, value)}
                        >
                         <SelectTrigger>
                            <SelectValue placeholder={`Select ${column.headerName}`} />

                          </SelectTrigger>
                          <SelectContent>
                            {(getOptions(column.headerName) ?? tableConstants['Listed'] ?? []).map((option, idx) => (
                              <SelectItem key={idx} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : column.headerName === 'Status' ? (
                        <Select
                          key="Select Status"
                          value={editedData[column.field] && editedData[column.field]}
                          onValueChange={(value) => handleInputChange(column.field, value)}
                        >
                         <SelectTrigger>
                            <SelectValue placeholder={`Select ${column.headerName}`} />

                          </SelectTrigger>
                          <SelectContent>
                          {[
                            'Successful',
                            'Failed',
                            'Unattended',
                            'WIP',
                            'Expired',
                            'Skipped'
                          ].map((option, idx) => (
                            <SelectItem key={idx} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : column.headerName === 'Application Mode' ? (
                      <Select
                        key="Select Mode"
                          value={editedData[column.field] && editedData[column.field]}
                          onValueChange={(value) => handleInputChange(column.field, value)}
                        >
                       <SelectTrigger>
                          <SelectValue placeholder={`Select ${column.headerName}`} />

                          </SelectTrigger>
                          <SelectContent>
                          {[
                            'Manual',
                            'Automated',
                            'Unattended'
                          ].map((option, idx) => (
                            <SelectItem key={idx} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                        </Select>
                      ) : column.headerName === 'Classification Name' ? (
                        <ClassificationSelect
                          tableConstants={tableConstants}
                          editedData={editedData}
                          column={column}
                          handleInputChange={handleInputChange}
                        />
                      ) : column.headerName === 'Classification Exclude' ? (
                        <ClassificationSelect
                          tableConstants={tableConstants}
                          editedData={editedData}
                          column={column}
                          handleInputChange={handleInputChange}
                        />
                      ) : column.headerName === 'Country' ? (
                        <Select
                          value={
                            editedData[column.field] &&
                            countries.some((country: { value: string }) => country.value === editedData[column.field])
                              ? editedData[column.field]
                              : undefined
                          }
                          key="Select Country"
                          onValueChange={(value) => handleInputChange(column.field, value)}
                        >
                         <SelectTrigger>
                            <SelectValue placeholder={`Select ${column.headerName}`} />

                          </SelectTrigger>
                          <SelectContent>
                            {countries.map((country: { id: number; value: string; label: string }) => (
                              <SelectItem key={country.id} value={country.value}>
                                {country.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : column.headerName === 'Advertiser Exclude' ||
                        column.headerName === 'Advertiser Include' ? (
                        <Select
 
                          value={
                            editedData[column.field] &&
                            advertiserList.includes(editedData[column.field])
                              ? editedData[column.field]
                              : undefined
                          }
                          key={`Select ${column.headerName}`}
                          onValueChange={(value) => handleInputChange(column.field, value)}
                          
                        >
                      
                         <SelectTrigger>
                            <SelectValue placeholder={`Select ${column.headerName}`} />

                          </SelectTrigger>
                          <SelectContent>
                          {(getOptions(column.headerName)
                            ?? advertiserList
                          ).map((advertiser, index) => (
                            <SelectItem key={`advertiser-${index}`} value={advertiser}>
                              {advertiser}
                            </SelectItem>
                          ))}
                          </SelectContent>
                        </Select>
                      ) : column.headerName === 'Min' ? (
                        <Select
                          value={
                            editedData[column.field] &&
                            minOptions.some((option) => option === editedData[column.field])
                              ? editedData[column.field]
                              : undefined
                          }
                       
                          onValueChange={(value) => handleInputChange(column.field, value)}
                        >
                         <SelectTrigger>
                            <SelectValue placeholder={`Select ${column.headerName}`} />

                          </SelectTrigger>
                          <SelectContent> {(getOptions(column.headerName)
                            ?? minOptions
                          ).map((option, idx) => (
                            <SelectItem key={idx} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                          </SelectContent>
                        </Select>
                      ) : column.headerName === 'Title Filter Inclusive' ? (
                        <Select
                          value={editedData[column.field]}
                          onValueChange={(value) => handleInputChange(column.field, value)}
                        >
                         <SelectTrigger>
                            <SelectValue placeholder={`Select ${column.headerName}`} />

                          </SelectTrigger>
                          <SelectContent> {(getOptions(column.headerName)
                            ?? ['YES', 'NO']
                          ).map((option, idx) => (
                            <SelectItem key={idx} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                          </SelectContent>
                        </Select>
                      ) : column.headerName === 'Title Filter Exclusive' ? (
                        <Select
                          value={editedData[column.field]}
                          onValueChange={(value) => handleInputChange(column.field, value)}
                        >
                         <SelectTrigger>
                            <SelectValue placeholder={`Select ${column.headerName}`} />

                          </SelectTrigger>
                          <SelectContent> {(getOptions(column.headerName)
                            ?? ['YES', 'NO']
                          ).map((option, idx) => (
                            <SelectItem key={idx} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                          </SelectContent>
                        </Select>
                      ) : column.headerName === 'Advertiser Include' ? (
                        <Select
                          value={editedData[column.field]}
                          onValueChange={(value) => handleInputChange(column.field, value)}
                        >
                         <SelectTrigger>
                            <SelectValue placeholder={`Select ${column.headerName}`} />

                          </SelectTrigger>
                          <SelectContent> {(getOptions(column.headerName)
                            ?? ['YES', 'NO']
                          ).map((option, idx) => (
                            <SelectItem key={idx} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                          </SelectContent>
                        </Select>
                      ) : column.headerName === 'Advertiser Exclude' ? (
                        <Select
                          value={editedData[column.field]}
                          onValueChange={(value) => handleInputChange(column.field, value)}
                        >
                         <SelectTrigger>
                            <SelectValue placeholder={`Select ${column.headerName}`} />

                          </SelectTrigger>
                          <SelectContent> {(getOptions(column.headerName)
                            ?? ['YES', 'NO']
                          ).map((option, idx) => (
                            <SelectItem key={idx} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                          </SelectContent>
                        </Select>
                      ) : column.headerName === 'Advertiser Include Regex' ? (
                        <Select
                          value={editedData[column.field]}
                          onValueChange={(value) => handleInputChange(column.field, value)}
                        >
                         <SelectTrigger>
                            <SelectValue placeholder={`Select ${column.headerName}`} />

                          </SelectTrigger>
                          <SelectContent> {(getOptions(column.headerName)
                            ?? ['YES', 'NO']
                          ).map((option, idx) => (
                            <SelectItem key={idx} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                          </SelectContent>
                        </Select>
                      ) : column.headerName === 'Advertiser Exclude Regex' ? (
                        <Select
                          value={editedData[column.field]}
                          onValueChange={(value) => handleInputChange(column.field, value)}
                        >
                         <SelectTrigger>
                            <SelectValue placeholder={`Select ${column.headerName}`} />

                          </SelectTrigger>
                          <SelectContent> {(getOptions(column.headerName)
                            ?? ['YES', 'NO']
                          ).map((option, idx) => (
                            <SelectItem key={idx} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                          </SelectContent>
                        </Select>
                      ) : column.headerName === 'Criteria Acceptance' ? (
                        <Select
                          value={editedData[column.field]}
                          onValueChange={(value) => handleInputChange(column.field, value)}
                        >
                         <SelectTrigger>
                            <SelectValue placeholder={`Select ${column.headerName}`} />

                          </SelectTrigger>
                          <SelectContent> {(getOptions(column.headerName) ?? ['Approved', 'Declined', 'Proposed']
                          ).map((option, idx) => (
                            <SelectItem key={idx} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                          </SelectContent>
                        </Select>

                      ) : column.headerName === 'Location' ? (
                        <LocationSelect
                          locationOptions={locationOptions}
                          column={column}
                          name="locations"
                          editedData={editedData}
                          placeholder="Select Locations"
                          handleInputChange={handleInputChange}
                        />
                      ) : column.headerName === 'Type Name' ? (
                        <Select
                          value={
                            editedData[column.field] &&
                            [
                              'All Options',
                              'Full Time',
                              'Part Time',
                              'Contract / Temp',
                              'Casual / Vacation',
                            ].includes(editedData[column.field])
                              ? editedData[column.field]
                              : undefined
                          }
                          key="Select a type"
                          onValueChange={(value) => handleInputChange(column.field, value)}
                        >
                         <SelectTrigger>
                            <SelectValue placeholder={`Select ${column.headerName}`} />

                          </SelectTrigger>
                          <SelectContent> {(getOptions(column.headerName)
                            ??
                             [
                                'All Options',
                                'Full Time',
                                'Part Time',
                                'Contract / Temp',
                                'Casual / Vacation',
                              ]
                          ).map((option, idx) => (
                            <SelectItem key={idx} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                          </SelectContent>
                        </Select>
                      ) : column.headerName === 'Proximity' ? (
                        <Select
                          value={
                            editedData[column.field] &&
                            ['5', '10', '50', '100'].includes(editedData[column.field])
                              ? editedData[column.field]
                              : undefined
                          }
                          key="Select a max value"
                          onValueChange={(value) => handleInputChange(column.field, value)}
                        >
                         <SelectTrigger>
                            <SelectValue placeholder={`Select ${column.headerName}`} />

                          </SelectTrigger>
                          <SelectContent>
                            {(getOptions(column.headerName) ?? ['5', '10', '50', '100']).map((option, idx) => (
                              <SelectItem key={idx} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : column.headerName === 'Max' ? (
                        <Select
                          value={
                            editedData[column.field] &&
                            (
                              (getOptions(column.headerName) ?? [
                                '30000',
                                '40000',
                                '50000',
                                '60000',
                                '70000',
                                '80000',
                                '100000',
                                '120000',
                                '150000',
                                '200000',
                                '999999',
                              ])
                            ).includes(editedData[column.field])
                              ? editedData[column.field]
                              : undefined
                          }
                          key="Select a max value"
                          onValueChange={(value) => handleInputChange(column.field, value)}
                        >
                       <SelectTrigger>
                            <SelectValue placeholder={`Select ${column.headerName}`} />

                          </SelectTrigger>
                          <SelectContent>
                          {(getOptions(column.headerName)
                            ?? [
                                '30000',
                                '40000',
                                '50000',
                                '60000',
                                '70000',
                                '80000',
                                '100000',
                                '120000',
                                '150000',
                                '200000',
                                '999999',
                              ]
                          ).map((option, idx) => (
                            <SelectItem key={idx} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                          </SelectContent>
                        </Select>
                      ) : column.headerName === 'Sort By' ? (
                        <Select
                          key="Select an option"
                          value={
                            editedData[column.field] &&
                            (getOptions(column.headerName)
                              ?? ['KeywordRelevance', 'ListedDate']
                            ).includes(editedData[column.field])
                              ? editedData[column.field]
                              : undefined
                          }
                          onValueChange={(value) => handleInputChange(column.field, value)}
                        >
                       <SelectTrigger>
                            <SelectValue placeholder={`Select ${column.headerName}`} />

                          </SelectTrigger>
                          <SelectContent>
                          {(getOptions(column.headerName)
                            ?? ['KeywordRelevance', 'ListedDate']
                          ).map((option, idx) => (
                            <SelectItem key={idx} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      ) : column.headerName === 'Experience' ? (
                        <Select
                          value={
                            editedData[column.field] &&
                            (getOptions(column.headerName)
                              ?? [
                                  'Any',
                                  'Internship',
                                  'Entry Level',
                                  'Associate',
                                  'Mid-Senior Level',
                                  'Director',
                                  'Executive',
                                ]
                            ).includes(editedData[column.field])
                              ? editedData[column.field]
                              : undefined
                          }
                          key="Select experience level"
                          onValueChange={(value) => handleInputChange(column.field, value)}
                        >
                       <SelectTrigger>
                            <SelectValue placeholder={`Select ${column.headerName}`} />

                          </SelectTrigger>
                          <SelectContent>
                          {(getOptions(column.headerName)
                            ?? [
                                'Any',
                                'Internship',
                                'Entry Level',
                                'Associate',
                                'Mid-Senior Level',
                                'Director',
                                'Executive',
                              ]
                          ).map((option, idx) => (
                            <SelectItem key={idx} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                        </Select>
                      ) : column.headerName === 'Premise Type' ? (
                        <Select
                          value={
                            editedData[column.field] &&
                            ((getOptions(column.headerName) ?? ['Any', 'Remote', 'Hybrid', 'On-site'])
                            ).includes(editedData[column.field])
                              ? editedData[column.field]
                              : undefined
                          }
                          key="Select premise type"
                          onValueChange={(value) => handleInputChange(column.field, value)}
                        >
                       <SelectTrigger>
                            <SelectValue placeholder={`Select ${column.headerName}`} />

                          </SelectTrigger>
                          <SelectContent>
                          {[...(getOptions(column.headerName) ?? ['Any', 'Remote', 'Hybrid', 'On-site'])].map((option, idx) => (
                            <SelectItem key={idx} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                          </SelectContent>
                        </Select>
                      ) : column.headerName === 'Date Posted' ? (
                        <Select
                          value={
                            editedData[column.field] &&
                            ([...(getOptions(column.headerName) ?? ['Any time', 'Past 24 hours', 'Past week', 'Past month'])]
                            ).includes(editedData[column.field])
                              ? editedData[column.field]
                              : undefined
                          }
                          key="Select date posted"
                          onValueChange={(value) => handleInputChange(column.field, value)}
                        >
                         <SelectTrigger>
                            <SelectValue placeholder={`Select ${column.headerName}`} />

                          </SelectTrigger>
                          <SelectContent>
                            {[...(getOptions(column.headerName) ?? ['Any time', 'Past 24 hours', 'Past week', 'Past month'])].map((option, idx) => (
                              <SelectItem key={idx} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : column.headerName === 'Job Type' ? (
                        <Select
                          value={
                            editedData[column.field] &&
                            ((getOptions(column.headerName) ?? ['Any', 'Full-time', 'Contract'])
                            ).includes(editedData[column.field])
                              ? editedData[column.field]
                              : undefined
                          }
                          key="Select job type"
                          onValueChange={(value) => handleInputChange(column.field, value)}
                        >
                         <SelectTrigger>
                            <SelectValue placeholder={`Select ${column.headerName}`} />

                          </SelectTrigger>
                          <SelectContent>
                            {(getOptions(column.headerName) ?? ['Any', 'Full-time', 'Contract']
                            ).map((option, idx) => (
                              <SelectItem key={idx} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                          ) : column.headerName === 'Industry' ? (
                          <Select
                            value={
                            editedData[column.field] &&
                            ([...(getOptions(column.headerName) ?? [
                                'Any',
                                'IT Services and IT Consulting',
                                'Technology, Information and Internet',
                                'Internet Publishing',
                                'Banking',
                                'Human Resources Services',
                                'Outsourcing and Offshoring Consulting',
                                'Software Development',
                                'Staffing and Recruiting',
                                'Computer Games',
                                'Financial Services',
                                'Telecommunications',
                                'Engineering',
                              ])] as string[]).includes(editedData[column.field])
                              ? editedData[column.field]
                              : undefined
                            }
                            key="Select industry"
                            onValueChange={(value) => handleInputChange(column.field, value)}
                          >
                           <SelectTrigger>
                            <SelectValue placeholder={`Select ${column.headerName}`} />

                          </SelectTrigger>
                          <SelectContent>
                          {[...(getOptions(column.headerName) ?? [
                                'Any',
                                'IT Services and IT Consulting',
                                'Technology, Information and Internet',
                                'Internet Publishing',
                                'Banking',
                                'Human Resources Services',
                                'Outsourcing and Offshoring Consulting',
                                'Software Development',
                                'Staffing and Recruiting',
                                'Computer Games',
                                'Financial Services',
                                'Telecommunications',
                                'Engineering',
                              ])].map((option, idx) => (
                              <SelectItem key={idx} value={option}>
                              {option}
                              </SelectItem>
                            ))}
                            </SelectContent>
                          </Select>
                          ) : column.headerName === 'Job Function' ? (
                          <Select
                            value={
                            editedData[column.field] &&
                            (getOptions(column.headerName)
                              ?? [
                                'Any',
                                'Information Technology',
                                'Business Development',
                                'Consulting',
                                'Customer Service',
                                'Art/Creative',
                                'Engineering',
                                'Project Management',
                                'Other',
                                'Management',
                                'Administrative',
                                'Marketing',
                              ]
                            ).includes(editedData[column.field])
                              ? editedData[column.field]
                              : undefined
                            }
                            key="Select job function"
                            onValueChange={(value) => handleInputChange(column.field, value)}
                          >
                           <SelectTrigger>
                            <SelectValue placeholder={`Select ${column.headerName}`} />

                          </SelectTrigger>
                          <SelectContent>
                            {(getOptions(column.headerName)
                              ?? [
                                'Any',
                                'Information Technology',
                                'Business Development',
                                'Consulting',
                                'Customer Service',
                                'Art/Creative',
                                'Engineering',
                                'Project Management',
                                'Other',
                                'Management',
                                'Administrative',
                                'Marketing',
                              ]
                            ).map((option, idx) => (
                              <SelectItem key={idx} value={option}>
                              {option}
                              </SelectItem>
                            ))}
                            </SelectContent>
                          </Select>
                          ) : column.headerName === 'Commitments' ? (
                          <Select
                            value={
                            editedData[column.field] &&
                            (getOptions(column.headerName)
                              ?? [
                                'Any',
                                'Career growth and learning',
                                'Environmental sustainability',
                                'Work-life balance',
                                'Diversity, equity and inclusion',
                                'Social impact',
                              ]
                            ).includes(editedData[column.field])
                              ? editedData[column.field]
                              : undefined
                            }
                            key="Select commitment"
                            onValueChange={(value) => handleInputChange(column.field, value)}
                          >
                           <SelectTrigger>
                            <SelectValue placeholder={`Select ${column.headerName}`} />

                          </SelectTrigger>
                          <SelectContent>
                            {(getOptions(column.headerName)
                              ?? [
                                'Any',
                                'Career growth and learning',
                                'Environmental sustainability',
                                'Work-life balance',
                                'Diversity, equity and inclusion',
                                'Social impact',
                              ]
                            ).map((option, idx) => (
                              <SelectItem key={idx} value={option}>
                              {option}
                              </SelectItem>
                            ))}
                            </SelectContent>
                          </Select>
                          ) : column.headerName === 'Distance' ? (
                          <Select
                            value={
                            editedData[column.field] &&
                            (getOptions(column.headerName)
                              ?? ['Any', '0 km', '8 km', '16 km', '40 km', '80 km', '160 km']
                            ).includes(editedData[column.field])
                              ? editedData[column.field]
                              : undefined
                            }
                            key="Select distance"
                            onValueChange={(value) => handleInputChange(column.field, value)}
                          >
                           <SelectTrigger>
                            <SelectValue placeholder={`Select ${column.headerName}`} />

                          </SelectTrigger>
                          <SelectContent>
                            {(getOptions(column.headerName)
                              ?? ['Any', '0 km', '8 km', '16 km', '40 km', '80 km', '160 km']
                            ).map((option, idx) => (
                              <SelectItem key={idx} value={option}>
                              {option}
                              </SelectItem>
                            ))}
                            </SelectContent>
                          </Select>
                          ) : column.headerName === 'Job collections' ? (
                          <Select
                            value={
                            editedData[column.field] &&
                            (getOptions(column.headerName)
                              ?? ['Any', 'Top Applicant Jobs', 'Green Jobs']
                            ).includes(editedData[column.field])
                              ? editedData[column.field]
                              : undefined
                            }
                            key="Select job collection"
                            onValueChange={(value) => handleInputChange(column.field, value)}
                          >
                           <SelectTrigger>
                            <SelectValue placeholder={`Select ${column.headerName}`} />

                          </SelectTrigger>
                          <SelectContent>
                            {(getOptions(column.headerName)
                              ?? ['Any', 'Top Applicant Jobs', 'Green Jobs']
                            ).map((option, idx) => (
                              <SelectItem key={idx} value={option}>
                              {option}
                              </SelectItem>
                            ))}
                            </SelectContent>
                          </Select>
                          ) : column.headerName === 'Sort by' ? (
                          <Select
                            value={
                            editedData[column.field] &&
                            (getOptions(column.headerName)
                              ?? ['Any', 'Most recent', 'Most relevant']
                            ).includes(editedData[column.field])
                              ? editedData[column.field]
                              : undefined
                            }
                            key="Select sort option"
                            onValueChange={(value) => handleInputChange(column.field, value)}
                          >
                           <SelectTrigger>
                            <SelectValue placeholder={`Select ${column.headerName}`} />

                          </SelectTrigger>
                          <SelectContent>
                            {(getOptions(column.headerName)
                              ?? ['Any', 'Most recent', 'Most relevant']
                            ).map((option, idx) => (
                              <SelectItem key={idx} value={option}>
                              {option}
                              </SelectItem>
                            ))}
                            </SelectContent>
                          </Select>
                          ) : column.headerName === 'Category Logic' ? (
                          <Select
                            value={
                            editedData[column.field] &&
                            (getOptions(column.headerName)
                              ?? ['AND', 'OR']
                            ).includes(editedData[column.field])
                              ? editedData[column.field]
                              : undefined
                            }
                            key="Select an option"
                            onValueChange={(value) => handleInputChange(column.field, value)}
                          >
                           <SelectTrigger>
                            <SelectValue placeholder={`Select ${column.headerName}`} />

                          </SelectTrigger>
                          <SelectContent>
                            {(getOptions(column.headerName)
                              ?? ['AND', 'OR']
                            ).map((option, idx) => (
                              <SelectItem key={idx} value={option}>
                              {option}
                              </SelectItem>
                            ))}
                            </SelectContent>
                          </Select>
                          ) : column.headerName === 'Industry' ||
                          column.headerName?.toLowerCase() == 'industries' ? (
                          <Select
                            key="Select Industry"
                            value={
                            editedData[column.field] &&
                            (getOptions(column.headerName)
                              ?? industries
                            ).includes(editedData[column.field])
                              ? editedData[column.field]
                              : undefined
                            }
                            onValueChange={(value) => handleInputChange(column.field, value)}
                          >
                           <SelectTrigger>
                            <SelectValue placeholder={`Select ${column.headerName}`} />

                          </SelectTrigger>
                          <SelectContent>
                            {(getOptions(column.headerName)
                              ?? industries
                            ).map((option: any, idx: number) => (
                              <SelectItem
                              key={idx}
                              value={typeof option === 'string' ? option : option.category}
                              >
                              {typeof option === 'string' ? option : option.category}
                              </SelectItem>
                            ))}
                            </SelectContent>
                          </Select>
                          ) : column.headerName === 'KW/RT Logic' ? (
                          <Select
                            value={
                            editedData[column.field] &&
                            (getOptions(column.headerName)
                              ?? []
                            ).includes(editedData[column.field])
                              ? editedData[column.field]
                              : undefined
                            }
                            key="Select an option"
                            onValueChange={(value) => handleInputChange(column.field, value)}
                          >
                           <SelectTrigger>
                            <SelectValue placeholder={`Select ${column.headerName}`} />

                          </SelectTrigger>
                          <SelectContent>
                            {(getOptions(column.headerName) ?? []).map(
                              (option, idx) => (
                              <SelectItem key={idx} value={option}>
                                {option
                                .split('_') // Replace underscores
                                .map((word) => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize each word
                                .join(' ')}
                              </SelectItem>
                              )
                            )}
                            </SelectContent>
                          </Select>
                          ) : column.headerName === 'Proximity' ? (
                          <Select
                            value={
                            editedData[column.field] &&
                            (getOptions(column.headerName)
                              ?? ['5', '10', '50', '100']
                            ).includes(editedData[column.field])
                              ? editedData[column.field]
                              : undefined
                            }
                            key="Select a max value"
                            onValueChange={(value) => handleInputChange(column.field, value)}
                          >
                           <SelectTrigger>
                            <SelectValue placeholder={`Select ${column.headerName}`} />

                          </SelectTrigger>
                          <SelectContent>
                            {(getOptions(column.headerName)
                              ?? ['5', '10', '50', '100']
                            ).map((option, idx) => (
                              <SelectItem key={idx} value={option}>
                              {option}
                              </SelectItem>
                            ))}
                            </SelectContent>
                          </Select>
                            ) : column.headerName === 'Active' ? (
                            <Switch
                              checked={!!editedData[column.field]}
                              onChange={(checked) => handleInputChange(column.field, checked)}
                              className={`${
                              editedData[column.field] ? '!bg-green-500' : '!bg-red-500'
                              }`}
                            />
                            ) : column.headerName === 'Include Cover Letter' ? (
                            <Switch
                              checked={!!editedData[column.field]}
                              onChange={(checked) => handleInputChange(column.field, checked)}
                              className={`${
                              editedData[column.field] ? '!bg-green-500' : '!bg-red-500'
                              }`}
                            />
                            ) : column.headerName === 'Include Criteria' ? (
                            <Switch
                              checked={!!editedData[column.field]}
                              onChange={(checked) => handleInputChange(column.field, checked)}
                              className={`${
                              editedData[column.field] ? '!bg-green-500' : '!bg-red-500'
                              }`}
                            />
                            ) : column.type === "select" ? (
  <Select
    value={editedData[column.field]}
    onValueChange={(value) => handleInputChange(column.field, value)}
  >
    <SelectTrigger>
      <SelectValue placeholder={`Select ${column.headerName}`} />
    </SelectTrigger>
   <SelectTrigger>
                            <SelectValue placeholder={`Select ${column.headerName}`} />

                          </SelectTrigger>
                          <SelectContent>
      {column.options?.map((option: string, idx: number) => (
        <SelectItem key={idx} value={option}>
          {option}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
) : column.type === "multiSelect" ? (
  // Note: This assumes you customize Select to support multi-select or replace this with checkboxes
  <div className="flex flex-col gap-1">
    {column.options?.map((option: string, idx: number) => (
      <label key={idx} className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={editedData[column.field]?.includes(option)}
          onChange={(e) => {
            const values = editedData[column.field] || [];
            const newValues = e.target.checked
              ? [...values, option]
              : values.filter((val: string) => val !== option);
            handleInputChange(column.field, newValues);
          }}
        />
        {option}
      </label>
    ))}
  </div>
) : column.type === "number" ? (
  <Input
    type="number"
    className="w-full p-2"
    value={editedData[column.field]}
    onChange={(e) => handleInputChange(column.field, e.target.value)}
  />
) : column.type === "Pay_Min" || column.type === "Salary_Min" ? (
  <Select
    value={
      minOptions.includes(editedData[column.field])
        ? editedData[column.field]
        : undefined
    }
    onValueChange={(value) => handleInputChange(column.field, value)}
  >
    <SelectTrigger>
      <SelectValue placeholder="Select a min value" />
    </SelectTrigger>
   <SelectTrigger>
                            <SelectValue placeholder={`Select ${column.headerName}`} />

                          </SelectTrigger>
                          <SelectContent>
      {minOptions.map((option, idx) => (
        <SelectItem key={idx} value={option}>
          {option}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
) : column.type === "Pay_Max" || column.type === "Salary_Max" ? (
  <Select
    value={
      maxOptions.includes(editedData[column.field])
        ? editedData[column.field]
        : undefined
    }
    onValueChange={(value) => handleInputChange(column.field, value)}
  >
    <SelectTrigger>
      <SelectValue placeholder="Select a max value" />
    </SelectTrigger>
   <SelectTrigger>
                            <SelectValue placeholder={`Select ${column.headerName}`} />

                          </SelectTrigger>
                          <SelectContent>
      {maxOptions.map((option, idx) => (
        <SelectItem key={idx} value={option}>
          {option}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
) : (
  <Input
    spellCheck
    placeholder={column.type}
    className="w-full p-2 bg-gray-50 rounded-lg border border-gray-300"
    value={editedData[column.field]}
    onChange={(e) => handleInputChange(column.field, e.target.value)}
  />
   )}
                    </div>
                  ))}
         
         
          </div>
          <div className="flex justify-between items-center mt-8">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-6 py-2 rounded-lg text-white transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-opacity-50 ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-career-blue-800 hover:bg-career-blue-900 focus:ring-career-blue-500'
              }`}
              disabled={isAssistant ? isValidMapping : loading}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </AppModal>

      );
};

export default EditRowModal;
