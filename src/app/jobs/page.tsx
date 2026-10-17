import React from 'react';
import Link from 'next/link';
import { getCurrentAuth } from '@/lib/auth/session';
import { repo } from '@/lib/db/repository';
import { formatZAR, formatDate } from '@/lib/utils/formatters';
import { StatusBadge, PaymentStatusBadge } from '@/components/common/StatusBadge';
import { Plus, Search, Filter, Car, ChevronRight } from 'lucide-react';
import { JobStatus } from '@/lib/types';

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const auth = await getCurrentAuth();
  const { status, q } = await searchParams;

  const currentStatus = status || 'all';
  const query = q || '';

  const jobs = await repo.listJobs(auth.workshop.id, {
    status: currentStatus !== 'all' ? currentStatus : undefined,
    query: query.trim() || undefined,
    mechanicId: auth.isMechanic ? auth.user.id : undefined,
  });

  const statuses: { id: string; label: string }[] = [
    { id: 'all', label: 'All Jobs' },
    { id: 'received', label: 'Received' },
    { id: 'diagnosing', label: 'Diagnosing' },
    { id: 'awaiting_approval', label: 'Awaiting Approval' },
    { id: 'waiting_for_parts', label: 'Waiting for Parts' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'ready_for_collection', label: 'Ready for Pickup' },
    { id: 'closed', label: 'Closed' },
  ];

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-zinc-900 tracking-tight">Workshop Jobs</h1>
          <p className="text-xs text-zinc-500">
            {auth.isMechanic ? 'Jobs assigned to you' : 'All repair cards and vehicle work'}
          </p>
        </div>
        <Link
          href="/jobs/new"
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-bold text-xs shadow-md transition"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>New Job</span>
        </Link>
      </div>

      {/* Search Bar */}
      <form method="GET" className="relative">
        {currentStatus !== 'all' && (
          <input type="hidden" name="status" value={currentStatus} />
        )}
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="Search customer, phone, registration or JOB-..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-xs sm:text-sm text-zinc-900 placeholder-zinc-400 shadow-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </form>

      {/* Status Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        {statuses.map((s) => {
          const isActive = currentStatus === s.id;
          return (
            <Link
              key={s.id}
              href={`/jobs?status=${s.id}${query ? `&q=${encodeURIComponent(query)}` : ''}`}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
                isActive
                  ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
                  : 'bg-white text-zinc-600 hover:bg-zinc-50 border-zinc-200'
              }`}
            >
              {s.label}
            </Link>
          );
        })}
      </div>

      {/* Job Cards List */}
      <div className="bg-white rounded-3xl border border-zinc-200 shadow-xs divide-y divide-zinc-100 overflow-hidden">
        {jobs.length === 0 ? (
          <div className="p-10 text-center">
            <Car className="h-10 w-10 text-zinc-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-zinc-700">No matching jobs found</p>
            <p className="text-xs text-zinc-400 mt-1">
              Try adjusting your search query or status filter.
            </p>
            {(query || currentStatus !== 'all') && (
              <Link
                href="/jobs"
                className="mt-3 inline-block text-xs font-semibold text-amber-600 hover:underline"
              >
                Clear all filters
              </Link>
            )}
          </div>
        ) : (
          jobs.map((job) => (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className="p-4 sm:p-5 hover:bg-zinc-50/80 flex items-center justify-between gap-3 transition group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                  <span className="font-mono font-bold text-xs text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                    {job.job_number}
                  </span>
                  <StatusBadge status={job.status} size="sm" />
                  {auth.isOwner && <PaymentStatusBadge status={job.payment_status} />}
                </div>

                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-zinc-900 truncate group-hover:text-amber-600 transition">
                    {job.vehicle_make} {job.vehicle_model}
                  </h2>
                  <span className="text-xs font-mono font-bold text-zinc-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 shrink-0">
                    {job.vehicle_registration_display || job.vehicle_registration}
                  </span>
                </div>

                <p className="text-xs text-zinc-600 truncate mt-1">
                  <strong>{job.customer_name}</strong> • {job.customer_phone_display}
                </p>

                <p className="text-[11px] text-zinc-400 truncate mt-0.5 italic">
                  "{job.customer_reported_problem}"
                </p>
              </div>

              <div className="text-right shrink-0">
                {auth.isOwner && job.approved_amount_cents && job.approved_amount_cents > 0 ? (
                  <div>
                    <div className="text-xs font-bold text-zinc-900">
                      {formatZAR(job.approved_amount_cents)}
                    </div>
                    {job.balance_cents !== undefined && job.balance_cents > 0 ? (
                      <div className="text-[10px] font-semibold text-amber-700">
                        Bal: {formatZAR(job.balance_cents)}
                      </div>
                    ) : (
                      <div className="text-[10px] font-semibold text-emerald-600">
                        Paid
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-zinc-400">
                    {formatDate(job.intake_date)}
                  </div>
                )}

                <div className="text-[10px] text-zinc-400 mt-1">
                  {job.assigned_mechanic_name ? job.assigned_mechanic_name.split(' ')[0] : 'Unassigned'}
                </div>
              </div>

              <ChevronRight className="h-4 w-4 text-zinc-300 group-hover:text-zinc-600 transition shrink-0" />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
