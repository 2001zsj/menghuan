-- Destructive addon removal: export candidate/mapping snapshots before executing.
-- Stage3/Stage4 tables and records are intentionally untouched.
DROP TABLE IF EXISTS stage5_yuc_candidates;
DROP TABLE IF EXISTS stage5_yuc_source;
