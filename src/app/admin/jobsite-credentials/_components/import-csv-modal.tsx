import React, { useRef, useState } from "react";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAdminMutations } from "@/hooks/api/admin.api";
import { JobsiteCredentialCsvImportResult } from "@/types/jobsite-credential.types";

interface ImportCsvModalProps {
  onClose: () => void;
}

// One-time migration of the existing book (C2C-180). Creates no jobsite
// accounts — that stays manual SPC work.
const ImportCsvModal: React.FC<ImportCsvModalProps> = ({ onClose }) => {
  const { importJobsiteCredentialsCsv, isImportingCsv } = useAdminMutations();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<JobsiteCredentialCsvImportResult | null>(
    null,
  );

  const handleImport = () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    importJobsiteCredentialsCsv(formData, {
      onSuccess: (data: any) => {
        setResult(data?.data ?? null);
      },
    });
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Import from CSV</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          One-time migration of your existing book. The file needs
          "clientEmail" and "applicationEmail" columns. This does not create
          any jobsite accounts — the SPC still opens those by hand.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm"
        />

        {result && (
          <div className="rounded-md border p-3 text-sm">
            <p className="font-medium">
              {result.created} created, {result.skipped.length} skipped
            </p>
            {result.skipped.length > 0 && (
              <ul className="mt-2 max-h-40 overflow-y-auto list-disc pl-4 text-xs text-muted-foreground">
                {result.skipped.map((s) => (
                  <li key={s.row}>
                    Row {s.row}: {s.reason}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            {result ? "Close" : "Cancel"}
          </Button>
          {!result && (
            <Button
              onClick={handleImport}
              disabled={!file || isImportingCsv}
            >
              {isImportingCsv ? "Importing…" : "Import"}
            </Button>
          )}
        </div>
      </div>
    </DialogContent>
  );
};

export default ImportCsvModal;
