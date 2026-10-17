import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAuth } from '@/lib/auth/session';
import { repo } from '@/lib/db/repository';

export async function GET(req: NextRequest) {
  try {
    const auth = await getCurrentAuth();
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || undefined;

    const customers = await repo.listCustomers(auth.workshop.id, query);
    return NextResponse.json({ success: true, customers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getCurrentAuth();
    const body = await req.json();

    if (!body.full_name || !body.full_name.trim()) {
      return NextResponse.json({ error: 'Customer full name is required.' }, { status: 400 });
    }
    if (!body.phone || !body.phone.trim()) {
      return NextResponse.json({ error: 'Customer phone number is required.' }, { status: 400 });
    }

    // Check for duplicates
    if (!body.confirm_duplicate) {
      const duplicates = await repo.findDuplicateCustomers(
        auth.workshop.id,
        body.phone,
        body.full_name
      );

      if (duplicates.byPhone.length > 0 || duplicates.byName.length > 0) {
        return NextResponse.json(
          {
            warning: 'Possible duplicate customer detected.',
            duplicates: {
              byPhone: duplicates.byPhone,
              byName: duplicates.byName,
            },
            needsConfirmation: true,
          },
          { status: 409 }
        );
      }
    }

    const customer = await repo.createCustomer(auth.workshop.id, {
      full_name: body.full_name,
      phone: body.phone,
      email: body.email,
      address: body.address,
      notes: body.notes,
    });

    return NextResponse.json({ success: true, customer }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
