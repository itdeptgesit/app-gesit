-- =====================================================================
-- MENU / ACCESS PROFILES (IT vs CSL) — Supabase Migration
-- Model: 4 role tetap (Super Admin / Admin / Staff / User).
--        Modul dibedakan lewat user_accounts.groups -> user_groups.
--
-- Profil yang disediakan:
--   it_staff       (role Staff)  -> input & update data IT
--   it_management  (role Admin)  -> lihat & approve IT
--   general_user   (role User)   -> lihat saja
--   csl_admin      (role Admin)  -> approve & kroscek dokumen
--   csl_staff      (role Staff)  -> input & urus request CSL
--   csl_requester  (role User)   -> buat request CSL
-- =====================================================================

INSERT INTO public.user_groups (id, name, description, allowed_menus) VALUES
-- ── IT MODULE ────────────────────────────────────────────────────────
('it_staff',
 'IT Staff',
 'Input & update data IT (ticketing, procurement, assets, planner)',
 ARRAY['dashboard','it-operations','helpdesk','activity','weekly','network',
       'it-payment','purchase','purchase-record',
       'it-assets','assets','asset-loan','asset-handover',
       'extension-directory','office-layout','tv-meeting-rooms',
       'csl-requests']),

('it_management',
 'IT Management',
 'Lihat & approve data IT + admin data pendukung',
 ARRAY['dashboard','it-operations','helpdesk','activity','weekly','network',
       'it-payment','purchase','purchase-record',
       'it-assets','assets','asset-loan','asset-handover',
       'extension-directory','office-layout','tv-meeting-rooms',
       'csl-requests',
       'users','tracking-log','announcements',
       'master-company','master-department','master-category']),

('general_user',
 'General User',
 'Lihat data umum; bisa buat request CSL & ticketing IT',
 ARRAY['dashboard','assets','asset-loan','helpdesk',
       'csl-requests',
       'extension-directory','office-layout']),

-- ── CSL MODULE ───────────────────────────────────────────────────────
('csl_admin',
 'CSL Admin',
 'Approve & kroscek dokumen, kelola request, rutinitas, budget, reports',
 ARRAY['dashboard','csl-requests',
       'routine','routine-activity','routine-task',
       'budget','budget-expense','budget-report',
       'directory-external',
       'reports','reports-request','reports-task','reports-budget',
       'csl-settings','master-company','master-department',
       'helpdesk']),

('csl_staff',
 'CSL Staff',
 'Input & urus request, rutinitas, budget, dan kontak',
 ARRAY['dashboard','csl-requests',
       'routine','routine-activity','routine-task',
       'budget','budget-expense','budget-report',
       'directory-external',
       'reports','reports-request','reports-task','reports-budget',
       'helpdesk']),

('csl_requester',
 'CSL Requester',
 'Membuat & melacak request CSL',
 ARRAY['dashboard','csl-requests','extension-directory','office-layout']),

-- ── HELPDESK / SUPPORT ───────────────────────────────────────────────
('support',
 'IT Support',
 'Hanya menangani ticketing IT (agent helpdesk)',
 ARRAY['dashboard','helpdesk','extension-directory','office-layout'])
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    allowed_menus = EXCLUDED.allowed_menus;

-- Bersihkan grup legacy yang tidak lagi dipakai pada model 4 role
DELETE FROM public.user_groups
WHERE id IN ('admin', 'staff', 'requester', 'user');