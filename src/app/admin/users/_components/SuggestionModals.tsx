"use client"
import Icon from "../../../../../public/icons"
import AppModal from "@/components/modals/AppModal"
// import { useState } from "react"

export const SuggestedKeywordsModal = ({ isOpen, setIsOpen, keywords = [] }: { isOpen: boolean, setIsOpen: (value: boolean) => void, keywords: any[] }) => {
    // console.log(keywords)
    return (
        <>
            <AppModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                contentClassName="w-[95vw] max-w-4xl max-h-[85vh] overflow-auto"
            >
                <div className="w-full rounded-3xl whitespace-nowrap">
                    <div className="min-w-full flex-shrink-0">
                        <div className="flex justify-between rounded-xl mb-6 sticky top-0 z-10 bg-[#FAFAFA] p-4 items-center left-0 right-0">
                            <div className="flex items-center">
                                <button
                                    onClick={() => { }}
                                    className="bg-[#EDFFFF] flex py-1 px-2 space-x-1 md:space-x-2 md:px-3 md:py-2 text-sm md:text-base rounded-md items-center"
                                >
                                    <Icon name="refresh" /> <span>Refresh</span>
                                </button>
                            </div>
                            <div>
                                <span className="text-gray-600 text-sm md:text-base">Total:</span> {keywords.length}
                            </div>
                            <div>
                                <span className="text-sm md:text-base font-semibold text-career-blue-800">
                                    Keywords
                                </span>
                            </div>
                        </div>
                        {/* Header */}
                        <div className="bg-[#F3F3F3] border-b border-gray-300 py-3 px-4 text-gray-700 font-semibold">
                            <div className="flex justify-between">
                                <div className="xl:w-1/3 w-2/5 break-words cursor-pointer" onClick={() => null}>
                                    <div className="flex items-center space-x-3">
                                        <p>Long</p>
                                        <Icon name="filter" />
                                    </div>
                                    <small>(Actual Word)</small>
                                </div>
                                <div className="xl:w-1/3 w-2/5 ms-4 cursor-pointer" onClick={() => null}>
                                    <div className="flex items-center space-x-3">
                                        <p>Short</p>
                                        <Icon name="filter" />
                                    </div>
                                    <small>(Shortened Word)</small>
                                </div>
                                <div className="xl:w-1/3 w-1/5 text-right self-center">
                                    Action</div>
                            </div>
                        </div>
                        {keywords.length ? (
                            <div className="flex flex-col max-h-[55vh] overflow-y-auto scrollbar scrollbar-thumb-career-blue-800 scrollbar-track-gray-200 text-gray-700">
                                {/* {keywords.map((kw, index) => (
                                    TODO add the component and pass props
                                    <SingleOption
                                        checkApproved={checkApproved}
                                        checkDeclined={checkDeclined}
                                        handleApprovalChange={handleApprovalChange}
                                        short={kw.short}
                                        id={index}
                                        long={kw.long}
                                        key={kw.id}
                                        comp={'kw'}
                                    />
                                ))}*/}
                            </div> 
                        ) : (
                            <p>Loading</p>
                        )}
                    </div>
                </div>
            </AppModal>
        </>
    )
}

export const SuggestedJobTitlesModal = () => {
    return (
        <></>
    )
}


// interface ISingleOptionProps {
//     id: number;
//     short: string;
//     long: string;
//     checkApproved: (jt: any) => boolean;
//     checkDeclined: (jt: any) => boolean;
//     handleApprovalChange: (jobTitle: any, status: any) => void;
//     comp: string
// }

// const SingleOption = ({
//     id,
//     short,
//     long,
//     checkApproved,
//     checkDeclined,
//     handleApprovalChange,
//     comp
// }: ISingleOptionProps) => {
//     const [open, setOpen] = useState(true);
//     const [checked, setChecked] = useState(checkApproved(long));

//     const addSpacesToCamelCase = (text:string) => {
//         return text.replace(/([a-z])([A-Z])/g, '$1 $2');
//     };

//     return (
//         <div key={id} className="border-b border-2 border-[#F9F9F9]">
//             {/* Main Row */}
//             <div className="flex justify-between items-center py-4 px-6 text-sm xl:text-base">
//                 <div className="xl:w-1/3 w-2/5 break-words whitespace-normal pr-2">
//                     {addSpacesToCamelCase(long)}
//                 </div>
//                 <div className={`xl:w-1/3 w-2/5 ms-4 break-words whitespace-normal pr-2 ${comp === 'kw' && short === long ? "text-career-blue-800" : ""}`}>
//                     {addSpacesToCamelCase(comp === 'rt' ? short !== long ? short : '' : long || short)}
//                 </div>
//                 <div className="xl:w-1/3 w-1/5 flex justify-end">
//                     <button
//                         onClick={() => setOpen((prev) => !prev)}
//                         className={`bg-[#F5F7F9] transition-transform duration-300 ${open ? 'rotate-180' : ''
//                             } rounded-full w-8 h-8 flex items-center justify-center`}
//                     >
//                         <Icon name="caretDown" />
//                     </button>
//                 </div>
//             </div>

//             {/* Expandable Section with Smooth Transition */}
//             <div
//                 className={`overflow-hidden transition-all duration-600 ease-in-out ${open ? 'max-h-20 opacity-100 pb-2 px-6' : 'max-h-0 opacity-0'
//                     }`}
//             >
//                 <div className="flex flex-col text-xs sm:text-sm">
//                     {short !== long ? (
//                         <div className="flex space-x-4">
//                             <label className="flex w-1/3 items-center gap-2">
//                                 <input
//                                     type="radio"
//                                     name={`status-${id}`}
//                                     defaultChecked={checked}
//                                     onChange={() => {
//                                         handleApprovalChange(long, 'Approved');
//                                         setChecked(checkApproved(long));
//                                     }}
//                                     className="accent-gray-400"
//                                 />
//                                 I accept long
//                             </label>
//                             <label className="flex w-1/3 items-center gap-2">
//                                 <input
//                                     type="radio"
//                                     name={`status-${id}`}
//                                     className="accent-gray-400"
//                                     onChange={() => {
//                                         handleApprovalChange(short, 'Approved');
//                                         setChecked(long !== short && checkApproved(short));
//                                     }}
//                                 />
//                                 I accept short
//                             </label>
//                             <div className="w-1/3"></div>
//                         </div>
//                     ) : (
//                         <label className="flex w-1/3 items-center gap-2">
//                             <input
//                                 type="radio"
//                                 name={`status-${id}`}
//                                 defaultChecked={checked}
//                                 onChange={() => {
//                                     handleApprovalChange(long, 'Approved');
//                                     setChecked(checkApproved(long));
//                                 }}
//                                 className="accent-gray-400"
//                             />
//                             I accept
//                         </label>
//                     )}
//                     {/* Right Column */}
//                     <div className="mt-1">
//                         <label className="flex w-1/3 items-center gap-2">
//                             <input
//                                 type="radio"
//                                 name={`status-${id}`}
//                                 className="accent-blue-500"
//                                 onChange={() => {
//                                     handleApprovalChange(short, 'Proposed');
//                                     handleApprovalChange(long, 'Proposed');
//                                 }}
//                                 defaultChecked={
//                                     !checkApproved(short) &&
//                                     !checkApproved(long) &&
//                                     !checkDeclined(short) &&
//                                     !checkDeclined(long)
//                                 }
//                             />
//                             We propose
//                         </label>
//                         <div className="w-1/3"></div>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };