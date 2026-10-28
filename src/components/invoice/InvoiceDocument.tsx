'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Job, Workshop, Customer, Vehicle, Quote, Payment } from '@/lib/types';
import { formatZAR, formatDate, formatDateTime } from '@/lib/utils/formatters';
import {
  Wrench,
  Printer,
  Share2,
  Copy,
  Check,
  CreditCard,
  Building,
  Phone,
  MapPin,
  Car,
  User,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

interface InvoiceDocumentProps {
  job: Job;
  workshop: Workshop;
  customer: Customer;
  vehicle: Vehicle;
  quote?: Quote | null;
  payments: Payment[];
  publicUrl?: string;
  isStaffView?: boolean;
}

export function InvoiceDocument({
  job,
  workshop,
  customer,
  vehicle,
  quote,
  payments,
  publicUrl,
  isStaffView = false,
}: InvoiceDocumentProps) {
  const [copiedBank, setCopiedBank] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Derived financial figures
  const subtotalCents = quote?.subtotal_cents ?? (job.approved_amount_cents || 0);
  const taxCents = quote?.tax_cents ?? 0;
  const totalCents = quote?.total_cents ?? subtotalCents + taxCents;

  const totalPaidCents = payments
    .filter((p) => !p.is_reversed)
    .reduce((sum, p) => sum + p.amount_cents, 0);

  const balanceCents = Math.max(0, totalCents - totalPaidCents);
  const isPaidInFull = totalCents > 0 && balanceCents === 0;
  const isPartiallyPaid = totalPaidCents > 0 && balanceCents > 0;

  // Invoice Number: Use existing job_number if it starts with INV, or format it
  const invoiceNumber = job.job_number.startsWith('INV-')
    ? job.job_number
    : job.job_number.replace('JOB-', 'INV-');

  // Copy bank account number
  const handleCopyBankAccount = () => {
    if (!workshop.account_number) return;
    navigator.clipboard.writeText(workshop.account_number);
    setCopiedBank(true);
    setTimeout(() => setCopiedBank(false), 2500);
  };

  // Copy public link
  const handleCopyLink = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Share via WhatsApp
  const handleWhatsAppShare = () => {
    const reg = vehicle.registration_display || vehicle.registration;
    const balanceText = balanceCents === 0 ? 'PAID IN FULL' : `Balance Due: ${formatZAR(balanceCents)}`;
    const linkText = publicUrl ? `\n\n📄 View Official Invoice Online:\n${publicUrl}` : '';

    const text = `Hello ${customer.full_name},\n\nHere is your official invoice from *${workshop.name}* for your *${vehicle.make} ${vehicle.model}* (${reg}):\n\n` +
      `🧾 *Invoice No:* ${invoiceNumber}\n` +
      `💰 *Total Amount:* ${formatZAR(totalCents)}\n` +
      `💳 *Status:* ${balanceText}${linkText}\n\n` +
      (workshop.account_number && balanceCents > 0
        ? `*EFT Banking Details:*\nBank: ${workshop.bank_name || 'FNB'}\nAcc: ${workshop.account_number}\nBranch: ${workshop.branch_code || '231733'}\nRef: ${invoiceNumber}\n\n`
        : '') +
      `Thank you for trusting us with your vehicle!`;

    const phoneNum = customer.phone.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${phoneNum}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-4">
      {/* Action Bar (Hidden when printing) */}
      <div className="no-print bg-zinc-900 text-white p-4 rounded-3xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {isStaffView && (
            <Link
              href={`/jobs/${job.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Job Card</span>
            </Link>
          )}

          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="text-xs font-bold text-zinc-100">Official Tax Invoice</span>
            <span className="text-[11px] font-mono text-zinc-400">({invoiceNumber})</span>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-98"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print / PDF</span>
          </button>

          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-98"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>WhatsApp</span>
          </button>

          {publicUrl && (
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl transition active:scale-98"
              title="Copy customer public link"
            >
              {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedLink ? 'Copied' : 'Link'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Invoice Printable Sheet */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-zinc-200 shadow-sm space-y-7 text-zinc-900 print:border-none print:shadow-none print:p-0 print:rounded-none">
        {/* Header: Logo, Workshop Info & Invoice Meta */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-zinc-200">
          {/* Workshop Brand Header */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {workshop.logo_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={workshop.logo_url}
                  alt={workshop.name}
                  className="h-16 w-auto max-w-[200px] max-h-16 object-contain rounded-xl border border-zinc-200/80 p-1 bg-white shadow-xs"
                />
              ) : (
                <div className="h-14 w-14 rounded-2xl bg-zinc-950 text-amber-500 flex items-center justify-center font-black shadow-xs">
                  <Wrench className="h-7 w-7" />
                </div>
              )}

              <div>
                <h1 className="text-lg sm:text-xl font-black text-zinc-900 tracking-tight leading-tight">
                  {workshop.name}
                </h1>
                <p className="text-[11px] font-bold text-amber-700 tracking-wide uppercase">
                  Auto Mechanical & Panel Beating Services
                </p>
              </div>
            </div>

            <div className="text-xs text-zinc-600 space-y-1">
              <p className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                <span>{workshop.address}</span>
              </p>
              <p className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                <span>{workshop.phone_display || workshop.phone}</span>
              </p>
              {workshop.tax_enabled && workshop.vat_number && (
                <p className="text-[11px] text-zinc-500 font-mono">
                  VAT Reg No: <span className="font-semibold text-zinc-800">{workshop.vat_number}</span>
                </p>
              )}
            </div>
          </div>

          {/* Invoice Meta Box */}
          <div className="sm:text-right space-y-2 bg-zinc-50 sm:bg-transparent p-4 sm:p-0 rounded-2xl border border-zinc-200/60 sm:border-none">
            <div>
              <span className="text-[10px] font-black tracking-widest text-zinc-500 uppercase">
                {workshop.tax_enabled ? 'TAX INVOICE' : 'OFFICIAL INVOICE'}
              </span>
              <p className="text-2xl font-black font-mono text-zinc-900 tracking-tight">
                {invoiceNumber}
              </p>
            </div>

            <div className="text-xs space-y-0.5 text-zinc-600">
              <p>
                <span className="text-zinc-500">Date:</span>{' '}
                <span className="font-semibold text-zinc-900 font-mono">
                  {formatDate(job.created_at)}
                </span>
              </p>
              <p>
                <span className="text-zinc-500">Job Reference:</span>{' '}
                <span className="font-semibold text-zinc-900 font-mono">{job.job_number}</span>
              </p>
            </div>

            {/* Status Pill */}
            <div className="pt-1 sm:justify-end flex">
              {isPaidInFull ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-wider border border-emerald-200">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Paid In Full</span>
                </span>
              ) : isPartiallyPaid ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black uppercase tracking-wider border border-amber-200">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                  <span>Partially Paid</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 text-zinc-800 text-xs font-black uppercase tracking-wider border border-zinc-300">
                  <AlertCircle className="h-3.5 w-3.5 text-zinc-500" />
                  <span>Payment Due</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Customer & Vehicle Information Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-2xl bg-zinc-50 border border-zinc-200/80">
          {/* Customer */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
              <User className="h-3 w-3 text-zinc-400" /> Invoiced To
            </span>
            <p className="text-sm font-black text-zinc-900">{customer.full_name}</p>
            <div className="text-xs text-zinc-600 space-y-0.5">
              <p>{customer.phone_display || customer.phone}</p>
              {customer.email && <p className="text-zinc-500">{customer.email}</p>}
              {customer.address && <p className="text-zinc-500">{customer.address}</p>}
            </div>
          </div>

          {/* Vehicle */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
              <Car className="h-3 w-3 text-zinc-400" /> Vehicle Details
            </span>
            <p className="text-sm font-black text-zinc-900">
              {vehicle.year ? `${vehicle.year} ` : ''}
              {vehicle.make} {vehicle.model}
            </p>
            <div className="text-xs text-zinc-600 space-y-0.5">
              <p className="font-mono font-bold text-zinc-900">
                Reg: {vehicle.registration_display || vehicle.registration}
              </p>
              {vehicle.mileage ? (
                <p className="text-zinc-500">
                  Mileage: <span className="font-mono">{vehicle.mileage.toLocaleString()} km</span>
                </p>
              ) : null}
              {vehicle.vin && <p className="text-[11px] font-mono text-zinc-500">VIN: {vehicle.vin}</p>}
              {vehicle.engine_no && (
                <p className="text-[11px] font-mono text-zinc-500">Eng: {vehicle.engine_no}</p>
              )}
            </div>
          </div>
        </div>

        {/* Job Scope / Problem Reported */}
        {job.customer_reported_problem && (
          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs">
            <span className="font-bold text-zinc-900 block mb-0.5">Scope of Work / Reported Fault:</span>
            <p className="text-zinc-700 leading-relaxed">{job.customer_reported_problem}</p>
          </div>
        )}

        {/* Itemized Parts & Labour Breakdown */}
        <div className="space-y-3">
          <h2 className="text-xs font-black uppercase tracking-wider text-zinc-700">
            Itemized Parts & Workmanship Breakdown
          </h2>

          <div className="overflow-x-auto rounded-2xl border border-zinc-200">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-100/80 text-[11px] font-black uppercase tracking-wider text-zinc-600 border-b border-zinc-200">
                  <th className="py-3 px-4">Item Description</th>
                  <th className="py-3 px-3 text-center">Type</th>
                  <th className="py-3 px-3 text-right">Qty</th>
                  <th className="py-3 px-4 text-right">Unit Price</th>
                  <th className="py-3 px-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/70 text-xs">
                {quote?.items && quote.items.length > 0 ? (
                  quote.items.map((item) => (
                    <tr key={item.id} className="hover:bg-zinc-50/50">
                      <td className="py-3 px-4 font-semibold text-zinc-900">
                        {item.description}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                            item.item_type === 'part'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {item.item_type === 'part' ? 'Part' : 'Labour'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-zinc-700">
                        {item.quantity}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-zinc-700">
                        {formatZAR(item.unit_price_cents)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-zinc-900">
                        {formatZAR(item.total_price_cents)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-zinc-500 text-xs">
                      Repairs and diagnostics for {job.customer_reported_problem || 'vehicle servicing'}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Summary & Payments Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          {/* Payment History / Receipts */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-700">
              Payments Received ({payments.filter((p) => !p.is_reversed).length})
            </h3>

            {payments.filter((p) => !p.is_reversed).length > 0 ? (
              <div className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200 p-3 bg-zinc-50 space-y-2">
                {payments
                  .filter((p) => !p.is_reversed)
                  .map((p) => (
                    <div key={p.id} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-zinc-900">{p.receipt_number}</span>
                          <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                            {p.payment_method.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500">
                          {formatDate(p.payment_date || p.created_at)}
                          {p.reference ? ` • Ref: ${p.reference}` : ''}
                        </p>
                      </div>
                      <span className="font-mono font-bold text-emerald-600">
                        {formatZAR(p.amount_cents)}
                      </span>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="p-4 rounded-2xl border border-dashed border-zinc-200 text-center text-xs text-zinc-400">
                No payments received yet.
              </div>
            )}
          </div>

          {/* Totals & Balance Due Box */}
          <div className="space-y-2 sm:ml-auto w-full max-w-sm">
            <div className="space-y-1.5 text-xs text-zinc-600 p-4 rounded-2xl bg-zinc-50 border border-zinc-200">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-mono font-semibold text-zinc-900">{formatZAR(subtotalCents)}</span>
              </div>

              {workshop.tax_enabled ? (
                <div className="flex justify-between">
                  <span>VAT ({workshop.tax_rate_percent}%)</span>
                  <span className="font-mono font-semibold text-zinc-900">{formatZAR(taxCents)}</span>
                </div>
              ) : (
                <div className="flex justify-between text-[11px] text-zinc-500">
                  <span>VAT</span>
                  <span>Non-VAT Vendor</span>
                </div>
              )}

              <div className="flex justify-between text-sm font-bold text-zinc-900 pt-1.5 border-t border-zinc-200">
                <span>Total Invoice</span>
                <span className="font-mono font-black">{formatZAR(totalCents)}</span>
              </div>

              {totalPaidCents > 0 && (
                <div className="flex justify-between text-xs text-emerald-700 pt-1 font-semibold">
                  <span>Less Total Paid</span>
                  <span className="font-mono">- {formatZAR(totalPaidCents)}</span>
                </div>
              )}
            </div>

            {/* Prominent Balance Banner */}
            <div
              className={`p-4 rounded-2xl border flex items-center justify-between ${
                isPaidInFull
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950'
                  : 'bg-zinc-900 border-zinc-950 text-white shadow-sm'
              }`}
            >
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest block opacity-80">
                  {isPaidInFull ? 'Account Settled' : 'Total Balance Due'}
                </span>
                <p className="text-xl sm:text-2xl font-black font-mono tracking-tight">
                  {formatZAR(balanceCents)}
                </p>
              </div>

              {isPaidInFull ? (
                <div className="h-10 w-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">
                  ✓
                </div>
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-amber-500 text-zinc-950">
                  Due on Collection
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Dedicated EFT Banking Details Card */}
        {workshop.account_number && (
          <div className="p-5 rounded-2xl bg-zinc-950 text-white space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-zinc-100">Direct EFT Banking Details</h3>
                  <p className="text-[10px] text-zinc-400">Please use invoice number as transfer reference</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopyBankAccount}
                className="no-print inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition active:scale-98"
              >
                {copiedBank ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedBank ? 'Account Copied!' : 'Copy Account'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-medium">Bank</span>
                <span className="font-bold text-zinc-100">{workshop.bank_name || 'FNB'}</span>
              </div>

              <div>
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-medium">Account Name</span>
                <span className="font-semibold text-zinc-100 truncate block">
                  {workshop.account_holder || workshop.name}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-medium">Account Number</span>
                <span className="font-mono font-bold text-amber-400 text-sm tracking-wide">
                  {workshop.account_number}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-medium">
                  Branch / Code
                </span>
                <span className="font-mono font-semibold text-zinc-100">
                  {workshop.branch_code || '231733'}
                  {workshop.branch_name ? ` (${workshop.branch_name})` : ''}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Footer & Workshop Guarantee */}
        <div className="pt-4 border-t border-zinc-200 text-center space-y-1">
          <p className="text-xs font-bold text-zinc-800">
            Thank you for supporting {workshop.name}!
          </p>
          <p className="text-[11px] text-zinc-500 leading-relaxed max-w-xl mx-auto">
            All workmanship is guaranteed against defective parts and mechanical faults for 90 days or 5,000 km.
            Vehicles stored and driven at owner's risk during testing and diagnostic checks.
          </p>
        </div>
      </div>
    </div>
  );
}
