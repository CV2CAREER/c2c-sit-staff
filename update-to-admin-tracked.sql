-- Update user role to admin with tracking
UPDATE users 
SET 
  role = 'admin',
  "updatedBy" = 'MANUAL_DB_UPDATE_ADMIN_ROLE',
  "updatedAt" = NOW()
WHERE 
  id = '51fb342d-807b-4e4a-8c1b-a9cadaad20c9';

-- Verify the update
SELECT id, email, role, "updatedBy", "updatedAt" FROM users WHERE id = '51fb342d-807b-4e4a-8c1b-a9cadaad20c9';
