import React from 'react';
import Link from 'next/link';
import { getCurrentAuth } from '@/lib/auth/session';
import { repo } from '@/lib/db/repository';
import { seedDatabase } from '@/lib/db/seed';
import { formatZAR, formatDate } from '@/lib/utils/formatters';
import { StatusBadge, PaymentStatusBadge } from '@/components/common/StatusBadge';
import {
  Plus,
  Camera,
  Mic,
  Clock,
  Car,
  ChevronRight,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

export default async function DashboardPage() {
  const auth = await getCurrentAuth();

  // Auto-seed if database is brand new
  try {
    await seedDatabase();
  } catch (err) {
    console.warn('Seed note:', err);
  }

  const [metrics, recentJobs] = await Promise.all([
    repo.getWorkshopMetrics(auth.workshop.id),
    repo.listJobs(auth.workshop.id, {
      limit: 6,
      mechanicId: auth.isMechanic ? auth.user.id : undefined,
    }),
  ]);

  return (
    <div className="space-y-5">
      {/* Welcome Banner */}
      <div className="bg-zinc-900 text-white rounded-3xl p-5 shadow-sm border border-zinc-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider">
                {auth.workshop.name}
              </span>
              <span className="text-zinc-500">•</span>
              <span className="text-xs text-zinc-400">
                Logged in as <strong className="text-zinc-200">{auth.user.full_name}</strong>
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">Workshop Floor</h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-lg">
              Manage vehicle repairs, voice-note evidence, quotations, customer approvals, and receipts.
            </p>
          </div>

          {/* Quick New Job Button */}
          <Link
            href="/jobs/new"
            className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-black text-sm shadow-lg transition active:scale-98 shrink-0"
          >
            <Plus className="h-5 w-5 stroke-[2.5]" />
            <span>Open New Job</span>
          </Link>
        </div>

        {/* Quick Action Shortcuts */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-5 pt-4 border-t border-zinc-800">
          <Link
            href="/jobs/new"
            className="flex items-center gap-2.5 p-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-xs font-semibold text-zinc-200 transition"
          >
            <div className="h-7 w-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Plus className="h-4 w-4" />
            </div>
            <span>New Job Card</span>
          </Link>

          <Link
            href="/jobs"
            className="flex items-center gap-2.5 p-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-xs font-semibold text-zinc-200 transition"
          >
            <div className="h-7 w-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <Camera className="h-4 w-4" />
            </div>
            <span>Job Evidence</span>
          </Link>

          <Link
            href="/customers"
            className="col-span-2 sm:col-span-1 flex items-center gap-2.5 p-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-xs font-semibold text-zinc-200 transition"
          >
            <div className="h-7 w-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Car className="h-4 w-4" />
            </div>
            <span>Vehicle History</span>
          </Link>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          href="/jobs?status=in_progress"
          className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-xs hover:border-amber-400 transition"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Active Jobs</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
          </div>
          <div className="text-2xl font-black text-zinc-900">{metrics.active_jobs}</div>
          <p className="text-[11px] text-zinc-500 mt-1">Vehicles in workshop</p>
        </Link>

        <Link
          href="/jobs?status=awaiting_approval"
          className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-xs hover:border-amber-400 transition"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Awaiting Approval</span>
            <span className="h-2 w-2 rounded-full bg-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-700">{metrics.awaiting_approval}</div>
          <p className="text-[11px] text-zinc-500 mt-1">Quotes with customer</p>
        </Link>

        <Link
          href="/jobs?status=waiting_for_parts"
          className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-xs hover:border-amber-400 transition"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Waiting Parts</span>
            <span className="h-2 w-2 rounded-full bg-orange-500" />
          </div>
          <div className="text-2xl font-black text-orange-700">{metrics.waiting_for_parts}</div>
          <p className="text-[11px] text-zinc-500 mt-1">Ordered from suppliers</p>
        </Link>

        <Link
          href="/jobs?status=ready_for_collection"
          className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-xs hover:border-amber-400 transition"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Ready for Pickup</span>
            <span className="h-2 w-2 rounded-full bg-teal-500" />
          </div>
          <div className="text-2xl font-black text-teal-700">{metrics.ready_for_collection}</div>
          <p className="text-[11px] text-zinc-500 mt-1">Ready for collection</p>
        </Link>
      </div>

      {/* Financial Snapshot (Owner only) */}
      {auth.isOwner && (
        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500 text-zinc-950 flex items-center justify-center font-bold text-sm shrink-0">
              R
            </div>
            <div>
              <p className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                Workshop Balance Snapshot (Owner View)
              </p>
              <div className="flex items-center gap-4 mt-0.5">
                <div>
                  <span className="text-xs text-amber-800">Outstanding: </span>
                  <strong className="text-sm font-black text-amber-950">
                    {formatZAR(metrics.total_outstanding_cents)}
                  </strong>
                </div>
                <div>
                  <span className="text-xs text-amber-800">Total Collected: </span>
                  <strong className="text-sm font-black text-emerald-800">
                    {formatZAR(metrics.total_revenue_cents)}
                  </strong>
                </div>
              </div>
            </div>
          </div>
          <Link
            href="/settings"
            className="text-xs font-bold text-amber-900 hover:text-amber-950 flex items-center gap-1 self-start sm:self-auto"
          >
            Settings & Records <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* Quick Search */}
      <form action="/jobs" method="GET" className="relative">
        <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-400" />
        <input
          type="text"
          name="q"
          placeholder="Search by customer name, phone (082...), vehicle plate, or JOB-..."
          className="w-full pl-10 pr-4 py-3 bg-white border border-zinc-200 rounded-2xl text-xs sm:text-sm text-zinc-900 placeholder-zinc-400 shadow-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </form>

      {/* Recent Jobs */}
      <div className="bg-white rounded-3xl border border-zinc-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-zinc-900">Current Jobs</h2>
            <p className="text-xs text-zinc-500">
              {auth.isMechanic ? 'Your assigned repair jobs' : 'All active workshop jobs'}
            </p>
          </div>
          <Link
            href="/jobs"
            className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
          >
            View All Jobs <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="divide-y divide-zinc-100">
          {recentJobs.length === 0 ? (
            <div className="p-8 text-center">
              <Car className="h-10 w-10 text-zinc-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-zinc-700">No repair jobs opened yet</p>
              <p className="text-xs text-zinc-400 mt-1">Tap below to create your first job card.</p>
              <Link
                href="/jobs/new"
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-zinc-950 rounded-xl text-xs font-bold"
              >
                <Plus className="h-4 w-4" /> Open New Job
              </Link>
            </div>
          ) : (
            recentJobs.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="p-4 sm:px-5 hover:bg-zinc-50 flex items-center justify-between gap-3 transition group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-bold text-xs text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                      {job.job_number}
                    </span>
                    <StatusBadge status={job.status} size="sm" />
                    {auth.isOwner && <PaymentStatusBadge status={job.payment_status} />}
                  </div>

                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-zinc-900 truncate group-hover:text-amber-600 transition">
                      {job.vehicle_make} {job.vehicle_model}
                    </h3>
                    <span className="text-xs font-mono font-semibold text-zinc-600 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 shrink-0">
                      {job.vehicle_registration_display || job.vehicle_registration}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-500 truncate mt-0.5">
                    Customer: <span className="text-zinc-700 font-medium">{job.customer_name}</span> • {job.customer_phone_display}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  {auth.isOwner && job.approved_amount_cents && job.approved_amount_cents > 0 ? (
                    <div className="text-xs font-bold text-zinc-900">
                      {formatZAR(job.approved_amount_cents)}
                    </div>
                  ) : (
                    <div className="text-xs text-zinc-400">
                      {formatDate(job.intake_date)}
                    </div>
                  )}
                  <div className="text-[10px] text-zinc-400 mt-0.5">
                    {job.assigned_mechanic_name ? job.assigned_mechanic_name.split(' ')[0] : 'Unassigned'}
                  </div>
                </div>

                <ChevronRight className="h-4 w-4 text-zinc-300 group-hover:text-zinc-600 transition shrink-0" />
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
