'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  Job,
  JobStatus,
  JobTask,
  JobAttachment,
  JobTranscript,
  Quote,
  QuoteItem,
  Payment,
  ActivityEvent,
  ApprovalMethod,
  PaymentMethod,
} from '@/lib/types';
import { StatusBadge, PaymentStatusBadge } from '@/components/common/StatusBadge';
import { VoiceRecorder } from '@/components/media/VoiceRecorder';
import { MediaUploader } from '@/components/media/MediaUploader';
import { AudioPlayer } from '@/components/media/AudioPlayer';
import { WhatsAppShareModal } from '@/components/whatsapp/WhatsAppShareModal';
import { formatZAR, formatDateTime, formatDate } from '@/lib/utils/formatters';
import {
  Phone,
  MessageSquare,
  Car,
  User as UserIcon,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Plus,
  Trash2,
  Share2,
  Printer,
  ChevronDown,
  RotateCcw,
  Sparkles,
  DollarSign,
  ArrowLeft,
  Wrench,
} from 'lucide-react';

export default function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: jobId } = use(params);

  // Active tab: 'overview' | 'media' | 'quote' | 'payments' | 'timeline'
  const [activeTab, setActiveTab] = useState<'overview' | 'media' | 'quote' | 'payments' | 'timeline'>('overview');

  // Job Data
  const [job, setJob] = useState<Job | null>(null);
  const [tasks, setTasks] = useState<JobTask[]>([]);
  const [attachments, setAttachments] = useState<JobAttachment[]>([]);
  const [transcripts, setTranscripts] = useState<JobTranscript[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [canManageFinance, setCanManageFinance] = useState(false);

  // Loading & error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Status Change State
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState<JobStatus | ''>('');
  const [statusNote, setStatusNote] = useState('');

  // Diagnosis Edit State
  const [diagnosisEdit, setDiagnosisEdit] = useState('');
  const [savingDiagnosis, setSavingDiagnosis] = useState(false);

  // New Task State
  const [newTaskDesc, setNewTaskDesc] = useState('');

  // Quote Editor State
  const [quoteItems, setQuoteItems] = useState<
    { item_type: 'part' | 'labour'; description: string; quantity: number; unit_price_cents: number }[]
  >([{ item_type: 'part', description: '', quantity: 1, unit_price_cents: 0 }]);
  const [quoteNotes, setQuoteNotes] = useState('');
  const [validityDate, setValidityDate] = useState('');
  const [savingQuote, setSavingQuote] = useState(false);

  // Approval Modal State
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<'approved' | 'rejected'>('approved');
  const [approvalMethod, setApprovalMethod] = useState<ApprovalMethod>('verbal');
  const [approvalNotes, setApprovalNotes] = useState('');

  // Payment Form State
  const [payAmountRands, setPayAmountRands] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash');
  const [payReference, setPayReference] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [recordingPay, setRecordingPay] = useState(false);

  // Payment Reversal State
  const [reversingPaymentId, setReversingPaymentId] = useState<string | null>(null);
  const [reversalReason, setReversalReason] = useState('');

  // WhatsApp Share Modal
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

  // Transcript Edit State
  const [editingTranscriptId, setEditingTranscriptId] = useState<string | null>(null);
  const [editedTranscriptText, setEditedTranscriptText] = useState('');

  const fetchJobData = async () => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`);
      if (!res.ok) {
        throw new Error('Failed to load job card.');
      }
      const data = await res.json();
      setJob(data.job);
      setTasks(data.tasks || []);
      setAttachments(data.attachments || []);
      setTranscripts(data.transcripts || []);
      setQuotes(data.quotes || []);
      setPayments(data.payments || []);
      setActivity(data.activity || []);
      setCanManageFinance(Boolean(data.canManageFinance));

      setDiagnosisEdit(data.job.diagnosis_notes || '');
      setNewStatus(data.job.status);

      // Pre-populate quote editor if current quote exists
      const currentQuote = data.quotes?.find((q: Quote) => q.is_current);
      if (currentQuote && currentQuote.items && currentQuote.items.length > 0) {
        setQuoteItems(
          currentQuote.items.map((it: QuoteItem) => ({
            item_type: it.item_type,
            description: it.description,
            quantity: it.quantity,
            unit_price_cents: it.unit_price_cents,
          }))
        );
        setQuoteNotes(currentQuote.notes || '');
        setValidityDate(currentQuote.validity_date || '');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobData();
  }, [jobId]);

  // Handle Status Update
  const handleUpdateStatus = async (status: JobStatus) => {
    try {
      setUpdatingStatus(true);
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes: statusNote }),
      });
      if (!res.ok) throw new Error('Status update failed');
      setStatusNote('');
      await fetchJobData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Handle Save Diagnosis
  const handleSaveDiagnosis = async () => {
    try {
      setSavingDiagnosis(true);
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diagnosis_notes: diagnosisEdit }),
      });
      if (!res.ok) throw new Error('Failed to update diagnosis');
      await fetchJobData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingDiagnosis(false);
    }
  };

  // Handle Add Task
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskDesc.trim()) return;
    try {
      const res = await fetch(`/api/jobs/${jobId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: newTaskDesc }),
      });
      if (res.ok) {
        setNewTaskDesc('');
        await fetchJobData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Toggle Task
  const handleToggleTask = async (taskId: string, current: boolean) => {
    try {
      await fetch(`/api/jobs/${jobId}/tasks`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, isCompleted: !current }),
      });
      await fetchJobData();
    } catch (err) {
      console.error(err);
    }
  };

  // Quote Item Operations
  const addQuoteItem = (type: 'part' | 'labour') => {
    setQuoteItems([...quoteItems, { item_type: type, description: '', quantity: 1, unit_price_cents: 0 }]);
  };

  const removeQuoteItem = (index: number) => {
    if (quoteItems.length <= 1) return;
    setQuoteItems(quoteItems.filter((_, i) => i !== index));
  };

  const updateQuoteItem = (index: number, field: string, val: any) => {
    const updated = [...quoteItems];
    (updated[index] as any)[field] = val;
    setQuoteItems(updated);
  };

  // Handle Save Quote Revision
  const handleSaveQuoteRevision = async () => {
    try {
      setSavingQuote(true);
      const res = await fetch(`/api/jobs/${jobId}/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: quoteItems,
          notes: quoteNotes,
          validity_date: validityDate || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save quote revision');
      }
      await fetchJobData();
      alert(`Quote Revision ${data.quote.revision_number} saved successfully!`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingQuote(false);
    }
  };

  // Handle Record Approval
  const handleRecordApproval = async () => {
    const currentQuote = quotes.find((q) => q.is_current);
    if (!currentQuote) {
      alert('No current quote revision found to approve.');
      return;
    }

    try {
      const res = await fetch(`/api/jobs/${jobId}/quotes/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote_id: currentQuote.id,
          status: approvalStatus,
          method: approvalMethod,
          notes: approvalNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to record approval');
      }

      setShowApprovalModal(false);
      setApprovalNotes('');
      await fetchJobData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Handle Record Payment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountRands = parseFloat(payAmountRands);
    if (isNaN(amountRands) || amountRands <= 0) {
      alert('Please enter a valid payment amount in Rands.');
      return;
    }

    try {
      setRecordingPay(true);
      const amountCents = Math.round(amountRands * 100);
      // Client-side idempotency key based on job, amount, and timestamp
      const idempotencyKey = `pay-${jobId}-${amountCents}-${Date.now()}`;

      const res = await fetch(`/api/jobs/${jobId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount_cents: amountCents,
          payment_method: payMethod,
          reference: payReference,
          notes: payNotes,
          idempotency_key: idempotencyKey,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to record payment');
      }

      setPayAmountRands('');
      setPayReference('');
      setPayNotes('');
      await fetchJobData();
      alert(`Payment recorded! Receipt: ${data.payment.receipt_number}`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRecordingPay(false);
    }
  };

  // Handle Reverse Payment
  const handleReversePayment = async (paymentId: string) => {
    if (!reversalReason.trim()) {
      alert('A reversal reason is required for financial auditing.');
      return;
    }

    try {
      const res = await fetch(`/api/jobs/${jobId}/payments/${paymentId}/reverse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reversalReason }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to reverse payment');
      }

      setReversingPaymentId(null);
      setReversalReason('');
      await fetchJobData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Handle Mark Transcript Reviewed
  const handleMarkTranscriptReviewed = async (transcriptId: string) => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/transcripts/${transcriptId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ editedTranscript: editedTranscriptText || undefined }),
      });
      if (res.ok) {
        setEditingTranscriptId(null);
        await fetchJobData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-zinc-500 flex flex-col items-center justify-center">
        <span className="h-8 w-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-bold text-zinc-700">Loading Job Card...</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-red-200">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <p className="text-sm font-bold text-zinc-900">{error || 'Job not found'}</p>
        <Link href="/jobs" className="mt-4 inline-block text-xs font-bold text-amber-600 hover:underline">
          Return to Jobs List
        </Link>
      </div>
    );
  }

  const currentQuote = quotes.find((q) => q.is_current);

  // Calculate live quote subtotal in editor
  const calculatedSubtotal = quoteItems.reduce(
    (sum, it) => sum + Math.round((it.quantity || 1) * (it.unit_price_cents || 0)),
    0
  );

  return (
    <div className="space-y-4">
      {/* Top Header & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/jobs"
          className="flex items-center gap-1.5 text-xs font-bold text-zinc-600 hover:text-zinc-900 transition"
        >
          <ArrowLeft className="h-4 w-4" /> All Jobs
        </Link>

        {/* WhatsApp Share trigger */}
        <button
          onClick={() => setShowWhatsAppModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span>Share WhatsApp</span>
        </button>
      </div>

      {/* Main Job Card Header */}
      <div className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="font-mono font-black text-sm bg-zinc-900 text-white px-2.5 py-0.5 rounded-lg">
                {job.job_number}
              </span>
              <StatusBadge status={job.status} size="md" />
              {canManageFinance && <PaymentStatusBadge status={job.payment_status} />}
            </div>

            <div className="flex items-center gap-2 mt-1">
              <h1 className="text-xl font-black text-zinc-900 tracking-tight">
                {job.vehicle_make} {job.vehicle_model}
              </h1>
              <span className="text-xs font-mono font-bold text-zinc-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-300">
                {job.vehicle_registration_display || job.vehicle_registration}
              </span>
            </div>

            {/* Customer Contact Bar */}
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-zinc-600">
              <span className="font-semibold text-zinc-900">{job.customer_name}</span>
              <span>•</span>
              <a
                href={`tel:${job.customer_phone}`}
                className="flex items-center gap-1 text-amber-700 hover:underline font-mono font-semibold"
              >
                <Phone className="h-3 w-3" /> {job.customer_phone_display}
              </a>
              <span>•</span>
              <span>Intake: {formatDate(job.intake_date)}</span>
            </div>
          </div>

          {/* Quick Balance for Owner */}
          {canManageFinance && job.approved_amount_cents && job.approved_amount_cents > 0 ? (
            <div className="bg-zinc-50 p-3 rounded-2xl border border-zinc-200 text-right shrink-0">
              <p className="text-[10px] text-zinc-500 uppercase font-bold">Approved Quote</p>
              <p className="text-base font-black text-zinc-900">{formatZAR(job.approved_amount_cents)}</p>
              <p className="text-[11px] font-bold text-amber-700 mt-0.5">
                Balance: {formatZAR(job.balance_cents)}
              </p>
            </div>
          ) : null}
        </div>

        {/* Status Transition Bar */}
        <div className="mt-4 pt-4 border-t border-zinc-100 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wide shrink-0">
            Change Status:
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {(
              [
                'received',
                'diagnosing',
                'awaiting_approval',
                'waiting_for_parts',
                'in_progress',
                'ready_for_collection',
                'closed',
              ] as JobStatus[]
            ).map((st) => (
              <button
                key={st}
                onClick={() => handleUpdateStatus(st)}
                disabled={updatingStatus || job.status === st}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition capitalize ${
                  job.status === st
                    ? 'bg-zinc-900 text-white cursor-default'
                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 active:scale-95'
                }`}
              >
                {st.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 bg-white p-1.5 rounded-2xl border border-zinc-200 shadow-xs overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 min-w-[85px] py-2 px-3 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-zinc-900 text-white shadow-xs'
              : 'text-zinc-600 hover:bg-zinc-100'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('media')}
          className={`flex-1 min-w-[95px] py-2 px-3 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center justify-center gap-1 ${
            activeTab === 'media'
              ? 'bg-zinc-900 text-white shadow-xs'
              : 'text-zinc-600 hover:bg-zinc-100'
          }`}
        >
          <span>Evidence</span>
          {attachments.length > 0 && (
            <span className="h-4 w-4 rounded-full bg-amber-500 text-zinc-950 text-[10px] flex items-center justify-center font-black">
              {attachments.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('quote')}
          className={`flex-1 min-w-[85px] py-2 px-3 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'quote'
              ? 'bg-zinc-900 text-white shadow-xs'
              : 'text-zinc-600 hover:bg-zinc-100'
          }`}
        >
          Quote & Approval
        </button>
        {canManageFinance && (
          <button
            onClick={() => setActiveTab('payments')}
            className={`flex-1 min-w-[90px] py-2 px-3 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'payments'
                ? 'bg-zinc-900 text-white shadow-xs'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            Payments
          </button>
        )}
        <button
          onClick={() => setActiveTab('timeline')}
          className={`flex-1 min-w-[85px] py-2 px-3 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'timeline'
              ? 'bg-zinc-900 text-white shadow-xs'
              : 'text-zinc-600 hover:bg-zinc-100'
          }`}
        >
          Timeline
        </button>
      </div>

      {/* ================= TAB 1: OVERVIEW ================= */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Customer Reported Problem */}
          <div className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-xs">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wide mb-1">
              Customer Reported Problem
            </h3>
            <p className="text-sm font-medium text-zinc-900 leading-relaxed bg-zinc-50 p-3.5 rounded-2xl border border-zinc-100">
              "{job.customer_reported_problem}"
            </p>
          </div>

          {/* Diagnosis Notes Editor */}
          <div className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wide">
                  Physical Diagnosis Notes
                </h3>
                <p className="text-[11px] text-zinc-500">Inspection findings, worn parts, test drive results</p>
              </div>
              <button
                onClick={handleSaveDiagnosis}
                disabled={savingDiagnosis}
                className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold rounded-xl transition"
              >
                {savingDiagnosis ? 'Saving...' : 'Save Diagnosis'}
              </button>
            </div>
            <textarea
              rows={4}
              value={diagnosisEdit}
              onChange={(e) => setDiagnosisEdit(e.target.value)}
              placeholder="e.g. Front left wheel bearing has excessive play. Sump plug threads stripped by previous service..."
              className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-2xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed font-sans"
            />
          </div>

          {/* Tasks & Repair Progress */}
          <div className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wide">
              Repair Checklist & Tasks
            </h3>

            <div className="space-y-2">
              {tasks.length === 0 ? (
                <p className="text-xs text-zinc-400 italic">No checklist items added yet.</p>
              ) : (
                tasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => handleToggleTask(t.id, Boolean(t.is_completed))}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-zinc-50 cursor-pointer border border-zinc-100 transition"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(t.is_completed)}
                      readOnly
                      className="h-4 w-4 rounded border-zinc-300 text-amber-500 focus:ring-amber-400"
                    />
                    <span
                      className={`text-xs ${
                        t.is_completed ? 'line-through text-zinc-400 font-normal' : 'text-zinc-800 font-semibold'
                      }`}
                    >
                      {t.description}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Add Task Input */}
            <form onSubmit={handleAddTask} className="flex gap-2 pt-2">
              <input
                type="text"
                placeholder="Add task e.g. Bleed cooling system"
                value={newTaskDesc}
                onChange={(e) => setNewTaskDesc(e.target.value)}
                className="flex-1 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="submit"
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-bold text-xs rounded-xl shadow transition"
              >
                Add
              </button>
            </form>
          </div>

          {/* Vehicle & Customer Specifications */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-white p-4 rounded-2xl border border-zinc-200">
              <h4 className="font-bold text-zinc-900 mb-2 flex items-center gap-1.5">
                <Car className="h-4 w-4 text-amber-600" /> Vehicle Specs
              </h4>
              <dl className="space-y-1 text-zinc-600">
                <div className="flex justify-between">
                  <span>Year:</span>
                  <span className="font-semibold text-zinc-900">{job.vehicle_year || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Odometer Mileage:</span>
                  <span className="font-semibold text-zinc-900">
                    {job.vehicle_mileage ? `${job.vehicle_mileage.toLocaleString()} km` : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Assigned Mechanic:</span>
                  <span className="font-semibold text-zinc-900">
                    {job.assigned_mechanic_name || 'Unassigned'}
                  </span>
                </div>
              </dl>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-zinc-200">
              <h4 className="font-bold text-zinc-900 mb-2 flex items-center gap-1.5">
                <UserIcon className="h-4 w-4 text-amber-600" /> Customer Info
              </h4>
              <dl className="space-y-1 text-zinc-600">
                <div className="flex justify-between">
                  <span>Name:</span>
                  <span className="font-semibold text-zinc-900">{job.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Phone:</span>
                  <span className="font-mono font-semibold text-zinc-900">
                    {job.customer_phone_display}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Target Date:</span>
                  <span className="font-semibold text-zinc-900">
                    {job.expected_completion_date ? formatDate(job.expected_completion_date) : 'Flexible'}
                  </span>
                </div>
              </dl>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: EVIDENCE & MEDIA ================= */}
      {activeTab === 'media' && (
        <div className="space-y-4">
          {/* Voice Recorder Module */}
          <VoiceRecorder jobId={job.id} onUploaded={fetchJobData} />

          {/* Photo & Document Uploader */}
          <MediaUploader jobId={job.id} onUploaded={fetchJobData} />

          {/* AI Transcripts (Draft — review required) */}
          {transcripts.length > 0 && (
            <div className="bg-white rounded-3xl p-5 border border-amber-200 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-600" />
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">Voice Note Transcripts</h3>
                  <p className="text-[11px] text-zinc-500">Drafted from voice recordings</p>
                </div>
              </div>

              {transcripts.map((tr) => (
                <div key={tr.id} className="p-3.5 bg-amber-50/50 rounded-2xl border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        tr.status === 'draft_review_required'
                          ? 'bg-amber-500 text-zinc-950'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {tr.status === 'draft_review_required' ? 'Draft — review required' : 'Reviewed & Verified'}
                    </span>
                    <span className="text-[10px] text-zinc-400">{formatDateTime(tr.created_at)}</span>
                  </div>

                  {editingTranscriptId === tr.id ? (
                    <div className="space-y-2">
                      <textarea
                        rows={3}
                        value={editedTranscriptText}
                        onChange={(e) => setEditedTranscriptText(e.target.value)}
                        className="w-full p-2 bg-white border border-amber-300 rounded-xl text-xs text-zinc-900 focus:outline-none"
                      />
                      <button
                        onClick={() => handleMarkTranscriptReviewed(tr.id)}
                        className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-xl"
                      >
                        Save & Mark Reviewed
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-800 leading-relaxed font-sans">{tr.raw_transcript}</p>
                  )}

                  {tr.structured_issue && (
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-amber-200/60 text-[11px]">
                      <div>
                        <span className="font-bold text-zinc-700">Issue: </span>
                        <span className="text-zinc-600">{tr.structured_issue}</span>
                      </div>
                      <div>
                        <span className="font-bold text-zinc-700">Checks: </span>
                        <span className="text-zinc-600">{tr.structured_checks}</span>
                      </div>
                      <div>
                        <span className="font-bold text-zinc-700">Findings: </span>
                        <span className="text-zinc-600">{tr.structured_findings}</span>
                      </div>
                      <div>
                        <span className="font-bold text-zinc-700">Next Steps: </span>
                        <span className="text-zinc-600">{tr.structured_next_steps}</span>
                      </div>
                    </div>
                  )}

                  {tr.status === 'draft_review_required' && editingTranscriptId !== tr.id && (
                    <button
                      onClick={() => {
                        setEditingTranscriptId(tr.id);
                        setEditedTranscriptText(tr.raw_transcript);
                      }}
                      className="text-xs text-amber-800 font-bold hover:underline"
                    >
                      Edit & Verify Transcript
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Stored Evidence Gallery */}
          <div className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-zinc-900">Attached Evidence ({attachments.length})</h3>

            {attachments.length === 0 ? (
              <p className="text-xs text-zinc-400 italic">No photos or audio files uploaded yet.</p>
            ) : (
              <div className="space-y-3">
                {attachments.map((att) => {
                  const isAudio = att.mime_type.startsWith('audio/');
                  const isImage = att.mime_type.startsWith('image/');

                  return (
                    <div
                      key={att.id}
                      className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-200 text-zinc-800">
                            {att.category.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[10px] text-zinc-400">
                            {formatDateTime(att.created_at)}
                          </span>
                        </div>

                        {att.caption && (
                          <p className="text-xs font-semibold text-zinc-900 mb-1">{att.caption}</p>
                        )}

                        {isAudio ? (
                          <AudioPlayer
                            src={`/api/media/${att.id}`}
                            fileName={att.file_name}
                            uploadedByName={att.uploaded_by_name}
                          />
                        ) : isImage ? (
                          <div className="mt-2">
                            <img
                              src={`/api/media/${att.id}`}
                              alt={att.caption || att.file_name}
                              className="max-h-48 rounded-xl object-contain bg-zinc-900"
                            />
                          </div>
                        ) : (
                          <a
                            href={`/api/media/${att.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-amber-700 font-bold hover:underline mt-1"
                          >
                            <FileText className="h-4 w-4" /> Download {att.file_name}
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 3: QUOTE & APPROVAL ================= */}
      {activeTab === 'quote' && (
        <div className="space-y-4">
          {/* Current Approval Status Banner */}
          {currentQuote?.approval ? (
            <div
              className={`p-4 rounded-3xl border flex items-center justify-between gap-3 ${
                currentQuote.approval.status === 'approved'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : 'bg-red-50 border-red-200 text-red-950'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider">
                    Quote Rev {currentQuote.revision_number} {currentQuote.approval.status.toUpperCase()}
                  </span>
                  <span className="text-[11px] font-mono font-bold">
                    ({formatZAR(currentQuote.approval.approved_amount_cents)})
                  </span>
                </div>
                <p className="text-xs mt-0.5">
                  Method:{' '}
                  <strong>
                    {currentQuote.approval.method === 'verbal'
                      ? 'Verbally recorded (not digitally verified)'
                      : currentQuote.approval.method}
                  </strong>{' '}
                  • Staff: {currentQuote.approval.staff_name}
                </p>
                {currentQuote.approval.notes && (
                  <p className="text-[11px] mt-0.5 italic">"{currentQuote.approval.notes}"</p>
                )}
              </div>

              <button
                onClick={() => setShowApprovalModal(true)}
                className="px-3 py-1.5 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 hover:bg-zinc-50 shadow-xs"
              >
                Change Approval
              </button>
            </div>
          ) : (
            <div className="p-4 bg-amber-50 rounded-3xl border border-amber-200 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-amber-950">Awaiting Customer Approval</p>
                <p className="text-[11px] text-amber-800">
                  {currentQuote
                    ? `Quote Rev ${currentQuote.revision_number} (${formatZAR(currentQuote.total_cents)}) prepared.`
                    : 'No quote saved yet.'}
                </p>
              </div>

              {currentQuote && (
                <button
                  onClick={() => setShowApprovalModal(true)}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs rounded-xl shadow transition"
                >
                  Record Approval
                </button>
              )}
            </div>
          )}

          {/* Quotation Editor */}
          <div className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-900">
                  Quotation Line Items {currentQuote && `(Rev ${currentQuote.revision_number})`}
                </h3>
                <p className="text-xs text-zinc-500">
                  Exact integer-cent arithmetic in South African Rand (ZAR)
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => addQuoteItem('part')}
                  className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg text-xs font-bold transition"
                >
                  + Add Part
                </button>
                <button
                  type="button"
                  onClick={() => addQuoteItem('labour')}
                  className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg text-xs font-bold transition"
                >
                  + Add Labour
                </button>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="space-y-2">
              {quoteItems.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200 grid grid-cols-12 gap-2 items-center"
                >
                  <div className="col-span-3 sm:col-span-2">
                    <select
                      value={item.item_type}
                      onChange={(e) => updateQuoteItem(idx, 'item_type', e.target.value)}
                      className="w-full p-2 bg-white border border-zinc-200 rounded-lg text-xs font-bold text-zinc-800"
                    >
                      <option value="part">Part</option>
                      <option value="labour">Labour</option>
                    </select>
                  </div>

                  <div className="col-span-9 sm:col-span-5">
                    <input
                      type="text"
                      placeholder="Description (e.g. Front brake pads)"
                      value={item.description}
                      onChange={(e) => updateQuoteItem(idx, 'description', e.target.value)}
                      className="w-full p-2 bg-white border border-zinc-200 rounded-lg text-xs text-zinc-900"
                    />
                  </div>

                  <div className="col-span-4 sm:col-span-2">
                    <input
                      type="number"
                      step="0.5"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateQuoteItem(idx, 'quantity', parseFloat(e.target.value) || 1)}
                      className="w-full p-2 bg-white border border-zinc-200 rounded-lg text-xs font-mono text-zinc-900"
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-2">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="R 0.00"
                      value={(item.unit_price_cents / 100).toFixed(2)}
                      onChange={(e) =>
                        updateQuoteItem(
                          idx,
                          'unit_price_cents',
                          Math.round((parseFloat(e.target.value) || 0) * 100)
                        )
                      }
                      className="w-full p-2 bg-white border border-zinc-200 rounded-lg text-xs font-mono font-bold text-zinc-900"
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-1 text-right">
                    <button
                      type="button"
                      onClick={() => removeQuoteItem(idx)}
                      className="p-2 text-zinc-400 hover:text-red-600 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Summary */}
            <div className="bg-zinc-900 text-white p-4 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400">Total Quotation Value</p>
                <p className="text-2xl font-black text-amber-400 font-mono">
                  {formatZAR(calculatedSubtotal)}
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveQuoteRevision}
                disabled={savingQuote}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-black text-xs rounded-xl shadow transition"
              >
                {savingQuote ? 'Saving...' : 'Save as Revision'}
              </button>
            </div>
          </div>

          {/* Revision History */}
          {quotes.length > 0 && (
            <div className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
                Quote Revision History
              </h3>
              <div className="divide-y divide-zinc-100">
                {quotes.map((q) => (
                  <div key={q.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-zinc-900">Revision {q.revision_number}</span>
                      {q.is_current ? (
                        <span className="ml-2 px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                          CURRENT
                        </span>
                      ) : null}
                      <p className="text-[11px] text-zinc-400">
                        {formatDateTime(q.created_at)} by {q.creator_name || 'Staff'}
                      </p>
                    </div>
                    <span className="font-mono font-bold text-zinc-900">{formatZAR(q.total_cents)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 4: PAYMENTS & RECEIPTS (Owner Only) ================= */}
      {activeTab === 'payments' && canManageFinance && (
        <div className="space-y-4">
          {/* Balance Summary Card */}
          <div className="bg-zinc-900 text-white rounded-3xl p-5 shadow-sm space-y-3 border border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Financial Balance & Receipts
              </span>
              <PaymentStatusBadge status={job.payment_status} />
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800 text-center sm:text-left">
              <div>
                <p className="text-[11px] text-zinc-400">Total Agreed</p>
                <p className="text-base font-black text-zinc-100 font-mono">
                  {formatZAR(job.approved_amount_cents || 0)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-zinc-400">Total Paid</p>
                <p className="text-base font-black text-emerald-400 font-mono">
                  {formatZAR(job.total_paid_cents || 0)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-zinc-400">Balance Due</p>
                <p
                  className={`text-base font-black font-mono ${
                    (job.balance_cents || 0) < 0 ? 'text-indigo-400' : 'text-amber-400'
                  }`}
                >
                  {(job.balance_cents || 0) < 0
                    ? `Overpaid ${formatZAR(Math.abs(job.balance_cents || 0))}`
                    : formatZAR(job.balance_cents || 0)}
                </p>
              </div>
            </div>
          </div>

          {/* Record Payment Form */}
          <form
            onSubmit={handleRecordPayment}
            className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-xs space-y-3"
          >
            <h3 className="text-sm font-bold text-zinc-900">Record Customer Payment</h3>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-zinc-600 font-semibold mb-1">Amount (ZAR) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-bold text-zinc-500">R</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="1500.00"
                    value={payAmountRands}
                    onChange={(e) => setPayAmountRands(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl font-mono font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-600 font-semibold mb-1">Payment Method *</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                  className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="cash">Cash</option>
                  <option value="eft">EFT Bank Transfer</option>
                  <option value="card_external">Card (External Machine / POS)</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-zinc-600 font-semibold mb-1">Payment Reference</label>
                <input
                  type="text"
                  placeholder="e.g. FNB EFT / Yoco Receipt"
                  value={payReference}
                  onChange={(e) => setPayReference(e.target.value)}
                  className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-zinc-600 font-semibold mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Deposit for clutch kit"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={recordingPay}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow transition"
            >
              {recordingPay ? 'Generating Receipt...' : 'Record Payment & Issue Receipt'}
            </button>
          </form>

          {/* Numbered Receipts List */}
          <div className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-zinc-900">Recorded Receipts & Payments</h3>

            {payments.length === 0 ? (
              <p className="text-xs text-zinc-400 italic">No payments recorded for this job yet.</p>
            ) : (
              <div className="space-y-2">
                {payments.map((p) => (
                  <div
                    key={p.id}
                    className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition ${
                      p.is_reversed ? 'bg-red-50/50 border-red-200 opacity-70' : 'bg-zinc-50 border-zinc-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-xs text-zinc-900 bg-white px-2 py-0.5 rounded border border-zinc-200">
                          {p.receipt_number}
                        </span>
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-zinc-200 text-zinc-700">
                          {p.payment_method.replace('_', ' ')}
                        </span>
                        {p.is_reversed ? (
                          <span className="text-[10px] font-bold text-red-600 uppercase">
                            [REVERSED]
                          </span>
                        ) : null}
                      </div>

                      <p className="text-xs text-zinc-600 mt-1">
                        Recorded on {formatDateTime(p.created_at)} by {p.recorded_by_name || 'Staff'}
                      </p>
                      {p.reference && (
                        <p className="text-[11px] text-zinc-500">Ref: {p.reference}</p>
                      )}
                      {p.notes && (
                        <p className="text-[11px] text-zinc-500 italic">"{p.notes}"</p>
                      )}
                      {p.reversal && (
                        <p className="text-[11px] text-red-700 mt-0.5 font-semibold">
                          Reversal Reason: {p.reversal.reason}
                        </p>
                      )}
                    </div>

                    <div className="text-right flex items-center justify-between sm:justify-end gap-3">
                      <span className="font-mono font-black text-base text-zinc-900">
                        {formatZAR(p.amount_cents)}
                      </span>

                      {!p.is_reversed && (
                        <button
                          type="button"
                          onClick={() => setReversingPaymentId(p.id)}
                          className="text-xs text-red-600 hover:underline font-semibold"
                        >
                          Reverse
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 5: TIMELINE ================= */}
      {activeTab === 'timeline' && (
        <div className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-900">Job Activity Timeline</h3>
            <p className="text-xs text-zinc-500">
              Audit log of status changes, quote approvals, payments, and uploaded evidence
            </p>
          </div>

          <div className="space-y-4 pl-2 border-l-2 border-zinc-200 ml-2">
            {activity.map((ev) => (
              <div key={ev.id} className="relative pl-4">
                <span className="absolute -left-[23px] top-1 h-3 w-3 rounded-full bg-amber-500 ring-4 ring-white" />
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-900">{ev.actor_name}</span>
                  <span className="text-[10px] text-zinc-400">{formatDateTime(ev.created_at)}</span>
                </div>
                <p className="text-xs text-zinc-700 mt-0.5 leading-relaxed">{ev.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Record Approval Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-zinc-200">
            <h3 className="font-bold text-base text-zinc-900">Record Customer Approval</h3>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Decision</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setApprovalStatus('approved')}
                  className={`p-2.5 rounded-xl font-bold border transition ${
                    approvalStatus === 'approved'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-zinc-50 text-zinc-700 border-zinc-200'
                  }`}
                >
                  ✓ Approve Work
                </button>
                <button
                  type="button"
                  onClick={() => setApprovalStatus('rejected')}
                  className={`p-2.5 rounded-xl font-bold border transition ${
                    approvalStatus === 'rejected'
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-zinc-50 text-zinc-700 border-zinc-200'
                  }`}
                >
                  ✕ Reject Quote
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Approval Method</label>
              <select
                value={approvalMethod}
                onChange={(e) => setApprovalMethod(e.target.value as ApprovalMethod)}
                className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 font-semibold"
              >
                <option value="verbal">Verbal Approval (Phone / In person)</option>
                <option value="whatsapp">WhatsApp Audio / Message</option>
                <option value="signed">Signed Job Card / Work Order</option>
                <option value="in_person">In Person at Workshop</option>
                <option value="other">Other</option>
              </select>
              {approvalMethod === 'verbal' && (
                <p className="text-[10px] text-amber-700 mt-1 font-medium">
                  Note: Verbal approvals are strictly marked as "Verbally recorded", not digitally verified.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Notes / Quote Ref</label>
              <input
                type="text"
                placeholder="e.g. Customer approved over phone at 14:10"
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowApprovalModal(false)}
                className="flex-1 py-2.5 border border-zinc-300 rounded-xl text-xs font-semibold text-zinc-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRecordApproval}
                className="flex-1 py-2.5 bg-zinc-900 text-white font-bold text-xs rounded-xl shadow"
              >
                Save Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Reversal Modal */}
      {reversingPaymentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-zinc-200">
            <h3 className="font-bold text-base text-red-600">Reverse Payment Record</h3>
            <p className="text-xs text-zinc-600">
              Payments cannot be silently deleted. An auditable reversal record will be saved.
            </p>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Reason for Reversal *
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Cash counted incorrectly / duplicate entry / customer bank reversed"
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setReversingPaymentId(null)}
                className="flex-1 py-2.5 border border-zinc-300 rounded-xl text-xs font-semibold text-zinc-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleReversePayment(reversingPaymentId)}
                className="flex-1 py-2.5 bg-red-600 text-white font-bold text-xs rounded-xl shadow"
              >
                Confirm Reversal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Share Modal */}
      <WhatsAppShareModal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        context={{
          customerName: job.customer_name || 'Customer',
          customerPhone: job.customer_phone || '',
          vehicleMake: job.vehicle_make || '',
          vehicleModel: job.vehicle_model || '',
          vehicleRegistration: job.vehicle_registration_display || job.vehicle_registration || '',
          workshopName: 'Bongz Auto Workshop',
          jobNumber: job.job_number,
          quoteTotalCents: currentQuote?.total_cents,
          outstandingBalanceCents: job.balance_cents,
          currentStatusLabel: job.status.replace(/_/g, ' '),
        }}
        currentQuoteId={currentQuote?.id}
        jobId={job.id}
      />
    </div>
  );
}
