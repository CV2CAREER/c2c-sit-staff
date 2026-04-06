import moment from "moment";

interface CampaignData {
  SeekSubStartDate?: string;
  SeekSubDurDays?: string | number;
  SeekSubEndDate?: string;
  GraceDuration?: string | number | null;
  CampaignEnd?: string;
  SeekSubToExpireDays?: number;
  SeekSubExpired?: string;
  [key: string]: any;
}

/**
 * Centralized calculation logic for campaign fields.
 * Optimized for speed - uses native Date operations where possible
 */
export function calculateCampaignFields(data: CampaignData): CampaignData {
  const result = { ...data };

  // Parse start date once
  let subStartDateMoment: moment.Moment | null = null;
  if (result?.SeekSubStartDate) {
    subStartDateMoment = moment.utc(result.SeekSubStartDate, "DD-MM-YYYY");
  }

  // Calculate Subscription End Date = Start + Duration
  let subEndDateMoment: moment.Moment | null = null;
  if (subStartDateMoment && result?.SeekSubDurDays) {
    const durDays = parseInt(result.SeekSubDurDays as string, 10) || 0;
    subEndDateMoment = subStartDateMoment.clone().add(durDays, "days");
    result.SeekSubEndDate = subEndDateMoment.format("DD-MM-YYYY");
  }

  // Calculate Campaign End Date = Sub End + Grace
  let campaignEndMoment: moment.Moment | null = null;
  if (subEndDateMoment && result?.GraceDuration !== null && result?.GraceDuration !== undefined) {
    const grace = parseInt(result.GraceDuration as string, 10) || 0;
    campaignEndMoment = subEndDateMoment.clone().add(grace, "days");
    result.CampaignEnd = campaignEndMoment.format("DD-MM-YYYY");
  }

  // Calculate days remaining (Campaign End - Today)
  if (campaignEndMoment) {
    const today = moment.utc();
    const daysRemaining = campaignEndMoment.diff(today, "days");
    result.SeekSubToExpireDays = daysRemaining > 0 ? daysRemaining : 0;
  } else {
    result.SeekSubToExpireDays = 0;
  }

  // Set Expired Flag (YES/NO)
  if (campaignEndMoment) {
    const today = moment.utc();
    const isExpired = campaignEndMoment.diff(today, "days") <= 0;
    result.SeekSubExpired = isExpired ? "YES" : "NO";
  }

  return result;
}

/**
 * Batch calculation for multiple campaigns - optimized for performance
 */
export function batchCalculateCampaignFields(
  campaigns: CampaignData[]
): CampaignData[] {
  const today = moment.utc();
  
  return campaigns.map((campaign) => {
    const result = { ...campaign };

    // Parse start date
    let subStartDateMoment: moment.Moment | null = null;
    if (result?.SeekSubStartDate) {
      subStartDateMoment = moment.utc(result.SeekSubStartDate, "DD-MM-YYYY");
    }

    // Calculate end dates
    let campaignEndMoment: moment.Moment | null = null;
    if (subStartDateMoment && result?.SeekSubDurDays) {
      const durDays = parseInt(result.SeekSubDurDays as string, 10) || 0;
      const subEndDateMoment = subStartDateMoment.clone().add(durDays, "days");
      result.SeekSubEndDate = subEndDateMoment.format("DD-MM-YYYY");

      const grace = parseInt(result.GraceDuration as string, 10) || 0;
      campaignEndMoment = subEndDateMoment.clone().add(grace, "days");
      result.CampaignEnd = campaignEndMoment.format("DD-MM-YYYY");

      // Calculate days remaining
      const daysRemaining = campaignEndMoment.diff(today, "days");
      result.SeekSubToExpireDays = daysRemaining > 0 ? daysRemaining : 0;
      result.SeekSubExpired = daysRemaining <= 0 ? "YES" : "NO";
    } else {
      result.SeekSubToExpireDays = 0;
      result.SeekSubExpired = "NO";
    }

    return result;
  });
}

/**
 * Ultra-fast calculation using native Date (no moment.js)
 * For maximum performance
 */
export function calculateCampaignFieldsFast(data: CampaignData): CampaignData {
  const result = { ...data };

  // Parse DD-MM-YYYY to Date object
  const parseDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    const [day, month, year] = dateStr.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  };

  const startDate = result.SeekSubStartDate ? parseDate(result.SeekSubStartDate) : null;
  
  if (startDate && result.SeekSubDurDays) {
    const durDays = parseInt(result.SeekSubDurDays as string, 10) || 0;
    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + durDays);
    
    // Format as DD-MM-YYYY
    result.SeekSubEndDate = `${String(endDate.getUTCDate()).padStart(2, "0")}-${String(endDate.getUTCMonth() + 1).padStart(2, "0")}-${endDate.getUTCFullYear()}`;
    
    const grace = parseInt(result.GraceDuration as string, 10) || 0;
    const campaignEnd = new Date(endDate);
    campaignEnd.setUTCDate(campaignEnd.getUTCDate() + grace);
    result.CampaignEnd = `${String(campaignEnd.getUTCDate()).padStart(2, "0")}-${String(campaignEnd.getUTCMonth() + 1).padStart(2, "0")}-${campaignEnd.getUTCFullYear()}`;
    
    // Calculate days remaining
    const today = new Date();
    const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    const diffTime = campaignEnd.getTime() - todayUTC.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    result.SeekSubToExpireDays = diffDays > 0 ? diffDays : 0;
    result.SeekSubExpired = diffDays <= 0 ? "YES" : "NO";
  } else {
    result.SeekSubToExpireDays = 0;
    result.SeekSubExpired = "NO";
  }

  return result;
}
