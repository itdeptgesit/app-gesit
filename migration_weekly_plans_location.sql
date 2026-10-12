-- Migration to add location column to weekly_plans
ALTER TABLE weekly_plans 
ADD COLUMN IF NOT EXISTS location TEXT;

-- Add comments for documentation
COMMENT ON COLUMN weekly_plans.location IS 'Location of the scheduled event or task';
