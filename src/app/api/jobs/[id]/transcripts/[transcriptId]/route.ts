import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAuth } from '@/lib/auth/session';
import { repo } from '@/lib/db/repository';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; transcriptId: string }> }
) {
  try {
    const auth = await getCurrentAuth();
    const { transcriptId } = await params;
    const { editedTranscript } = await req.json();

    await repo.markTranscriptReviewed(
      auth.workshop.id,
      transcriptId,
      auth.user.id,
      auth.user.full_name,
      editedTranscript
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
