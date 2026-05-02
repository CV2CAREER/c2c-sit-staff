-- Update master password last changed date
-- Set to 4/21/2026 by oghenemerhovwo.va@gmail.com

UPDATE settings 
SET 
  "updatedBy" = 'oghenemerhovwo.va@gmail.com',
  "updatedAt" = '2026-04-21 00:00:00+00'
WHERE 
  key = 'masterpass';

-- Verify the update
SELECT id, key, "updatedBy", "updatedAt", "createdAt" FROM settings WHERE key = 'masterpass';
