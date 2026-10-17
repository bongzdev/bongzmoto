import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAuth } from '@/lib/auth/session';
import { repo } from '@/lib/db/repository';

export async function GET(req: NextRequest) {
  try {
    const auth = await getCurrentAuth();
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || undefined;
    const customerId = searchParams.get('customer_id') || undefined;

    let vehicles;
    if (customerId) {
      vehicles = await repo.listCustomerVehicles(auth.workshop.id, customerId);
    } else {
      vehicles = await repo.listVehicles(auth.workshop.id, query);
    }

    return NextResponse.json({ success: true, vehicles });
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
    if (!body.registration || !body.registration.trim()) {
      return NextResponse.json({ error: 'Vehicle registration is required.' }, { status: 400 });
    }
    if (!body.make || !body.make.trim()) {
      return NextResponse.json({ error: 'Vehicle make is required.' }, { status: 400 });
    }
    if (!body.model || !body.model.trim()) {
      return NextResponse.json({ error: 'Vehicle model is required.' }, { status: 400 });
    }

    // Check for duplicate vehicle registration in this workshop
    if (!body.confirm_duplicate) {
      const existing = await repo.checkDuplicateVehicle(auth.workshop.id, body.registration);
      if (existing) {
        return NextResponse.json(
          {
            warning: `Vehicle with registration "${existing.registration_display}" already exists in the workshop system under customer "${existing.customer_name}".`,
            existingVehicle: existing,
            needsConfirmation: true,
          },
          { status: 409 }
        );
      }
    }

    const vehicle = await repo.createVehicle(auth.workshop.id, {
      customer_id: body.customer_id,
      registration: body.registration,
      make: body.make,
      model: body.model,
      year: body.year ? parseInt(body.year, 10) : undefined,
      mileage: body.mileage ? parseInt(body.mileage, 10) : undefined,
      vin: body.vin,
      engine_no: body.engine_no,
      color: body.color,
      notes: body.notes,
    });

    return NextResponse.json({ success: true, vehicle }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
