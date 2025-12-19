-- Add profile contact fields for onboarding
-- Keeps existing display_name/username for backward compatibility.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS first_name TEXT CHECK (char_length(first_name) <= 100),
  ADD COLUMN IF NOT EXISTS last_name TEXT CHECK (char_length(last_name) <= 100),
  ADD COLUMN IF NOT EXISTS phone_number TEXT CHECK (char_length(phone_number) <= 30);

