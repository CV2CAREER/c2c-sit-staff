import moment from 'moment';

export function modifyEOTArray(modifiedArr: any[]) {
  modifiedArr = modifiedArr.filter(
    (el) =>
      el.field !== '_id' &&
      el.field !== 'isDeleted' &&
      el.field !== '__v' &&
      el.headerName !== 'Nominated Developer' &&
      el.headerName !== 'Last Updated By',
  );

  const numberOfHours = modifiedArr.findIndex((el) => el.field === 'numberOfHours');
  const numberOfHoursColumn = modifiedArr[numberOfHours];
  modifiedArr[numberOfHours] = {
    ...numberOfHoursColumn,
    field: 'numberOfHours',
    headerName: 'Hours',
    width: 150,
    headerClassName: 'bg-[#80D7FF]',
    renderCell: (params: any) => params?.value || null,
  };

  const nilIndex = modifiedArr.findIndex((el) => el.field === 'NIL');

  const nilColumn = modifiedArr[nilIndex];
  modifiedArr[nilIndex] = {
    ...nilColumn,
    field: 'NIL',
    headerName: 'Next in Line',
    width: 150,
    headerClassName: 'bg-[#80D7FF]',
    renderCell: (params: any) => params?.value?.name || null,
  };

  const developerIndex = modifiedArr.findIndex((el) => el.field === 'developer');

  const developerColumn = modifiedArr[developerIndex];
  modifiedArr[developerIndex] = {
    ...developerColumn,
    field: 'developer',
    headerName: 'Developer',
    width: 150,
    headerClassName: 'bg-[#80D7FF]',
    renderCell: (params: any) => params.value?.name || null,
  };

  const durationIndex = modifiedArr.findIndex((el) => el.field === 'duration');
  const durationColumn = modifiedArr[durationIndex];
  modifiedArr[durationIndex] = {
    ...durationColumn,
    field: 'duration',
    headerName: 'Duration',
    width: 150,
    headerClassName: 'bg-[#80D7FF]',
    renderCell: (params: any) =>
      `${moment(params.value.start).format('MMMM Do, h:mm a')} - ${moment(params.value.end).format('MMMM Do, h:mm a')}` ||
      null,
  };

  const CRIndex = modifiedArr.findIndex((el) => el.field === 'CR');
  const CRColumn = modifiedArr[CRIndex];
  modifiedArr[0] = {
    ...CRColumn,
    field: 'CR',
    headerName: 'CR ID',
    width: 150,
    headerClassName: 'bg-[#80D7FF]',
    renderCell: (params: any) => params.value?.id || null,
  };

  return modifiedArr;
}
