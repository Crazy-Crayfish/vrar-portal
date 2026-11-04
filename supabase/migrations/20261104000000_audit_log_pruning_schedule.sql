-- Turns on pg_cron and schedules the weekly audit_log pruning.
--
-- 20260921000000_audit_log.sql schedules the job only when pg_cron is
-- already on, and leaves enabling it to the dashboard, so on a fresh project
-- the job was never created and the log would grow forever. Migrations now
-- deploy on merge rather than being re-run by hand, so "enable it, then
-- re-run that file" no longer applies; this does both here instead.
--
-- Same job, schedule and retention as that migration: "prune-audit-log",
-- Sundays 03:30 UTC, keeping 12 months. If you change the retention, change
-- AUDIT_LOG_RETENTION_MONTHS in src/lib/auditLog.ts to match.
--
-- Safe to re-run: scheduling under an existing job name replaces that job.

create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

select cron.schedule('prune-audit-log', '30 3 * * 0', 'select public.prune_audit_log(12)');
