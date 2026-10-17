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
    const body = await req.json();

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: 'At least one quote item (part or labour) is required.' }, { status: 400 });
    }

    // Validate items
    for (const item of body.items) {
      if (!item.description || !item.description.trim()) {
        return NextResponse.json({ error: 'Each item must have a description.' }, { status: 400 });
      }
      if (item.unit_price_cents === undefined || item.unit_price_cents < 0) {
        return NextResponse.json({ error: 'Item unit price cannot be negative.' }, { status: 400 });
      }
      if (item.quantity === undefined || item.quantity <= 0) {
        return NextResponse.json({ error: 'Item quantity must be greater than zero.' }, { status: 400 });
      }
    }

    const quote = await repo.saveQuoteRevision(
      auth.workshop.id,
      jobId,
      auth.user.id,
      auth.user.full_name,
      {
        items: body.items,
        notes: body.notes,
        validity_date: body.validity_date,
      }
    );

    return NextResponse.json({ success: true, quote }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
