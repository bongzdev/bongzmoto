import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAuth } from '@/lib/auth/session';
import { repo } from '@/lib/db/repository';
import fs from 'fs';
import path from 'path';

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

    const fullPath = path.resolve(process.cwd(), 'storage', 'attachments', attachment.file_path);
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: 'File content missing on server.' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(fullPath);
    return new NextResponse(fileBuffer, {
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
