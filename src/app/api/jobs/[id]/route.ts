import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAuth } from '@/lib/auth/session';
import { repo } from '@/lib/db/repository';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getCurrentAuth();
    const { id } = await params;

    const job = await repo.getJob(auth.workshop.id, id);
    if (!job) {
      return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
    }

    // Role check: If mechanic, ensure job is assigned to them (or solo owner)
    if (auth.isMechanic && job.assigned_mechanic_id && job.assigned_mechanic_id !== auth.user.id) {
      return NextResponse.json({ error: 'Access denied: You are not assigned to this job.' }, { status: 403 });
    }

    // Fetch related records
    const [tasks, attachments, transcripts, quotes, payments, activity] = await Promise.all([
      repo.listJobTasks(auth.workshop.id, id),
      repo.listJobAttachments(auth.workshop.id, id),
      repo.getJobTranscripts(auth.workshop.id, id),
      repo.listQuoteRevisions(auth.workshop.id, id),
      repo.listJobPayments(auth.workshop.id, id),
      repo.listJobActivity(auth.workshop.id, id),
    ]);

    // Financial sanitization:
    // If mechanic, do not show payment details or receipts
    const sanitizedPayments = auth.isOwner ? payments : [];

    return NextResponse.json({
      success: true,
      job,
      tasks,
      attachments,
      transcripts,
      quotes,
      payments: sanitizedPayments,
      activity,
      canManageFinance: auth.isOwner,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getCurrentAuth();
    const { id } = await params;
    const body = await req.json();

    const job = await repo.getJob(auth.workshop.id, id);
    if (!job) {
      return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
    }

    // Status update
    if (body.status) {
      await repo.updateJobStatus(
        auth.workshop.id,
        id,
        auth.user.id,
        auth.user.full_name,
        body.status,
        body.notes
      );
    }

    // Diagnosis notes update
    if (body.diagnosis_notes !== undefined) {
      await repo.updateJobDiagnosis(
        auth.workshop.id,
        id,
        auth.user.id,
        auth.user.full_name,
        body.diagnosis_notes
      );
    }

    // Assign mechanic (Owner only)
    if (body.assigned_mechanic_id !== undefined) {
      if (!auth.isOwner) {
        return NextResponse.json({ error: 'Only workshop owners can assign staff.' }, { status: 403 });
      }
      await repo.assignJobMechanic(
        auth.workshop.id,
        id,
        auth.user.id,
        auth.user.full_name,
        body.assigned_mechanic_id
      );
    }

    const updated = await repo.getJob(auth.workshop.id, id);
    return NextResponse.json({ success: true, job: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
