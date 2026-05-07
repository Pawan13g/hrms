-- No-op: we cannot know which permissions were added by this backfill vs
-- already present, so rollback is not meaningful.
SELECT 1;
