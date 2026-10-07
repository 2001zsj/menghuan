CREATE TABLE IF NOT EXISTS stage5_yuc_source (
  source_key text PRIMARY KEY CHECK (source_key = 'synthetic-yuc'),
  enabled boolean NOT NULL DEFAULT false
);
INSERT INTO stage5_yuc_source(source_key) VALUES ('synthetic-yuc') ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS stage5_yuc_candidates (
  record_id text PRIMARY KEY,
  entity_key text NOT NULL,
  payload jsonb NOT NULL CHECK (payload->>'kind' = 'synthetic'),
  adopted_page jsonb,
  mapping_reason text,
  active boolean NOT NULL DEFAULT false,
  CHECK (NOT active OR (adopted_page IS NOT NULL AND length(mapping_reason) >= 5))
);
CREATE UNIQUE INDEX IF NOT EXISTS stage5_yuc_one_active_entity
  ON stage5_yuc_candidates(entity_key) WHERE active;
CREATE UNIQUE INDEX IF NOT EXISTS stage5_yuc_one_active_anime
  ON stage5_yuc_candidates((adopted_page->'anime'->>'id')) WHERE active;
CREATE UNIQUE INDEX IF NOT EXISTS stage5_yuc_one_active_slug
  ON stage5_yuc_candidates((adopted_page->'anime'->>'slug')) WHERE active;
