"use client";

import React, { useState } from "react";
import { Dialog } from "@headlessui/react";
import { useBulkUploadReferrals } from "@/hooks/usePartnerDashboard";
import { useDropzone } from "react-dropzone";
import { utils, read } from "xlsx";
import toast from "react-hot-toast";

interface BulkReferralRow {
  "first name": string;
  "middle name"?: string;
  "last name": string;
  "phone number": string;
  email: string;
}

interface SendBulkReferralsDialogProps {
  onSuccess?: () => void;
}

export default function SendBulkReferralsDialog({ onSuccess }: SendBulkReferralsDialogProps) {
  const [open, setOpen] = useState(false);
  const [validRows, setValidRows] = useState<BulkReferralRow[]>([]);
  const [fileUploaded, setFileUploaded] = useState(false);
  const { mutate: bulkUpload, isPending } = useBulkUploadReferrals();

  const normalizeHeaders = (row: Record<string, any>): BulkReferralRow => ({
    "first name": row["first name"] || row["First name"] || row["FIRST NAME"] || "",
    "middle name": row["middle name"] || row["Middle name"] || row["MIDDLE NAME"] || "",
    "last name": row["last name"] || row["Last name"] || row["LAST NAME"] || "",
    "phone number": row["phone number"] || row["Phone Number"] || row["PHONE NUMBER"] || "",
    email: row["email"] || row["Email"] || row["EMAIL"] || "",
  });

  const validateExcelRows = (rows: BulkReferralRow[]): BulkReferralRow[] => {
    const valid: BulkReferralRow[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    rows.forEach((raw) => {
      const row = normalizeHeaders(raw);
      row["phone number"] = row["phone number"].toString().startsWith("+")
        ? row["phone number"].toString()
        : "+" + row["phone number"];

      if (
        row["first name"]?.trim() &&
        row["last name"]?.trim() &&
        row["middle name"]?.trim() &&
        emailRegex.test(row.email) &&
        row["phone number"]?.length >= 4
      ) {
        valid.push(row);
      }
    });

    return valid;
  };

  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const data = new Uint8Array(e.target.result);
      const workbook = read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows: BulkReferralRow[] = utils.sheet_to_json<BulkReferralRow>(sheet);

      if (rows.length === 0) {
        toast.error("The file is empty or invalid");
        return;
      }

      const valid = validateExcelRows(rows);
      if (valid.length !== rows.length) {
        toast(`${rows.length - valid.length} row(s) removed due to invalid data`);
      }
      setValidRows(valid);
      setFileUploaded(true);
    };
    reader.readAsArrayBuffer(file);
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    multiple: false,
  });

  const handleSendBulk = () => {
    if (validRows.length === 0) {
      toast.error("No valid rows to upload");
      return;
    }

    const referrals = validRows.map((r) => ({
      firstName: r["first name"],
      lastName: r["last name"],
      middleName: r["middle name"] || "",
      email: r.email,
      phoneNumber: r["phone number"],
    }));

    bulkUpload(referrals, {
      onSuccess: () => {
        setOpen(false);
        setFileUploaded(false);
        setValidRows([]);
        onSuccess?.();
      },
    });
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-[#008ED3] text-white px-4 py-2 rounded-md font-medium"
      >
        Send Bulk Referrals
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} className="fixed z-50 inset-0">
        <div className="flex items-center justify-center min-h-screen bg-black/30 p-4">
          <Dialog.Panel className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-black">Send Bulk Referrals</h2>

            {!fileUploaded ? (
              <div
                {...getRootProps()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-[#008ED3] transition"
              >
                <input {...getInputProps()} />
                <p className="text-gray-500">
                  Upload a spreadsheet with the headers: first name, last name, middle name, email, phone number
                </p>
                <p className="text-sm text-gray-400 mt-2">(phone numbers should begin with country code)</p>
                <button
                  type="button"
                  className="mt-4 bg-[#008ED3] text-white px-6 py-2 rounded-md text-sm"
                >
                  Upload file
                </button>
              </div>
            ) : (
              <div>
                <div className="overflow-x-auto max-h-64 overflow-y-auto border rounded-md">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3">First Name</th>
                        <th className="px-4 py-3">Middle Name</th>
                        <th className="px-4 py-3">Last Name</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Phone</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validRows.map((row, idx) => (
                        <tr key={idx} className="bg-white border-b">
                          <td className="px-4 py-3">{row["first name"]}</td>
                          <td className="px-4 py-3">{row["middle name"]}</td>
                          <td className="px-4 py-3">{row["last name"]}</td>
                          <td className="px-4 py-3">{row.email}</td>
                          <td className="px-4 py-3">{row["phone number"]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-sm text-gray-500 mt-2">{validRows.length} valid row(s)</p>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => {
                      setFileUploaded(false);
                      setValidRows([]);
                    }}
                    className="border border-gray-300 text-gray-600 px-4 py-2 rounded-md text-sm"
                  >
                    Upload Another
                  </button>
                  <button
                    onClick={handleSendBulk}
                    disabled={isPending}
                    className="bg-[#008ED3] text-white px-6 py-2 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPending ? "Uploading..." : "Send Bulk Referrals"}
                  </button>
                </div>
              </div>
            )}
          </Dialog.Panel>
        </div>
      </Dialog>
    </>
  );
}
