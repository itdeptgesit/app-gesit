-- =====================================================================
-- CSL SYSTEM (Corporate Secretary & Legal) — Supabase Migration
-- Target : Supabase SQL Editor  |  Schema : public
-- NOTE   : RLS intentionally DISABLED on CSL tables (app uses anon key
--          with broad internal access; enable + add policies if needed).
-- =====================================================================

-- =====================================================================
-- 1. CSL REQUEST CATEGORIES
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.csl_request_categories (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code        text NOT NULL,
    name        text NOT NULL,
    sla_days    integer NOT NULL DEFAULT 5,
    description text
);

-- =====================================================================
-- 2. CSL REQUESTS
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.csl_requests (
    id                                 bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    request_number                     text NOT NULL,
    category_id                        bigint REFERENCES public.csl_request_categories(id),
    category_name                      text,
    requester_name                     text NOT NULL,
    requester_email                    text,
    requester_id                       text,
    department                         text,
    company                            text,
    assigned_pic_name                  text,
    assigned_pic_id                    text,
    priority                           text DEFAULT 'Medium',             -- Low | Medium | High | Critical
    status                             text DEFAULT 'SUBMITTED',          -- DRAFT | SUBMITTED | ACKNOWLEDGED | IN_REVIEW | REVIEW_USER | PROCESSING | COMPLETED | RESPONDED | CLOSED | REJECTED | CANCELLED
    description                        text,
    tujuan                             text,
    progress                           integer DEFAULT 0,
    required_date                      timestamptz,
    sla_target_days                    integer,
    sla_due_date                       timestamptz,
    completed_at                       timestamptz,
    created_at                         timestamptz DEFAULT now(),
    updated_at                         timestamptz DEFAULT now(),
    csl_response                       text,
    csl_response_at                    timestamptz,
    csl_response_files                 jsonb,                             -- [{type, url, name, added_at}]
    attachments                        jsonb,                             -- legacy file URLs
    feedback_overall_rating            integer,
    feedback_response_time_rating      integer,
    feedback_service_quality_rating    integer,
    feedback_comment                   text,
    feedback_submitted_at              timestamptz
);

CREATE INDEX IF NOT EXISTS idx_csl_requests_category   ON public.csl_requests(category_id);
CREATE INDEX IF NOT EXISTS idx_csl_requests_status     ON public.csl_requests(status);
CREATE INDEX IF NOT EXISTS idx_csl_requests_requester  ON public.csl_requests(requester_email);
CREATE INDEX IF NOT EXISTS idx_csl_requests_pic        ON public.csl_requests(assigned_pic_id);
CREATE INDEX IF NOT EXISTS idx_csl_requests_created    ON public.csl_requests(created_at DESC);

