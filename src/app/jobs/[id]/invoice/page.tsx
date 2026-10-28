import React from 'react';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { getCurrentAuth } from '@/lib/auth/session';
import { repo } from '@/lib/db/repository';
import { InvoiceDocument } from '@/components/invoice/InvoiceDocument';

export default async function JobInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await getCurrentAuth();
  const { id: jobId } = await params;

  const job = await repo.getJob(auth.workshop.id, jobId);
  if (!job) {
    notFound();
  }

  const customer = await repo.getCustomer(auth.workshop.id, job.customer_id);
  const vehicle = await repo.getVehicle(auth.workshop.id, job.vehicle_id);
  if (!customer || !vehicle) {
    notFound();
  }

  const currentQuote = await repo.getCurrentQuote(auth.workshop.id, jobId);

  const payments = await repo.listJobPayments(auth.workshop.id, jobId);

  // Generate or obtain public invoice token
  let publicUrl = '';
  try {
    const token = await repo.createPublicInvoiceToken(auth.workshop.id, jobId);
    const headersList = await headers();
    const host = headersList.get('host') || 'localhost:3000';
    const proto = headersList.get('x-forwarded-proto') || 'http';
    publicUrl = `${proto}://${host}/public/invoice/${token}`;
  } catch (err) {
    console.error('Failed to create public invoice token:', err);
  }

  return (
    <div className="max-w-3xl mx-auto py-2">
      <InvoiceDocument
        job={job}
        workshop={auth.workshop}
        customer={customer}
        vehicle={vehicle}
        quote={currentQuote}
        payments={payments}
        publicUrl={publicUrl}
        isStaffView={true}
      />
    </div>
  );
}
