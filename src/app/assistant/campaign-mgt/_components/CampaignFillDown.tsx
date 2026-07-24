/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Input, Select as AntSelect } from 'antd';
import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import Select from 'react-select';
import { useAdminQueries } from '@/hooks/api/admin.api';
import {
  indeedConstants,
  jobserveConstants,
  escapeCityConstants,
  seekConstants,
  linkedinConstants,
  reedConstants,
  joraConstants,
  adeccoConstants,
  adzunaConstants,
  cvlibraryConstants,
} from '@/constants';

interface MasterSheetDropDownModalProps {
  ColumnValues: any;
  ColumnValue: any;
  handleFillDropDown: any;
  setColumnValue: any;
  setFillDownValues: any;
  fillDownValues: any;
}

interface SeekDropDownModalProps {
  ColumnValues: any;
  ColumnValue: any;
  handleFillDropDown: any;
  setColumnValue: any;
  setFillDownValues: any;
  fillDownValues: any;
}

interface DropDownModalProps {
  ColumnValues: any;
  ColumnValue: any;
  handleFillDropDown: any;
  setColumnValue: any;
  setFillDownValues: any;
  fillDownValues: any;
  fillCountry?: any;
}


// eslint-disable-next-line @typescript-eslint/no-unused-vars
function formatTextOption(text: string) {
  return text?.replace(/_/g, ' ').replace(/\b\w/g, (char: string) => char.toUpperCase()); // Capitalize each word
}

export const MasterSheetDropDownModal = ({
  ColumnValues,
  ColumnValue,
  handleFillDropDown,
  setColumnValue,
  setFillDownValues,
  fillDownValues,
} : MasterSheetDropDownModalProps) => {

  const [valueColumns, setColumnsValue] = useState<any[]>([])

  useEffect(() => {
    const fillDownColumns = ColumnValues
      .map((el: any) => ({ value: el.field, label: el.field }))
      .filter(
        (el: any) =>
          el.value !== 'id' &&
          el.value !== 'actions' &&
          el.value !== 'flight' &&
          el.value !== 'generate-aq' &&
          el.value !== 'CustomerId' &&
          el.value !== 'Last_Application' &&
          el.value !== 'Done' &&
          el.value !== 'Seek_Last_Application' &&
          el.value !== 'Seek_Done' &&
          el.value !== 'EscapeCity_Last_Application' &&
          el.value !== 'EscapeCity_Done' &&
          el.value !== 'WorkforceAustralia_Last_Application' &&
          el.value !== 'WorkforceAustralia_Done' &&
          el.value !== 'Indeed_Last_Application' &&
          el.value !== 'Indeed_Done' &&
          el.value !== 'Adzuna_Last_Application' &&
          el.value !== 'Adzuna_Done' &&
          el.value !== 'CareerOne_Last_Application' &&
          el.value !== 'CareerOne_Done' &&
          el.value !== 'Jobserve_Last_Application' &&
          el.value !== 'Jobserve_Done' &&
          el.value !== 'Linkedin_Last_Application' &&
          el.value !== 'Monster_Last_Application' &&
          el.value !== 'Linkedin_Done' &&
          el.value !== 'Seek_Credentials_Test_Date' &&
          el.value !== 'SeekCVLastUpdateddate' &&
          el.value !== 'Linkedin_Credentials_Test_Date' &&
          el.value !== 'Indeed_Credentials_Test_Date' &&
          el.value !== 'Jobserve_Credentials_Test_Date' &&
          el.value !== 'WorkforceAustralia_Credentials_Test_Date' &&
          el.value !== 'EscapeCity_Credentials_Test_Date' &&
          el.value !== 'Suncorp_Credentials_Test_Date' &&
          el.value !== 'Macquiare_Group_Credentials_Test_Date' &&
          el.value !== 'Fortescue_Metals_Group_Credentials_Test_Date' &&
          el.value !== 'Department_of_Planning_and_Environment_Credentials_Test_Date' &&
          el.value !== 'Aurecon_Credentials_Test_Date' &&
          el.value !== 'BHP_Credentials_Test_Date' &&
          el.value !== 'Michael_Page_Credentials_Test_Date' &&
          el.value !== 'Randstad_Credentials_Test_Date' &&
          el.value !== 'Commonwealth_Bank_Credentials_Test_Date' &&
          el.value !== 'NAB_Credentials_Test_Date' &&
          el.value !== 'Glencore_Credentials_Test_Date' &&
          el.value !== 'Onboarding_Date' &&
          el.value !== 'isActiveTriggeredByAdmin' &&
          el.value !== 'Monster_Credentials_Test_Date',
      );
    
    setColumnsValue(fillDownColumns)
  }, [valueColumns]);

  return (
    <div className="bg-white p-6 rounded-xl h-[400px] flex flex-col gap-6">
      <div>
        <h3 className="text-lg font-bold text-gray-900">Fill Column Values</h3>
        <p className="text-sm text-gray-500 mt-0.5">Apply a single value across every visible row for the column you pick.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="" className="text-xs font-semibold uppercase tracking-wide text-gray-400">Select Column</label>
        <AntSelect
          className="w-full"
          options={valueColumns}
          onChange={(value) => setColumnValue(value)}
        />
      </div>

      {ColumnValue && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="" className="text-xs font-semibold uppercase tracking-wide text-gray-400">Enter value to fill</label>
          <Input
          spellCheck={true}
            className="w-full"
            onChange={(e) => setFillDownValues({ value: e.target.value, columnName: ColumnValue })}
          />
        </div>
      )}

      <div className="w-full mt-auto flex justify-end">
        {!!Object.keys(fillDownValues).length && (
          <Button
            onClick={() => {
              handleFillDropDown(fillDownValues);
              setFillDownValues('');
            }}
          >
            Fill Column Values
          </Button>
        )}
      </div>
    </div>
  );
};