-- =====================================================================
-- 3. CSL REQUEST DOCUMENTS
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.csl_request_documents (
    id                     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    request_id             bigint NOT NULL REFERENCES public.csl_requests(id) ON DELETE CASCADE,
    doc_name               text NOT NULL,
    doc_type               text,
    gdrive_url             text,
    gdrive_file_id         text,
    doc_url                text,
    uploaded_by_name       text,
    uploaded_by_id         text,
    is_visible_to_requester boolean DEFAULT true,
    created_at             timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_csl_req_docs_request ON public.csl_request_documents(request_id);

-- =====================================================================
-- 4. CSL REQUEST LOGS
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.csl_request_logs (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    request_id  bigint NOT NULL REFERENCES public.csl_requests(id) ON DELETE CASCADE,
    status      text,
    actor_name  text NOT NULL,
    actor_id    text,
    note        text,
    has_files   boolean DEFAULT false,
    is_internal boolean DEFAULT false,
    created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_csl_req_logs_request ON public.csl_request_logs(request_id);

-- =====================================================================
-- 5. CSL ROUTINES
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.csl_routines (
    id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title            text NOT NULL,
    description      text,
    category         text,                              -- Tax | Compliance | Licensing | Corporate Secretary | Notary | Other
    frequency        text DEFAULT 'MONTHLY',           -- DAILY | WEEKLY | MONTHLY | QUARTERLY | SEMI_ANNUALLY | ANNUALLY
    due_day          integer DEFAULT 1,
    assigned_pic_name text,
    is_active        boolean DEFAULT true,
    attachment_url   text,
    attachment_name  text,
    created_at       timestamptz DEFAULT now()
);

-- =====================================================================
-- 6. CSL ROUTINE INSTANCES
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.csl_routine_instances (
    id                    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    routine_id            bigint NOT NULL REFERENCES public.csl_routines(id) ON DELETE CASCADE,
    period_start          text,                          -- 'YYYY-MM-DD'
    period_end            text,
    due_date              text,
    status                text DEFAULT 'PENDING',        -- PENDING | IN_PROGRESS | COMPLETED | OVERDUE | CANCELLED
    completion_notes      text,
    completed_at          timestamptz,
    completion_file_url   text,
    completion_file_name  text,
    admin_attachment_url  text,
    admin_attachment_name text,
    created_at            timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_csl_routine_inst_routine ON public.csl_routine_instances(routine_id);
CREATE INDEX IF NOT EXISTS idx_csl_routine_inst_status  ON public.csl_routine_instances(status);
CREATE INDEX IF NOT EXISTS idx_csl_routine_inst_due     ON public.csl_routine_instances(due_date);

-- =====================================================================
-- 7. CSL ROUTINE COMMENTS
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.csl_routine_comments (
    id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    instance_id  text NOT NULL,                          -- csl_routine_instances.id (as string)
    sender_id    text,
    sender_name  text NOT NULL,
    sender_role  text DEFAULT 'staff',                   -- admin | staff
    message      text NOT NULL,
    created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_csl_routine_comments_instance ON public.csl_routine_comments(instance_id);

-- =====================================================================
-- 8. CSL TASKS (general task tracking for dashboard aggregation)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.csl_tasks (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    task_name   text NOT NULL,
    category    text,
    company     text,
    owner       text,
    status      text DEFAULT 'Open',
    due_date    text,
    finish_date text,
    created_at  timestamptz DEFAULT now()
);

-- =====================================================================
-- 9. CSL RUPS / AR TASKS
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.csl_rups_ar (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company     text NOT NULL,
    periode     text,
    status      text DEFAULT 'Open',
    owner       text,
    start_date  text,
    due_date    text,
    finish_date text,
    notes       text,
    created_at  timestamptz DEFAULT now()
);

-- =====================================================================
-- 10. CSL CONTACTS (Directory External)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.csl_contacts (
    id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name         text NOT NULL,
    category     text DEFAULT 'Other',                   -- Lawyer | Vendor | Government | Other
    organization text DEFAULT '-',
    phone        text NOT NULL,
    email        text DEFAULT '-',
    city         text DEFAULT 'Jakarta',
    notes        text,
    license_no   text,                                   -- lawyer registration no
    created_at   timestamptz DEFAULT now(),
    updated_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_csl_contacts_category ON public.csl_contacts(category);

-- =====================================================================
-- 11. CSL DOCUMENTS (Corporate Docs Repository)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.csl_documents (
    id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    doc_number     text,
    title          text NOT NULL,
    category       text DEFAULT 'General',               -- Agreement | Legal Document | Permit | Google Drive | General
    counterparty   text DEFAULT '-',
    contract_value text,
    effective_date text,                                 -- 'YYYY-MM-DD'
    expired_date   text,
    status         text DEFAULT 'ACTIVE',                -- ACTIVE | EXPIRING_SOON | EXPIRED | ARCHIVED
    auto_renew     boolean DEFAULT false,
    issuer         text,
    file_name      text,
    gdrive_url     text,
    gdrive_file_id text,
    folder_type    text DEFAULT 'CSL_DOCUMENTS',
    uploaded_by    text,
    notes          text,
    created_at     timestamptz DEFAULT now()
);

-- =====================================================================
-- 12. CSL EXPENSE APPROVALS
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.csl_expense_approvals (
    id                   uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    expense_number       text NOT NULL,
    voucher_number       text,
    company              text DEFAULT 'PT Bumi Grafika Jaya',
    department           text DEFAULT 'CSL',
    project_name         text NOT NULL,
    request_date         text,                           -- 'YYYY-MM-DD'
    paid_to              text,
    payee_type           text DEFAULT 'Company',         -- Company | Individual
    payment_method       text DEFAULT 'Bank Transfer / T.T',
    payment_location     text DEFAULT 'Local',           -- Local | Offshore
    currency             text DEFAULT 'IDR',
    amount               numeric DEFAULT 0,
    exchange_rate        numeric DEFAULT 1,
    exchange_rate_source text DEFAULT 'API',             -- API | Manual
    exchange_rate_date   text,
    reporting_currency   text DEFAULT 'IDR',
    reporting_amount     numeric,
    total_amount         numeric,
    bank_name            text,
    account_number       text,
    account_name         text,
    bank_code            text,
    swift_code           text,
    account_number_foreign text,
    account_number_usd   text,
    invoice_number       text,
    account_code         text,
    payment_description  text,
    category             text,
    note                 text,
    prepared_by_name     text,
    prepared_by_id       text,
    approved_by_name     text,
    approved_by_id       text,
    status               text DEFAULT 'DRAFT',           -- DRAFT | PENDING_APPROVAL | APPROVED | DISBURSED | PAID | REJECTED
    invoice_attachment_id text,
    created_at           timestamptz DEFAULT now(),
    updated_at           timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_csl_expense_status ON public.csl_expense_approvals(status);
CREATE INDEX IF NOT EXISTS idx_csl_expense_created ON public.csl_expense_approvals(created_at DESC);

-- =====================================================================
-- 13. CSL OFFSHORE INVOICES
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.csl_offshore_invoices (
    id                   uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_number       text NOT NULL,
    voucher_number       text,
    company              text,
    paid_to              text,
    payment_description  text,
    note                 text,
    request_date         text,
    foreign_amount       numeric,
    exchange_rate        numeric,
    foreign_currency     text DEFAULT 'USD',
    status               text DEFAULT 'PENDING_APPROVAL', -- PENDING_APPROVAL | APPROVED | PAID | REJECTED
    prepared_by_name     text,
    prepared_by_id       text,
    approved_by_name     text,
    approved_by_id       text,
    invoice_attachment_id text,
    bank_name            text,
    account_number       text,
    account_name         text,
    created_at           timestamptz DEFAULT now(),
    updated_at           timestamptz DEFAULT now()
);

-- =====================================================================
-- 14. CSL BUDGET ALLOCATIONS
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.csl_budget_allocations (
    id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    fiscal_year      integer NOT NULL,
    company          text DEFAULT 'PT Determinan Indah',
    department       text DEFAULT 'CSL',
    project_name     text NOT NULL,
    allocated_amount numeric DEFAULT 0,
    updated_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_csl_budget_fiscal ON public.csl_budget_allocations(fiscal_year);

-- =====================================================================
-- 15. CSL SYSTEM SETTINGS
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.csl_system_settings (
    setting_key   text PRIMARY KEY,
    setting_value text,
    updated_at    timestamptz DEFAULT now()
);

-- =====================================================================
-- 16. OFFICE LAYOUT MARKERS (Office & Directory / Office Layout)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.office_layout_markers (
    id          text PRIMARY KEY,                        -- client-generated 'm_...'
    label       text NOT NULL,
    description text DEFAULT '',
    color       text DEFAULT '#2563EB',
    category    text DEFAULT 'general',                  -- division | meeting | director | facility | utility | general
    x_pct       numeric,                                 -- 0..1 (% of floorplan width)
    y_pct       numeric,                                 -- 0..1 (% of floorplan height)
    polygon     text,                                    -- JSON [{xPct, yPct}]
    updated_at  timestamptz DEFAULT now()
);

-- =====================================================================
-- SEED DATA
-- =====================================================================

-- Default request categories
INSERT INTO public.csl_request_categories (code, name, sla_days, description) VALUES
    ('AGR',        'Agreement',           7,  'Contract & agreement review'),
    ('LREV',       'Legal Review',        5,  'General legal review'),
    ('CORPSECR',   'Corporate Secretary', 3,  'Company secretarial matters'),
    ('OSS',        'OSS & Licensing',     5,  'Business licensing'),
    ('LIC',        'License Renewal',     5,  'License renewal'),
    ('NOTARY',     'Notary',              5,  'Notary coordination'),
    ('LEGALOP',    'Legal Opinion',       5,  'Legal opinion requests'),
    ('DOCREQ',     'Document Request',    2,  'Company document request'),
    ('COMPLIANCE', 'Compliance',          5,  'Compliance matters'),
    ('OTHER',      'Other',               5,  'Other requests')
ON CONFLICT DO NOTHING;

-- Default system settings keys (approvers are set from CSL Settings UI / env)
INSERT INTO public.csl_system_settings (setting_key, setting_value) VALUES
    ('csl_expense_approver',    'natalia@gesit.co.id'),
    ('csl_offshore_approver',   'natalia@gesit.co.id')
ON CONFLICT (setting_key) DO NOTHING;