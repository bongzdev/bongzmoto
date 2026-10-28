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

    const job = await repo.getJob(auth.workshop.id, jobId);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const token = await repo.createPublicInvoiceToken(auth.workshop.id, jobId);

    // Build public URL
    const host = req.headers.get('host') || 'localhost:3000';
    const proto = req.headers.get('x-forwarded-proto') || 'http';
    const publicUrl = `${proto}://${host}/public/invoice/${token}`;

    return NextResponse.json({ success: true, token, publicUrl });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
