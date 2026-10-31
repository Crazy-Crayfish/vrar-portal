-- Removes the placeholder `loans` table created by
-- 20260816000000_profiles_baseline.sql. It existed only so that
-- 20260914061000_loan_approval_audit.sql and
-- 20260927010000_loans_legacy_fk_cleanup.sql, which alter it, could run on a
-- fresh project. Nothing in the app reads or writes it; every loan lives in
-- loan_requests / loan_request_items.
--
-- Safe to re-run.

drop table if exists public.loans;
