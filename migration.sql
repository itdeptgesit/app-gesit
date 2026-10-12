-- SQL Migration to add new columns to purchase_records table
ALTER TABLE purchase_records 
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS evidence_link TEXT,
ADD COLUMN IF NOT EXISTS input_by TEXT,
ADD COLUMN IF NOT EXISTS category TEXT;

-- Comment for documentation
COMMENT ON COLUMN purchase_records.payment_method IS 'Transfer, VA, or Debit/CC';
COMMENT ON COLUMN purchase_records.evidence_link IS 'Link to Google Drive evidence or invoices';
