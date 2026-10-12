-- Add vp_id column to user_accounts table
-- This allows assigning a VP HR & Logistic for approval hierarchies

ALTER TABLE public.user_accounts 
ADD COLUMN IF NOT EXISTS vp_id int8;

-- Optional: If you want to add a foreign key constraint to ensure data integrity
-- (Uncomment the lines below if your table's id is int8 and you want strict checking)
-- ALTER TABLE public.user_accounts
-- ADD CONSTRAINT fk_user_accounts_vp_id 
-- FOREIGN KEY (vp_id) 
-- REFERENCES public.user_accounts(id) 
-- ON DELETE SET NULL;
