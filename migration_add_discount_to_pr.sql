-- Migration: Add discount and delivery_fee columns to purchase_requisitions table
-- These columns hold the optional purchase discount and delivery fee.

ALTER TABLE public.purchase_requisitions 
ADD COLUMN IF NOT EXISTS discount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC DEFAULT 0;

-- Update Comments
COMMENT ON COLUMN public.purchase_requisitions.discount IS 'The optional purchase discount subtracted from the grand total';
COMMENT ON COLUMN public.purchase_requisitions.delivery_fee IS 'The optional delivery fee added to the grand total';
