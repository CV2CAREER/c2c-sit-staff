-- Update user role from 'guest' to 'admin'
-- User: Adimchimnobi Chukwujekwu (adimchikrilz@gmail.com)
-- User ID: 51fb342d-807b-4e4a-8c1b-a9cadaad20c9

UPDATE users 
SET 
  role = 'admin',
  "updatedAt" = NOW()
WHERE 
  id = '51fb342d-807b-4e4a-8c1b-a9cadaad20c9';

-- Verify the update
SELECT 
  id, 
  email, 
  "firstName", 
  "lastName", 
  role, 
  "updatedAt"
FROM users 
WHERE id = '51fb342d-807b-4e4a-8c1b-a9cadaad20c9';
