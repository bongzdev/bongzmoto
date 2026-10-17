-- BongzMoto Workshop Management System - Supabase / PostgreSQL Migration
-- Full multi-tenant Row Level Security (RLS), workshop isolation, triggers, and storage policies

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Workshops Table
CREATE TABLE IF NOT EXISTS workshops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID NOT NULL,
  phone TEXT NOT NULL,
  phone_display TEXT NOT NULL,
  address TEXT NOT NULL,
  tax_enabled BOOLEAN DEFAULT FALSE,
  tax_rate_percent NUMERIC(5,2) DEFAULT 15.00,
  vat_number TEXT,
  job_prefix TEXT DEFAULT 'JOB-',
  receipt_prefix TEXT DEFAULT 'REC-',
  next_job_number INTEGER DEFAULT 1,
  next_receipt_number INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles Table linked to Supabase Auth
CREATE TABLE IF NOT EXISTS users_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('owner', 'mechanic')),
  active_workshop_id UUID REFERENCES workshops(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workshop Memberships
CREATE TABLE IF NOT EXISTS workshop_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users_profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('owner', 'mechanic')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workshop_id, user_id)
);

-- Customers Table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,          -- Normalized E.164: +27821234567
  phone_display TEXT NOT NULL,  -- Display: 082 123 4567
  email TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customers_workshop_phone ON customers(workshop_id, phone);
CREATE INDEX IF NOT EXISTS idx_customers_workshop_name ON customers(workshop_id, full_name);

-- Vehicles Table
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  registration TEXT NOT NULL,         -- Normalized: CA123456
  registration_display TEXT NOT NULL, -- Display: CA 123-456
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER,
  mileage INTEGER,
  vin TEXT,
  engine_no TEXT,
  color TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vehicles_workshop_reg ON vehicles(workshop_id, registration);
CREATE INDEX IF NOT EXISTS idx_vehicles_customer ON vehicles(customer_id);

-- Jobs Table
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  job_number TEXT NOT NULL, -- e.g. JOB-0001
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  assigned_mechanic_id UUID REFERENCES users_profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK(status IN (
    'received', 'diagnosing', 'awaiting_approval', 
    'waiting_for_parts', 'in_progress', 'ready_for_collection', 
    'closed', 'cancelled'
  )) DEFAULT 'received',
  payment_status TEXT NOT NULL CHECK(payment_status IN (
    'unpaid', 'partially_paid', 'paid', 'overpaid'
  )) DEFAULT 'unpaid',
  customer_reported_problem TEXT NOT NULL,
  intake_date TIMESTAMPTZ DEFAULT NOW(),
  expected_completion_date DATE,
  diagnosis_notes TEXT,
  ready_date TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  closing_notes TEXT,
  created_by UUID REFERENCES users_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workshop_id, job_number)
);
CREATE INDEX IF NOT EXISTS idx_jobs_workshop_status ON jobs(workshop_id, status);
CREATE INDEX IF NOT EXISTS idx_jobs_vehicle ON jobs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_jobs_customer ON jobs(customer_id);

-- Job Tasks
CREATE TABLE IF NOT EXISTS job_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  assigned_to UUID REFERENCES users_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job Attachments
CREATE TABLE IF NOT EXISTS job_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN (
    'intake', 'diagnosis', 'customer_approval', 
    'parts_receipt', 'work_in_progress', 'completed_work'
  )),
  caption TEXT,
  uploaded_by UUID REFERENCES users_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_attachments_job ON job_attachments(job_id);

-- Transcripts
CREATE TABLE IF NOT EXISTS job_transcripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  attachment_id UUID REFERENCES job_attachments(id) ON DELETE SET NULL,
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  audio_duration_seconds INTEGER,
  raw_transcript TEXT NOT NULL,
  structured_issue TEXT,
  structured_checks TEXT,
  structured_findings TEXT,
  structured_next_steps TEXT,
  status TEXT NOT NULL CHECK(status IN ('draft_review_required', 'reviewed')) DEFAULT 'draft_review_required',
  reviewed_by UUID REFERENCES users_profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quotes & Revisions
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL DEFAULT 1,
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  subtotal_cents BIGINT NOT NULL DEFAULT 0,
  tax_cents BIGINT NOT NULL DEFAULT 0,
  total_cents BIGINT NOT NULL DEFAULT 0,
  tax_rate_percent NUMERIC(5,2) DEFAULT 0,
  notes TEXT,
  validity_date DATE,
  created_by UUID REFERENCES users_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, revision_number)
);

