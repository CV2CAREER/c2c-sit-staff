"use client"
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Download, CheckCircle2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import axiosInstance from "@/services/api-client";
import { SERVER_URI } from "@/constants/env";


interface DocumentActionsProps {
  document_: any;
  allDocuments: any[]
  actions: ("download" | "default" | "keywords" | "role-titles" | "activate")[];
}

export default function DocumentTableActions({
  document_,
  allDocuments,
  actions,
}: DocumentActionsProps) {
  const queryClient = useQueryClient();
  const [activeDialog, setActiveDialog] = useState<
    "download" | "default" | "keywords" | "role-titles" | "activate" | null
  >(null);

  const handleDownloadDocs = async (documentId: string) => {
    toast.loading("Downloading document")

    const target = allDocuments.find(
    (dt: any) =>
        dt._id === documentId || dt.id === documentId
    );

    if (!target) {
        toast.dismiss();
        toast.error("Document not found");
        // console.error(`Document with ID ${documentId} not found in allDocuments`);
        return;
    }

    // `document` may be an array (admin uploads) or a single object (client
    // uploads). The stored storage identifier is `cloudFilename` on admin
    // uploads and `publicId` on client uploads.
    const doc0 = Array.isArray(target?.document) ? target.document[0] : target?.document;
    const name = doc0?.filename ?? doc0?.name ?? target?.filename ?? target?.name;
    const cloudFilename =
        doc0?.cloudFilename ?? doc0?.publicId ?? target?.cloudFilename ?? target?.publicId;

    if (!name || !cloudFilename) {
        toast.dismiss();
        toast.error("Document information is incomplete");
        return;
    }

    // Always mint a FRESH signed URL server-side. URLs persisted on the
    // document die once the Firebase signing key rotates (SignatureDoesNotMatch).
    const filePath = cloudFilename;

    try {
        const res = await axiosInstance.get(`${SERVER_URI}/api/v1/admin/documents/get-signed-url?filePath=${encodeURIComponent(filePath)}&filename=${encodeURIComponent(name)}`);

        const url = res?.data?.data?.url ?? res?.data?.url;
        if (!url) {
            throw new Error("No download URL received from server");
        }

        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', name);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (err: any) {
        toast.dismiss();
        
        // Check if it's a 404 error (file not found)
        if (err?.response?.status === 404) {
            toast.error("File not found in cloud storage. It may have been deleted.");

        } else {
            const errorMessage = err?.response?.data?.error || err?.message || "Failed to download document";
            toast.error(errorMessage);
        }
        throw err; // Re-throw to trigger mutation onError
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const approveUserDocumentAction = useMutation({
    mutationFn: (userId: string) => {
      toast.loading("Approving document...");
      return axiosInstance.patch(`${SERVER_URI}/api/v1/admin/users/approve-document?id=${userId}`);
    },
    onSuccess: (data) => {
      const successMessage = data.data.message || "Document approved for user";
      toast.success(successMessage);
      queryClient.invalidateQueries({ queryKey: ["users", "active"] });
    },
    onError: (error: any) => {
      const errorMessage = error.response.data?.message || "Could not approve user document";
      toast.error(errorMessage);
    }
  })

  const downloadDocumentAction = useMutation({
    mutationFn: (documentId: string) => {
        return handleDownloadDocs(documentId)
    },
    onSuccess: () => {
      toast.dismiss();
      toast.success("Document downloaded successfully");
    },
    onError: () => {
      toast.dismiss();
      toast.error("Could not download document");
    },
  });

  const activateUploadAction = useMutation({
    mutationFn: (target: { id: string; recordType: string }) => {
      toast.loading("Activating document...");
      const url =
        target.recordType === "supportDocument"
          ? `${SERVER_URI}/api/v1/admin/client-support-documents/${target.id}/activate`
          : `${SERVER_URI}/api/v1/uploads/${target.id}/activate`;
      return axiosInstance.patch(url);
    },
    onSuccess: () => {
      toast.dismiss();
      toast.success("Document activated");
      queryClient.invalidateQueries({ queryKey: ["admin-user-documents", document_.userId] });
      queryClient.invalidateQueries({ queryKey: ["client-support-documents"] });
    },
    onError: (error: any) => {
      toast.dismiss();
      const errorMessage = error?.response?.data?.message || "Could not activate document";
      toast.error(errorMessage);
    },
  });
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const restoreUserAction = useMutation({
    mutationFn: (userId: string) => {
      toast.loading("Restoring user...");
      return axiosInstance.patch(`${SERVER_URI}/api/v1/admin/users?id=${userId}`, {
        isDeleted: false,
      });
    },
    onSuccess: () => {
      toast.success("User has been restored to active users table");
      queryClient.invalidateQueries({ queryKey: ["users", "active"] });
      queryClient.invalidateQueries({ queryKey: ["users", "recycle"] });
    },
    onError: () => {
      toast.error("Could not restore user");
    },
  });
    
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const deleteUserAction = useMutation({
    mutationFn: (userId: string) => {
      toast.loading("Deleting user permanently...");
      return axiosInstance.delete(`${SERVER_URI}/api/v1/admin/users?id=${userId}`);
    },
    onSuccess: () => {
      toast.success("User has been delete permanently.");
      queryClient.invalidateQueries({ queryKey: ["users", "recycle"] });
    },
    onError: () => {
      toast.error("Could not delete user.");
    },
  });
  
  /* ---- Render ---- */
  return (
    <Dialog
      open={activeDialog !== null}
      onOpenChange={() => setActiveDialog(null)}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          
          {actions.map((action) => {
            switch (action) {
              case "download":
                return (
                  <DropdownMenuItem
                    onClick={() => downloadDocumentAction.mutate(document_.id)}
                    key="download"
                  >
                    <Download />
                    <span>Download Resume</span>
                  </DropdownMenuItem>
                );
              case "activate":
                // Only admin-generated, not-yet-active documents offer this —
                // client uploads and already-active documents don't need it.
                // Covers both Upload rows and ClientSupportDocument rows
                // (isActive must be a real boolean on either).
                if (
                  typeof document_.isActive !== "boolean" ||
                  document_.source !== "admin" ||
                  document_.isActive
                )
                  return null;
                return (
                  <DropdownMenuItem
                    onClick={() => setActiveDialog("activate")}
                    key="activate"
                  >
                    <CheckCircle2 />
                    <span>Activate</span>
                  </DropdownMenuItem>
                );
            //   case "default":
            //     return (
            //       <DropdownMenuItem
            //         onClick={() => setActiveDialog("default")}
            //         key="default"
            //       >
            //         <Home />
            //         <span>Default</span>
            //       </DropdownMenuItem>
            //     );
            //   case "keywords":
            //     return (
            //       <DropdownMenuItem
            //         onClick={() => setActiveDialog("keywords")}
            //         key="keywords"
            //       >
            //         <IoDocument/>
            //         <span>Keywords</span>
            //       </DropdownMenuItem>
            //     );
            //   case "role-titles":
            //     return (
            //       <DropdownMenuItem
            //         onClick={() => setActiveDialog("role-titles")}
            //         key="role-titles"
            //       >
            //         <IoDocument/>
            //         <span>Role Titles</span>
            //       </DropdownMenuItem>
            //     );
              default:
                return null;
            }
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {activeDialog === "download" && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              Proceed to download {document_.filename}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => {
                downloadDocumentAction.mutate(document_.id);
                setActiveDialog(null);
              }}
            >
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      )}

      {activeDialog === "activate" && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activate this document?</DialogTitle>
            <DialogDescription>
              {document_.fileName} was generated by an admin and is currently
              inactive. Activating it makes it live for the client.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              className="bg-[#0D9F6E] hover:bg-[#0b8a5f]"
              onClick={() => {
                activateUploadAction.mutate({
                  id: document_.id,
                  recordType: document_.recordType,
                });
                setActiveDialog(null);
              }}
            >
              Activate
            </Button>
          </DialogFooter>
        </DialogContent>
      )}

      {/* {activeDialog === "keywords" && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              Proceed to generate keywords from {document.filename} 
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => {
                restoreUserAction.mutate(document.id);
                setActiveDialog(null);
              }}
            >
              Generate Keywords
            </Button>
          </DialogFooter>
        </DialogContent>
      )} */}

      {/* {activeDialog === "role-titles" && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              Proceed to generate keywords from {document.filename} 
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={() => {
                deleteUserAction.mutate(document.id);
                setActiveDialog(null);
              }}
            >
              Generate role titles
            </Button>
          </DialogFooter>
        </DialogContent>
      )} */}

      {/* {activeDialog === "default" && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              Proceed to make {document.filename} default resume
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => {
                approveUserDocumentAction.mutate(document.id);
                setActiveDialog(null);
              }}
            >
              Make Default
            </Button>
          </DialogFooter>
        </DialogContent>
      )} */}
    </Dialog>
  );
}
