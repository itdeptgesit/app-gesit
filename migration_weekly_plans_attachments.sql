-- Migration to add Google Drive attachments and assignee details to weekly_plans
ALTER TABLE weekly_plans 
ADD COLUMN IF NOT EXISTS gdrive_attachments JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS assignee_email TEXT,
ADD COLUMN IF NOT EXISTS assignee_avatar TEXT;

-- Add comments for documentation
COMMENT ON COLUMN weekly_plans.gdrive_attachments IS 'Array of Google Drive attachments for the task';
COMMENT ON COLUMN weekly_plans.assignee_email IS 'Email of the task assignee fetched from Google People API';
COMMENT ON COLUMN weekly_plans.assignee_avatar IS 'Avatar URL of the task assignee fetched from Google People API';

