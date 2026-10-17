'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Customer, Vehicle, User } from '@/lib/types';
import {
  User as UserIcon,
  Car,
  ClipboardList,
  Search,
  Plus,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';

export default function NewJobPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Staff list for mechanic assignment
  const [staff, setStaff] = useState<User[]>([]);

  // Step 1: Customer state
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustNotes, setNewCustNotes] = useState('');
  const [custDuplicateWarning, setCustDuplicateWarning] = useState<string | null>(null);
  const [confirmCustDuplicate, setConfirmCustDuplicate] = useState(false);

  // Step 2: Vehicle state
  const [customerVehicles, setCustomerVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isNewVehicle, setIsNewVehicle] = useState(false);
  const [newVehReg, setNewVehReg] = useState('');
  const [newVehMake, setNewVehMake] = useState('');
  const [newVehModel, setNewVehModel] = useState('');
  const [newVehYear, setNewVehYear] = useState('');
  const [newVehMileage, setNewVehMileage] = useState('');
  const [newVehColor, setNewVehColor] = useState('');
  const [vehDuplicateWarning, setVehDuplicateWarning] = useState<string | null>(null);
  const [confirmVehDuplicate, setConfirmVehDuplicate] = useState(false);

  // Step 3: Job Intake state
  const [problem, setProblem] = useState('');
  const [intakeNotes, setIntakeNotes] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [assignedMechanicId, setAssignedMechanicId] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load staff on mount
  useEffect(() => {
    fetch('/api/workshop/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.staff) setStaff(data.staff);
      })
      .catch((err) => console.error(err));
  }, []);

  // Search customers
  useEffect(() => {
    const timer = setTimeout(() => {
      fetch(`/api/customers?q=${encodeURIComponent(customerSearch)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.customers) setCustomers(data.customers);
        })
        .catch((err) => console.error(err));
    }, 200);
    return () => clearTimeout(timer);
  }, [customerSearch]);

  // Load customer vehicles when customer selected
  useEffect(() => {
    if (selectedCustomer) {
      fetch(`/api/vehicles?customer_id=${selectedCustomer.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.vehicles) {
            setCustomerVehicles(data.vehicles);
            if (data.vehicles.length === 0) {
              setIsNewVehicle(true);
            }
          }
        })
        .catch((err) => console.error(err));
    }
  }, [selectedCustomer]);

  // Handle Step 1 Submit / Next
  const handleCustomerNext = async () => {
    setError(null);
    if (!isNewCustomer) {
      if (!selectedCustomer) {
        setError('Please select an existing customer or tap "Add New Customer".');
        return;
      }
      setStep(2);
      return;
    }

    // Creating new customer
    if (!newCustName.trim()) {
      setError('Customer name is required.');
      return;
    }
    if (!newCustPhone.trim()) {
      setError('Customer phone number is required.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: newCustName,
          phone: newCustPhone,
          address: newCustAddress,
          notes: newCustNotes,
          confirm_duplicate: confirmCustDuplicate,
        }),
      });

      const data = await res.json();
      if (res.status === 409 && data.needsConfirmation) {
        setCustDuplicateWarning(data.warning);
        setConfirmCustDuplicate(true);
        setLoading(false);
        return;
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create customer.');
      }

      setSelectedCustomer(data.customer);
      setIsNewCustomer(false);
      setIsNewVehicle(true);
      setStep(2);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Step 2 Submit / Next
  const handleVehicleNext = async () => {
    setError(null);
    if (!isNewVehicle) {
      if (!selectedVehicle) {
        setError('Please select a vehicle or tap "Add New Vehicle".');
        return;
      }
      setStep(3);
      return;
    }

    if (!newVehReg.trim()) {
      setError('Vehicle registration is required.');
      return;
    }
    if (!newVehMake.trim() || !newVehModel.trim()) {
      setError('Vehicle make and model are required.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: selectedCustomer!.id,
          registration: newVehReg,
          make: newVehMake,
          model: newVehModel,
          year: newVehYear ? parseInt(newVehYear, 10) : undefined,
          mileage: newVehMileage ? parseInt(newVehMileage, 10) : undefined,
          color: newVehColor,
          confirm_duplicate: confirmVehDuplicate,
        }),
      });

      const data = await res.json();
      if (res.status === 409 && data.needsConfirmation) {
        setVehDuplicateWarning(data.warning);
        setConfirmVehDuplicate(true);
        setLoading(false);
        return;
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create vehicle.');
      }

      setSelectedVehicle(data.vehicle);
      setIsNewVehicle(false);
      setStep(3);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Step 3 Submit (Create Job)
  const handleCreateJob = async () => {
    setError(null);
    if (!problem.trim()) {
      setError('Customer reported problem is required.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: selectedCustomer!.id,
          vehicle_id: selectedVehicle!.id,
          customer_reported_problem: problem,
          expected_completion_date: expectedDate || undefined,
          intake_notes: intakeNotes || undefined,
          assigned_mechanic_id: assignedMechanicId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to open job card.');
      }

      // Redirect directly to the newly opened job card!
      router.push(`/jobs/${data.job.id}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-4">
      {/* Step Progress Header */}
      <div className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-xs">
        <div className="flex items-center justify-between text-xs font-bold text-zinc-500 mb-2">
          <span>STEP {step} OF 3</span>
          <span className="text-amber-600 font-extrabold">
            {step === 1 ? 'Customer' : step === 2 ? 'Vehicle' : 'Intake Problem'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className={`h-2 rounded-full ${step >= 1 ? 'bg-amber-500' : 'bg-zinc-200'}`} />
          <div className={`h-2 rounded-full ${step >= 2 ? 'bg-amber-500' : 'bg-zinc-200'}`} />
          <div className={`h-2 rounded-full ${step >= 3 ? 'bg-amber-500' : 'bg-zinc-200'}`} />
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 font-medium">
          {error}
        </div>
      )}

      {/* ================= STEP 1: CUSTOMER ================= */}
      {step === 1 && (
        <div className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-zinc-900">Select or Add Customer</h2>
              <p className="text-xs text-zinc-500">Who owns or brought in this vehicle?</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsNewCustomer(!isNewCustomer);
                setSelectedCustomer(null);
                setCustDuplicateWarning(null);
              }}
              className="text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-xl border border-amber-200 transition"
            >
              {isNewCustomer ? 'Search Existing' : '+ New Customer'}
            </button>
          </div>

          {!isNewCustomer ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Search by name or phone (082...)"
                  className="w-full pl-9 pr-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="max-h-60 overflow-y-auto divide-y divide-zinc-100 border border-zinc-200 rounded-2xl">
                {customers.length === 0 ? (
                  <p className="p-4 text-xs text-zinc-400 text-center">No customers found.</p>
                ) : (
                  customers.map((c) => {
                    const isSelected = selectedCustomer?.id === c.id;
                    return (
                      <div
                        key={c.id}
                        onClick={() => setSelectedCustomer(c)}
                        className={`p-3 cursor-pointer flex items-center justify-between transition ${
                          isSelected ? 'bg-amber-50/80 font-semibold' : 'hover:bg-zinc-50'
                        }`}
                      >
                        <div>
                          <p className="text-xs font-bold text-zinc-900">{c.full_name}</p>
                          <p className="text-[11px] text-zinc-500">{c.phone_display}</p>
                        </div>
                        {isSelected && <CheckCircle2 className="h-4 w-4 text-amber-600" />}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {custDuplicateWarning && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-bold">Possible Duplicate Record</p>
                    <p className="text-[11px] mt-0.5">{custDuplicateWarning}</p>
                    <p className="text-[10px] text-amber-700 mt-1 font-semibold">
                      Tap "Next: Vehicle" again to save anyway.
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Customer Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Siphiwe Dube"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  South African Phone Number *
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 082 123 4567 or +27..."
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <p className="text-[10px] text-zinc-400 mt-0.5">Used for direct WhatsApp links and quotes</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Address / Area (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Section 2, Meadowlands"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleCustomerNext}
            disabled={loading}
            className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs rounded-xl shadow flex items-center justify-center gap-2 transition"
          >
            {loading ? 'Validating...' : 'Next: Vehicle'} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ================= STEP 2: VEHICLE ================= */}
      {step === 2 && (
        <div className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-zinc-900">Select or Add Vehicle</h2>
              <p className="text-xs text-zinc-500">
                Customer: <strong>{selectedCustomer?.full_name}</strong>
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsNewVehicle(!isNewVehicle);
                setSelectedVehicle(null);
                setVehDuplicateWarning(null);
              }}
              className="text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-xl border border-amber-200 transition"
            >
              {isNewVehicle ? 'Pick Existing' : '+ New Vehicle'}
            </button>
          </div>

          {!isNewVehicle && customerVehicles.length > 0 ? (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-zinc-700">Existing Vehicles on Record:</label>
              <div className="space-y-1.5">
                {customerVehicles.map((v) => {
                  const isSelected = selectedVehicle?.id === v.id;
                  return (
                    <div
                      key={v.id}
                      onClick={() => setSelectedVehicle(v)}
                      className={`p-3 rounded-2xl border cursor-pointer flex items-center justify-between transition ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/80'
                          : 'border-zinc-200 hover:bg-zinc-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-700 font-bold">
                          <Car className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-zinc-900">
                            {v.make} {v.model} {v.year ? `(${v.year})` : ''}
                          </p>
                          <span className="text-[11px] font-mono font-bold text-zinc-700 bg-zinc-100 px-1.5 py-0.2 rounded border border-zinc-200">
                            {v.registration_display || v.registration}
                          </span>
                        </div>
                      </div>
                      {isSelected && <CheckCircle2 className="h-5 w-5 text-amber-600" />}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {vehDuplicateWarning && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-bold">Duplicate Vehicle Registration Warning</p>
                    <p className="text-[11px] mt-0.5">{vehDuplicateWarning}</p>
                    <p className="text-[10px] text-amber-700 mt-1 font-semibold">
                      Tap "Next: Job Details" again if you wish to confirm.
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Registration / Number Plate *
                </label>
                <input
                  type="text"
                  placeholder="e.g. CA 123-456 or AB 12 CD GP"
                  value={newVehReg}
                  onChange={(e) => setNewVehReg(e.target.value)}
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-mono font-bold text-zinc-900 uppercase focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Make *</label>
                  <input
                    type="text"
                    placeholder="e.g. Toyota"
                    value={newVehMake}
                    onChange={(e) => setNewVehMake(e.target.value)}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Model *</label>
                  <input
                    type="text"
                    placeholder="e.g. HiAce Ses'fikile"
                    value={newVehModel}
                    onChange={(e) => setNewVehModel(e.target.value)}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Year</label>
                  <input
                    type="number"
                    placeholder="2019"
                    value={newVehYear}
                    onChange={(e) => setNewVehYear(e.target.value)}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Mileage (km)</label>
                  <input
                    type="number"
                    placeholder="120000"
                    value={newVehMileage}
                    onChange={(e) => setNewVehMileage(e.target.value)}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Colour</label>
                  <input
                    type="text"
                    placeholder="White"
                    value={newVehColor}
                    onChange={(e) => setNewVehColor(e.target.value)}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="py-3 px-4 border border-zinc-300 rounded-xl text-xs font-bold text-zinc-700 hover:bg-zinc-100 flex items-center justify-center gap-1.5 transition"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button
              type="button"
              onClick={handleVehicleNext}
              disabled={loading}
              className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs rounded-xl shadow flex items-center justify-center gap-2 transition"
            >
              {loading ? 'Saving...' : 'Next: Job Details'} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 3: JOB DETAILS ================= */}
      {step === 3 && (
        <div className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-bold text-zinc-900">Job Intake Details</h2>
            <p className="text-xs text-zinc-500">
              Vehicle: <strong>{selectedVehicle?.make} {selectedVehicle?.model}</strong> (
              <span className="font-mono">{selectedVehicle?.registration_display || selectedVehicle?.registration}</span>)
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Customer's Reported Problem *
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Engine knocking under acceleration. Squeaking front brakes and overheating light turned red."
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Assign Mechanic
              </label>
              <select
                value={assignedMechanicId}
                onChange={(e) => setAssignedMechanicId(e.target.value)}
                className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Unassigned</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} ({s.role})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Expected Completion
              </label>
              <input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Intake Notes & Physical Condition
            </label>
            <input
              type="text"
              placeholder="e.g. Scratched left mirror, 1/4 tank fuel, spare wheel present"
              value={intakeNotes}
              onChange={(e) => setIntakeNotes(e.target.value)}
              className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="py-3 px-4 border border-zinc-300 rounded-xl text-xs font-bold text-zinc-700 hover:bg-zinc-100 flex items-center justify-center gap-1.5 transition"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button
              type="button"
              onClick={handleCreateJob}
              disabled={loading}
              className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {loading ? 'Opening Job Card...' : 'Open Job Card Now'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
