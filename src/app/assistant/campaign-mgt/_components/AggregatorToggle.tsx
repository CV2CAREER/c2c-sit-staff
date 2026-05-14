"use client"
import { useAdminMutations } from '@/hooks/api/admin.api';
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

interface AggregatorProps {
    clientId: number;
}

const EXTERNAL_AGGREGATORS = ['Randstad', 'MichaelPage'];

const AggregatorToggle = ({ clientId }: AggregatorProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [internalJobSites, setInternalJobSites] = useState<any[]>([]);
    const [externalJobSites, setExternalJobSites] = useState<any[]>([]);
    const { getAggregatorsByUserMutation, toggleCampaignAggregatorMutation } = useAdminMutations();

    const fetchAggregators = async () => {
        try {
            setIsLoading(true);
            const result = await getAggregatorsByUserMutation.mutateAsync({ userId: clientId });
            if (result.success) {
                const list = result.data?.aggregators ?? [];
                const mapped = list.map((item: any) => ({
                    name: item.aggregator.name,
                    status: item.isEnabled ?? item.aggregator.isEnabled,
                    picture: item.aggregator.picture?.fileUrl ?? '',
                }));
                setInternalJobSites(mapped.filter((s: any) => !EXTERNAL_AGGREGATORS.includes(s.name)));
                setExternalJobSites(mapped.filter((s: any) => EXTERNAL_AGGREGATORS.includes(s.name)));
            }
        } catch {
        } finally {
            setIsLoading(false);
        }
    };

    const aggSwitch = async (site: any, type: string) => {
        const toastId = toast.loading(`Toggling ${site.name}...`);
        try {
            const result = await toggleCampaignAggregatorMutation.mutateAsync({
                clientId: clientId.toString(),
                jobSite: site.name,
            });
            toast.dismiss(toastId);
            if (result.success) {
                toast.success(result.message);
                const updater = (prev: any[]) =>
                    prev.map(s => s.name === site.name ? { ...s, status: !s.status } : s);
                if (type === 'internal') setInternalJobSites(updater);
                else setExternalJobSites(updater);
            } else {
                toast.error(result.message || `Failed to toggle ${site.name}`);
            }
        } catch (error: any) {
            toast.dismiss(toastId);
            toast.error(error.message || `Failed to toggle ${site.name}`);
        }
    };

    useEffect(() => {
        if (clientId) fetchAggregators();
    }, [clientId]);

    return (
        <div className="relative inline-block text-left z-10 w-full">
            <button
                type="button"
                className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-3 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue transition-all"
                id="options-menu"
                aria-haspopup="true"
                aria-expanded={isOpen}
                onClick={() => setIsOpen(!isOpen)}
            >
                Manage Job Aggregators
                <svg
                    className="-mr-1 ml-2 h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                >
                    <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                    />
                </svg>
            </button>

            {isOpen && (
                <div
                    className="origin-top-right absolute right-0 mt-2 w-full rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 transition-opacity ease-out duration-200"
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="options-menu"
                >
                    <div className="py-1" role="none">
                        <p className="px-3 py-2 text-xs text-gray-500">
                            Toggle job sites to enable or disable the Aggregator
                        </p>
                    </div>

                    <div className="py-1" role="none">
                        <p className="block px-3 py-2 text-sm font-semibold text-gray-700">Internal:</p>
                        {isLoading ? (
                            <p className="text-gray-500 text-sm px-3 py-2">Loading...</p>
                        ) : internalJobSites.length === 0 ? (
                            <p className="text-sm text-gray-500 px-3 py-2">No internal aggregators found</p>
                        ) : (
                            internalJobSites.map((site: any) => (
                                <div key={site.name} className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded-md">
                                    <div className="flex items-center gap-2">
                                        {site.picture && (
                                            <img src={site.picture} alt={site.name} className="w-5 h-5 object-contain rounded" />
                                        )}
                                        <span className="text-sm font-medium text-gray-800">{site.name}</span>
                                    </div>
                                    <div
                                        className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${site.status ? 'bg-green-500' : 'bg-gray-300'}`}
                                        role="switch"
                                        aria-checked={site.status}
                                        tabIndex={0}
                                        onClick={() => aggSwitch(site, 'internal')}
                                    >
                                        <span
                                            aria-hidden="true"
                                            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${site.status ? 'translate-x-5' : 'translate-x-0'}`}
                                        />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="py-1" role="none">
                        <p className="block px-3 py-2 text-sm font-semibold text-gray-700">External:</p>
                        {isLoading ? (
                            <p className="text-gray-500 text-sm px-3 py-2">Loading...</p>
                        ) : externalJobSites.length === 0 ? (
                            <p className="text-sm text-gray-500 px-3 py-2">No external aggregators found</p>
                        ) : (
                            externalJobSites.map((site: any) => (
                                <div key={site.name} className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded-md">
                                    <div className="flex items-center gap-2">
                                        {site.picture && (
                                            <img src={site.picture} alt={site.name} className="w-5 h-5 object-contain rounded" />
                                        )}
                                        <span className="text-sm font-medium text-gray-800">{site.name}</span>
                                    </div>
                                    <div
                                        className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${site.status ? 'bg-green-500' : 'bg-gray-300'}`}
                                        role="switch"
                                        aria-checked={site.status}
                                        tabIndex={0}
                                        onClick={() => aggSwitch(site, 'external')}
                                    >
                                        <span
                                            aria-hidden="true"
                                            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${site.status ? 'translate-x-5' : 'translate-x-0'}`}
                                        />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AggregatorToggle;
