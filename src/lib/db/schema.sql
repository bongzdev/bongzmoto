-- BongzMoto Workshop Management System - SQLite / LibSQL Local Schema
-- Supports complete multi-tenant workshop isolation, sequential job numbering, quotes revisions, and payments.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS workshops (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id TEXT NOT NULL,
  phone TEXT NOT NULL,
  phone_display TEXT NOT NULL,
  address TEXT NOT NULL,
  tax_enabled INTEGER DEFAULT 0,
  tax_rate_percent REAL DEFAULT 15.0,
  vat_number TEXT,
  job_prefix TEXT DEFAULT 'JOB-',
  receipt_prefix TEXT DEFAULT 'REC-',
  next_job_number INTEGER DEFAULT 1,
  next_receipt_number INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('owner', 'mechanic')),
  active_workshop_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (active_workshop_id) REFERENCES workshops(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS workshop_members (
  id TEXT PRIMARY KEY,
  workshop_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('owner', 'mechanic')),
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(workshop_id, user_id),
  FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  workshop_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,          -- Normalized e.g. +27821234567
  phone_display TEXT NOT NULL,  -- Display format e.g. 082 123 4567
  email TEXT,
  address TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_customers_workshop_phone ON customers(workshop_id, phone);
CREATE INDEX IF NOT EXISTS idx_customers_workshop_name ON customers(workshop_id, full_name);

CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  workshop_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  registration TEXT NOT NULL,         -- Normalized e.g. CA123456
  registration_display TEXT NOT NULL, -- Display e.g. CA 123-456
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER,
  mileage INTEGER,
  vin TEXT,
  engine_no TEXT,
  color TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_vehicles_workshop_reg ON vehicles(workshop_id, registration);
CREATE INDEX IF NOT EXISTS idx_vehicles_customer ON vehicles(customer_id);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  workshop_id TEXT NOT NULL,
  job_number TEXT NOT NULL, -- e.g. JOB-0001
  customer_id TEXT NOT NULL,
  vehicle_id TEXT NOT NULL,
  assigned_mechanic_id TEXT,
  status TEXT NOT NULL CHECK(status IN (
    'received', 'diagnosing', 'awaiting_approval', 
    'waiting_for_parts', 'in_progress', 'ready_for_collection', 
    'closed', 'cancelled'
  )) DEFAULT 'received',
  payment_status TEXT NOT NULL CHECK(payment_status IN (
    'unpaid', 'partially_paid', 'paid', 'overpaid'
  )) DEFAULT 'unpaid',
  customer_reported_problem TEXT NOT NULL,
  intake_date TEXT DEFAULT (datetime('now')),
  expected_completion_date TEXT,
  diagnosis_notes TEXT,
  ready_date TEXT,
  closed_at TEXT,
  closing_notes TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(workshop_id, job_number),
  FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_mechanic_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_jobs_workshop_status ON jobs(workshop_id, status);
CREATE INDEX IF NOT EXISTS idx_jobs_vehicle ON jobs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_jobs_customer ON jobs(customer_id);

CREATE TABLE IF NOT EXISTS job_tasks (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  workshop_id TEXT NOT NULL,
  description TEXT NOT NULL,
  is_completed INTEGER DEFAULT 0,
  assigned_to TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS job_attachments (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  workshop_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN (
    'intake', 'diagnosis', 'customer_approval', 
    'parts_receipt', 'work_in_progress', 'completed_work'
  )),
  caption TEXT,
  uploaded_by TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_attachments_job ON job_attachments(job_id);

CREATE TABLE IF NOT EXISTS job_transcripts (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  attachment_id TEXT,
  workshop_id TEXT NOT NULL,
  audio_duration_seconds INTEGER,
  raw_transcript TEXT NOT NULL,
  structured_issue TEXT,
  structured_checks TEXT,
  structured_findings TEXT,
  structured_next_steps TEXT,
  status TEXT NOT NULL CHECK(status IN ('draft_review_required', 'reviewed')) DEFAULT 'draft_review_required',
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (attachment_id) REFERENCES job_attachments(id) ON DELETE SET NULL,
  FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS quotes (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  workshop_id TEXT NOT NULL,
  revision_number INTEGER NOT NULL DEFAULT 1,
  is_current INTEGER NOT NULL DEFAULT 1,
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  tax_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  tax_rate_percent REAL DEFAULT 0,
  notes TEXT,
  validity_date TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(job_id, revision_number),
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS quote_items (
  id TEXT PRIMARY KEY,
  quote_id TEXT NOT NULL,
  workshop_id TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK(item_type IN ('part', 'labour')),
  description TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1.0,
  unit_price_cents INTEGER NOT NULL DEFAULT 0,
  total_price_cents INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE,
  FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote ON quote_items(quote_id);

CREATE TABLE IF NOT EXISTS quote_approvals (
  id TEXT PRIMARY KEY,
  quote_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  workshop_id TEXT NOT NULL,
  revision_number INTEGER NOT NULL,
  approved_amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('approved', 'rejected', 'awaiting_response')),
  method TEXT NOT NULL CHECK(method IN ('verbal', 'whatsapp', 'signed', 'in_person', 'other')),
  staff_id TEXT NOT NULL,
  notes TEXT,
  attachment_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE CASCADE,
  FOREIGN KEY (staff_id) REFERENCES users(id),
  FOREIGN KEY (attachment_id) REFERENCES job_attachments(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_approvals_quote ON quote_approvals(quote_id);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  workshop_id TEXT NOT NULL,
  receipt_number TEXT NOT NULL, -- e.g. REC-0001
  amount_cents INTEGER NOT NULL,
  payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'eft', 'card_external', 'other')),
  payment_date TEXT DEFAULT (datetime('now')),
  reference TEXT,
  notes TEXT,
  recorded_by TEXT NOT NULL,
  idempotency_key TEXT UNIQUE,
  is_reversed INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(workshop_id, receipt_number),
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE CASCADE,
  FOREIGN KEY (recorded_by) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_payments_job ON payments(job_id);

CREATE TABLE IF NOT EXISTS payment_reversals (
  id TEXT PRIMARY KEY,
  payment_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  workshop_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  reversal_date TEXT DEFAULT (datetime('now')),
  recorded_by TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE CASCADE,
  FOREIGN KEY (recorded_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS activity_events (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  workshop_id TEXT NOT NULL,
  actor_id TEXT,
  actor_name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata_json TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_activity_job ON activity_events(job_id, created_at);

CREATE TABLE IF NOT EXISTS public_quote_tokens (
  id TEXT PRIMARY KEY,
  quote_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  workshop_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_quote_tokens_token ON public_quote_tokens(token);
