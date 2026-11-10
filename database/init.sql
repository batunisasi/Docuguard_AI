CREATE SCHEMA IF NOT EXISTS n8n;
CREATE SCHEMA IF NOT EXISTS docuguard;

CREATE TABLE IF NOT EXISTS docuguard.reference_documents (
  id UUID PRIMARY KEY,
  report_type TEXT NOT NULL CHECK (report_type IN ('sales','budget','incident')),
  document_kind TEXT NOT NULL CHECK (document_kind IN ('sop','template')),
  version_no INTEGER NOT NULL CHECK (version_no > 0),
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  storage_path TEXT NOT NULL,
  extracted_text TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (report_type, document_kind, version_no)
);

CREATE UNIQUE INDEX IF NOT EXISTS one_active_reference_per_type_kind
ON docuguard.reference_documents(report_type, document_kind)
WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS docuguard.reviews (
  id UUID PRIMARY KEY,
  parent_review_id UUID NULL REFERENCES docuguard.reviews(id),
  report_type TEXT NOT NULL CHECK (report_type IN ('sales','budget','incident')),
  version_no INTEGER NOT NULL DEFAULT 1,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  storage_path TEXT NOT NULL,
  extracted_text TEXT NOT NULL,
  reference_snapshot JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'PROCESSING',
  results JSONB NULL,
  human_review_required BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ NULL,
  UNIQUE (parent_review_id, version_no)
);

CREATE INDEX IF NOT EXISTS reviews_created_at_idx
ON docuguard.reviews(created_at DESC);

CREATE TABLE IF NOT EXISTS docuguard.review_events (
  id BIGSERIAL PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES docuguard.reviews(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
