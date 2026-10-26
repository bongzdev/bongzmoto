import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAuth } from '@/lib/auth/session';
import { repo } from '@/lib/db/repository';
import { readAttachment } from '@/lib/storage';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getCurrentAuth();
    const { id } = await params;

    const attachment = await repo.getAttachment(id);
    if (!attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    // Access control: Ensure attachment belongs to user's workshop
    if (attachment.workshop_id !== auth.workshop.id) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    const fileBuffer = await readAttachment(attachment.file_path);
    if (!fileBuffer) {
      return NextResponse.json({ error: 'File content missing on server.' }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': attachment.mime_type,
        'Content-Length': attachment.file_size.toString(),
        'Content-Disposition': `inline; filename="${encodeURIComponent(attachment.file_name)}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
