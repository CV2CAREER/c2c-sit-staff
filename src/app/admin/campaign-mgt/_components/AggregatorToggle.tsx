"use client"
import { ClientTableInformationEnum } from '@/types/enum';
import { useAdminMutations } from '@/hooks/api/admin.api';
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

interface AggregatorProps {
    MySQLClientId: number;
}

const AggregatorToggle = ({ MySQLClientId } : AggregatorProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isApplicationsLoading, setIsApplicationsLoading] = useState(true);
    const [internalJobSites, setInternalJobSites] = useState<any[]>([]);
    const [externalJobSites, setExternalJobSites] = useState<any[]>([]);
    const { campaignApplicationsCountMutation, toggleCampaignAggregatorMutation } = useAdminMutations();

    const filterValues = [
        {
        value: ClientTableInformationEnum.Seek,
        label: 'Seek',
        },
        {
        value: ClientTableInformationEnum.SeekStage,
        label: 'Seek Stage',
        },
        {
        value: ClientTableInformationEnum.Adecco,
        label: 'Adecco',
        },
        {
        value: ClientTableInformationEnum.AdeccoStage,
        label: 'Adecco Stage',
        },
        {
        value: ClientTableInformationEnum.Jobserve,
        label: 'Jobserve',
        },
        {
        value: ClientTableInformationEnum.JobserveStage,
        label: 'Jobserve Stage',
        },
        {
        value: ClientTableInformationEnum.Indeed,
        label: 'Indeed',
        },
        {
        value: ClientTableInformationEnum.Linkedin,
        label: 'Linkedin',
        },
        {
        value: ClientTableInformationEnum.Monster,
        label: 'Monster',
        },
        {
        value: ClientTableInformationEnum.Jora,
        label: 'Jora',
        },
        {
        value: ClientTableInformationEnum.JoraStage,
        label: 'Jora Stage',
        },
        {
        value: ClientTableInformationEnum.Reed,
        label: 'Reed',
        },
        {
        value: ClientTableInformationEnum.ReedStage,
        label: 'Reed Stage',
        },
        {
        value: ClientTableInformationEnum.WorkforceAustralia,
        label: 'Workforce Australia',
        },
        {
        value: ClientTableInformationEnum.EscapeCity,
        label: 'Escape The City',
        },
        {
        value: ClientTableInformationEnum.Adzuna,
        label: 'Adzuna',
        },
        {
        value: ClientTableInformationEnum.AdzunaStage,
        label: 'Adzuna Stage',
        },
        {
        value: ClientTableInformationEnum.MichaelPage,
        label: 'MichaelPage',
        },
        {
        value: ClientTableInformationEnum.MichaelPageStage,
        label: 'MichaelPage Stage',
        },
        {
        value: ClientTableInformationEnum.Randstad,
        label: 'Randstad',
        },
        {
        value: ClientTableInformationEnum.RandstadStage,
        label: 'Randstad Stage',
        },
        {
        value: ClientTableInformationEnum.CareerOne,
        label: 'CareerOne',
        },
        {
        value: ClientTableInformationEnum.CareerOneStage,
        label: 'CareerOne Stage',
        },
        {
        value: ClientTableInformationEnum.NHSJobs,
        label: 'NHS Jobs',
        },
        {
        value: ClientTableInformationEnum.JobBank,
        label: 'JobBank',
        },  
        {
        value: ClientTableInformationEnum.JobBankStage,
        label: 'JobBank Stage',
        },
    ].sort((a, b) => a.label?.localeCompare(b.label));

    const internalJobSites_ = filterValues.filter(
        (item) => item.value !== ClientTableInformationEnum.Randstad && item.value !== ClientTableInformationEnum.MichaelPage && item.value !== ClientTableInformationEnum.All
    );

    const externalJobSites_ = filterValues.filter(
        (item) => item.value === ClientTableInformationEnum.Randstad || item.value === ClientTableInformationEnum.MichaelPage
    );
    
    const fetchApplicationCounts = async () => {
        try {
        setIsApplicationsLoading(true);
        const result = await campaignApplicationsCountMutation.mutateAsync({
            MySQLClientId,
            internalJobSites_,
            externalJobSites_,
        });

        if (result.success) {
            setInternalJobSites(result.data.internal || []);
            setExternalJobSites(result.data.external || []);
        } else {
            setInternalJobSites([]);
            setExternalJobSites([]);
        }
        } catch {
        } finally {
            setIsApplicationsLoading(false);
        }
    };

    // Simulate data loading
    useEffect(() => {
        const timer = setTimeout(() => {
        setIsApplicationsLoading(false);
        }, 1500); // Simulate 1.5 seconds loading time
        return () => clearTimeout(timer);
    }, []);

    // Function to handle toggling the status of a job aggregator
    const aggSwitch = async (siteName: any, type: string) => {
        toast.loading(`Toggling aggregator ${siteName}...`);

        try {
            const result = await toggleCampaignAggregatorMutation.mutateAsync({
                MySQLClientId: MySQLClientId,
                jobSite: siteName.toLowerCase(),
            });

            if (result.success) {
                toast.success(result.message);

                if (type === 'internal') {
                    setInternalJobSites(prevSites =>
                        prevSites.map(site =>
                        site.name === siteName ? { ...site, status: !site.status } : site
                        )
                    );
                } else if (type === 'external') {
                    setExternalJobSites(prevSites =>
                        prevSites.map(site =>
                        site.name === siteName ? { ...site, status: !site.status } : site
                        )
                    );
                }
            } else {
                toast.error(result.message || `Failed to update aggregator ${siteName}`);
            }
        } catch (error: any) {
            toast.error(error.message || `Failed to update aggregator ${siteName}`);
        }
    };

    useEffect(() => {
        if (MySQLClientId) {
            fetchApplicationCounts();
        }
    }, [MySQLClientId]);

    // Render a single job site item within the dropdown
    const renderJobSiteItem = (site: any, type: string) => (
        <div key={site.name} className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded-md">
        <span className="text-sm font-medium text-gray-800">{site.name}</span>
        {/* Toggle Switch */}
        <div
            className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
            ${site.status ? 'bg-green-500' : 'bg-gray-300'}`}
            role="switch"
            aria-checked={site.status}
            tabIndex={0}
            onClick={() => aggSwitch(site.name, type)}
        >
            <span
            aria-hidden="true"
            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200
                ${site.status ? 'translate-x-5' : 'translate-x-0'}`}
            ></span>
        </div>
        </div>
    );

    return (
        <div className="relative inline-block text-left z-10 w-full">
        {/* Dropdown Toggle Button */}
        <button
            type="button"
            className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-3 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue transition-all"
            id="options-menu"
            aria-haspopup="true"
            aria-expanded={isOpen}
            onClick={() => setIsOpen(!isOpen)}
        >
            Manage Job Aggregators
            {/* Dropdown Arrow Icon */}
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

        {/* Dropdown Panel */}
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
                {isApplicationsLoading ? (
                <p className="text-gray-500 text-sm px-3 py-2">Loading internal sites...</p>
                ) : internalJobSites.length === 0 ? (
                <p className="text-sm text-gray-500 px-3 py-2">No internal applications found</p>
                ) : (
                internalJobSites.map(site => renderJobSiteItem(site, 'internal'))
                )}
            </div>

            <div className="py-1" role="none">
                <p className="block px-3 py-2 text-sm font-semibold text-gray-700">External:</p>
                {isApplicationsLoading ? (
                <p className="text-gray-500 text-sm px-3 py-2">Loading external sites...</p>
                ) : externalJobSites.length === 0 ? (
                <p className="text-sm text-gray-500 px-3 py-2">No external applications found</p>
                ) : (
                externalJobSites.map(site => renderJobSiteItem(site, 'external'))
                )}
            </div>
            </div>
        )}
        </div>
    );
}

export default  AggregatorToggle