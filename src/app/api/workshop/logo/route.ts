import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAuth } from '@/lib/auth/session';
import { repo } from '@/lib/db/repository';
import { saveLogo } from '@/lib/storage';
import path from 'path';

const ALLOWED_LOGO_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/svg+xml',
]);

const MAX_LOGO_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  try {
    const auth = await getCurrentAuth();
    if (!auth.isOwner) {
      return NextResponse.json(
        { error: 'Access denied: Only workshop owners can update workshop branding.' },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No image file provided.' }, { status: 400 });
    }

    let mimeType = file.type;
    const ext = path.extname(file.name).toLowerCase();
    if (!mimeType || mimeType === 'application/octet-stream') {
      if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
      else if (ext === '.png') mimeType = 'image/png';
      else if (ext === '.webp') mimeType = 'image/webp';
      else if (ext === '.svg') mimeType = 'image/svg+xml';
    }

    if (!ALLOWED_LOGO_TYPES.has(mimeType)) {
      return NextResponse.json(
        {
          error:
            'Unsupported image format. Please upload a PNG, JPG, WebP, or SVG logo file.',
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_LOGO_SIZE) {
      return NextResponse.json(
        { error: 'Logo file size exceeds 5MB limit. Please upload a smaller image.' },
        { status: 400 }
      );
    }

    const fileExt = ext || (mimeType === 'image/svg+xml' ? '.svg' : '.png');
    const safeFilename = `${auth.workshop.id}-${Date.now()}${fileExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const publicUrl = await saveLogo(safeFilename, buffer, mimeType);

    // Update workshop record in database
    const updated = await repo.updateWorkshopSettings(auth.workshop.id, {
      logo_url: publicUrl,
    });

    return NextResponse.json({
      success: true,
      logo_url: publicUrl,
      workshop: updated,
    });
  } catch (error: any) {
    console.error('Error uploading workshop logo:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const auth = await getCurrentAuth();
    if (!auth.isOwner) {
      return NextResponse.json(
        { error: 'Access denied: Only workshop owners can remove workshop branding.' },
        { status: 403 }
      );
    }

    const updated = await repo.updateWorkshopSettings(auth.workshop.id, {
      logo_url: null,
    });

    return NextResponse.json({
      success: true,
      logo_url: null,
      workshop: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
