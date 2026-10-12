-- ==========================================================================
-- GESIT Approval Chain Seed Migration
-- Generated: 2026-09-15
-- Description: Seeds approval_levels, user_accounts, supervisor_assignments,
--              and creates approval chain view for the GESIT People PWA.
-- Run in Supabase SQL Editor.
-- ==========================================================================

BEGIN;

-- ==========================================================================
-- 1. APPROVAL LEVELS
-- ==========================================================================
-- Drop and recreate to ensure clean state
DROP VIEW IF EXISTS v_approval_chain_summary;
DROP TABLE IF EXISTS supervisor_assignments CASCADE;
DROP TABLE IF EXISTS approval_levels CASCADE;

CREATE TABLE IF NOT EXISTS approval_levels (
    id SERIAL PRIMARY KEY,
    level_number INTEGER NOT NULL UNIQUE,
    level_name TEXT NOT NULL,
    level_description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO approval_levels (level_number, level_name, level_description)
VALUES
    (1, 'Direct Supervisor', 'Immediate supervisor from Approval Line 1'),
    (2, 'Higher Supervisor', 'Higher-level supervisor from Approval Line 2'),
    (3, 'HR / Management', 'HR or management escalation from Column 1'),
    (4, 'Office Management', 'Office management final escalation from Column 2')
ON CONFLICT (level_number) DO UPDATE SET
    level_name = EXCLUDED.level_name,
    level_description = EXCLUDED.level_description;

-- ==========================================================================
-- 1.5 USER ACCOUNTS COLUMN PREP
-- ==========================================================================
-- Seed ini memakai kolom employee_id/organization/job_position/branch_name
-- yang belum tentu ada di user_accounts. Tambahkan bila belum ada.
ALTER TABLE public.user_accounts
  ADD COLUMN IF NOT EXISTS employee_id TEXT,
  ADD COLUMN IF NOT EXISTS organization TEXT,
  ADD COLUMN IF NOT EXISTS job_position TEXT,
  ADD COLUMN IF NOT EXISTS branch_name TEXT,
  ADD COLUMN IF NOT EXISTS job_level TEXT;

-- ON CONFLICT (employee_id) membutuhkan unique constraint/index
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_accounts_employee_id ON public.user_accounts(employee_id);

-- ==========================================================================
-- 2. USER ACCOUNTS SEED
-- ==========================================================================
-- Insert employees that don't already exist in user_accounts
-- Matches on employee_id to avoid duplicates

INSERT INTO user_accounts (employee_id, full_name, organization, job_position, job_level, branch_name)
VALUES
    ('BOC00001', 'Jacob Soetoyo', 'Board Of Commisionaire', 'Chairman', 'Board Of Commisionaire', 'PT Gesit Perkasa'),
    ('BOC00002', 'Jahja Soetoyo', 'Board Of Commisionaire', 'CEO', 'Board Of Commisionaire', 'PT Gesit Perkasa'),
    ('BOC00003', 'Meiriana Soetoyo', 'Board Of Commisionaire', 'Board Of Commisionaire', 'Board Of Commisionaire', 'PT Gesit Perkasa'),
    ('BOC00004', 'Meiriani Soetoyo', 'Board Of Commisionaire', 'Board Of Commisionaire', 'Board Of Commisionaire', 'PT Gesit Perkasa'),
    ('BOC00005', 'Meiriaty Soetoyo', 'Board Of Commisionaire', 'Board Of Commisionaire', 'Board Of Commisionaire', 'PT Gesit Perkasa'),
    ('A011225359', 'Franklyn Berris', 'Business Unit Mining', 'VP of Mining Operational', 'Vice President', 'PT Dinamika Sejahtera Mandiri'),
    ('A151025337', 'Novita Ariani Sitorus', 'Business Unit Mining', 'Permit and License', 'Manager', 'PT Dinamika Sejahtera Mandiri'),
    ('A271025340', 'Puji Setiyatno', 'Business Unit Mining', 'IT & Data Management Spv', 'Supervisor', 'PT Dinamika Sejahtera Mandiri'),
    ('A281025341', 'Marissa Theodora', 'Business Unit Mining', 'Tecnical Permit & License Officer', 'Staff', 'PT Dinamika Sejahtera Mandiri'),
    ('A03112025435', 'Dimas Andi Nugroho', 'Business Unit Mining', 'Tecnical Permit & License Officer', 'Staff', 'PT Dinamika Sejahtera Mandiri'),
    ('A03112025344', 'Ezra Farabi Umar', 'Business Unit Mining', 'Technical Permit & Lisence', 'Supervisor', 'PT Dinamika Sejahtera Mandiri'),
    ('A171125353', 'Fathul Jannah', 'Business Unit Mining', 'Technical Permit & Lisence', 'Manager', 'PT Dinamika Sejahtera Mandiri'),
    ('A081225361', 'Luhut Pardamean Manik', 'Business Unit Mining', 'Permit and License', 'Staff', 'PT Dinamika Sejahtera Mandiri'),
    ('A011225360', 'Ahid Suria Nandya', 'Business Unit Mining', 'Mine Engineering Superintendent', 'Superintendent', 'PT Dinamika Sejahtera Mandiri'),
    ('20070239', 'Yudha Prabowo', 'Corporate Affair', 'Assistant to Corporate Affairs Head', 'Vice President', 'PT Gesit Perkasa'),
    ('99090012', 'Tjia Peng Tjoan', 'Corporate Affair', 'VP of Corporate Affair', 'Vice President', 'PT Gesit Perkasa'),
    ('13070059', 'Thomas Tony Irawan', 'Corporate Affair', 'Staff - Corporate Affair', 'Staff', 'PT Gesit Perkasa'),
    ('24010365', 'Ananda Ruby Nurcantika', 'Corporate Affair', 'Admin Corporate Affair', 'Staff', 'PT Gesit Perkasa'),
    ('96050004', 'Natalia', 'Corporate Secretary & Legal', 'VP of Corporate Secretary & Legal', 'Vice President', 'PT Gesit Perkasa'),
    ('001/AI', 'Nancy Dunda', 'Corporate Secretary & Legal', 'Staff - Corporate Secretary & Legal', 'Staff', 'PT Gesit Perkasa'),
    ('22050349', 'Yohan Alamsyah', 'Corporate Secretary & Legal', 'Deputy VP - Corporate Secretary & Legal', 'Deputy VP', 'PT Gesit Perkasa'),
    ('22020378', 'Desi Rahmuni', 'Corporate Secretary & Legal', 'Supervisor - Corporate Secretary & Legal', 'Supervisor', 'PT Gesit Perkasa'),
    ('25010384', 'Sylvia', 'Corporate Secretary & Legal', 'Supervisor - Corporate Secretary & Legal', 'Supervisor', 'PT Gesit Perkasa'),
    ('A26021886', 'Fendra Hartanto', 'Dinamika Sejahtera Mandiri', 'VP of Finance & Admin for Mining', 'Vice President', 'PT Dinamika Sejahtera Mandiri'),
    ('A040917073', 'Jones Soetoyo', 'Dinamika Sejahtera Mandiri', 'Deputy CEO & President', 'Deputy CEO & President', 'PT Dinamika Sejahtera Mandiri'),
    ('A310717034', 'Muchammad Tunggul Buono', 'Dinamika Sejahtera Mandiri', 'Mine Engineer Manager', 'Manager', 'PT Dinamika Sejahtera Mandiri'),
    ('A23111783', 'Pipin Syaripin', 'Dinamika Sejahtera Mandiri', 'Accounting & Tax', 'Manager', 'PT Dinamika Sejahtera Mandiri'),
    ('A120722165', 'Hansdi Putra Adinata', 'Dinamika Sejahtera Mandiri', 'Accounting', 'Superintendent', 'PT Dinamika Sejahtera Mandiri'),
    ('A060417013', 'Rahmat Hidayat Hengky Saputra', 'Dinamika Sejahtera Mandiri', 'Procurement & Logistic', 'Manager', 'PT Dinamika Sejahtera Mandiri'),
    ('A20111784', 'Ryandhi Widjaya', 'Dinamika Sejahtera Mandiri', 'Sales & Logistic', 'Manager', 'PT Dinamika Sejahtera Mandiri'),
    ('A250521149', 'Hadly Robbianza', 'Dinamika Sejahtera Mandiri', 'Procurement & Logistic', 'Superintendent', 'PT Dinamika Sejahtera Mandiri'),
    ('A100717023', 'Andrias Hartono', 'Dinamika Sejahtera Mandiri', 'Logistic & Support', 'Staff', 'PT Dinamika Sejahtera Mandiri'),
    ('A021017067', 'Juni Baktius', 'Dinamika Sejahtera Mandiri', 'Staff - HRGA', 'Staff', 'PT Dinamika Sejahtera Mandiri'),
    ('A170619125B', 'Dwi Suryati', 'Dinamika Sejahtera Mandiri', 'PA for VP Marketing', 'Deputy Manager', 'PT Dinamika Sejahtera Mandiri'),
    ('A010323198', 'Aditya Wibisono', 'Dinamika Sejahtera Mandiri', 'HRGS', 'Manager', 'PT Dinamika Sejahtera Mandiri'),
    ('A070923199', 'Said Uwais', 'Dinamika Sejahtera Mandiri', 'Superintendent - Accounting & Tax for Mining', 'Superintendent', 'PT Dinamika Sejahtera Mandiri'),
    ('A210224214', 'Aldri Herdian', 'Dinamika Sejahtera Mandiri', 'Mine Development Manager', 'Manager', 'PT Dinamika Sejahtera Mandiri'),
    ('A010724300', 'Nike Destia', 'Dinamika Sejahtera Mandiri', 'Manager - Corporate Secretary & Legal', 'Deputy VP', 'PT Dinamika Sejahtera Mandiri'),
    ('A030225301', 'Rayviansyah Andika Aulia', 'Dinamika Sejahtera Mandiri', 'Geologist', 'Supervisor', 'PT Dinamika Sejahtera Mandiri'),
    ('A170225302', 'Titis Gayuh Jayati', 'Dinamika Sejahtera Mandiri', 'Mine Engineering Supervisor', 'Supervisor', 'PT Dinamika Sejahtera Mandiri'),
    ('A180825317', 'Afirlinka Nisrina', 'Dinamika Sejahtera Mandiri', 'Document Controller', 'Staff', 'PT Dinamika Sejahtera Mandiri'),
    ('A010925318', 'Annisa Ayu Budhiarti', 'Dinamika Sejahtera Mandiri', 'HRGS', 'Superintendent', 'PT Dinamika Sejahtera Mandiri'),
    ('A260925323', 'Hilia Annisa Putri', 'Dinamika Sejahtera Mandiri', 'Receptionist', 'Staff', 'PT Dinamika Sejahtera Mandiri'),
    ('A011025325', 'Afif Rivai', 'Dinamika Sejahtera Mandiri', 'Supervisor - Finance & Accounting', 'Supervisor', 'PT Dinamika Sejahtera Mandiri'),
    ('A241125354', 'Winda Amelia', 'Dinamika Sejahtera Mandiri', 'Document Controller', 'Staff', 'PT Dinamika Sejahtera Mandiri'),
    ('A050126363', 'Sinta Wahyuputri', 'Dinamika Sejahtera Mandiri', 'Talent Acquisition & Development Supervisor', 'Superintendent', 'PT Dinamika Sejahtera Mandiri'),
    ('A050126362', 'Irsyad Mubarok', 'Dinamika Sejahtera Mandiri', 'Budget and Reporting Manager', 'Manager', 'PT Dinamika Sejahtera Mandiri'),
    ('A050126364', 'Loi Emarson', 'Dinamika Sejahtera Mandiri', 'Government Relation Manager', 'Manager', 'PT Dinamika Sejahtera Mandiri'),
    ('A090326366', 'Eddie Martono', 'Dinamika Sejahtera Mandiri', 'Deputy Head of Natural Resources', 'Deputy Head of Natural Resources', 'PT Dinamika Sejahtera Mandiri'),
    ('A010426367', 'Argadana Abdul Aziz Sukron', 'Dinamika Sejahtera Mandiri', 'Operational Excellence Superintendent', 'Superintendent', 'PT Dinamika Sejahtera Mandiri'),
    ('A010426368', 'Andi Raniadhi', 'Dinamika Sejahtera Mandiri', 'QHSE Superintendent', 'Superintendent', 'PT Dinamika Sejahtera Mandiri'),
    ('A270426370', 'Hana Trijayanti Trijayanti', 'Dinamika Sejahtera Mandiri', 'Tecnical Permit & License Officer', 'Staff', 'PT Dinamika Sejahtera Mandiri'),
    ('A060526284', 'Muh. Surhamzah', 'Dinamika Sejahtera Mandiri', 'Permit and License', 'Staff', 'PT Dinamika Sejahtera Mandiri'),
    ('A080626372', 'Aldo Sastra', 'Dinamika Sejahtera Mandiri', 'Government Relations Superintendent', 'Superintendent', 'PT Dinamika Sejahtera Mandiri'),
    ('A080626373', 'Muhammad Zakky Alif', 'Dinamika Sejahtera Mandiri', 'Tax', 'Manager', 'PT Dinamika Sejahtera Mandiri'),
    ('A180626374', 'Juan Novsky Yunus Prayoga', 'Dinamika Sejahtera Mandiri', 'Procurement & Logistic', 'Staff', 'PT Dinamika Sejahtera Mandiri'),
    ('A010726376', 'Rizcky Wishaputra Basnapal', 'Dinamika Sejahtera Mandiri', 'Permit & License Superintendent', 'Superintendent', 'PT Dinamika Sejahtera Mandiri'),
    ('A060726377', 'Aldi Maulana', 'Dinamika Sejahtera Mandiri', 'Procurement & Logistic', 'Superintendent', 'PT Dinamika Sejahtera Mandiri'),
    ('A130726378', 'Mazhar Andrian', 'Dinamika Sejahtera Mandiri', 'Document Controller', 'Supervisor', 'PT Dinamika Sejahtera Mandiri'),
    ('A200726379', 'Avisa Regina Cahyaningrum', 'Dinamika Sejahtera Mandiri', 'Permit and License', 'Staff', 'PT Dinamika Sejahtera Mandiri'),
    ('A270726380', 'Dwi Ibnu Afrikanto', 'Dinamika Sejahtera Mandiri', 'Human Capital', 'Superintendent', 'PT Dinamika Sejahtera Mandiri'),
    ('A300726282', 'Salma Sanniyah', 'Dinamika Sejahtera Mandiri', 'Document Controller', 'Staff', 'PT Dinamika Sejahtera Mandiri'),
    ('90110002', 'Srijani Winata', 'Finance & Accounting', 'VP of Finance & Accounting', 'Vice President', 'PT Gesit Perkasa'),
    ('14110081', 'Maradona Parhorasan Manurung', 'Finance & Accounting', 'Deputy VP of Finance & Accounting', 'Deputy VP', 'PT Gesit Perkasa'),
    ('14020071', 'Stephanie Yaputra', 'Finance & Accounting', 'Manager - Accounting', 'Manager', 'PT Gesit Perkasa'),
    ('21030340', 'Nathalia Lisi Yohanes', 'Finance & Accounting', 'Finance, Accounting and Tax', 'Deputy Manager', 'PT Sircon Development'),
    ('16080100', 'Novitasari Siregar', 'Finance & Accounting', 'Tax', 'Supervisor', 'PT Gesit Perkasa'),
    ('18080724', 'Parawinata Naidi Gaing', 'Finance & Accounting', 'Manager - Tax', 'Manager', 'PT Gesit Perkasa'),
    ('6010053', 'Mian', 'Finance & Accounting', 'Staff - Finance & Accounting', 'Staff', 'PT Gesit Perkasa'),
    ('13110063', 'Ahmad Yunus', 'Finance & Accounting', 'Messenger (BGJ)', 'Operator', 'PT Bumi Grafika Jaya'),
    ('23020355', 'Coraevi', 'Finance & Accounting', 'Deputy Manager - Finance', 'Deputy Manager', 'PT Gesit Perkasa'),
    ('23080360', 'Merly Miselly', 'Finance & Accounting', 'Finance, Accounting and Tax', 'Supervisor', 'PT Gesit Perkasa'),
    ('23100364', 'Vanesha Valentina', 'Finance & Accounting', 'Staff - Accounting', 'Staff', 'PT Gesit Perkasa'),
    ('24110377', 'Winarti', 'Finance & Accounting', 'Deputy Manager - Finance & Accounting', 'Deputy Manager', 'PT Gesit Perkasa'),
    ('161001077', 'Ita Permatasari', 'Finance & Accounting', 'Deputy Manager - Accounting', 'Deputy Manager', 'PT Dharma Alumas Sakti'),
    ('26020386', 'Heni', 'Finance & Accounting', 'Senior Finance Staff', 'Senior Staff', 'PT Gesit Perkasa'),
    ('26070390', 'Priscilia Angsari', 'Finance & Accounting', 'Senior Accounting Staff', 'Senior Staff', 'PT Gesit Perkasa'),
    ('0030526GF', 'Edel Trudis Uto', 'Gesit Foundation', 'Staff', 'Staff', 'Gesit Foundation'),
    ('0040826GF', 'Angelica Thania Ivone', 'Gesit Foundation', 'Executive Officer', 'Manager', 'Gesit Foundation'),
    ('0050826GF', 'Christin Rajagukguk', 'Gesit Foundation', 'Program Specialist', 'Supervisor', 'Gesit Foundation'),
    ('96110005', 'Ety Sumiaty', 'HR & Logistics', 'PA - BOC', 'Staff', 'PT Sircon Investment'),
    ('20040238', 'Javier Wijaya', 'HR & Logistics', 'VP of HR & Logistic', 'Vice President', 'PT Gesit Perkasa'),
    ('19110233', 'Noni', 'HR & Logistics', 'GA Support', 'Supervisor', 'PT Gesit Alumas'),
    ('99070008', 'Suryadi', 'HR & Logistics', 'Formalities', 'Staff', 'PT Gesit Alumas'),
    ('12020029', 'Retno Widiyati', 'HR & Logistics', 'Receptionist', 'Operator', 'PT Mitra Sudirman Mandiri'),
    ('93100003', 'Pratiwi', 'HR & Logistics', 'Office Boy', 'Operator', 'PT Lima Garda Sakti'),
    ('6020017', 'Andri Widiyanto', 'HR & Logistics', 'Messenger', 'Operator', 'PT Lima Sudirman Perkasa'),
    ('22050350', 'Muhammad Susilo', 'HR & Logistics', 'Formalities', 'Staff', 'PT Gesit Alumas'),
    ('22090351', 'Khairun Nisa Oktafiani', 'HR & Logistics', 'Staff - Human Resources', 'Staff', 'PT Gesit Alumas'),
    ('23080361', 'Sariana', 'HR & Logistics', 'Office Boy', 'Operator', 'PT Grahasejahtera Asri'),
    ('24090376', 'Abdul Wahid Ramdoni', 'HR & Logistics', 'Office Boy', 'Operator', 'PT Lima Sudirman Perkasa'),
    ('25040379', 'Bendry', 'HR & Logistics', 'IT Specialist', 'Supervisor', 'PT Gesit Alumas'),
    ('25040380', 'Mesrama Gultom', 'HR & Logistics', 'Office Manager', 'Manager', 'PT Gesit Alumas'),
    ('25060382', 'Rudi Si''arudin', 'HR & Logistics', 'Teknisi IT', 'Staff', 'PT Gesit Alumas'),
    ('26060389', 'Julhan Sabani', 'HR & Logistics', 'Driver Operational', 'Operator', 'PT Gesit Alumas'),
    ('21070342', 'Dinny Anggraini', 'PA & Secretary', 'PA - CEO', 'Deputy Manager', 'PT Gesit Perkasa'),
    ('24060371', 'Artika Octavin Manafe', 'PA & Secretary', 'PA - Investment', 'Supervisor', 'PT Dharma Alumas Sakti'),
    ('25012385', 'Cherie Goh Pei Wen', 'PA & Secretary', 'PA & Secretary - Singapore', 'Supervisor', 'PT Gesit Investment Corporation PTE.LTD'),
    ('99080009', 'Asmawati', 'PA & Secretary', 'PA - MSB', 'Deputy Manager', 'PT Gesit Perkasa'),
    ('24020366', 'Nabillah Saroh Afifah', 'PA & Secretary', 'PA & Secretary', 'Staff', 'PT Gesit Perkasa'),
    ('26040388', 'Rizki Meisara Rosadi', 'PA & Secretary', 'PA - Chairman', 'Supervisor', 'PT Dharma Alumas Sakti'),
    ('070201', 'Yamanudin', 'Prodas', 'Kurir', 'Operator', 'PT Prodas Perdana'),
    ('091102', 'Juwarno', 'Prodas', 'Teknisi', 'Operator', 'PT Prodas Perdana'),
    ('260502', 'Ahmad Arif Aolia', 'Prodas', 'Staff', 'Staff', 'PT Prodas Perdana'),
    ('260704', 'Anta Agung Syahputra', 'Prodas', 'Administrasi & Marketing', 'Staff', 'PT Prodas Perdana'),
    ('24090374', 'Adriana Neysa Yulita Sutanto', 'Property', 'Project Manager', 'Manager', 'PT Dharma Alumas Sakti'),
    ('19060229', 'Jave Soetoyo', 'Property', 'VP of Property & Investments', 'Vice President', 'PT Dharma Alumas Sakti'),
    ('13050051', 'Stefanini', 'Property', 'Manager - Property Management, Finance & Admin', 'Manager', 'PT Dharma Alumas Sakti'),
    ('17070119', 'Eliaanti Christine', 'Property', 'Project Admin for Property', 'Deputy Manager', 'PT Dharma Alumas Sakti'),
    ('11050024', 'Yohanes Donny Triatmoko', 'Property', 'Deputy Manager - Property', 'Deputy Manager', 'PT Dharma Alumas Sakti'),
    ('001/AE', 'Petrus Voki Cahyadi', 'Property', 'Manager - Finance & Accounting for Property', 'Manager', 'PT Dharma Alumas Sakti'),
    ('13120067', 'Corinna Soetoyo', 'Property', 'Supervisor - Sales & Marketing for Property', 'Staff', 'PT Dharma Alumas Sakti'),
    ('9100020', 'Romli', 'Property', 'Staff - Facility Management for Property', 'Staff', 'PT Gesit Bumi Persada'),
    ('24030367', 'Devi Aryani', 'Property', 'Manager - Marketing for Property', 'Manager', 'PT Dharma Alumas Sakti'),
    ('25060381', 'Katherine Herviana Sumantri', 'Property', 'Architecture', 'Deputy Manager', 'PT Dharma Alumas Sakti'),
    ('260101', 'Nurarifah Dwiyuniar', 'Staff', 'Staff - Finance & Accounting', 'Staff', 'PT Prodas Perdana'),
    ('97090006', 'Suryadi Hertanto', 'Trading', 'Deputy VP - Trading B', 'Deputy VP', 'PT Gesit Intrade'),
    ('16040098', 'Hilaluddin', 'Trading', 'Supervisor - Trader', 'Supervisor', 'PT Gesit Intrade'),
    ('20010234', 'Harvey Kurniawan', 'Trading', 'Velec Contractor', 'Staff', 'PT Gesit Intrade'),
    ('26080391', 'Stefani Cyntia Dwi Ningrum', 'Trading', 'Staff - Trading', 'Staff', 'PT Gesit Intrade')
ON CONFLICT (employee_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    organization = EXCLUDED.organization,
    job_position = EXCLUDED.job_position,
    job_level = EXCLUDED.job_level,
    branch_name = EXCLUDED.branch_name;

-- ==========================================================================
-- 3. SUPERVISOR ASSIGNMENTS
-- ==========================================================================
-- Creates approval chain for each employee based on the 4-level hierarchy
-- Level 1: Direct Supervisor (Approval Line 1)
-- Level 2: Higher Supervisor (Approval Line 2)
-- Level 3: HR / Management (Column 1)
-- Level 4: Office Management (Column 2)

CREATE TABLE IF NOT EXISTS supervisor_assignments (
    id SERIAL PRIMARY KEY,
    staff_employee_id TEXT NOT NULL,
    supervisor_employee_id TEXT NOT NULL,
    approval_level INTEGER NOT NULL REFERENCES approval_levels(level_number),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(staff_employee_id, approval_level)
);

INSERT INTO supervisor_assignments (staff_employee_id, supervisor_employee_id, approval_level)
VALUES
    ('BOC00001', '22090351', 1),
    ('BOC00001', '25040380', 2),
    ('BOC00002', '22090351', 1),
    ('BOC00002', '25040380', 2),
    ('BOC00003', '22090351', 1),
    ('BOC00003', '25040380', 2),
    ('BOC00004', '22090351', 1),
    ('BOC00004', '25040380', 2),
    ('BOC00005', '22090351', 1),
    ('BOC00005', '25040380', 2),
    ('A011225359', 'A040917073', 1),
    ('A011225359', 'A010323198', 2),
    ('A011225359', 'A021017067', 3),
    ('A151025337', 'A060417013', 1),
    ('A151025337', 'A021017067', 2),
    ('A151025337', 'A010323198', 3),
    ('A271025340', 'A010323198', 1),
    ('A271025340', 'A021017067', 2),
    ('A271025340', 'A010323198', 3),
    ('A281025341', 'A060417013', 1),
    ('A281025341', 'A021017067', 2),
    ('A281025341', 'A010323198', 3),
    ('A03112025435', 'A060417013', 1),
    ('A03112025435', 'A021017067', 2),
    ('A03112025435', 'A010323198', 3),
    ('A03112025344', 'A060417013', 1),
    ('A03112025344', 'A021017067', 2),
    ('A03112025344', 'A010323198', 3),
    ('A171125353', 'A060417013', 1),
    ('A171125353', 'A021017067', 2),
    ('A171125353', 'A010323198', 3),
    ('A081225361', 'A151025337', 1),
    ('A081225361', 'A021017067', 2),
    ('A081225361', 'A010323198', 3),
    ('A011225360', 'A310717034', 1),
    ('A011225360', 'A021017067', 2),
    ('A011225360', 'A010323198', 3),
    ('20070239', '99090012', 1),
    ('20070239', '22090351', 2),
    ('20070239', '25040380', 3),
    ('99090012', '21070342', 1),
    ('99090012', '25040380', 2),
    ('99090012', '22090351', 3),
    ('13070059', '99090012', 1),
    ('13070059', '22090351', 2),
    ('13070059', '25040380', 3),
    ('24010365', '20070239', 1),
    ('24010365', '22090351', 2),
    ('24010365', '25040380', 3),
    ('96050004', '21070342', 1),
    ('96050004', '25040380', 2),
    ('96050004', '22090351', 3),
    ('001/AI', '96050004', 1),
    ('001/AI', '22090351', 2),
    ('001/AI', '25040380', 3),
    ('22050349', '96050004', 1),
    ('22050349', '22090351', 2),
    ('22050349', '25040380', 3),
    ('22020378', '22050349', 1),
    ('22020378', '22090351', 2),
    ('22020378', '25040380', 3),
    ('25010384', '22050349', 1),
    ('25010384', '22090351', 2),
    ('25010384', '25040380', 3),
    ('A26021886', 'A040917073', 1),
    ('A26021886', 'A010323198', 2),
    ('A26021886', 'A021017067', 3),
    ('A040917073', 'A021017067', 1),
    ('A040917073', 'A010323198', 2),
    ('A310717034', 'A011225359', 1),
    ('A310717034', 'A021017067', 2),
    ('A310717034', 'A010323198', 3),
    ('A23111783', 'A26021886', 1),
    ('A23111783', 'A021017067', 2),
    ('A23111783', 'A010323198', 3),
    ('A120722165', 'A021017067', 1),
    ('A120722165', 'A010323198', 2),
    ('A060417013', 'A26021886', 1),
    ('A060417013', 'A021017067', 2),
    ('A060417013', 'A010323198', 3),
    ('A20111784', 'A040917073', 1),
    ('A20111784', 'A021017067', 2),
    ('A20111784', 'A010323198', 3),
    ('A250521149', 'A26021886', 1),
    ('A250521149', 'A021017067', 2),
    ('A250521149', 'A010323198', 3),
    ('A100717023', 'A250521149', 1),
    ('A100717023', 'A021017067', 2),
    ('A100717023', 'A010323198', 3),
    ('A021017067', 'A010323198', 1),
    ('A021017067', 'A021017067', 2),
    ('A021017067', 'A010323198', 3),
    ('A170619125B', 'A040917073', 1),
    ('A170619125B', 'A021017067', 2),
    ('A170619125B', 'A010323198', 3),
    ('A010323198', 'A040917073', 1),
    ('A010323198', 'A021017067', 2),
    ('A010323198', 'A010323198', 3),
    ('A070923199', 'A23111783', 1),
    ('A070923199', 'A021017067', 2),
    ('A070923199', 'A010323198', 3),
    ('A210224214', 'A011225359', 1),
    ('A210224214', 'A021017067', 2),
    ('A210224214', 'A010323198', 3),
    ('A010724300', 'A021017067', 1),
    ('A010724300', 'A010323198', 2),
    ('A030225301', 'A210224214', 1),
    ('A030225301', 'A021017067', 2),
    ('A030225301', 'A010323198', 3),
    ('A170225302', 'A310717034', 1),
    ('A170225302', 'A021017067', 2),
    ('A170225302', 'A010323198', 3),
    ('A180825317', 'A060417013', 1),
    ('A180825317', 'A021017067', 2),
    ('A180825317', 'A010323198', 3),
    ('A010925318', 'A010323198', 1),
    ('A010925318', 'A021017067', 2),
    ('A010925318', 'A010323198', 3),
    ('A260925323', 'A170619125B', 1),
    ('A260925323', 'A021017067', 2),
    ('A260925323', 'A010323198', 3),
    ('A011025325', 'A23111783', 1),
    ('A011025325', 'A021017067', 2),
    ('A011025325', 'A010323198', 3),
    ('A241125354', 'A021017067', 1),
    ('A241125354', 'A010323198', 2),
    ('A050126363', 'A010925318', 1),
    ('A050126363', 'A021017067', 2),
    ('A050126363', 'A010323198', 3),
    ('A050126362', 'A26021886', 1),
    ('A050126362', 'A021017067', 2),
    ('A050126362', 'A010323198', 3),
    ('A050126364', 'A010323198', 1),
    ('A050126364', 'A021017067', 2),
    ('A050126364', 'A010323198', 3),
    ('A090326366', 'A040917073', 1),
    ('A090326366', 'A021017067', 2),
    ('A090326366', 'A010323198', 3),
    ('A010426367', 'A011225359', 1),
    ('A010426367', 'A021017067', 2),
    ('A010426367', 'A010323198', 3),
    ('A010426368', 'A011225359', 1),
    ('A010426368', 'A021017067', 2),
    ('A010426368', 'A010323198', 3),
    ('A270426370', 'A171125353', 1),
    ('A270426370', 'A021017067', 2),
    ('A270426370', 'A010323198', 3),
    ('A060526284', 'A151025337', 1),
    ('A060526284', 'A021017067', 2),
    ('A060526284', 'A010323198', 3),
    ('A080626372', 'A050126364', 1),
    ('A080626372', 'A021017067', 2),
    ('A080626372', 'A010323198', 3),
    ('A080626373', 'A26021886', 1),
    ('A080626373', 'A021017067', 2),
    ('A080626373', 'A010323198', 3),
    ('A180626374', 'A250521149', 1),
    ('A180626374', 'A021017067', 2),
    ('A180626374', 'A010323198', 3),
    ('A010726376', 'A060417013', 1),
    ('A010726376', 'A021017067', 2),
    ('A010726376', 'A010323198', 3),
    ('A060726377', 'A26021886', 1),
    ('A060726377', 'A021017067', 2),
    ('A060726377', 'A010323198', 3),
    ('A130726378', 'A060417013', 1),
    ('A130726378', 'A021017067', 2),
    ('A130726378', 'A010323198', 3),
    ('A200726379', 'A010726376', 1),
    ('A200726379', 'A021017067', 2),
    ('A200726379', 'A010323198', 3),
    ('A270726380', 'A010323198', 1),
    ('A270726380', 'A021017067', 2),
    ('A270726380', 'A010323198', 3),
    ('A300726282', 'A080626372', 1),
    ('A300726282', 'A021017067', 2),
    ('A300726282', 'A010323198', 3),
    ('90110002', '21070342', 1),
    ('90110002', '25040380', 2),
    ('90110002', '22090351', 3),
    ('14110081', '90110002', 1),
    ('14110081', '22090351', 2),
    ('14110081', '25040380', 3),
    ('14020071', '14110081', 1),
    ('14020071', '22090351', 2),
    ('14020071', '25040380', 3),
    ('21030340', '14110081', 1),
    ('21030340', '22090351', 2),
    ('21030340', '25040380', 3),
    ('16080100', '18080724', 1),
    ('16080100', '22090351', 2),
    ('16080100', '25040380', 3),
    ('18080724', '14110081', 1),
    ('18080724', '22090351', 2),
    ('18080724', '25040380', 3),
    ('6010053', '23020355', 1),
    ('6010053', '22090351', 2),
    ('6010053', '25040380', 3),
    ('13110063', '19110233', 1),
    ('13110063', '22090351', 2),
    ('13110063', '25040380', 3),
    ('23020355', '14110081', 1),
    ('23020355', '22090351', 2),
    ('23020355', '25040380', 3),
    ('23080360', '14110081', 1),
    ('23080360', '22090351', 2),
    ('23080360', '25040380', 3),
    ('23100364', '14020071', 1),
    ('23100364', '22090351', 2),
    ('23100364', '25040380', 3),
    ('24110377', '14110081', 1),
    ('24110377', '22090351', 2),
    ('24110377', '25040380', 3),
    ('161001077', '22090351', 1),
    ('161001077', '25040380', 2),
    ('26020386', '23020355', 1),
    ('26020386', '22090351', 2),
    ('26020386', '25040380', 3),
    ('26070390', '14020071', 1),
    ('26070390', '22090351', 2),
    ('26070390', '25040380', 3),
    ('0030526GF', '22090351', 1),
    ('0030526GF', '25040380', 2),
    ('0040826GF', '13050051', 1),
    ('0040826GF', '22090351', 2),
    ('0040826GF', '25040380', 3),
    ('0050826GF', '0040826GF', 1),
    ('0050826GF', '22090351', 2),
    ('0050826GF', '25040380', 3),
    ('96110005', '22090351', 1),
    ('96110005', '25040380', 2),
    ('96110005', '20040238', 3),
    ('20040238', '21070342', 1),
    ('20040238', '25040380', 2),
    ('20040238', '22090351', 3),
    ('19110233', '25040380', 1),
    ('19110233', '22090351', 2),
    ('19110233', '25040380', 3),
    ('99070008', '25040380', 1),
    ('99070008', '22090351', 2),
    ('99070008', '25040380', 3),
    ('12020029', '19110233', 1),
    ('12020029', '22090351', 2),
    ('12020029', '25040380', 3),
    ('93100003', '19110233', 1),
    ('93100003', '22090351', 2),
    ('93100003', '25040380', 3),
    ('6020017', '19110233', 1),
    ('6020017', '22090351', 2),
    ('6020017', '25040380', 3),
    ('22050350', '99070008', 1),
    ('22050350', '22090351', 2),
    ('22050350', '25040380', 3),
    ('22090351', '22090351', 1),
    ('22090351', '25040380', 2),
    ('23080361', '19110233', 1),
    ('23080361', '22090351', 2),
    ('23080361', '25040380', 3),
    ('24090376', '19110233', 1),
    ('24090376', '22090351', 2),
    ('24090376', '25040380', 3),
    ('25040379', '25040380', 1),
    ('25040379', '22090351', 2),
    ('25040379', '25040380', 3),
    ('25040380', '20040238', 1),
    ('25040380', '22090351', 2),
    ('25040380', '25040380', 3),
    ('25060382', '25040379', 1),
    ('25060382', '22090351', 2),
    ('25060382', '25040380', 3),
    ('26060389', '19110233', 1),
    ('26060389', '22090351', 2),
    ('26060389', '25040380', 3),
    ('21070342', '22090351', 1),
    ('21070342', '25040380', 2),
    ('24060371', '22090351', 1),
    ('24060371', '25040380', 2),
    ('25012385', '25040380', 1),
    ('25012385', '22090351', 2),
    ('25012385', '20040238', 3),
    ('99080009', '22090351', 1),
    ('99080009', '25040380', 2),
    ('99080009', '20040238', 3),
    ('24020366', '22090351', 1),
    ('24020366', '25040380', 2),
    ('24020366', '20040238', 3),
    ('26040388', '25040380', 1),
    ('26040388', '22090351', 2),
    ('26040388', '25040380', 3),
    ('070201', '17070119', 1),
    ('070201', '17070119', 2),
    ('091102', '17070119', 1),
    ('091102', '17070119', 2),
    ('260502', '17070119', 1),
    ('260502', '17070119', 2),
    ('260704', '17070119', 1),
    ('260704', '17070119', 2),
    ('24090374', '24060371', 1),
    ('24090374', '22090351', 2),
    ('24090374', '25040380', 3),
    ('19060229', '21070342', 1),
    ('19060229', '25040380', 2),
    ('19060229', '22090351', 3),
    ('13050051', '24060371', 1),
    ('13050051', '22090351', 2),
    ('13050051', '25040380', 3),
    ('17070119', '13050051', 1),
    ('17070119', '22090351', 2),
    ('17070119', '25040380', 3),
    ('11050024', '13050051', 1),
    ('11050024', '22090351', 2),
    ('11050024', '25040380', 3),
    ('001/AE', '13050051', 1),
    ('001/AE', '22090351', 2),
    ('001/AE', '25040380', 3),
    ('13120067', '13050051', 1),
    ('13120067', '22090351', 2),
    ('13120067', '25040380', 3),
    ('9100020', '17070119', 1),
    ('9100020', '22090351', 2),
    ('9100020', '25040380', 3),
    ('24030367', '13050051', 1),
    ('24030367', '22090351', 2),
    ('24030367', '25040380', 3),
    ('25060381', '24090374', 1),
    ('25060381', '22090351', 2),
    ('25060381', '25040380', 3),
    ('260101', '17070119', 1),
    ('260101', '17070119', 2),
    ('97090006', '20040238', 1),
    ('97090006', '22090351', 2),
    ('97090006', '25040380', 3),
    ('16040098', '97090006', 1),
    ('16040098', '22090351', 2),
    ('16040098', '25040380', 3),
    ('20010234', '97090006', 1),
    ('20010234', '22090351', 2),
    ('20010234', '25040380', 3),
    ('26080391', '16040098', 1),
    ('26080391', '22090351', 2),
    ('26080391', '25040380', 3)
ON CONFLICT (staff_employee_id, approval_level) DO UPDATE SET
    supervisor_employee_id = EXCLUDED.supervisor_employee_id,
    is_active = true;

-- ==========================================================================
-- 4. APPROVAL CHAIN SUMMARY VIEW
-- ==========================================================================
-- Shows each employee's full 4-level approval chain

CREATE OR REPLACE VIEW v_approval_chain_summary AS
WITH employee_list AS (
    SELECT DISTINCT employee_id, full_name, organization, job_position, job_level, branch_name
    FROM user_accounts
    WHERE employee_id IN (
        SELECT staff_employee_id FROM supervisor_assignments
        UNION
        SELECT supervisor_employee_id FROM supervisor_assignments
    )
),
level1 AS (
    SELECT sa.staff_employee_id, sa.supervisor_employee_id AS supervisor_id, ua.full_name AS supervisor_name
    FROM supervisor_assignments sa
    JOIN user_accounts ua ON ua.employee_id = sa.supervisor_employee_id
    WHERE sa.approval_level = 1
),
level2 AS (
    SELECT sa.staff_employee_id, sa.supervisor_employee_id AS supervisor_id, ua.full_name AS supervisor_name
    FROM supervisor_assignments sa
    JOIN user_accounts ua ON ua.employee_id = sa.supervisor_employee_id
    WHERE sa.approval_level = 2
),
level3 AS (
    SELECT sa.staff_employee_id, sa.supervisor_employee_id AS supervisor_id, ua.full_name AS supervisor_name
    FROM supervisor_assignments sa
    JOIN user_accounts ua ON ua.employee_id = sa.supervisor_employee_id
    WHERE sa.approval_level = 3
),
level4 AS (
    SELECT sa.staff_employee_id, sa.supervisor_employee_id AS supervisor_id, ua.full_name AS supervisor_name
    FROM supervisor_assignments sa
    JOIN user_accounts ua ON ua.employee_id = sa.supervisor_employee_id
    WHERE sa.approval_level = 4
)
SELECT
    el.employee_id,
    el.full_name,
    el.organization,
    el.job_position,
    el.job_level,
    el.branch_name,
    l1.supervisor_id AS level1_supervisor_id,
    l1.supervisor_name AS level1_supervisor_name,
    l2.supervisor_id AS level2_supervisor_id,
    l2.supervisor_name AS level2_supervisor_name,
    l3.supervisor_id AS level3_supervisor_id,
    l3.supervisor_name AS level3_supervisor_name,
    l4.supervisor_id AS level4_supervisor_id,
    l4.supervisor_name AS level4_supervisor_name
FROM employee_list el
LEFT JOIN level1 l1 ON l1.staff_employee_id = el.employee_id
LEFT JOIN level2 l2 ON l2.staff_employee_id = el.employee_id
LEFT JOIN level3 l3 ON l3.staff_employee_id = el.employee_id
LEFT JOIN level4 l4 ON l4.staff_employee_id = el.employee_id
ORDER BY el.organization, el.full_name;

-- ==========================================================================
-- 5. GRANT PERMISSIONS (Supabase RLS compatible)
-- ==========================================================================
-- Allow authenticated users to read the summary view
-- (Actual RLS policies should be configured in Supabase dashboard)
GRANT SELECT ON v_approval_chain_summary TO authenticated;
GRANT SELECT ON approval_levels TO authenticated;

COMMIT;

-- ==========================================================================
-- VERIFICATION QUERIES (uncomment to test)
-- ==========================================================================
-- SELECT * FROM approval_levels ORDER BY level_number;
-- SELECT COUNT(*) AS total_user_accounts FROM user_accounts;
-- SELECT COUNT(*) AS total_assignments FROM supervisor_assignments;
-- SELECT * FROM v_approval_chain_summary LIMIT 10;