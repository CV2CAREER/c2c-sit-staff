import type { CampaignTableColType } from '@/types/admin';

/**
 * SPR-21-41-015: the authoritative list of retained data columns for the
 * campaign grid.
 *
 * Both the Admin grid and the Placement Controller grid build their data
 * columns from this array, and `scripts/check-campaign-modal-bindings.mjs`
 * asserts that each edit modal represents every column here — either as an
 * editable control or as a read-only display.
 *
 * The three UI-only columns (`actions`, `flight`, `generate-aq`) are
 * deliberately excluded: they carry no client data and have no modal
 * equivalent. SPR-21-41-015 describes the grid as having 35 columns; the real
 * retained data column count is 33 (36 grid columns including the three
 * UI-only ones), so this list is the source of truth rather than the ticket's
 * count.
 */
export const CAMPAIGN_TABLE_KEYS: (keyof CampaignTableColType)[] = [
  'id',
  'CustomerId',
  'Full_Name',
  'First_Name',
  'Middle_Name',
  'Last_Name',
  'Plan',
  'TourCount',
  'Order',
  'SeekSubStartDate',
  'Assurance',
  'SeekWeeklyMax',
  'SeekSubDurDays',
  'SeekSubEndDate',
  'GraceDuration',
  'CampaignEnd',
  'Capitalized',
  'SeekSubToExpireDays',
  'SeekSubExpired',
  'Active',
  'Alias_Email',
  'Alias_Password',
  'VaName',
  'VetName',
  'CompletedName',
  'InterimDPCName',
  'InterimSPCName',
  'Last_Application',
  'First_Application',
  'Craft',
  'updateBy',
  'createdAt',
  'updatedAt',
];

export default CAMPAIGN_TABLE_KEYS;