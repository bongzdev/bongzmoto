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
    const { quote_id } = await req.json();

    if (!quote_id) {
      return NextResponse.json({ error: 'Quote ID is required.' }, { status: 400 });
    }

    const token = await repo.createPublicQuoteToken(auth.workshop.id, jobId, quote_id);

    // Build public URL
    const host = req.headers.get('host') || 'localhost:3000';
    const proto = req.headers.get('x-forwarded-proto') || 'http';
    const publicUrl = `${proto}://${host}/public/quote/${token}`;

    return NextResponse.json({ success: true, token, publicUrl });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
