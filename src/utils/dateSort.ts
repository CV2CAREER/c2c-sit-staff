/* eslint-disable @typescript-eslint/no-unused-vars */
import moment from 'moment';

interface DateComparator {
    (v1: string, v2: string): number | undefined;
}

interface DateComparator {
    (v1: string, v2: string): number | undefined;
}

interface DateSortComparatorFactory {
    (): DateComparator;
}

const dateSortComparator: DateSortComparatorFactory = (): DateComparator => (v1: string, v2: string): number | undefined => {
    const parseDate = (dateStr: string): number => {
        if (dateStr.includes(", ")) {
            const [day, month, year, time] = dateStr.split(/[-, ]+/);
            const [hours, minutes, seconds] = time.split(":");
            return new Date(
                parseInt(year, 10),
                parseInt(month, 10) - 1, // Months are zero-based in JavaScript
                parseInt(day, 10),
                parseInt(hours, 10),
                parseInt(minutes, 10),
                parseInt(seconds, 10)
            ).getTime();
        }
        return Date.parse(dateStr);
    };

    try {
        const d1: number = parseDate(v1);
        const d2: number = parseDate(v2);
        return d1 - d2; // Ascending order
    } catch  {
        return undefined;
    }
};


//Date Examples
//1. 2024/08/29
//2. 29-08-2024, 10:08:04
//“YYYY-MM-DDTHH:mm:ss.sssZ”
export const applyDateSort = (data: any[], otherDateFields: string[] = []) =>{
  // console.log('applying date sort', {data})
  //09-01-2025, 20:01:14
  const formats = [
    "YYYY/MM/DD", 
    "DD-MM-YYYY, HH:mm:ss", 
    "DD MMM YYYY", // Handle "10 July 2023"
    "YYYY-MM-DDTHH:mm:ss.SSSSSS", // Handle "2024-05-24T11:42:17.751000"
    "YYYY-MM-DDTHH:mm:ss.SSSZ", 
    'DD-MM-YYYY',
    'MM-DD-YYYY',
    "DD-MM-YYYY HH:mm:ss", 
  ];
  

  const dateFields = ['createdAt', 'updatedAt', 'timestamp', ...otherDateFields]

  const res = data?.map(d=>{
    let sortComparator;
    try{
      // console.log({dateFields, field: d.field})
      if(dateFields.includes(d.field)){
        
        const f1_regex = /^[0-9]{4}\/[0-9]{2}\/[0-9]{2}$/;
        const f2_regex = /^[0-9]{2}\-[0-9]{2}\-[0-9]{4}, [0-9]{2}:[0-9]{2}:[0-9]{2}$/;
        const f3_regex = /^[0-9]{2} [A-Za-z]+ [0-9]{4}$/;


        // console.log(`${d.field} is to be sorted.`);
        sortComparator = function (a: string | undefined, b: string | undefined): number {
          // Handle undefined values
          if (a === undefined || b === undefined) {
            if (a === undefined && b === undefined) {
              return 0; // Both are undefined, considered equal
            }
            return a === undefined ? 1 : -1; // Undefined values are considered "greater" for sorting
          }

          if(f2_regex.test(a)){
            a = normalizeDateString(a)
          }

          if(f2_regex.test(b)){
            b = normalizeDateString(b)
          }
        
          // Parse and verify date format
          const parsedA = moment(a, formats, true); // Strict parsing with all formats
          const parsedB = moment(b, formats, true); // Correctly use `b` here
        
          // console.log(`${a} is valid: ${parsedA.isValid()}`, '/n', `${b} is valid: ${parsedB.isValid()}`);
        
          if (parsedA.isValid() && parsedB.isValid()) {
            const timeA = parsedA.toDate().getTime();
            const timeB = parsedB.toDate().getTime();
            // console.log(`Comparing: ${a} (${timeA}) with ${b} (${timeB})`);
            return timeA - timeB; // Correctly sort based on timestamp
          }
        
          // If neither is valid, consider them equal
          return 0;
        };
        
      }
    }catch{
      sortComparator = undefined
    }
    return sortComparator? {...d, sortComparator}: d
  })

  // console.log({res})
  return res

}

const build_utc = (a: string)=>{

// Split the date and time
const [a_date_str, a_time_str] = a.split(', ');

// Extract day, month, and year
const [a_dd, a_mm, a_yyyy] = a_date_str.split('-');

// Extract hours, minutes, and seconds
const [a_hr, a_min, a_sec] = a_time_str.split(':');

// Normalize seconds
const totalSeconds = parseInt(a_sec, 10);
const normalizedMinutes = Math.floor(totalSeconds / 60); // Extract extra minutes from seconds
const normalizedSeconds = totalSeconds % 60; // Remaining seconds

// Normalize minutes
const totalMinutes = parseInt(a_min, 10) + normalizedMinutes;
const normalizedHours = Math.floor(totalMinutes / 60); // Extract extra hours from minutes
const normalizedMinutesFinal = totalMinutes % 60; // Remaining minutes

// Update hours
const normalizedHoursFinal = parseInt(a_hr, 10) + normalizedHours;

// Construct a valid date string
const isoString = `${a_yyyy}-${a_mm}-${a_dd}T${String(normalizedHoursFinal).padStart(2, '0')}:${String(normalizedMinutesFinal).padStart(2, '0')}:${String(normalizedSeconds).padStart(2, '0')}Z`;

// Create UTC timestamp
const a_utc = new Date(isoString).getTime();
  return a_utc
}

function normalizeDateString(dateString: string) {
  // Split the date string into date and time components
  const [datePart, timePart] = dateString.split(", ");
  
  // Further split the time into hours, minutes, and seconds
  let [hours, minutes, seconds] = timePart.split(":").map(Number);

  // Normalize the seconds
  const extraMinutes = Math.floor(seconds / 60);
  seconds = seconds % 60;

  // Add extra minutes to the minutes value
  minutes += extraMinutes;

  // Normalize the minutes if they exceed 60
  const extraHours = Math.floor(minutes / 60);
  minutes = minutes % 60;

  // Add extra hours to the hours value
  hours += extraHours;

  // Format hours, minutes, and seconds to ensure two digits
  const normalizedTime = [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    String(seconds).padStart(2, "0"),
  ].join(":");

  // Return the normalized date string
  return `${datePart}, ${normalizedTime}`;
}

export default dateSortComparator;