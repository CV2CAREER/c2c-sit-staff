// Create this as a new component: SubscriptionAlerts.tsx
import React from 'react';
import { AlertTriangle, XCircle, Clock } from 'lucide-react';

interface SubscriptionAlertsProps {
  campaigns: any[];
}

const SubscriptionAlerts: React.FC<SubscriptionAlertsProps> = ({ campaigns }) => {
  // Filter campaigns by expiry status
  const expiredCampaigns = campaigns.filter(
    (c) => c.SeekSubToExpireDays !== null && c.SeekSubToExpireDays <= 0
  );
  
  const criticalCampaigns = campaigns.filter(
    (c) => c.SeekSubToExpireDays > 0 && c.SeekSubToExpireDays <= 7
  );
  
  const warningSoonCampaigns = campaigns.filter(
    (c) => c.SeekSubToExpireDays > 7 && c.SeekSubToExpireDays <= 14
  );

  // Don't show if no alerts
  if (expiredCampaigns.length === 0 && criticalCampaigns.length === 0 && warningSoonCampaigns.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 space-y-3">
      {/* Expired Subscriptions */}
      {expiredCampaigns.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded-md">
          <div className="flex items-start">
            <XCircle className="h-6 w-6 text-red-600 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-900">
                {expiredCampaigns.length} Expired Subscription{expiredCampaigns.length > 1 ? 's' : ''}
              </h3>
              <div className="mt-2 text-sm text-red-800">
                <ul className="list-disc list-inside space-y-1">
                  {expiredCampaigns.slice(0, 5).map((campaign) => (
                    <li key={campaign.id}>
                      <strong>{campaign.Full_Name}</strong> - Expired {Math.abs(campaign.SeekSubToExpireDays)} day(s) ago
                    </li>
                  ))}
                  {expiredCampaigns.length > 5 && (
                    <li className="text-red-600 font-semibold">
                      + {expiredCampaigns.length - 5} more expired subscriptions
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Critical (7 days or less) */}
      {criticalCampaigns.length > 0 && (
        <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-md">
          <div className="flex items-start">
            <AlertTriangle className="h-6 w-6 text-orange-600 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-orange-900">
                {criticalCampaigns.length} Subscription{criticalCampaigns.length > 1 ? 's' : ''} Expiring in 7 Days or Less
              </h3>
              <div className="mt-2 text-sm text-orange-800">
                <ul className="list-disc list-inside space-y-1">
                  {criticalCampaigns.slice(0, 5).map((campaign) => (
                    <li key={campaign.id}>
                      <strong>{campaign.Full_Name}</strong> - {campaign.SeekSubToExpireDays} day(s) remaining
                    </li>
                  ))}
                  {criticalCampaigns.length > 5 && (
                    <li className="text-orange-600 font-semibold">
                      + {criticalCampaigns.length - 5} more critical subscriptions
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Warning (8-14 days) */}
      {warningSoonCampaigns.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
          <div className="flex items-start">
            <Clock className="h-6 w-6 text-yellow-600 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-yellow-900">
                {warningSoonCampaigns.length} Subscription{warningSoonCampaigns.length > 1 ? 's' : ''} Expiring Soon (8-14 days)
              </h3>
              <p className="mt-1 text-sm text-yellow-800">
                Monitor these subscriptions closely
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionAlerts;