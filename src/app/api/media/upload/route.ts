import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAuth } from '@/lib/auth/session';
import { repo } from '@/lib/db/repository';
import { transcriptionService } from '@/lib/transcription/service';
import { AttachmentCategory } from '@/lib/types';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const ALLOWED_MIME_TYPES = new Set([
  // Images
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  // Audio (including WhatsApp voice note formats: .ogg, .opus, .m4a, .mp3, .wav, .aac, .webm)
  'audio/webm',
  'audio/ogg',
  'audio/opus',
  'audio/mp4',
  'audio/x-m4a',
  'audio/m4a',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/aac',
  // Documents
  'application/pdf',
]);

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

export async function POST(req: NextRequest) {
  try {
    const auth = await getCurrentAuth();
    const formData = await req.formData();

    const file = formData.get('file') as File | null;
    const jobId = formData.get('job_id') as string | null;
    const category = (formData.get('category') as AttachmentCategory) || 'intake';
    const caption = (formData.get('caption') as string) || '';
    const requestTranscription = formData.get('request_transcription') === 'true';

    if (!file || !jobId) {
      return NextResponse.json({ error: 'File and Job ID are required.' }, { status: 400 });
    }

    // Verify job belongs to workshop
    const job = await repo.getJob(auth.workshop.id, jobId);
    if (!job) {
      return NextResponse.json({ error: 'Job not found in this workshop.' }, { status: 404 });
    }

    // Validate mime type
    let mimeType = file.type;
    // Fallback detection from file extension if browser sent generic application/octet-stream
    if (!mimeType || mimeType === 'application/octet-stream') {
      const ext = path.extname(file.name).toLowerCase();
      if (ext === '.opus') mimeType = 'audio/opus';
      else if (ext === '.ogg') mimeType = 'audio/ogg';
      else if (ext === '.m4a') mimeType = 'audio/m4a';
      else if (ext === '.mp3') mimeType = 'audio/mpeg';
      else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
      else if (ext === '.png') mimeType = 'image/png';
      else if (ext === '.pdf') mimeType = 'application/pdf';
    }

    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        {
          error: `Unsupported file type: "${file.type || 'unknown'}". Supported formats: Photos (JPEG, PNG, WebP), Voice/Audio (Opus, OGG, M4A, MP3, WAV, WebM), and PDF documents.`,
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 25 MB.` },
        { status: 400 }
      );
    }

    // Write file to local private storage
    const storageDir = path.resolve(process.cwd(), 'storage', 'attachments', auth.workshop.id);
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    const fileExt = path.extname(file.name) || (mimeType.startsWith('audio/') ? '.webm' : '.bin');
    const safeFilename = `${Date.now()}-${randomUUID()}${fileExt}`;
    const destinationPath = path.join(storageDir, safeFilename);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(destinationPath, buffer);

    // Save attachment in database
    const relativePath = path.posix.join(auth.workshop.id, safeFilename);
    const attachment = await repo.addJobAttachment(
      auth.workshop.id,
      jobId,
      auth.user.id,
      auth.user.full_name,
      {
        file_path: relativePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: mimeType,
        category,
        caption,
      }
    );

    let transcriptCreated = false;
    let transcriptionNote: string | undefined;

    // If audio and transcription requested
    if (mimeType.startsWith('audio/') && requestTranscription) {
      if (transcriptionService.isConfigured()) {
        try {
          const res = await transcriptionService.transcribe(buffer, mimeType, file.name);
          await repo.saveTranscript(
            auth.workshop.id,
            jobId,
            auth.user.id,
            auth.user.full_name,
            {
              attachment_id: attachment.id,
              raw_transcript: res.rawTranscript,
              structured_issue: res.structured?.issue,
              structured_checks: res.structured?.checks,
              structured_findings: res.structured?.findings,
              structured_next_steps: res.structured?.nextSteps,
            }
          );
          transcriptCreated = true;
        } catch (transErr: any) {
          transcriptionNote = `Voice note saved, but transcription failed: ${transErr.message}`;
        }
      } else {
        transcriptionNote = 'Voice note saved. AI transcription is not configured (add OPENAI_API_KEY in .env).';
      }
    }

    return NextResponse.json({
      success: true,
      attachment,
      transcriptCreated,
      transcriptionNote,
    });
  } catch (error: any) {
    console.error('Media upload error:', error);
    return NextResponse.json({ error: error.message || 'File upload failed.' }, { status: 500 });
  }
}
