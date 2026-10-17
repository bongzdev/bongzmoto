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
    const { description } = await req.json();

    if (!description || !description.trim()) {
      return NextResponse.json({ error: 'Task description is required' }, { status: 400 });
    }

    const task = await repo.addJobTask(auth.workshop.id, jobId, description);
    return NextResponse.json({ success: true, task }, { status: 201 });
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
    await params;
    const { taskId, isCompleted } = await req.json();

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    await repo.toggleJobTask(auth.workshop.id, taskId, Boolean(isCompleted));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
