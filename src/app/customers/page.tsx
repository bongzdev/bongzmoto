import React from 'react';
import Link from 'next/link';
import { getCurrentAuth } from '@/lib/auth/session';
import { repo } from '@/lib/db/repository';
import { formatDate } from '@/lib/utils/formatters';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Search, Car, User as UserIcon, Phone, Plus, ChevronRight, History } from 'lucide-react';

export default async function CustomersVehiclesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const auth = await getCurrentAuth();
  const { q } = await searchParams;
  const query = q || '';

  const [customers, vehicles] = await Promise.all([
    repo.listCustomers(auth.workshop.id, query),
    repo.listVehicles(auth.workshop.id, query),
  ]);

  // For each vehicle, also fetch its job history to show previous repairs
  const vehiclesWithJobs = await Promise.all(
    vehicles.map(async (v) => {
      const vehicleJobs = await repo.listJobs(auth.workshop.id, { vehicleId: v.id });
      return {
        ...v,
        repairHistory: vehicleJobs,
      };
    })
  );

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-zinc-900 tracking-tight">Vehicles & Repair History</h1>
          <p className="text-xs text-zinc-500">
            View customer vehicles and retrieve all past and active jobs
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

      {/* Search Input */}
      <form method="GET" className="relative">
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="Search by vehicle registration plate, customer name, or phone..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-xs sm:text-sm text-zinc-900 placeholder-zinc-400 shadow-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </form>

      {/* Vehicles with Complete Repair History */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
          Registered Vehicles ({vehiclesWithJobs.length})
        </h2>

        {vehiclesWithJobs.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl border border-zinc-200 text-center">
            <Car className="h-10 w-10 text-zinc-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-zinc-700">No vehicles matching search</p>
            <p className="text-xs text-zinc-400 mt-1">Check spelling or create a new job to register a vehicle.</p>
          </div>
        ) : (
          vehiclesWithJobs.map((veh) => (
            <div
              key={veh.id}
              className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-xs space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-zinc-900 text-white flex items-center justify-center font-bold shrink-0">
                    <Car className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-zinc-900">
                        {veh.make} {veh.model} {veh.year ? `(${veh.year})` : ''}
                      </h3>
                      <span className="font-mono font-bold text-xs bg-amber-50 text-zinc-800 px-2 py-0.5 rounded border border-amber-300">
                        {veh.registration_display || veh.registration}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Owner: <strong className="text-zinc-800">{veh.customer_name}</strong> • {veh.customer_phone}
                    </p>
                  </div>
                </div>

                <Link
                  href={`/jobs/new`}
                  className="self-start sm:self-auto text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1"
                >
                  + Open New Job
                </Link>
              </div>

              {/* Repair History Drawer */}
              <div className="pt-3 border-t border-zinc-100">
                <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-700 mb-2">
                  <History className="h-3.5 w-3.5 text-zinc-500" />
                  <span>Repair History ({veh.repairHistory.length} Jobs)</span>
                </div>

                {veh.repairHistory.length === 0 ? (
                  <p className="text-xs text-zinc-400 italic">No previous repair records for this vehicle.</p>
                ) : (
                  <div className="divide-y divide-zinc-100 bg-zinc-50 rounded-2xl border border-zinc-100 overflow-hidden">
                    {veh.repairHistory.map((j) => (
                      <Link
                        key={j.id}
                        href={`/jobs/${j.id}`}
                        className="p-3 hover:bg-zinc-100/80 flex items-center justify-between gap-3 transition text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-mono font-bold text-zinc-900 bg-white px-1.5 py-0.2 rounded border border-zinc-200">
                              {j.job_number}
                            </span>
                            <StatusBadge status={j.status} size="sm" />
                            <span className="text-zinc-400 text-[11px]">{formatDate(j.intake_date)}</span>
                          </div>
                          <p className="text-zinc-600 truncate max-w-sm italic">
                            "{j.customer_reported_problem}"
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-zinc-400 shrink-0" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Customers Section */}
      <div className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-xs space-y-3">
        <h2 className="text-sm font-bold text-zinc-900">Registered Customers ({customers.length})</h2>
        <div className="divide-y divide-zinc-100">
          {customers.map((c) => (
            <div key={c.id} className="py-3 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-zinc-900">{c.full_name}</p>
                <div className="flex items-center gap-2 text-zinc-500 mt-0.5">
                  <span className="font-mono">{c.phone_display}</span>
                  {c.address && <span>• {c.address}</span>}
                </div>
              </div>
              <div className="text-right text-[11px] text-zinc-500 font-medium">
                <span>{c.vehicle_count || 0} Vehicles</span> • <span>{c.job_count || 0} Jobs</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
