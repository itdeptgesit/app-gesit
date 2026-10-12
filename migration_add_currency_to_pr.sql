-- Migration script to add 'currency' column to 'purchase_requisitions' table
-- This allows supporting both IDR and USD currencies in the system.

ALTER TABLE public.purchase_requisitions
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'IDR';
