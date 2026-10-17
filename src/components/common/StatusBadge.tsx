import React from 'react';
import { JobStatus, PaymentStatus } from '@/lib/types';

interface StatusBadgeProps {
  status: JobStatus;
  size?: 'sm' | 'md' | 'lg';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config: Record<
    JobStatus,
    { label: string; bg: string; text: string; dot: string; border: string }
  > = {
    received: {
      label: 'Received',
      bg: 'bg-blue-50',
      text: 'text-blue-900',
      dot: 'bg-blue-600',
      border: 'border-blue-200',
    },
    diagnosing: {
      label: 'Diagnosing',
      bg: 'bg-purple-50',
      text: 'text-purple-900',
      dot: 'bg-purple-600',
      border: 'border-purple-200',
    },
    awaiting_approval: {
      label: 'Awaiting Approval',
      bg: 'bg-amber-50',
      text: 'text-amber-900',
      dot: 'bg-amber-500',
      border: 'border-amber-300',
    },
    waiting_for_parts: {
      label: 'Waiting for Parts',
      bg: 'bg-orange-50',
      text: 'text-orange-900',
      dot: 'bg-orange-600',
      border: 'border-orange-200',
    },
    in_progress: {
      label: 'In Progress',
      bg: 'bg-emerald-50',
      text: 'text-emerald-900',
      dot: 'bg-emerald-600',
      border: 'border-emerald-200',
    },
    ready_for_collection: {
      label: 'Ready for Collection',
      bg: 'bg-teal-50',
      text: 'text-teal-900',
      dot: 'bg-teal-600',
      border: 'border-teal-300',
    },
    closed: {
      label: 'Closed',
      bg: 'bg-zinc-100',
      text: 'text-zinc-800',
      dot: 'bg-zinc-500',
      border: 'border-zinc-300',
    },
    cancelled: {
      label: 'Cancelled',
      bg: 'bg-red-50',
      text: 'text-red-900',
      dot: 'bg-red-600',
      border: 'border-red-200',
    },
  };

  const c = config[status] || {
    label: status,
    bg: 'bg-zinc-50',
    text: 'text-zinc-800',
    dot: 'bg-zinc-400',
    border: 'border-zinc-200',
  };

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-xs'
      : size === 'lg'
      ? 'px-3 py-1.5 text-sm font-semibold'
      : 'px-2.5 py-1 text-xs font-medium';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${c.bg} ${c.text} ${c.border} ${sizeClasses}`}
    >
      <span className={`h-2 w-2 rounded-full ${c.dot}`} />
      <span>{c.label}</span>
    </span>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const config: Record<
    PaymentStatus,
    { label: string; bg: string; text: string; dot: string; border: string }
  > = {
    unpaid: {
      label: 'Unpaid',
      bg: 'bg-zinc-100',
      text: 'text-zinc-800',
      dot: 'bg-zinc-400',
      border: 'border-zinc-200',
    },
    partially_paid: {
      label: 'Partially Paid',
      bg: 'bg-amber-50',
      text: 'text-amber-900',
      dot: 'bg-amber-500',
      border: 'border-amber-200',
    },
    paid: {
      label: 'Paid in Full',
      bg: 'bg-emerald-50',
      text: 'text-emerald-900',
      dot: 'bg-emerald-600',
      border: 'border-emerald-200',
    },
    overpaid: {
      label: 'Overpaid',
      bg: 'bg-indigo-50',
      text: 'text-indigo-900',
      dot: 'bg-indigo-600',
      border: 'border-indigo-200',
    },
  };

  const c = config[status] || config.unpaid;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${c.bg} ${c.text} ${c.border}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      <span>{c.label}</span>
    </span>
  );
}
