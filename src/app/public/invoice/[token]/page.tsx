import React from 'react';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { repo } from '@/lib/db/repository';
import { InvoiceDocument } from '@/components/invoice/InvoiceDocument';
import { AlertCircle } from 'lucide-react';

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await repo.getPublicInvoiceByToken(token);

  if (!data) {
    return (
      <div className="min-h-screen bg-zinc-100 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full p-8 rounded-3xl border border-zinc-200 text-center shadow-sm space-y-3">
          <div className="h-12 w-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h1 className="text-base font-bold text-zinc-900">Invoice Link Expired or Unavailable</h1>
          <p className="text-xs text-zinc-500 leading-relaxed">
            This customer invoice link has expired, was revoked by the workshop, or does not exist. Please contact your workshop directly to request an updated invoice link.
          </p>
        </div>
      </div>
    );
  }

  const { job, quote, payments, workshop, customer, vehicle } = data;

  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';
  const proto = headersList.get('x-forwarded-proto') || 'http';
  const publicUrl = `${proto}://${host}/public/invoice/${token}`;

  return (
    <div className="min-h-screen bg-zinc-100 py-6 px-4">
      <div className="max-w-3xl mx-auto">
        <InvoiceDocument
          job={job}
          workshop={workshop}
          customer={customer}
          vehicle={vehicle}
          quote={quote}
          payments={payments}
          publicUrl={publicUrl}
          isStaffView={false}
        />
      </div>
    </div>
  );
}
