-- Import Employees Directory.xlsx
-- Idempotent, matched by email. NIK intentionally excluded from plaintext import.
-- Execute in Supabase SQL Editor with authorized write access.

WITH source(email, full_name, employee_code, company, department, job_title, job_level, employment_status, join_date, contract_end_date, employment_type) AS (
  VALUES
  ('javier@gesit.co.id','Javier Wijaya','20040238','PT Gesit Perkasa','HR & Logistics','VP of HR & Logistic','Vice President','Permanent','2020-04-20',NULL,'PKWTT'),
  ('noni@gesit.co.id','Noni','19110233','PT Gesit Alumas','HR & Logistics','GA Support','Supervisor','Permanent','2019-11-01',NULL,'PKWTT'),
  ('etty@gesit.co.id','Ety Sumiaty','96110005','PT Sircon Investment','HR & Logistics','PA - BOC','Staff','Permanent','1996-11-20',NULL,'PKWTT'),
  ('suryadi@gesit.co.id','Suryadi','99070008','PT Gesit Alumas','HR & Logistics','Formalities','Staff','Permanent','1999-07-19',NULL,'PKWTT'),
  ('widya@gesit.co.id','Retno Widiyati','12020029','PT Mitra Sudirman Mandiri','HR & Logistics','Receptionist','Operator','Permanent','2012-02-06',NULL,'PKWTT'),
  ('pratiwi@gesit.co.id','Pratiwi','93100003','PT Lima Garda Sakti','HR & Logistics','Office Boy','Operator','Permanent','1993-10-29',NULL,'PKWTT'),
  ('andri@gesit.co.id','Andri Widiyanto','6020017','PT Lima Sudirman Perkasa','HR & Logistics','Messenger','Operator','Permanent','2006-02-27',NULL,'PKWTT'),
  ('susilo@gesit.co.id','Muhammad Susilo','22050350','PT Gesit Alumas','HR & Logistics','Formalities','Staff','Permanent','2022-05-09',NULL,'PKWTT'),
  ('nisa@gesit.co.id','Khairun Nisa Oktafiani','22090351','PT Gesit Alumas','HR & Logistics','Staff - Human Resources','Staff','Permanent','2022-09-19',NULL,'PKWTT'),
  ('sariana@gesit.co.id','Sariana','23080361','PT Grahasejahtera Asri','HR & Logistics','Office Boy','Operator','Permanent','2023-08-11',NULL,'PKWTT'),
  ('awr2712@gmail.com','Abdul Wahid Ramdoni','24090376','PT Lima Sudirman Perkasa','HR & Logistics','Office Boy','Operator','Permanent','2024-09-23',NULL,'PKWTT'),
  ('bendry@gesit.co.id','Bendry','25040379','PT Gesit Alumas','HR & Logistics','IT Specialist','Supervisor','Permanent','2025-04-07',NULL,'PKWTT'),
  ('rara@gesit.co.id','Mesrama Gultom','25040380','PT Gesit Alumas','HR & Logistics','Office Manager','Manager','Permanent','2025-04-14',NULL,'PKWTT'),
  ('rudi.siarudin@gesit.co.id','Rudi Si''arudin','25060382','PT Gesit Alumas','HR & Logistics','Teknisi IT','Staff','Permanent','2025-06-02',NULL,'PKWTT'),
  ('babangjulhan@gmail.com','Julhan Sabani','26060389','PT Gesit Alumas','HR & Logistics','Driver Operational','Operator','Contract','2026-07-08','2027-07-07','PKWT'),
  ('hananda.cherry@gesit.co.id','Kadek Hananda Cherry','26100392','PT Gesit Perkasa','HR & Logistics','Staff Administrasi - HRL','Staff','Probation','2026-10-05','2027-01-04','PKWT')
)
UPDATE public.user_accounts AS u
SET full_name = s.full_name,
    employee_code = s.employee_code,
    company = s.company,
    department = s.department,
    job_title = s.job_title,
    job_level = s.job_level,
    status = CASE WHEN s.employment_status = 'Permanent' THEN 'Active' ELSE s.employment_status END,
    join_date = s.join_date::date,
    contract_start_date = CASE WHEN s.employment_type = 'PKWT' THEN s.join_date::date ELSE NULL END,
    contract_end_date = s.contract_end_date::date,
    employment_type = s.employment_type,
    contract_type = s.employment_status
FROM source AS s
WHERE lower(u.email) = lower(s.email);

-- Verify separately with the employee email list after migration completes.
