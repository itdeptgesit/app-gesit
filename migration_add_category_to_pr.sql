-- Migration: Add category column to purchase_requisitions table
-- This column holds the standard purchase category selected by the user.

ALTER TABLE public.purchase_requisitions 
ADD COLUMN IF NOT EXISTS category TEXT;

-- Update RLS Comment for category
COMMENT ON COLUMN public.purchase_requisitions.category IS 'The purchase category (e.g. Hardware, Accessories, Cloud & Hosting, Subscription, Maintenance & Support, IT Services)';
