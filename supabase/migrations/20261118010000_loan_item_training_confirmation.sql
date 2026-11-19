-- When the borrower confirmed they had read the item's training material.
--
-- An item's training material is its existing documentation_url (relabelled
-- "training" in the app; no separate column). When an item has one, the
-- checkout's signing step shows a tick-box under that item's agreement and
-- won't continue until it's ticked, the same way it won't continue without a
-- signature. The time of the tick is stored here, in the same insert that
-- stores signature_name and signature_date.
--
-- Null means "not recorded": the item had no training link when it was
-- requested, or it was requested before this column existed. Like the
-- signature, the database records the confirmation and doesn't enforce it.
--
-- No audit or guard change needed: it's written once, by the insert already
-- logged as loan_item.requested, and guard_member_loan_item_update
-- (20260925000000) already refuses a member changing it afterwards, since it
-- compares every column except the return-request ones.
--
-- Safe to re-run.

alter table loan_request_items
  add column if not exists training_confirmed_at timestamptz;
