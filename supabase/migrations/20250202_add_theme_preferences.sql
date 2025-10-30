-- Migration: Add theme preferences to profiles table
-- Created: 2025-02-02
-- Description: Add theme mode, custom colors, and palette selection to user profiles

-- Add theme preference columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS theme_mode TEXT DEFAULT 'dark' CHECK (theme_mode IN ('dark', 'light')),
ADD COLUMN IF NOT EXISTS custom_primary_color TEXT DEFAULT '#8b5cf6',
ADD COLUMN IF NOT EXISTS selected_palette TEXT DEFAULT 'purple';

-- Create comment for documentation
COMMENT ON COLUMN profiles.theme_mode IS 'User theme preference: dark or light';
COMMENT ON COLUMN profiles.custom_primary_color IS 'Custom primary color in hex format (e.g., #8b5cf6)';
COMMENT ON COLUMN profiles.selected_palette IS 'Selected color palette name (purple, blue, green, red, orange, teal, yellow)';