export const SeekFillDropDownModal = ({
  ColumnValues,
  ColumnValue,
  handleFillDropDown,
  setColumnValue,
  setFillDownValues,
  fillDownValues,
}: SeekDropDownModalProps) => {
  const [valueColumns, setColumnsValue] = useState<any[]>([])

  useEffect(() => {
    const fillDownColumns = ColumnValues
      .map((el: any) => (
        { value: el.field, label: el.field }
      ))
      .filter(
        (el: any) =>
          el.value !== 'id' &&
          el.value !== 'actions' &&
          el.value !== 'flight' &&
          el.value !== 'Master_Credential_Id'
      );
    
    setColumnsValue(fillDownColumns)
  }, [ColumnValues]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { adminDropdownsDomain, aggregatorLocationsDomain, countryInfoDomain } = useAdminQueries({
    fetchAdminDropdowns: true,
    fetchAggregatorLocations: ColumnValue === 'Location',
    aggregatorName: 'seek_locations',
    fetchCountryInfo: ColumnValue === 'Location',
    countryName: 'Australia',
    countryType: 'region',
  });

  // const dbOptions = adminDropdownsDomain.data || [];

  const locations = useMemo(() => {
    if (aggregatorLocationsDomain.isSuccess && countryInfoDomain.isSuccess) {
      const seekLocs = aggregatorLocationsDomain.data || [];
      const countryLocs = countryInfoDomain.data || [];
      return [...new Set([...seekLocs, ...countryLocs])];
    }
    return [];
  }, [aggregatorLocationsDomain.isSuccess, countryInfoDomain.isSuccess, aggregatorLocationsDomain.data, countryInfoDomain.data]);

  useEffect(() => {
    if (valueColumns.length > 0 && !ColumnValue) {
      setColumnValue(valueColumns[0]?.value);
    }
  }, [valueColumns, ColumnValue, setColumnValue]);

  return (
    <div className="bg-white p-4 rounded-lg h-[400px] flex flex-col gap-8">
      <div>
        <label htmlFor="">Select Column</label>
        <AntSelect
          className="w-full"
          options={valueColumns}
          onChange={(value) => setColumnValue(value)}
          defaultValue={valueColumns[0]}
        />
      </div>

      {ColumnValue && (
        <div>
          <label htmlFor="">Enter value to fill</label>
          {
            // @ts-ignore
            seekConstants[ColumnValue] !== undefined && ColumnValue === 'Country' && (
            <AntSelect
              className="w-full mt-4"
              // @ts-ignore
              options={seekConstants[ColumnValue].map((el: any) => ({
                label: el[ColumnValue],
                value: el[ColumnValue],
              }))}
              onChange={(value: any) => setFillDownValues({ value: value, columnName: ColumnValue })}
            />
          )}

          {(ColumnValue === 'Location_Exclude') && (
            <Input
            spellCheck={true}
            name={ColumnValue}
            className="w-full mt-4"
            onChange={(e: any) => setFillDownValues({ value: e.target.value, columnName: ColumnValue })}
            placeholder='Enter a Location'
             />
          )}

          {(ColumnValue === 'Location') && (
            <Select
              isMulti
              className="w-full mt-4"
              options={locations.map((el: any) => ({
                label: el,
                value: el,
              }))}
              onChange={(value: any) => setFillDownValues({ value: value, columnName: ColumnValue })}
            />
          )}

          {
            // @ts-ignore
            seekConstants[ColumnValue] !== undefined && ColumnValue === 'Keyword_Option' && (
            // @ts-ignore
            seekConstants[ColumnValue]?.length > 0 ? (
              <AntSelect
                className="w-full mt-4"
                // @ts-ignore
                options={seekConstants[ColumnValue]?.map((el: any) => ({
                  label: el.label,
                  value: el.value,
                }))}
                onChange={(value: any) => setFillDownValues({ value: value, columnName: ColumnValue })}
              />
            ) : (
              <p className="mt-4 text-gray-500">Loading options...</p>
            )
          )}

          {
            // @ts-ignore
            seekConstants[ColumnValue] !== undefined && ColumnValue === 'Active' && (
            <AntSelect
              className="w-full mt-4"
              // @ts-ignore
              options={seekConstants[ColumnValue].map((el: any) => ({
                label: el.label,
                value: el.value,
              }))}
              onChange={(value: any) => setFillDownValues({ value: value, columnName: ColumnValue })}
            />
          )}{' '}

          {
            // @ts-ignore
            seekConstants[ColumnValue] !== undefined &&
            (ColumnValue === 'Include_Cover_Letter' || ColumnValue === 'Include_Criteria') && (
            <AntSelect
              className="w-full mt-4"
              // @ts-ignore
              options={seekConstants[ColumnValue].map((el: any) => ({
                label: el.label,
                value: el.value,
              }))}
              onChange={(value: any) => setFillDownValues({ value: value, columnName: ColumnValue })}
            />
          )}

          {(ColumnValue === 'Classification' || ColumnValue === 'Classification_Exclude') && (
            <Select
              isMulti
              className="w-full mt-4"
              options={seekConstants['Classification_Name'].map((el: any) => ({
                label: el['Classification_Name'],
                value: el['Classification'],
              }))}
              onChange={(value: any) => setFillDownValues({ value: value, columnName: ColumnValue })}
            />
          )}

          {
            // @ts-ignore
            seekConstants[ColumnValue] !== undefined &&
            ColumnValue !== 'Classification' &&
            ColumnValue !== 'Location' &&
            ColumnValue !== 'Active' &&
            ColumnValue !== 'Include_Cover_Letter' &&
            ColumnValue !== 'Include_Criteria' &&
            ColumnValue !== 'Keyword_Option' &&
            ColumnValue !== 'Country' && (
              <AntSelect
                className="w-full mt-4"
                // @ts-ignore
                options={seekConstants[ColumnValue].map((el: any) => ({
                  label: el,
                  value: el,
                }))}
                onChange={(value: any) => setFillDownValues({ value: value, columnName: ColumnValue })}
              />
          )}

          {
            // @ts-ignore
            seekConstants[ColumnValue] === undefined &&
            ColumnValue !== 'Location_Exclude' &&
            ColumnValue !== 'Classification' &&
            ColumnValue !== 'Classification_Exclude' && ColumnValue !== 'Keyword_Option' && (
              <Input
              spellCheck={true}
                className="w-full mt-4"
                onChange={(e) =>
                  setFillDownValues({ value: e.target.value, columnName: ColumnValue })
                }
              />
          )}
        </div>
      )}

      <div className="w-full mt-2 flex justify-end">
        {!!Object.keys(fillDownValues).length && (
          <Button 
            onClick={() => {
              handleFillDropDown(fillDownValues);
              setFillDownValues('');
            }}
          >
            Fill Column Values
          </Button>
        )}
      </div>
    </div>
  );
};

export const JobserveFillDropDownModal = ({
  ColumnValues,
  ColumnValue,
  handleFillDropDown,
  setColumnValue,
  setFillDownValues,
  fillDownValues,
  fillCountry,
}: DropDownModalProps) => {

  const [valueColumns, setColumnsValue] = useState<any[]>([])

  useEffect(() => {
    const fillDownColumns = ColumnValues
      .map((el: any) => ({ value: el.field, label: el.field }))
      .filter(
        (el: any) =>
          el.value !== 'id' &&
          el.value !== 'actions' &&
          el.value !== 'flight' &&
          el.value !== 'Master_Credential_Id'
      );
    
    setColumnsValue(fillDownColumns)
  }, [valueColumns]);

  const { countryInfoDomain } = useAdminQueries({
    fetchCountryInfo: !!fillCountry,
    countryName: fillCountry,
    countryType: 'region',
  });

  const locations = countryInfoDomain.data || [];

  useEffect(() => {
    if (valueColumns.length > 0 && !ColumnValue) {
      setColumnValue(valueColumns[0]?.value);
    }
  }, [valueColumns, ColumnValue, setColumnValue]);

  return (
    <div className="bg-white p-4 rounded-lg h-[400px]">
      {valueColumns && (
        <AntSelect
          className="w-full"
          options={valueColumns}
          onChange={(value) => setColumnValue(value)}
          defaultValue={valueColumns[0]}
        />
      )}

      {ColumnValue === 'Location' && (
        <Select
          isMulti
          className="w-full mt-4"
          options={locations.map((el: any) => ({
            label: el,
            value: el,
          }))}
          onChange={(value) => setFillDownValues({ value: value, columnName: ColumnValue })}
        />
      )}

      {ColumnValue && (
        <div>
          {
            // @ts-ignore
            seekConstants[ColumnValue] !== undefined && ColumnValue === 'Country' && (
            <AntSelect
              className="w-full mt-4"
              // @ts-ignore
              options={seekConstants[ColumnValue].map((el: any) => ({
                label: el[ColumnValue],
                value: el[ColumnValue],
              }))}
              onChange={(value) => setFillDownValues({ value: value, columnName: ColumnValue })}
            />
          )}

          {
            // @ts-ignore
            seekConstants[ColumnValue] !== undefined && ColumnValue === 'Active' && (
            <AntSelect
              className="w-full mt-4"
              // @ts-ignore
              options={seekConstants[ColumnValue].map((el: any) => ({
                label: el.label,
                value: el.value,
              }))}
              onChange={(value) => setFillDownValues({ value: value, columnName: ColumnValue })}
            />
          )}

          {
            // @ts-ignore
            seekConstants[ColumnValue] !== undefined && ColumnValue === 'Keyword_Option' && (
            // @ts-ignore
            seekConstants[ColumnValue]?.length > 0 ? (
              <AntSelect
                className="w-full mt-4"
                // @ts-ignore
                options={seekConstants[ColumnValue]?.map((el: any) => ({
                  label: el.label,
                  value: el.value,
                }))}
                onChange={(value: any) => setFillDownValues({ value: value, columnName: ColumnValue })}
              />
            ) : (
              <p className="mt-4 text-gray-500">Loading options...</p>
            )
          )}

          { 
            // @ts-ignore
            jobserveConstants[ColumnValue] !== undefined &&
            ColumnValue !== 'Active' &&
            ColumnValue !== 'Country' && (
              <AntSelect
                className="w-full mt-4"
                // @ts-ignore
                options={jobserveConstants[ColumnValue].map((el: any) => ({
                  label: el,
                  value: el,
                }))}
                onChange={(value) => setFillDownValues({ value: value, columnName: ColumnValue })}
              />
            )
          }
          
          {
            // @ts-ignore
            jobserveConstants[ColumnValue] === undefined &&
            ColumnValue !== 'Active' &&
            ColumnValue !== 'Location' &&
            ColumnValue !== 'Country' && (
              <Input
              spellCheck={true}
                className="w-full mt-4"
                onChange={(e) =>
                  setFillDownValues({ value: e.target.value, columnName: ColumnValue })
                }
              />
            )
          }

        </div>
      )}

      <div className="w-full mt-2 flex justify-end">
        {!!Object.keys(fillDownValues).length && (
          <Button 
            onClick={() => {
              handleFillDropDown(fillDownValues);
              setFillDownValues('');
            }}
          >
            Fill Column Values
          </Button>
        )}
      </div>
    </div>
  );
};

export const AdzunaDropDownModal = ({
  ColumnValues,
  ColumnValue,
  handleFillDropDown,
  setColumnValue,
  setFillDownValues,
  fillDownValues,
  fillCountry,
}: DropDownModalProps) => {
  const [valueColumns, setColumnsValue] = useState<any[]>([])

  useEffect(() => {
    const fillDownColumns = ColumnValues
      .map((el: any) => ({ value: el.field, label: el.field }))
      .filter(
        (el: any) =>
          el.value !== 'id' &&
          el.value !== 'actions' &&
          el.value !== 'flight' &&
          el.value !== 'Master_Credential_Id'
      );
    
    setColumnsValue(fillDownColumns)
  }, [valueColumns]);

  const { aggregatorLocationsDomain, countryInfoDomain } = useAdminQueries({
    fetchAggregatorLocations: true,
    aggregatorName: 'jora_locations',
    fetchCountryInfo: !!fillCountry,
    countryName: fillCountry,
    countryType: 'region',
  });

  const locations = useMemo(() => {
    const joraLocs = aggregatorLocationsDomain.data || [];
    const countryLocs = countryInfoDomain.data || [];
    return [...new Set([...joraLocs, ...countryLocs])];
  }, [aggregatorLocationsDomain.data, countryInfoDomain.data]);

  useEffect(() => {
    if (valueColumns.length > 0 && !ColumnValue) {
      setColumnValue(valueColumns[0]?.value);
    }
  }, [valueColumns, ColumnValue, setColumnValue]);

  return (
    <div className="bg-white p-4 rounded-lg h-[400px]">
      <AntSelect
        className="w-full"
        options={valueColumns}
        onChange={(value) => setColumnValue(value)}
        defaultValue={valueColumns[0]}
      />

      {ColumnValue === 'Location' && (
        <Select
          isMulti
          className="w-full mt-4"
          options={locations.map((el: any) => ({
            label: el,
            value: el,
          }))}
          onChange={(value) => setFillDownValues({ value: value, columnName: ColumnValue })}
        />
      )}

      {ColumnValue && (
        <div>
          {
            // @ts-ignore
            seekConstants[ColumnValue] !== undefined && ColumnValue === 'Country' && (
            <AntSelect
              className="w-full mt-4"
              // @ts-ignore
              options={seekConstants[ColumnValue].map((el: any) => ({
                label: el[ColumnValue],
                value: el[ColumnValue],
              }))}
              onChange={(value) => setFillDownValues({ value: value, columnName: ColumnValue })}
            />
          )}

          { 
            // @ts-ignore
            seekConstants[ColumnValue] !== undefined && ColumnValue === 'Active' && (
            <AntSelect
              className="w-full mt-4"
              // @ts-ignore
              options={seekConstants[ColumnValue].map((el: any) => ({
                label: el.label,
                value: el.value,
              }))}
              onChange={(value) => setFillDownValues({ value: value, columnName: ColumnValue })}
            />
          )}

          {
            // @ts-ignore
            seekConstants[ColumnValue] !== undefined && ColumnValue === 'Keyword_Option'  && (
            <AntSelect
              className="w-full mt-4"
              options={
                // @ts-ignore
                seekConstants[ColumnValue].map((el: any) => ({
                label: el.label,
                value: el.value,
              }))}
              onChange={(value) => setFillDownValues({ value: value, columnName: ColumnValue })}
            />
          )}

          {
            // @ts-ignore
            adzunaConstants[ColumnValue] !== undefined &&
            ColumnValue !== 'Active' &&
            ColumnValue !== 'Country' && (
              <AntSelect
                className="w-full mt-4"
                options={
                  // @ts-ignore
                  adzunaConstants[ColumnValue].map((el: any) => ({
                  label: el,
                  value: el,
                }))}
                onChange={(value) => setFillDownValues({ value: value, columnName: ColumnValue })}
              />
            )}
          {
            // @ts-ignore
            adzunaConstants[ColumnValue] === undefined &&
            ColumnValue !== 'Active' &&
            ColumnValue !== 'Location' &&
            ColumnValue !== 'Country' &&
            ColumnValue !== 'Keyword_Option' &&  (
              <Input
              spellCheck={true}
                className="w-full mt-4"
                onChange={(e) =>
                  setFillDownValues({ value: e.target.value, columnName: ColumnValue })
                }
              />
            )}
        </div>
      )}

      <div className="w-full mt-2 flex justify-end">
        {!!Object.keys(fillDownValues).length && (
          <Button 
            onClick={() => {
              handleFillDropDown(fillDownValues);
              setFillDownValues('');
            }}
          >
            Fill Column Values
          </Button>
        )}
      </div>
    </div>
  );
};

export const JoraDropDownModal = ({
  ColumnValues,
  ColumnValue,
  handleFillDropDown,
  setColumnValue,
  setFillDownValues,
  fillDownValues,
  fillCountry,
}: DropDownModalProps) => {
  const [valueColumns, setColumnsValue] = useState<any[]>([])

  useEffect(() => {
    const fillDownColumns = ColumnValues
      .map((el: any) => ({ value: el.field, label: el.field }))
      .filter(
        (el: any) =>
          el.value !== 'id' &&
          el.value !== 'actions' &&
          el.value !== 'flight' &&
          el.value !== 'Master_Credential_Id'
      );
    
    setColumnsValue(fillDownColumns)
  }, [valueColumns]);

  const { aggregatorLocationsDomain, countryInfoDomain } = useAdminQueries({
    fetchAggregatorLocations: true,
    aggregatorName: 'jora_locations',
    fetchCountryInfo: !!fillCountry,
    countryName: fillCountry,
    countryType: 'region',
  });

  const locations = useMemo(() => {
    const joraLocs = aggregatorLocationsDomain.data || [];
    const countryLocs = countryInfoDomain.data || [];
    return [...new Set([...joraLocs, ...countryLocs])];
  }, [aggregatorLocationsDomain.data, countryInfoDomain.data]);

  useEffect(() => {
    if (valueColumns.length > 0 && !ColumnValue) {
      setColumnValue(valueColumns[0]?.value);
    }
  }, [valueColumns, ColumnValue, setColumnValue]);

  return (
    <div className="bg-white p-4 rounded-lg h-[400px]">
      <AntSelect
        className="w-full"
        options={valueColumns}
        onChange={(value) => setColumnValue(value)}
        defaultValue={valueColumns[0]}
      />

      {ColumnValue === 'Location' && (
        <Select
          isMulti
          className="w-full mt-4"
          options={locations.map((el: any) => ({
            label: el,
            value: el,
          }))}
          onChange={(value) => setFillDownValues({ value: value, columnName: ColumnValue })}
        />
      )}

      {ColumnValue && (
        <div>
          {
            // @ts-ignore
            seekConstants[ColumnValue] !== undefined && ColumnValue === 'Country' && (
            <AntSelect
              className="w-full mt-4"
              // @ts-ignore
              options={seekConstants[ColumnValue].map((el: any) => ({
                label: el[ColumnValue],
                value: el[ColumnValue],
              }))}
              onChange={(value) => setFillDownValues({ value: value, columnName: ColumnValue })}
            />
          )}

          { 
            // @ts-ignore
            seekConstants[ColumnValue] !== undefined && ColumnValue === 'Active' && (
            <AntSelect
              className="w-full mt-4"
              // @ts-ignore
              options={seekConstants[ColumnValue].map((el: any) => ({
                label: el.label,
                value: el.value,
              }))}
              onChange={(value) => setFillDownValues({ value: value, columnName: ColumnValue })}
            />
          )}

          {
            // @ts-ignore
            seekConstants[ColumnValue] !== undefined && ColumnValue === 'Keyword_Option'  && (
            <AntSelect
              className="w-full mt-4"
              options={
                // @ts-ignore
                seekConstants[ColumnValue].map((el: any) => ({
                label: el.label,
                value: el.value,
              }))}
              onChange={(value) => setFillDownValues({ value: value, columnName: ColumnValue })}
            />
          )}

          {
            // @ts-ignore
            joraConstants[ColumnValue] !== undefined &&
            ColumnValue !== 'Active' &&
            ColumnValue !== 'Country' && (
              <AntSelect
                className="w-full mt-4"
                options={
                  // @ts-ignore
                  joraConstants[ColumnValue].map((el: any) => ({
                  label: el,
                  value: el,
                }))}
                onChange={(value) => setFillDownValues({ value: value, columnName: ColumnValue })}
              />
            )}
          {
            // @ts-ignore
            joraConstants[ColumnValue] === undefined &&
            ColumnValue !== 'Active' &&
            ColumnValue !== 'Location' &&
            ColumnValue !== 'Country' &&
            ColumnValue !== 'Keyword_Option' &&  (
              <Input
              spellCheck={true}
                className="w-full mt-4"
                onChange={(e) =>
                  setFillDownValues({ value: e.target.value, columnName: ColumnValue })
                }
              />
            )}
        </div>
      )}

      <div className="w-full mt-2 flex justify-end">
        {!!Object.keys(fillDownValues).length && (
          <Button 
            onClick={() => {
              handleFillDropDown(fillDownValues);
              setFillDownValues('');
            }}
          >
            Fill Column Values
          </Button>
        )}
      </div>
    </div>
  );
};

export const ReedDropDownModal = ({
  ColumnValues,
  ColumnValue,
  handleFillDropDown,
  setColumnValue,
  setFillDownValues,
  fillDownValues,
  fillCountry,
}: DropDownModalProps) => {
  const [valueColumns, setColumnsValue] = useState<any[]>([])

  useEffect(() => {
    const fillDownColumns = ColumnValues
      .map((el: any) => ({ value: el.field, label: el.field }))
      .filter(
        (el: any) =>
          el.value !== 'id' &&
          el.value !== 'actions' &&
          el.value !== 'flight' &&
          el.value !== 'Master_Credential_Id'
      );
    
    setColumnsValue(fillDownColumns)
  }, [valueColumns]);

  const { aggregatorLocationsDomain, countryInfoDomain } = useAdminQueries({
    fetchAggregatorLocations: true,
    aggregatorName: 'reed_locations',
    fetchCountryInfo: !!fillCountry,
    countryName: fillCountry,
    countryType: 'region',
  });

  const locations = useMemo(() => {
    const reedLocs = aggregatorLocationsDomain.data || [];
    const countryLocs = countryInfoDomain.data || [];
    return [...new Set([...reedLocs, ...countryLocs])];
  }, [aggregatorLocationsDomain.data, countryInfoDomain.data]);

  useEffect(() => {
    if (valueColumns.length > 0 && !ColumnValue) {
      setColumnValue(valueColumns[0]?.value);
    }
  }, [valueColumns, ColumnValue, setColumnValue]);

  return (
    <div className="bg-white p-4 rounded-lg h-[400px]">
      <AntSelect
        className="w-full"
        options={valueColumns}
        onChange={(value) => setColumnValue(value)}
        defaultValue={valueColumns[0]}
      />

      {ColumnValue === 'Location' && (
        <Select
          isMulti
          className="w-full mt-4"
          options={locations.map((el: any) => ({
            label: el,
            value: el,
          }))}
          onChange={(value) => setFillDownValues({ value: value, columnName: ColumnValue })}
        />
      )}

      {ColumnValue && (
        <div>
          {
            // @ts-ignore
            seekConstants[ColumnValue] !== undefined && ColumnValue === 'Country' && (
            <AntSelect
              className="w-full mt-4"
              // @ts-ignore
              options={seekConstants[ColumnValue].map((el: any) => ({
                label: el[ColumnValue],
                value: el[ColumnValue],
              }))}
              onChange={(value) => setFillDownValues({ value: value, columnName: ColumnValue })}
            />
          )}

          {(ColumnValue === 'Classification' || ColumnValue === 'Classification_Exclude') && (
            <Select
              isMulti
              className="w-full mt-4"
              options={reedConstants['Classification'].map((el: any) => ({
                label: el,
                value: el,
              }))}
              onChange={(value: any) => setFillDownValues({ value: value, columnName: ColumnValue })}
            />
          )}

          {
            // @ts-ignore
            seekConstants[ColumnValue] !== undefined && ColumnValue === 'Active' && (
            <AntSelect
              className="w-full mt-4"
              // @ts-ignore
              options={seekConstants[ColumnValue].map((el: any) => ({
                label: el.label,
                value: el.value,
              }))}
              onChange={(value) => setFillDownValues({ value: value, columnName: ColumnValue })}
            />
          )}

          {
            // @ts-ignore
            reedConstants[ColumnValue] !== undefined &&
            ColumnValue !== 'Active' &&
            ColumnValue !== 'Country' && ColumnValue !== 'Classification' && ColumnValue !== 'Classification_Exclude' &&(
              <AntSelect
                className="w-full mt-4"
                // @ts-ignore
                options={reedConstants[ColumnValue].map((el: any) => ({
                  label: el,
                  value: el,
                }))}
                onChange={(value) => setFillDownValues({ value: value, columnName: ColumnValue })}
              />
          )}

          {
            // @ts-ignore
            seekConstants[ColumnValue] !== undefined && ColumnValue === 'Keyword_Option'  && (
            <AntSelect
              className="w-full mt-4"
              // @ts-ignore
              options={seekConstants[ColumnValue].map((el: any) => ({
                label: el.label,
                value: el.value,
              }))}
              onChange={(value) => setFillDownValues({ value: value, columnName: ColumnValue })}
            />
          )}

          {
            // @ts-ignore
            reedConstants[ColumnValue] === undefined &&
            ColumnValue !== 'Active' &&
            ColumnValue !== 'Location' &&
            ColumnValue !== 'Country' && ColumnValue !== 'Keyword_Option' && ColumnValue !== "Classification" && ColumnValue !== "Classification_Exclude" && (
              <Input
              spellCheck={true}
                className="w-full mt-4"
                onChange={(e) =>
                  setFillDownValues({ value: e.target.value, columnName: ColumnValue })
                }
              />
          )}
        </div>
      )}

      <div className="w-full mt-2 flex justify-end">
        {!!Object.keys(fillDownValues).length && (
          <Button 
            onClick={() => {
              handleFillDropDown(fillDownValues);
              setFillDownValues('');
            }}
          >
            Fill Column Values
          </Button>
        )}
      </div>
    </div>
  );
};

export const IndeedDropDownModal = ({
  ColumnValues,
  ColumnValue,
  handleFillDropDown,
  setColumnValue,
  setFillDownValues,
  fillDownValues,
  fillCountry,
}: DropDownModalProps) => {

  const [valueColumns, setColumnsValue] = useState<any[]>([])

  useEffect(() => {
    const fillDownColumns = ColumnValues
      .map((el: any) => ({ value: el.field, label: el.field }))
      .filter(
        (el: any) =>
          el.value !== 'id' &&
          el.value !== 'actions' &&
          el.value !== 'flight' &&
          el.value !== 'Master_Credential_Id'
      );
    
    setColumnsValue(fillDownColumns)
  }, [valueColumns]);

  const { countryInfoDomain } = useAdminQueries({
    fetchCountryInfo: !!fillCountry,
    countryName: fillCountry,
    countryType: 'region',
  });

  const locations = countryInfoDomain.data || [];

  useEffect(() => {
    if (valueColumns.length > 0 && !ColumnValue) {
      setColumnValue(valueColumns[0]?.value);
    }
  }, [valueColumns, ColumnValue, setColumnValue]);

  return (
    <div className="bg-white p-4 rounded-lg h-[400px]">
      <AntSelect
        className="w-full"
        options={valueColumns}
        onChange={(value) => setColumnValue(value)}
        defaultValue={valueColumns[0]}
      />

      {ColumnValue === 'Location' && (
        <Select
          isMulti
          className="w-full mt-4"
          options={locations.map((el: any) => ({
            label: el,
            value: el,
          }))}
          onChange={(value) => setFillDownValues({ value: value, columnName: ColumnValue })}
        />
      )}

      {
        // @ts-ignore
        seekConstants[ColumnValue] !== undefined && ColumnValue === 'Keyword_Option'  && (
        <AntSelect
          className="w-full mt-4"
          // @ts-ignore
          options={seekConstants[ColumnValue].map((el: any) => ({
            label: el.label,
            value: el.value,
          }))}
          onChange={(value) => setFillDownValues({ value: value, columnName: ColumnValue })}
        />
      )}

      {ColumnValue && (
        <div>
          { 
            // @ts-ignore
            seekConstants[ColumnValue] !== undefined && ColumnValue === 'Country' && (
            <AntSelect
              className="w-full mt-4"
              // @ts-ignore
              options={seekConstants[ColumnValue].map((el: any) => ({
                label: el[ColumnValue],
                value: el[ColumnValue],
              }))}
              onChange={(value) => setFillDownValues({ value: value, columnName: ColumnValue })}
            />
          )}
          {
            // @ts-ignore
            seekConstants[ColumnValue] !== undefined && ColumnValue === 'Active' && (
            <AntSelect
              className="w-full mt-4"
              // @ts-ignore
              options={seekConstants[ColumnValue].map((el: any) => ({
                label: el.label,
                value: el.value,
              }))}
              onChange={(value) => setFillDownValues({ value: value, columnName: ColumnValue })}
            />
          )}

          {
            // @ts-ignore
            indeedConstants[ColumnValue] !== undefined &&
            ColumnValue !== 'Active' &&
            ColumnValue !== 'Country' && (
              <AntSelect
                className="w-full mt-4"
                // @ts-ignore
                options={indeedConstants[ColumnValue].map((el: any) => ({
                  label: el,
                  value: el,
                }))}
                onChange={(value) => setFillDownValues({ value: value, columnName: ColumnValue })}
              />
            )}

          { 
            // @ts-ignore
            indeedConstants[ColumnValue] === undefined &&
            ColumnValue !== 'Active' &&
            ColumnValue !== 'Location' &&
            ColumnValue !== 'Country' && (
              <Input
              spellCheck={true}
                className="w-full mt-4"
                onChange={(e) =>
                  setFillDownValues({ value: e.target.value, columnName: ColumnValue })
                }
              />
            )}
        </div>
      )}

      <div className="w-full mt-2 flex justify-end">
        {!!Object.keys(fillDownValues).length && (
          <Button 
            onClick={() => {
              handleFillDropDown(fillDownValues);
              setFillDownValues('');
            }}
          >
            Fill Column Values
          </Button>
        )}
      </div>
    </div>
  );
};


export const LinkedinDropDownModal = ({
  ColumnValues,
  ColumnValue,
  handleFillDropDown,
  setColumnValue,
  setFillDownValues,
  fillDownValues,
  fillCountry,
}: DropDownModalProps) => {
  
  const [valueColumns, setColumnsValue] = useState<any[]>([])

  useEffect(() => {
    const fillDownColumns = ColumnValues
      .map((el: any) => ({ value: el.field, label: el.field }))
      .filter(
        (el: any) =>
          el.value !== 'id' &&
          el.value !== 'actions' &&
          el.value !== 'flight' &&
          el.value !== 'Master_Credential_Id'
      );
    
    setColumnsValue(fillDownColumns)
  }, [valueColumns]);

  const { countryInfoDomain } = useAdminQueries({
    fetchCountryInfo: !!fillCountry,
    countryName: fillCountry,
    countryType: 'region',
  });

  const locations = countryInfoDomain.data || [];

  useEffect(() => {
    if (valueColumns.length > 0 && !ColumnValue) {
      setColumnValue(valueColumns[0]?.value);
    }
  }, [valueColumns, ColumnValue, setColumnValue]);

  return (
    <div className="bg-white p-4 rounded-lg h-[400px]">
      <AntSelect
        className="w-full"
        options={valueColumns}
        onChange={(value) => setColumnValue(value)}
        defaultValue={valueColumns[0]}
      />

      {ColumnValue === 'Location' && (
        <Select
          isMulti
          className="w-full mt-4"
          options={locations.map((el: any) => ({
            label: el,
            value: el,
          }))}
          onChange={(value) => setFillDownValues({ value: value, columnName: ColumnValue })}
        />
      )}

      {ColumnValue && (
        <div>
          { 
            // @ts-ignore
            seekConstants[ColumnValue] !== undefined && ColumnValue === 'Country' && (
            <AntSelect
              className="w-full mt-4"
              // @ts-ignore
              options={seekConstants[ColumnValue].map((el: any) => ({
                label: el[ColumnValue],
                value: el[ColumnValue],
              }))}
              onChange={(value) => setFillDownValues({ value: value, columnName: ColumnValue })}
            />
          )}

          {
            // @ts-ignore
            seekConstants[ColumnValue] !== undefined && ColumnValue === 'Active' && (
            <AntSelect
              className="w-full mt-4"
              // @ts-ignore
              options={seekConstants[ColumnValue].map((el: any) => ({
                label: el.label,
                value: el.value,
              }))}
              onChange={(value) => setFillDownValues({ value: value, columnName: ColumnValue })}
            />
          )}

          {
            // @ts-ignore
            linkedinConstants[ColumnValue] !== undefined &&
            (ColumnValue == 'In_your_network' || ColumnValue == 'Under_10_applicants') && (
              <AntSelect
                className="w-full mt-4"
                // @ts-ignore
                options={linkedinConstants[ColumnValue].map((el: any) => ({
                  label: el.label,
                  value: el.value,
                }))}
                onChange={(value) => setFillDownValues({ value: value, columnName: ColumnValue })}
              />
            )}

          {
            // @ts-ignore
          linkedinConstants[ColumnValue] !== undefined &&
            ColumnValue !== 'Active' &&
            ColumnValue !== 'In_your_network' &&
            ColumnValue !== 'Keyword_Option' &&
            ColumnValue !== 'Under_10_applicants' &&
            ColumnValue !== 'Country' && (
              <AntSelect
                className="w-full mt-4"
                // @ts-ignore
                options={linkedinConstants[ColumnValue].map((el: any) => ({
                  label: el,
                  value: el,
                }))}
                onChange={(value) => setFillDownValues({ value: value, columnName: ColumnValue })}
              />
            )}

          {
            // @ts-ignore
            linkedinConstants[ColumnValue] === undefined &&
            ColumnValue !== 'Active' &&
            ColumnValue !== 'Location' &&
            ColumnValue !== 'Country' && (
              <Input
              spellCheck={true}
                className="w-full mt-4"
                onChange={(e) =>
                  setFillDownValues({ value: e.target.value, columnName: ColumnValue })
                }
              />
            )}
        </div>
      )}

      <div className="w-full mt-2 flex justify-end">
        {!!Object.keys(fillDownValues).length && (
          <Button 
            onClick={() => {
              handleFillDropDown(fillDownValues);
              setFillDownValues('');
            }}
          >
            Fill Column Values
          </Button>
        )}
      </div>
    </div>
  );
};

export const AdeccoDropDownModal = ({
  ColumnValues,
  ColumnValue,
  handleFillDropDown,
  setColumnValue,
  setFillDownValues,
  fillDownValues,
  fillCountry,
}: DropDownModalProps) => {
  const [valueColumns, setColumnsValue] = useState<any[]>([])

  useEffect(() => {
    const fillDownColumns = ColumnValues
      .map((el: any) => ({ value: el.field, label: el.field }))
      .filter(
        (el: any) =>
          el.value !== 'id' &&
          el.value !== 'actions' &&
          el.value !== 'flight' &&
          el.value !== 'Master_Credential_Id'
      );
    
    setColumnsValue(fillDownColumns)
  }, [valueColumns]);

  const { countryInfoDomain } = useAdminQueries({
    fetchCountryInfo: !!fillCountry,
    countryName: fillCountry,
    countryType: 'region',
  });

  const locations = countryInfoDomain.data || [];

  useEffect(() => {
    if (valueColumns.length > 0 && !ColumnValue) {
      setColumnValue(valueColumns[0]?.value);
    }
  }, [valueColumns, ColumnValue, setColumnValue]);

  return (
    <div className="bg-white p-4 rounded-lg h-[400px]">
      <AntSelect
        className="w-full"
        options={valueColumns}
        onChange={(value) => setColumnValue(value)}
        defaultValue={valueColumns[0]}
      />

      {ColumnValue === 'Location' && (
        <Select
          isMulti
          className="w-full mt-4"
          options={locations.map((el: any) => ({
            label: el,
            value: el,
          }))}
          onChange={(value) => setFillDownValues({ value: value, columnName: ColumnValue })}
        />
      )}

      {ColumnValue && (
        <div>
          {
            // @ts-ignore
            seekConstants[ColumnValue] !== undefined && ColumnValue === 'Country' && (
            <AntSelect
              className="w-full mt-4"
              // @ts-ignore
              options={seekConstants[ColumnValue].map((el: any) => ({
                label: el[ColumnValue],
                value: el[ColumnValue],
              }))}
              onChange={(value) => setFillDownValues({ value: value, columnName: ColumnValue })}
            />
          )}

          {
            // @ts-ignore
            seekConstants[ColumnValue] !== undefined && ColumnValue === 'Keyword_Option'  && (
            <AntSelect
              className="w-full mt-4"
              // @ts-ignore
              options={seekConstants[ColumnValue].map((el: any) => ({
                label: el.label,
                value: el.value,
              }))}
              onChange={(value) => setFillDownValues({ value: value, columnName: ColumnValue })}
            />
          )}

          {
            // @ts-ignore
            seekConstants[ColumnValue] !== undefined && ColumnValue === 'Active' && (
            <AntSelect
              className="w-full mt-4"
              // @ts-ignore
              options={seekConstants[ColumnValue].map((el: any) => ({
                label: el.label,
                value: el.value,
              }))}
              onChange={(value) => setFillDownValues({ value: value, columnName: ColumnValue })}
            />
          )}

          { 
            // @ts-ignore
            adeccoConstants[ColumnValue] !== undefined &&
            ColumnValue !== 'Active' &&
            ColumnValue !== 'Country' && (
              <AntSelect
                className="w-full mt-4"
                // @ts-ignore
                options={adeccoConstants[ColumnValue].map((el: any) => ({
                  label: el,
                  value: el,
                }))}
                onChange={(value) => setFillDownValues({ value: value, columnName: ColumnValue })}
              />
            )}

          {
            // @ts-ignore
            adeccoConstants[ColumnValue] === undefined &&
            ColumnValue !== 'Active' &&
            ColumnValue !== 'Location' &&
            ColumnValue !== 'Salary_Range' &&
            ColumnValue !== 'Contract_Type' &&
            ColumnValue !== 'Sort_By' &&
            ColumnValue !== 'Last_Updated' &&
            ColumnValue !== 'Distance' &&
            ColumnValue !== 'Country' && (
              <Input
              spellCheck={true}
                className="w-full mt-4"
                onChange={(e) =>
                  setFillDownValues({ value: e.target.value, columnName: ColumnValue })
                }
              />
            )}
        </div>
      )}

      <div className="w-full mt-2 flex justify-end">
        {!!Object.keys(fillDownValues).length && (
          <Button 
            onClick={() => {
              handleFillDropDown(fillDownValues);
              setFillDownValues('');
            }}
          >
            Fill Column Values
          </Button>
        )}
      </div>
    </div>
  );
};

export const CVLibraryDropDownModal = ({
  ColumnValues,
  ColumnValue,
  handleFillDropDown,
  setColumnValue,
  setFillDownValues,
  fillDownValues,
  fillCountry,
}: DropDownModalProps) => {
  const [valueColumns, setColumnsValue] = useState<any[]>([])

  useEffect(() => {
    const fillDownColumns = ColumnValues
      .map((el: any) => ({ value: el.field, label: el.field }))
      .filter(
        (el: any) =>
          el.value !== 'id' &&
          el.value !== 'actions' &&
          el.value !== 'flight' &&
          el.value !== 'Master_Credential_Id'
      );
    
    setColumnsValue(fillDownColumns)
  }, [valueColumns]);

  const { countryInfoDomain } = useAdminQueries({
    fetchCountryInfo: !!fillCountry,
    countryName: fillCountry,
    countryType: 'region',
  });

  const locations = countryInfoDomain.data || [];

  useEffect(() => {
    if (valueColumns.length > 0 && !ColumnValue) {
      setColumnValue(valueColumns[0]?.value);
    }
  }, [valueColumns, ColumnValue, setColumnValue]);

  return (
    <div className="bg-white p-4 rounded-lg h-[400px]">
      <AntSelect
        className="w-full"
        options={valueColumns}
        onChange={(value) => setColumnValue(value)}
        defaultValue={valueColumns[0]}
      />

      {ColumnValue === 'Location' && (
        <Select
          isMulti
          className="w-full mt-4"
          options={locations.map((el: any) => ({
            label: el,
            value: el,
          }))}
          onChange={(value) => setFillDownValues({ value: value, columnName: ColumnValue })}
        />
      )}
      {ColumnValue && (
        <div>
          {
            // @ts-ignore
            seekConstants[ColumnValue] !== undefined && ColumnValue === 'Country' && (
            <AntSelect
              className="w-full mt-4"
              // @ts-ignore
              options={seekConstants[ColumnValue].map((el: any) => ({
                label: el[ColumnValue],
                value: el[ColumnValue],
              }))}
              onChange={(value) => setFillDownValues({ value: value, columnName: ColumnValue })}
            />
          )}

          {
            // @ts-ignore
            seekConstants[ColumnValue] !== undefined && ColumnValue === 'Keyword_Option'  && (
            <AntSelect
              className="w-full mt-4"
              // @ts-ignore
              options={seekConstants[ColumnValue].map((el: any) => ({
                label: el.label,
                value: el.value,
              }))}
              onChange={(value) => setFillDownValues({ value: value, columnName: ColumnValue })}
            />
          )}

          {
            // @ts-ignore
            seekConstants[ColumnValue] !== undefined && ColumnValue === 'Active' && (
            <AntSelect
              className="w-full mt-4"
              // @ts-ignore
              options={seekConstants[ColumnValue].map((el: any) => ({
                label: el.label,
                value: el.value,
              }))}
              onChange={(value) => setFillDownValues({ value: value, columnName: ColumnValue })}
            />
          )}

          {
            // @ts-ignore
            cvlibraryConstants[ColumnValue] !== undefined &&
            ColumnValue !== 'Active' &&
            ColumnValue !== 'Country' && (
              <AntSelect
                className="w-full mt-4"
                // @ts-ignore
                options={escapeCityConstants[ColumnValue].map((el: any) => ({
                  label: el,
                  value: el,
                }))}
                onChange={(value) => setFillDownValues({ value: value, columnName: ColumnValue })}
              />
            )}

          {
            // @ts-ignore
            cvlibraryConstants[ColumnValue] === undefined &&
            ColumnValue !== 'Active' &&
            ColumnValue !== 'Location' &&
            ColumnValue !== 'Country' && (
              <Input
              spellCheck={true}
                className="w-full mt-4"
                onChange={(e) =>
                  setFillDownValues({ value: e.target.value, columnName: ColumnValue })
                }
              />
            )}
        </div>
      )}

      <div className="w-full mt-2 flex justify-end">
        {!!Object.keys(fillDownValues).length && (
          <Button 
            onClick={() => {
              handleFillDropDown(fillDownValues);
              setFillDownValues('');
            }}
          >
            Fill Column Values
          </Button>
        )}
      </div>
    </div>
  );
};