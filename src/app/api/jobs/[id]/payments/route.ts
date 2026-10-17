import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAuth } from '@/lib/auth/session';
import { repo } from '@/lib/db/repository';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getCurrentAuth();
    const { id: jobId } = await params;

    // Role check: Only owners can record payments and manage finance
    if (!auth.isOwner) {
      return NextResponse.json({ error: 'Access denied: Only workshop owners can record payments.' }, { status: 403 });
    }

    const body = await req.json();

    if (!body.amount_cents || body.amount_cents <= 0) {
      return NextResponse.json({ error: 'Payment amount must be greater than zero.' }, { status: 400 });
    }
    if (!body.payment_method) {
      return NextResponse.json({ error: 'Payment method is required.' }, { status: 400 });
    }

    const payment = await repo.recordPayment(
      auth.workshop.id,
      jobId,
      auth.user.id,
      auth.user.full_name,
      {
        amount_cents: Number(body.amount_cents),
        payment_method: body.payment_method,
        payment_date: body.payment_date,
        reference: body.reference,
        notes: body.notes,
        idempotency_key: body.idempotency_key,
      }
    );

    return NextResponse.json({ success: true, payment }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
