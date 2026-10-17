'use client';

import React, { useState, useEffect } from 'react';
import { Workshop, User } from '@/lib/types';
import {
  Settings,
  Users,
  Shield,
  FileDown,
  Save,
  CheckCircle2,
  AlertCircle,
  Building,
  Phone,
  MapPin,
  Percent,
} from 'lucide-react';

export default function SettingsPage() {
  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [staff, setStaff] = useState<User[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [taxRate, setTaxRate] = useState(15.0);
  const [vatNumber, setVatNumber] = useState('');

  useEffect(() => {
    fetch('/api/workshop/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.workshop) {
          setWorkshop(data.workshop);
          setName(data.workshop.name);
          setPhone(data.workshop.phone_display || data.workshop.phone);
          setAddress(data.workshop.address);
          setTaxEnabled(Boolean(data.workshop.tax_enabled));
          setTaxRate(data.workshop.tax_rate_percent || 15.0);
          setVatNumber(data.workshop.vat_number || '');
        }
        if (data.staff) setStaff(data.staff);
        setIsOwner(Boolean(data.isOwner));
      })
      .catch((err) => setErrorMsg(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) return;

    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/workshop/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          address,
          tax_enabled: taxEnabled,
          tax_rate_percent: taxRate,
          vat_number: vatNumber.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save settings');
      }

      setSuccessMsg('Workshop settings updated successfully.');
      setWorkshop(data.workshop);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = () => {
    window.location.href = '/api/workshop/export';
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-zinc-500 flex flex-col items-center justify-center">
        <span className="h-8 w-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-bold text-zinc-700">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-black text-zinc-900 tracking-tight">Workshop Settings</h1>
        <p className="text-xs text-zinc-500">
          Workshop profile, VAT tax configuration, staff access, and backups
        </p>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-900 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Non-owner notice */}
      {!isOwner && (
        <div className="p-4 bg-zinc-100 border border-zinc-300 rounded-3xl text-xs text-zinc-700 space-y-1">
          <p className="font-bold text-zinc-900 flex items-center gap-1.5">
            <Shield className="h-4 w-4 text-zinc-600" /> Mechanic Mode (Read Only)
          </p>
          <p>
            You are currently logged in as a Mechanic. Settings and financial export features require Workshop Owner privileges.
          </p>
        </div>
      )}

      {/* Workshop Details Form */}
      <form onSubmit={handleSaveSettings} className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
          <Building className="h-4 w-4 text-amber-600" /> Workshop Information
        </h2>

        <div>
          <label className="block text-xs font-semibold text-zinc-700 mb-1">
            Workshop Trading Name
          </label>
          <input
            type="text"
            disabled={!isOwner}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-900 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Workshop Contact Phone
            </label>
            <input
              type="text"
              disabled={!isOwner}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-mono text-zinc-900 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Physical Workshop Address
            </label>
            <input
              type="text"
              disabled={!isOwner}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* VAT / Tax Configuration */}
        <div className="pt-3 border-t border-zinc-100 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-zinc-900">Value Added Tax (VAT)</p>
              <p className="text-[11px] text-zinc-500">
                Disabled by default for township micro-workshops
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                disabled={!isOwner}
                checked={taxEnabled}
                onChange={(e) => setTaxEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          {taxEnabled && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  VAT Rate (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  disabled={!isOwner}
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 15.0)}
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-mono text-zinc-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  VAT Registration Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 4010293847"
                  disabled={!isOwner}
                  value={vatNumber}
                  onChange={(e) => setVatNumber(e.target.value)}
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-mono text-zinc-900"
                />
              </div>
            </div>
          )}
        </div>

        {isOwner && (
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs rounded-xl shadow flex items-center justify-center gap-2 transition"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving Changes...' : 'Save Workshop Settings'}
          </button>
        )}
      </form>

      {/* Staff Administration List */}
      <div className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-xs space-y-3">
        <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
          <Users className="h-4 w-4 text-amber-600" /> Workshop Staff ({staff.length})
        </h2>

        <div className="divide-y divide-zinc-100">
          {staff.map((s) => (
            <div key={s.id} className="py-2.5 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-zinc-900">{s.full_name}</p>
                <p className="text-[11px] text-zinc-500">{s.email}</p>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  s.role === 'owner'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {s.role}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Backup and Data Export (Owner Only) */}
      {isOwner && (
        <div className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-xs space-y-3">
          <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
            <FileDown className="h-4 w-4 text-emerald-600" /> Data Export & Backup
          </h2>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Download a complete, offline-accessible snapshot of all customers, vehicles, job cards, quotes, and financial receipts as a structured JSON file.
          </p>

          <button
            type="button"
            onClick={handleExportData}
            className="py-2.5 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-bold text-xs rounded-xl border border-zinc-300 flex items-center gap-2 transition"
          >
            <FileDown className="h-4 w-4" />
            <span>Download Workshop Records Backup (.json)</span>
          </button>
        </div>
      )}
    </div>
  );
}
