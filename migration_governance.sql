-- Add status field to network_switches table for IT documentation governance
ALTER TABLE network_switches 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' 
CHECK (status IN ('active', 'spare', 'maintenance', 'decommissioned'));

-- Add audit trail fields
ALTER TABLE network_switches 
ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES user_accounts(id),
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES user_accounts(id),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Add notes field for documentation
ALTER TABLE network_switches 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create index for status filtering
CREATE INDEX IF NOT EXISTS idx_network_switches_status ON network_switches(status);

-- Update existing records to have 'active' status
UPDATE network_switches SET status = 'active' WHERE status IS NULL;
