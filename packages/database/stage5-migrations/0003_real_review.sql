CREATE SCHEMA IF NOT EXISTS stage5_real;
CREATE TABLE IF NOT EXISTS stage5_real.stage5_review_sessions (
  id uuid PRIMARY KEY, purpose text NOT NULL CHECK(purpose='local-noncommercial-evaluation'),
  enabled boolean NOT NULL DEFAULT false, scope jsonb NOT NULL, snapshot_id uuid,
  request_spent boolean NOT NULL DEFAULT false,
  CHECK(scope->>'publicDisplay'='false'),
  CHECK(scope->>'dataNature' IN ('real','synthetic-path-test'))
);
CREATE TABLE IF NOT EXISTS stage5_real.stage5_review_observations (
  id uuid PRIMARY KEY, session_id uuid NOT NULL REFERENCES stage5_real.stage5_review_sessions(id),
  version integer NOT NULL CHECK(version>0), digest text NOT NULL,payload jsonb NOT NULL,
  CHECK(payload->>'dataNature' IN ('real','synthetic-path-test')),
  CHECK(payload->'sourceEntityId'='null'::jsonb),
  CHECK(payload->>'publicVisibility'='local-only'),
  CHECK(payload->>'sourcePageUrl'='https://yuc.wiki/202610/'),
  CHECK(payload - ARRAY['observationId','snapshotId','version','sessionId','dataNature','sourceEntityId','sourcePageUrl','observedAt','parserVersion','ordinal','fields','provenance','publicVisibility']='{}'::jsonb),
  CHECK((payload->'fields') - ARRAY['title','releaseDate','broadcast','season']='{}'::jsonb)
);
CREATE TABLE IF NOT EXISTS stage5_real.stage5_review_observation_history (
  observation_id uuid NOT NULL REFERENCES stage5_real.stage5_review_observations(id),
  version integer NOT NULL,digest text NOT NULL,payload jsonb NOT NULL,PRIMARY KEY(observation_id,version)
);
CREATE TABLE IF NOT EXISTS stage5_real.stage5_review_works (
  id text PRIMARY KEY CHECK(id LIKE 'real-local-%'),slug text NOT NULL UNIQUE CHECK(slug LIKE 'real-local-%'),
  session_id uuid NOT NULL REFERENCES stage5_real.stage5_review_sessions(id),version integer NOT NULL DEFAULT 1,
  base_values jsonb NOT NULL,current_values jsonb NOT NULL,owners jsonb NOT NULL DEFAULT '{}',identity_evidence jsonb,
  CHECK(base_values - ARRAY['title','date','time','timezone','year','quarter','status']='{}'::jsonb),
  CHECK(current_values - ARRAY['title','date','time','timezone','year','quarter','status']='{}'::jsonb)
);
CREATE TABLE IF NOT EXISTS stage5_real.stage5_review_mappings (
  id uuid PRIMARY KEY,observation_id uuid NOT NULL REFERENCES stage5_real.stage5_review_observations(id),
  work_id text NOT NULL REFERENCES stage5_real.stage5_review_works(id),request jsonb NOT NULL,
  status text NOT NULL CHECK(status IN ('approved','revoked')),revoked_reason text,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS stage5_real_one_active_mapping ON stage5_real.stage5_review_mappings(observation_id) WHERE status='approved';
CREATE TABLE IF NOT EXISTS stage5_real.stage5_review_adoptions (
  id uuid PRIMARY KEY,mapping_id uuid NOT NULL REFERENCES stage5_real.stage5_review_mappings(id),request jsonb NOT NULL,
  status text NOT NULL CHECK(status IN ('approved','conflict','revoked')),conflicts jsonb NOT NULL DEFAULT '[]',revoked_reason text,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS stage5_real.stage5_review_contributions (
  sequence bigserial PRIMARY KEY,adoption_id uuid NOT NULL REFERENCES stage5_real.stage5_review_adoptions(id),
  work_id text NOT NULL REFERENCES stage5_real.stage5_review_works(id),
  field text NOT NULL CHECK(field IN ('title','date','time','timezone','year','quarter','status')),
  value jsonb NOT NULL,provenance jsonb NOT NULL,UNIQUE(adoption_id,field)
);
CREATE TABLE IF NOT EXISTS stage5_real.stage5_review_dispositions (
  sequence bigserial PRIMARY KEY,observation_id uuid NOT NULL REFERENCES stage5_real.stage5_review_observations(id),
  status text NOT NULL CHECK(status IN ('pending','rejected')),reason text NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
