import React from 'react';
import { repo } from '@/lib/db/repository';
import { formatZAR, formatDate } from '@/lib/utils/formatters';
import { Wrench, Phone, MapPin, Printer, ShieldCheck } from 'lucide-react';

export default async function PublicQuotePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await repo.getPublicQuoteByToken(token);

  if (!data) {
    return (
      <div className="min-h-screen bg-zinc-100 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full p-6 rounded-3xl border border-zinc-200 text-center shadow-sm space-y-3">
          <div className="h-12 w-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
            ✕
          </div>
          <h1 className="text-base font-bold text-zinc-900">Quotation Link Expired or Unavailable</h1>
          <p className="text-xs text-zinc-500 leading-relaxed">
            This customer quote link has expired, was revoked by the workshop, or does not exist. Please contact the workshop to request an updated quotation link.
          </p>
        </div>
      </div>
    );
  }

  const { quote, workshop, customer, vehicle, job_number } = data;

  return (
    <div className="min-h-screen bg-zinc-100 py-6 px-4">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Printable Action Bar (Hidden when printing) */}
        <div className="no-print flex items-center justify-between bg-zinc-900 text-white p-3.5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-semibold text-zinc-200">
              Verified Workshop Quotation
            </span>
          </div>

          <button
            onClick={() => {
              if (typeof window !== 'undefined') window.print();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl shadow transition"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print / Save PDF</span>
          </button>
        </div>

        {/* The Quotation Document Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200 shadow-sm space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-zinc-200">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="h-8 w-8 rounded-lg bg-zinc-900 text-amber-500 flex items-center justify-center font-bold">
                  <Wrench className="h-4 w-4" />
                </div>
                <h1 className="text-xl font-black text-zinc-900 tracking-tight">{workshop.name}</h1>
              </div>

              <div className="text-xs text-zinc-600 space-y-0.5 mt-2">
                <p className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-zinc-400 shrink-0" /> {workshop.address}
                </p>
                <p className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-zinc-400 shrink-0" /> {workshop.phone_display}
                </p>
                {workshop.vat_number && (
                  <p className="text-[11px] text-zinc-500 font-mono">VAT Reg: {workshop.vat_number}</p>
                )}
              </div>
            </div>

            <div className="text-left sm:text-right bg-zinc-50 sm:bg-transparent p-3 sm:p-0 rounded-2xl">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                OFFICIAL QUOTATION
              </span>
              <p className="text-lg font-mono font-black text-zinc-900 mt-0.5">
                Rev {quote.revision_number}
              </p>
              <p className="text-xs text-zinc-500">Ref: {job_number}</p>
              <p className="text-xs text-zinc-500">Date: {formatDate(quote.created_at)}</p>
              {quote.validity_date && (
                <p className="text-xs text-amber-800 font-medium mt-1">
                  Valid until: {formatDate(quote.validity_date)}
                </p>
              )}
            </div>
          </div>

          {/* Customer & Vehicle Info */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
            <div>
              <p className="text-zinc-500 font-semibold mb-0.5 uppercase tracking-wide">Quoted For:</p>
              <p className="font-bold text-zinc-900 text-sm">{customer.full_name}</p>
            </div>
            <div>
              <p className="text-zinc-500 font-semibold mb-0.5 uppercase tracking-wide">Vehicle Details:</p>
              <p className="font-bold text-zinc-900 text-sm">
                {vehicle.make} {vehicle.model} {vehicle.year ? `(${vehicle.year})` : ''}
              </p>
              <span className="inline-block font-mono font-bold text-xs bg-white px-2 py-0.5 rounded border border-zinc-200 mt-1">
                {vehicle.registration_display}
              </span>
            </div>
          </div>

          {/* Itemised Table */}
          <div className="space-y-2">
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              Itemised Scope of Work & Parts
            </h2>

            <div className="border border-zinc-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-100 text-zinc-700 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Type</th>
                    <th className="p-3">Description</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-right">Unit Price</th>
                    <th className="p-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-zinc-800">
                  {quote.items?.map((it) => (
                    <tr key={it.id} className="hover:bg-zinc-50/50">
                      <td className="p-3 font-semibold uppercase text-[10px] text-zinc-500">
                        {it.item_type}
                      </td>
                      <td className="p-3 font-medium text-zinc-900">{it.description}</td>
                      <td className="p-3 text-center font-mono">{it.quantity}</td>
                      <td className="p-3 text-right font-mono">{formatZAR(it.unit_price_cents)}</td>
                      <td className="p-3 text-right font-mono font-bold text-zinc-900">
                        {formatZAR(it.total_price_cents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Calculation Summary */}
          <div className="flex flex-col sm:flex-row justify-between gap-4 pt-2">
            <div className="text-xs text-zinc-500 max-w-xs space-y-1">
              {quote.notes && (
                <div>
                  <span className="font-bold text-zinc-700">Workshop Notes:</span>
                  <p className="text-zinc-600 italic mt-0.5">{quote.notes}</p>
                </div>
              )}
              <p className="text-[11px] text-zinc-400 mt-2">
                All prices quoted in South African Rand (ZAR). Please reply via WhatsApp or phone call to authorize work.
              </p>
            </div>

            <div className="w-full sm:w-64 space-y-1.5 text-xs">
              <div className="flex justify-between text-zinc-600">
                <span>Subtotal:</span>
                <span className="font-mono">{formatZAR(quote.subtotal_cents)}</span>
              </div>

              {quote.tax_cents > 0 ? (
                <div className="flex justify-between text-zinc-600">
                  <span>VAT ({quote.tax_rate_percent}%):</span>
                  <span className="font-mono">{formatZAR(quote.tax_cents)}</span>
                </div>
              ) : null}

              <div className="flex justify-between pt-2 border-t border-zinc-200 text-base font-black text-zinc-900">
                <span>Grand Total:</span>
                <span className="font-mono text-amber-600">{formatZAR(quote.total_cents)}</span>
              </div>
            </div>
          </div>

          {/* Security & Isolation Disclaimer */}
          <div className="pt-6 border-t border-zinc-100 text-center text-[10px] text-zinc-400">
            Powered securely by BongzMoto Workshop Systems • Soweto, South Africa
          </div>
        </div>
      </div>
    </div>
  );
}
