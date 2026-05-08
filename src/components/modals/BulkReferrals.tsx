import CustomButton from '../CustomButton/CustomButton';
import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { parsePhoneNumber } from 'libphonenumber-js';
import { utils, read } from 'xlsx';
import Icon from '../Icons';
import { ButtonProperties } from '@/lib/helpers';
import { generatePartnerCode } from '@/utils/helperFns';

type RowData = {
  'first name': string;
  'middle name'?: string;
  'last name': string;
  'phone number': string;
  email: string;
};

type ValidationResult = {
  valid: RowData[];
  invalid: RowData[];
};

const BulkReferral = ({
  onClose,
  referralLink,
  isBusinessPromo,
}: {
  onClose: Function;
  referralLink?: string;
  isBusinessPromo?: any;
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [validRows, setValidRows] = useState<RowData[]>([]);
  const [spreadsheetAdded, setSpreadSheetAdded] = useState(false);
  const fileInputRef = useRef(null);

  const handleButtonClick = () => {
    // @ts-ignore
    fileInputRef.current?.click(); // Programmatically click the hidden file input
  };

  const normalizeHeaders = (row: Record<string, any>): RowData => {
    return {
      'first name': row['first name'] || row['First name'] || row['FIRST NAME'] || '',
      'middle name': row['middle name'] || row['Middle name'] || row['MIDDLE NAME'] || '',
      'last name': row['last name'] || row['Last name'] || row['LAST NAME'] || '',
      'phone number': row['phone number'] || row['Phone Number'] || row['PHONE NUMBER'] || '',
      email: row['email'] || row['Email'] || row['EMAIL'] || '',
    };
  };

  const validateExcelRows = (rows: RowData[]): ValidationResult => {
    const valid: RowData[] = [];
    const invalid: RowData[] = [];

    const isValidEmail = (email: string): boolean => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };

    rows.forEach((raw) => {
      const row = normalizeHeaders(raw);
      row['phone number'] = row['phone number'].toString().startsWith('+')
        ? row['phone number'].toString()
        : '+' + row['phone number'];
      const {
        'first name': firstName,
        'middle name': middleName,
        'last name': lastName,
        'phone number': phoneNumber,
        email,
      } = row;
      const isFirstNameValid = typeof firstName === 'string' && firstName.trim() !== '';
      const isLastNameValid = typeof lastName === 'string' && lastName.trim() !== '';
      const isMiddleNameValid = typeof middleName === 'string' && middleName.trim() !== '';
      const isNumberValid = parsePhoneNumber(phoneNumber).isValid();
      const isEmailValid = isValidEmail(email);

      if (
        isFirstNameValid &&
        isLastNameValid &&
        isMiddleNameValid &&
        isNumberValid &&
        isEmailValid
      ) {
        valid.push(row);
      } else {
        invalid.push(row);
      }
    });

    return { valid, invalid };
  };

  const validateHeaders = (headers: string[]): boolean => {
    const requiredHeaders = ['first name', 'last name', 'middle name', 'phone number', 'email'];
    const changedHeaders = headers.map((header) => header.trim().toLowerCase());
    return requiredHeaders.every((required) => changedHeaders.includes(required));
  };

  const handleFileChange = (event: any) => {
    setLoading(true);
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();

      reader.onload = (e: any) => {
        const data = new Uint8Array(e.target.result as ArrayBuffer); // Read file as binary
        const workbook = read(data, { type: 'array' });

        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Convert sheet to JSON
        const rows: RowData[] = utils.sheet_to_json<RowData>(sheet);

        if (rows.length === 0) {
          toast.error('The file is empty or invalid');
          setLoading(false);
          return;
        }

        // Extract headers from the first row
        const headers = Object.keys(rows[0]);
        if (!validateHeaders(headers)) {
          toast.error('The uploaded file is missing required headers or is invalid.');
          setLoading(false);
          return;
        }

        const { valid, invalid } = validateExcelRows(rows);

        setValidRows(valid);
        setSpreadSheetAdded(true);

        if (invalid.length > 0) {
          toast(`Removed ${invalid.length} rows due to invalid data`);
        }
        setTimeout(() => {
          setLoading(false);
        }, 1500);
      };

      reader.readAsArrayBuffer(file);
    }
  };

  const sendBulk = async (type: string) => {
    setLoading(true);

    try {
      toast.success(`${validRows.length} referral(s) would be sent via ${type} (API removed)`);
      onClose(false);
    } catch (error: any) {
      console.error(error);
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white  rounded-[8px] p-12">
      <div className="flex justify-end">
        <Icon name="close" className="cursor-pointer" onClick={() => onClose(false)} />
      </div>
      <span className="!font-medium font-sharp-grotesk text-career-black-200 mobile:text-32 text-[24px] my-2">
        {isBusinessPromo ? ' Send Bulk Promotional Referrals' : ' Send Bulk Referrals'}
      </span>

      {loading ? (
        <>
          <div role="status" className="w-full flex justify-center">
            <svg
              aria-hidden="true"
              className="w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600"
              viewBox="0 0 100 101"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                fill="currentColor"
              />
              <path
                d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                fill="currentFill"
              />
            </svg>
            <span className="sr-only">Loading...</span>
          </div>
        </>
      ) : (
        <>
          {!spreadsheetAdded ? (
            <div className="w-full flex flex-col items-center">
              <p className="text-gray-500 text-center">
                Upload a spreadsheet with the headers: first name, last name, middle name, email,
                phone number (phone numbers should begin with country code).
              </p>
              <CustomButton
                customClass="!h-[2.75rem] !w-[150px] !rounded-[0.25rem] mt-6"
                handleClick={() => handleButtonClick()}
                size={ButtonProperties.SIZES.small}
                title="Upload file"
                type="submit"
                variant={ButtonProperties.VARIANT.primary.name}
              />
              {/* upload spreadsheet  */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>
          ) : (
            <>
              <div>
                <div className="relative overflow-x-auto">
                  <table className="w-full text-sm text-left rtl:text-right">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                      <tr>
                        <th scope="col" className="px-8 py-3">
                          First Name
                        </th>
                        <th scope="col" className="px-8 py-3">
                          Middle name
                        </th>
                        <th scope="col" className="px-8 py-3">
                          Last Name
                        </th>
                        <th scope="col" className="px-8 py-3">
                          email
                        </th>
                        <th scope="col" className="px-8 py-3">
                          Phone number
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {validRows.map((row, id) => (
                        <tr key={id} className="bg-white border-b">
                          <td className="px-8 py-4">{row['first name']}</td>
                          <td className="px-8 py-4">{row['middle name']}</td>
                          <td className="px-8 py-4">{row['last name']}</td>
                          <td className="px-8 py-4">{row.email}</td>
                          <td className="px-8 py-4">{row['phone number']}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-col items-center gap-2 md:flex-row">
                  <CustomButton
                    customClass="!h-[2.75rem] !w-[150px] !rounded-[0.25rem] mt-6"
                    handleClick={() => sendBulk('email')}
                    size={ButtonProperties.SIZES.small}
                    title="Send email"
                    type="submit"
                    isSubmitting={loading}
                    isDisabled={loading}
                    variant={ButtonProperties.VARIANT.primary.name}
                  />
                  <CustomButton
                    customClass="!h-[2.75rem] !w-[150px] !rounded-[0.25rem] mt-6"
                    handleClick={() => sendBulk('sms')}
                    size={ButtonProperties.SIZES.small}
                    title="Send sms"
                    type="submit"
                    isSubmitting={loading}
                    isDisabled={true}
                    variant={ButtonProperties.VARIANT.primary.name}
                  />
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default BulkReferral;