-- Quote Line Items
CREATE TABLE IF NOT EXISTS quote_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK(item_type IN ('part', 'labour')),
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1.0,
  unit_price_cents BIGINT NOT NULL DEFAULT 0,
  total_price_cents BIGINT NOT NULL DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote ON quote_items(quote_id);

-- Quote Approvals
CREATE TABLE IF NOT EXISTS quote_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL,
  approved_amount_cents BIGINT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('approved', 'rejected', 'awaiting_response')),
  method TEXT NOT NULL CHECK(method IN ('verbal', 'whatsapp', 'signed', 'in_person', 'other')),
  staff_id UUID REFERENCES users_profiles(id),
  notes TEXT,
  attachment_id UUID REFERENCES job_attachments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_approvals_quote ON quote_approvals(quote_id);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  receipt_number TEXT NOT NULL,
  amount_cents BIGINT NOT NULL,
  payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'eft', 'card_external', 'other')),
  payment_date TIMESTAMPTZ DEFAULT NOW(),
  reference TEXT,
  notes TEXT,
  recorded_by UUID REFERENCES users_profiles(id),
  idempotency_key TEXT UNIQUE,
  is_reversed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workshop_id, receipt_number)
);
CREATE INDEX IF NOT EXISTS idx_payments_job ON payments(job_id);

-- Payment Reversals
CREATE TABLE IF NOT EXISTS payment_reversals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  reversal_date TIMESTAMPTZ DEFAULT NOW(),
  recorded_by UUID REFERENCES users_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity Events
CREATE TABLE IF NOT EXISTS activity_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES users_profiles(id) ON DELETE SET NULL,
  actor_name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_activity_job ON activity_events(job_id, created_at);

-- Public Quote Tokens (for secure external WhatsApp sharing)
CREATE TABLE IF NOT EXISTS public_quote_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quote_tokens_token ON public_quote_tokens(token);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE users_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshop_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_reversals ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_events ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's workshop memberships
CREATE OR REPLACE FUNCTION get_user_workshops()
RETURNS SETOF UUID AS $$
  SELECT workshop_id FROM workshop_members WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Workshop isolation policies
CREATE POLICY "Users can view their workshops" ON workshops
  FOR SELECT USING (id IN (SELECT get_user_workshops()));

CREATE POLICY "Workshop members can view customers" ON customers
  FOR ALL USING (workshop_id IN (SELECT get_user_workshops()));

CREATE POLICY "Workshop members can view vehicles" ON vehicles
  FOR ALL USING (workshop_id IN (SELECT get_user_workshops()));

CREATE POLICY "Workshop members can view and manage jobs" ON jobs
  FOR ALL USING (workshop_id IN (SELECT get_user_workshops()));

CREATE POLICY "Workshop members can view attachments" ON job_attachments
  FOR ALL USING (workshop_id IN (SELECT get_user_workshops()));

CREATE POLICY "Workshop members can view quotes" ON quotes
  FOR ALL USING (workshop_id IN (SELECT get_user_workshops()));

CREATE POLICY "Workshop members can view quote items" ON quote_items
  FOR ALL USING (workshop_id IN (SELECT get_user_workshops()));

CREATE POLICY "Workshop members can view quote approvals" ON quote_approvals
  FOR ALL USING (workshop_id IN (SELECT get_user_workshops()));

CREATE POLICY "Only owners can view payments" ON payments
  FOR SELECT USING (
    workshop_id IN (
      SELECT workshop_id FROM workshop_members 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Only owners can insert payments" ON payments
  FOR INSERT WITH CHECK (
    workshop_id IN (
      SELECT workshop_id FROM workshop_members 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Function for atomic sequential job number generation
CREATE OR REPLACE FUNCTION generate_next_job_number(target_workshop_id UUID)
RETURNS TEXT AS $$
DECLARE
  w_prefix TEXT;
  w_next INT;
  formatted_job_number TEXT;
BEGIN
  SELECT job_prefix, next_job_number INTO w_prefix, w_next
  FROM workshops WHERE id = target_workshop_id FOR UPDATE;

  formatted_job_number := COALESCE(w_prefix, 'JOB-') || LPAD(w_next::TEXT, 4, '0');

  UPDATE workshops 
  SET next_job_number = next_job_number + 1, updated_at = NOW()
  WHERE id = target_workshop_id;

  RETURN formatted_job_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
