import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAuth } from '@/lib/auth/session';
import { repo } from '@/lib/db/repository';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  try {
    const auth = await getCurrentAuth();
    const { id: jobId, paymentId } = await params;

    // Role check: Only owner
    if (!auth.isOwner) {
      return NextResponse.json({ error: 'Access denied: Only workshop owners can reverse payments.' }, { status: 403 });
    }

    const { reason } = await req.json();
    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: 'Reversal reason is required.' }, { status: 400 });
    }

    const reversal = await repo.reversePayment(
      auth.workshop.id,
      jobId,
      paymentId,
      auth.user.id,
      auth.user.full_name,
      reason
    );

    return NextResponse.json({ success: true, reversal });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
