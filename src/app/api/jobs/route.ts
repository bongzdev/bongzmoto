import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAuth } from '@/lib/auth/session';
import { repo } from '@/lib/db/repository';

export async function GET(req: NextRequest) {
  try {
    const auth = await getCurrentAuth();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const query = searchParams.get('q') || undefined;
    const vehicleId = searchParams.get('vehicle_id') || undefined;
    const customerId = searchParams.get('customer_id') || undefined;

    // If user is a mechanic (not owner), should only see their assigned jobs unless specifically requested
    const mechanicFilter = auth.isMechanic ? auth.user.id : (searchParams.get('mechanic_id') || undefined);

    const jobs = await repo.listJobs(auth.workshop.id, {
      status,
      query,
      vehicleId,
      customerId,
      mechanicId: mechanicFilter,
    });

    return NextResponse.json({ success: true, jobs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getCurrentAuth();
    const body = await req.json();

    if (!body.customer_id) {
      return NextResponse.json({ error: 'Customer is required.' }, { status: 400 });
    }
    if (!body.vehicle_id) {
      return NextResponse.json({ error: 'Vehicle is required.' }, { status: 400 });
    }
    if (!body.customer_reported_problem || !body.customer_reported_problem.trim()) {
      return NextResponse.json({ error: 'Customer reported problem is required.' }, { status: 400 });
    }

    const job = await repo.createJob(
      auth.workshop.id,
      auth.user.id,
      auth.user.full_name,
      {
        customer_id: body.customer_id,
        vehicle_id: body.vehicle_id,
        assigned_mechanic_id: body.assigned_mechanic_id,
        customer_reported_problem: body.customer_reported_problem,
        expected_completion_date: body.expected_completion_date,
        intake_notes: body.intake_notes,
      }
    );

    return NextResponse.json({ success: true, job }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
