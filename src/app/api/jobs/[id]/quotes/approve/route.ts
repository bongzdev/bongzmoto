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

    if (!body.quote_id) {
      return NextResponse.json({ error: 'Quote ID is required.' }, { status: 400 });
    }
    if (!body.status || !['approved', 'rejected'].includes(body.status)) {
      return NextResponse.json({ error: 'Valid status (approved or rejected) is required.' }, { status: 400 });
    }
    if (!body.method) {
      return NextResponse.json({ error: 'Approval method is required.' }, { status: 400 });
    }

    const approval = await repo.recordQuoteApproval(
      auth.workshop.id,
      jobId,
      body.quote_id,
      auth.user.id,
      auth.user.full_name,
      {
        status: body.status,
        method: body.method,
        notes: body.notes,
        attachment_id: body.attachment_id,
      }
    );

    return NextResponse.json({ success: true, approval });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
