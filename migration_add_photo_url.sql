-- Add photo_url column to phone_extensions table
ALTER TABLE phone_extensions 
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Comment for documentation
COMMENT ON COLUMN phone_extensions.photo_url IS 'URL to the user''s photo/avatar';
