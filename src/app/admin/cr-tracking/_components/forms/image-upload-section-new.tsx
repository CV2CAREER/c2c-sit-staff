"use client"
import { useState, useEffect } from 'react';
import useDrivePicker from 'react-google-drive-picker';

interface ImageUploadSectionProps {
    stateType: 'current' | 'future';
    handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>, stateType: 'current' | 'future') => void;
    handleCloudUpload: (service: string, stateType: 'current' | 'future') => void;
    handleUrlUpload: (stateType: 'current' | 'future') => void;
    urlInput: string;
    setUrlInput: (url: string) => void;
    isAddingUrl: boolean;
    imageURLs: string[];
    isUploading: boolean;
    handleGoogleDriveUpload: (files: any[], stateType: "current" | "future") => Promise<void>;
    handleFileDelete: (url: string)=>Promise<void>;
    setImageUrls: (urls: string[])=>void;
}

const ImageUploadSectionUpdated: React.FC<ImageUploadSectionProps> = ({
    stateType,
    handleFileUpload,
    handleCloudUpload,
    handleUrlUpload,
    urlInput,
    setUrlInput,
    isAddingUrl,
    imageURLs,
    isUploading,
    handleGoogleDriveUpload,
    handleFileDelete,
    setImageUrls
}) => {
    const [openPicker] = useDrivePicker();
    const [isGoogleApiLoaded, setIsGoogleApiLoaded] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    useEffect(() => {
        const loadGoogleApi = () => {
            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.onload = () => {
                (window as any).gapi.load('picker', () => {
                    setIsGoogleApiLoaded(true);
                });
            };
            document.body.appendChild(script);
        };

        loadGoogleApi();
    }, []);

    const handleOpenPicker = () => {
        if (!isGoogleApiLoaded) {
            return;
        }
        
        openPicker({
            clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID2 as string,
            developerKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY as string,
            viewId: "DOCS_IMAGES",
            showUploadView: true,
            showUploadFolders: true,
            supportDrives: true,
            multiselect: true,
            callbackFunction: (data:any) => {
                if (data.action === 'picked') {
                    handleGoogleDriveUpload(data.docs, stateType);
                }
            },
        });
    };

    const ImagePreview = ({url}: {url: string}) =>{
        const [isLoading, setIsLoading] = useState(false)
        async function onDelete(){
            try{
                await handleFileDelete(url)
                setImageUrls(imageURLs.filter(u=>u !== url))
            }catch{
               // setImageUrls(imageURLs.filter(u=>u !== url))
            }finally{
                setIsLoading(false)
            }
        }    
        // Check if the URL contains 'loom.com'
        if (url.includes('loom.com')) return (
            <div className='relative inline-block w-40 h-40 rounded-md p-0 mx-2 my-2'> 
                <a href={url} target="_blank" rel="noopener noreferrer">
                    <img width="64" height="64" src="https://img.icons8.com/nolan/64/video.png" alt="video"/>
                </a>
            
                <div 
                    className={`absolute cursor-pointer -top-4 -left-4 p-2 rounded-full w-10 h-10 max-w-10 max-h-10 bg-red-500`}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (!isLoading) onDelete();
                    }}
        
                    >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                        <path fill="white" d="M7.616 20q-.672 0-1.144-.472T6 18.385V6H5V5h4v-.77h6V5h4v1h-1v12.385q0 .69-.462 1.153T16.384 20zM17 6H7v12.385q0 .269.173.442t.443.173h8.769q.23 0 .423-.192t.192-.424zM9.808 17h1V8h-1zm3.384 0h1V8h-1zM7 6v13z"/>
                    </svg>
                </div>
            </div>
        );

        // console.log({url})
        // Default rendering for other URLs

        return (
            <div className='relative inline-block w-40 h-40 rounded-md p-0 mx-2 my-2'  onClick={() => setPreviewImage(url)} > 
                <img src={url} alt='' className='w-full h-full bg-cover rounded-md relative' style={{width: '100%', aspectRatio: 1}} />
                <div 
                className={`absolute -top-4 -left-4 p-2 rounded-full w-10 h-10 max-w-10 max-h-10 bg-red-500 ${isLoading && 'animate-ping'} hover:cursor-pointer`}
                // onClick={async()=>{
                //     !isLoading && onDelete()
                // }}
                onClick={(e) => {
                    e.stopPropagation();
                    if (!isLoading) onDelete();
                }}

                >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="white" d="M7.616 20q-.672 0-1.144-.472T6 18.385V6H5V5h4v-.77h6V5h4v1h-1v12.385q0 .69-.462 1.153T16.384 20zM17 6H7v12.385q0 .269.173.442t.443.173h8.769q.23 0 .423-.192t.192-.424zM9.808 17h1V8h-1zm3.384 0h1V8h-1zM7 6v13z"/></svg>
                </div>
            </div>
        )
    } 

    return (
        <>
            <div className="flex flex-wrap gap-2">
                <label
                    htmlFor={`${stateType}-state-files`}
                    className={`cursor-pointer bg-career-blue-50 hover:bg-career-blue-100 text-career-blue-800 font-semibold py-2 px-4 rounded-lg border border-career-blue-300 transition duration-200 ease-in-out flex items-center ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {isUploading ? (
                        <svg className="animate-spin w-5 h-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                    )}
                    {isUploading ? 'Uploading...' : 'Upload Images'}
                </label>
                <input
                    spellCheck={true}
                    type="file"
                    id={`${stateType}-state-files`}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, stateType)}
                    multiple
                    disabled={isUploading}
                />
                <button
                    onClick={handleOpenPicker}
                    className="bg-gray-50 hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 rounded-lg border border-gray-300 transition duration-200 ease-in-out flex items-center"
                >
                    <CloudServiceIcon service="google-drive" />
                    Google Drive
                </button>
                {['onedrive', 'dropbox'].map((service) => (
                    <div key={service} className="relative group">
                        <button
                            onClick={() => service === 'google-drive' ? handleCloudUpload(service, stateType) : null}
                            className={`bg-gray-50 hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 rounded-lg border border-gray-300 transition duration-200 ease-in-out flex items-center ${service !== 'google-drive' ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={service !== 'google-drive'}
                        >
                            <CloudServiceIcon service={service} />
                            {service.charAt(0).toUpperCase() + service.slice(1)}
                        </button>
                        {service !== 'google-drive' && (
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                                <div className="bg-gray-800 text-white text-xs rounded-lg py-3 px-4 relative whitespace-nowrap">
                                    Coming soon
                                    <svg className="absolute text-gray-800 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255" xmlSpace="preserve">
                                        <polygon className="fill-current" points="0,0 127.5,127.5 255,0" />
                                    </svg>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            <div className="flex items-center space-x-2 mt-2">
                <input
                    spellCheck={true}
                    type="text"
                    placeholder="Insert image URL"
                    className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-0 focus:ring-career-blue-500 focus:border-career-blue-500 transition duration-200 ease-in-out"
                    onChange={(e) => setUrlInput(e.target.value)}
                    value={urlInput}
                    disabled={isAddingUrl}
                />
                <button
                    onClick={() => handleUrlUpload(stateType)}
                    disabled={isAddingUrl || !urlInput.trim()}
                    className={`
                    bg-career-blue-800 hover:bg-career-blue-900 text-white font-semibold 
                    py-2 px-4 rounded-lg transition duration-200 ease-in-out
                    focus:outline-none focus:ring-0 focus:ring-career-blue-500 focus:ring-opacity-50
                    ${(isAddingUrl || !urlInput.trim()) ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                >
                    {isAddingUrl ? (
                        <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Adding...
                        </span>
                    ) : 'Add URL'}
                </button>
            </div>
            {imageURLs.length > 0 && (
                <div className="mt-2 bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Uploaded images:</p>
                    {/* <ul className="space-y-1"> */}
                    <div className='pt-4' >
                        
                    {imageURLs.map((url, index) => {

                    return <ImagePreview key={index} url={url} />;
})}

                    </div>
                    {/* </ul> */}
                </div>
            )}
             {previewImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center" onClick={() => setPreviewImage(null)}>
          <div className="bg-white p-4 rounded-lg shadow-lg max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <img src={previewImage} alt="Preview" className="w-full h-auto rounded-lg" />
            <button className="mt-4 text-red-500" onClick={() => setPreviewImage(null)}>Close</button>
          </div>
        </div>
      )}
        </>
    )
}


const CloudServiceIcon: React.FC<{ service: string }> = ({ service }) => {
    switch (service) {
        case 'google-drive':
            return (
                <svg className="w-5 h-5 mr-2" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                    <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da" />
                    <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47" />
                    <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335" />
                    <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d" />
                    <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc" />
                    <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00" />
                </svg>
            );
        case 'onedrive':
            return (
                <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="#2378d4" fill-rule="evenodd" d="M21.692 13.987a2.733 2.733 0 0 1 .602 5.232h-13.7a3.166 3.166 0 1 1 .281-6.321 3.963 3.963 0 0 1 7.482-2.05 3.454 3.454 0 0 1 5.336 3.138M8.187 12.209a3.873 3.873 0 0 0-3.44 3.843c0 .81.252 1.563.681 2.186h-2.15a3.279 3.279 0 0 1-.237-6.549 3.692 3.692 0 0 1 5.668-3.86 5.103 5.103 0 0 1 9.648 1.757l-.109-.003c-.568 0-1.125.115-1.64.337a4.64 4.64 0 0 0-3.778-1.929 4.67 4.67 0 0 0-4.643 4.218" /></svg>
            );
        case 'dropbox':
            return (
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 2l6 3.75L6 9.5 0 5.75 6 2zm12 0l6 3.75-6 3.75-6-3.75L18 2zM0 13.25L6 9.5l6 3.75L6 17l-6-3.75zM18 9.5l6 3.75L18 17l-6-3.75 6-3.75zM6 18.25l6-3.75 6 3.75L12 22l-6-3.75z" fill="#0061FF" />
                </svg>
            );
        default:
            return null;
    }
};

export default ImageUploadSectionUpdated;