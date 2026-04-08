-- Enable SMS opt-in for a specific customer by phone number
-- Usage: Replace '+1234567890' with the actual customer phone number

-- First, find the customer ID
SELECT
  c.id,
  c.full_name,
  c.phone,
  COALESCE(p.sms_opt_in, false) as current_sms_opt_in
FROM customers c
LEFT JOIN customer_contact_prefs p ON p.customer_id = c.id
WHERE c.phone = '+1234567890'; -- REPLACE WITH ACTUAL PHONE

-- Enable SMS opt-in for the customer
INSERT INTO customer_contact_prefs (customer_id, sms_opt_in, updated_at)
SELECT id, true, NOW()
FROM customers
WHERE phone = '+1234567890' -- REPLACE WITH ACTUAL PHONE
ON CONFLICT (customer_id)
DO UPDATE SET
  sms_opt_in = true,
  updated_at = NOW();

-- Verify the update
SELECT
  c.id,
  c.full_name,
  c.phone,
  p.sms_opt_in,
  p.updated_at
FROM customers c
LEFT JOIN customer_contact_prefs p ON p.customer_id = c.id
WHERE c.phone = '+1234567890'; -- REPLACE WITH ACTUAL PHONE
