// BongzMoto Domain Types

export type UserRole = 'owner' | 'mechanic';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  active_workshop_id: string;
  created_at: string;
}

export interface Workshop {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  phone: string;
  phone_display: string;
  address: string;
  tax_enabled: number | boolean;
  tax_rate_percent: number;
  vat_number?: string | null;
  job_prefix: string;
  receipt_prefix: string;
  next_job_number: number;
  next_receipt_number: number;
  logo_url?: string | null;
  bank_name?: string | null;
  account_holder?: string | null;
  account_number?: string | null;
  branch_code?: string | null;
  branch_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  workshop_id: string;
  full_name: string;
  phone: string;
  phone_display: string;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  vehicle_count?: number;
  job_count?: number;
}

export interface Vehicle {
  id: string;
  workshop_id: string;
  customer_id: string;
  registration: string;
  registration_display: string;
  make: string;
  model: string;
  year?: number | null;
  mileage?: number | null;
  vin?: string | null;
  engine_no?: string | null;
  color?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  customer_name?: string;
  customer_phone?: string;
  job_count?: number;
}

export type JobStatus =
  | 'received'
  | 'diagnosing'
  | 'awaiting_approval'
  | 'waiting_for_parts'
  | 'in_progress'
  | 'ready_for_collection'
  | 'closed'
  | 'cancelled';

export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid' | 'overpaid';

export interface Job {
  id: string;
  workshop_id: string;
  job_number: string; // e.g. JOB-0001
  customer_id: string;
  vehicle_id: string;
  assigned_mechanic_id?: string | null;
  status: JobStatus;
  payment_status: PaymentStatus;
  customer_reported_problem: string;
  intake_date: string;
  expected_completion_date?: string | null;
  diagnosis_notes?: string | null;
  ready_date?: string | null;
  closed_at?: string | null;
  closing_notes?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;

  // Joined fields
  customer_name?: string;
  customer_phone?: string;
  customer_phone_display?: string;
  vehicle_registration?: string;
  vehicle_registration_display?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_year?: number | null;
  vehicle_mileage?: number | null;
  assigned_mechanic_name?: string | null;
  creator_name?: string;

  // Financial summary
  approved_amount_cents?: number;
  total_paid_cents?: number;
  balance_cents?: number;
}

export interface JobTask {
  id: string;
  job_id: string;
  workshop_id: string;
  description: string;
  is_completed: number | boolean;
  assigned_to?: string | null;
  created_at: string;
  updated_at: string;
}

export type AttachmentCategory =
  | 'intake'
  | 'diagnosis'
  | 'customer_approval'
  | 'parts_receipt'
  | 'work_in_progress'
  | 'completed_work';

export interface JobAttachment {
  id: string;
  job_id: string;
  workshop_id: string;
  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  category: AttachmentCategory;
  caption?: string | null;
  uploaded_by: string;
  uploaded_by_name?: string;
  created_at: string;
}

export interface JobTranscript {
  id: string;
  job_id: string;
  attachment_id?: string | null;
  workshop_id: string;
  audio_duration_seconds?: number | null;
  raw_transcript: string;
  structured_issue?: string | null;
  structured_checks?: string | null;
  structured_findings?: string | null;
  structured_next_steps?: string | null;
  status: 'draft_review_required' | 'reviewed';
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
}

export interface QuoteItem {
  id: string;
  quote_id: string;
  workshop_id: string;
  item_type: 'part' | 'labour';
  description: string;
  quantity: number;
  unit_price_cents: number;
  total_price_cents: number;
  sort_order: number;
}

export interface Quote {
  id: string;
  job_id: string;
  workshop_id: string;
  revision_number: number;
  is_current: number | boolean;
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  tax_rate_percent: number;
  notes?: string | null;
  validity_date?: string | null;
  created_by: string;
  creator_name?: string;
  created_at: string;
  items?: QuoteItem[];
  approval?: QuoteApproval | null;
}

export type ApprovalStatus = 'approved' | 'rejected' | 'awaiting_response';
export type ApprovalMethod = 'verbal' | 'whatsapp' | 'signed' | 'in_person' | 'other';

export interface QuoteApproval {
  id: string;
  quote_id: string;
  job_id: string;
  workshop_id: string;
  revision_number: number;
  approved_amount_cents: number;
  status: ApprovalStatus;
  method: ApprovalMethod;
  staff_id: string;
  staff_name?: string;
  notes?: string | null;
  attachment_id?: string | null;
  created_at: string;
}

export type PaymentMethod = 'cash' | 'eft' | 'card_external' | 'other';

export interface Payment {
  id: string;
  job_id: string;
  workshop_id: string;
  receipt_number: string;
  amount_cents: number;
  payment_method: PaymentMethod;
  payment_date: string;
  reference?: string | null;
  notes?: string | null;
  recorded_by: string;
  recorded_by_name?: string;
  idempotency_key?: string | null;
  is_reversed: number | boolean;
  created_at: string;
  reversal?: PaymentReversal | null;
}

export interface PaymentReversal {
  id: string;
  payment_id: string;
  job_id: string;
  workshop_id: string;
  reason: string;
  reversal_date: string;
  recorded_by: string;
  recorded_by_name?: string;
  created_at: string;
}

export interface ActivityEvent {
  id: string;
  job_id: string;
  workshop_id: string;
  actor_id?: string | null;
  actor_name: string;
  event_type: string;
  description: string;
  metadata_json?: string | null;
  created_at: string;
}

export interface PublicQuoteToken {
  id: string;
  quote_id: string;
  job_id: string;
  workshop_id: string;
  token: string;
  expires_at: string;
  revoked_at?: string | null;
  created_at: string;
}

export interface PublicInvoiceToken {
  id: string;
  job_id: string;
  workshop_id: string;
  token: string;
  expires_at: string;
  revoked_at?: string | null;
  created_at: string;
}

export interface WorkshopMetrics {
  active_jobs: number;
  awaiting_approval: number;
  waiting_for_parts: number;
  ready_for_collection: number;
  total_outstanding_cents: number;
  total_revenue_cents: number;
}
