/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import { useState, useMemo } from "react"
import toast from 'react-hot-toast';
import CustomTable from "../GenerateAQComponents/CustomTable";
import { changeDateFormat } from "@/utils/helperFns";
import { useAdminQueries, useAdminMutations } from "@/hooks/api/admin.api";

interface Prop{
    doc: any
    refetchData: Function
    close: Function
}

export const ViewDocRevamps = (prop: Prop) =>{
    const {doc, refetchData, close} = prop
    const docId = doc?._id
    const [approveLoading, setApproveLoading] = useState(false)
    const [approving, setApproving] = useState<string | null>()

    const { cvRevampDomain } = useAdminQueries({ fetchCvRevamp: true, docId });
    const { cvRevampMutation, fileUploadMutation, reviewDocumentPostMutation, adminUpdateClientDocumentsMutation } = useAdminMutations();

    const data = cvRevampDomain?.data || [];
    const docsData: any = useMemo(() => data, [data]);

    const handleAcceptRevamp = async(id: string, url: string) =>{
        if(!url)return
        const tId = toast.loading('Accepting document')
        try{
            setApproveLoading(true)
            setApproving(id)
            const builtFile = await buildFile(url)
            const formData = new FormData()
            // @ts-ignore
            formData.append('resume', builtFile)
            const userId = doc.userId?._id || doc.userId

            const uploadRes = await fileUploadMutation.mutateAsync(formData);
            const documentPayload = uploadRes?.data || uploadRes;

            await Promise.all([
               reviewDocumentPostMutation.mutateAsync({ uid: userId, files: documentPayload }),
               cvRevampMutation.mutateAsync({ cvId: id, action: 'approve' }),
               adminUpdateClientDocumentsMutation.mutateAsync({ id, body: {status: 'Approved'} })
            ]);

            setApproveLoading(false)
            setApproving(null)
            toast.success(`${doc.type || 'Document'} approved successfully.`, {id: tId})

            await refetchData()
            close()

        }catch{
          setApproveLoading(false);
          setApproving(null);
          toast.error('An error occurred while approving the document', {id: tId});
          close()
        }
    }

    const columns = [
        {
            Header: 'Variant',
            accessor: 'fileName',
            Cell: (props: any)=>{
                return <a rel='noreferrer' className="text-light-blue-900" href={props.row.original.url} target="_blank" >{props.row.original.fileName || 'file'}</a>
            }
          },
          {
            Header: 'Created At',
            accessor: 'createdAt',
            Cell: (props: any) => {
              return (
                <div className="">{changeDateFormat(props.row.original.updatedAt, 'DD/MM/YYYY')}</div>
              );
            },
          },
          {
            Header: 'Type',
            accessor: 'sourceFile.type'
          },
          {
            Header: 'Status',
            accessor: 'status',
          },
          {
            Header: 'Approve',
            accessor: 'approveDocument',
            Cell: (props: any) => {
                return (
                    <button
                    onClick={async()=>{
                        await handleAcceptRevamp(props.row.original._id, props.row.original.url)
                    }}
                    disabled={approveLoading && approving == props.row.original._id}
                    className={`${approveLoading && approving == props.row.original._id?"bg-gray-300":"bg-blue-500"} rounded-sm p-2 text-white`}>Approve</button>
                )
            },
          }
    ]

    async function buildFile(url: string) {
      try {
          const response = await fetch(url);
  
          // Ensure response is successful
          if (!response.ok) {
              throw new Error(`HTTP error! Status: ${response.status}`);
          }
  
          const blob = await response.blob(); // Fetch the file blob
  
          // Extract the file extension from the blob type
          const mimeType = blob.type; // e.g., "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          const fileExtension = mimeType.split('/')[1]; // Get the extension (e.g., "pdf", "docx")
          const validExtension = fileExtension.includes("msword") 
              ? "docx" 
              : fileExtension; // Handle special cases like "vnd.openxmlformats-officedocument..."
  
          // Generate a unique file name with extension
          const fileName = `resume-revamp-${Math.floor(Math.random() * 10 ** 4)}.${validExtension}`;
  
          // Create a new File object
          const file = new File([blob], fileName, { type: blob.type });
  
          return file;
      } catch {
          // console.error('Error:', error);
          return undefined; // Return undefined on failure
      }
  }
  
      


    return <div className="bg-white w-[100%] m-2 mobile:w-[34rem] rounded-[8px] relative p-6" >
            <h3> Document Revamps</h3>
            <div>
                <CustomTable 
                columns={columns}
                tdClass="p-2"
                thClass="bg-career-blue-200 p-4"
                tHeadClass="whitespace-nowrap"
                data={docsData}
                />
            </div>
    </div>
}