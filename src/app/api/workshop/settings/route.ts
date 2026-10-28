import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAuth } from '@/lib/auth/session';
import { repo } from '@/lib/db/repository';

export async function GET() {
  try {
    const auth = await getCurrentAuth();
    const staff = await repo.listWorkshopStaff(auth.workshop.id);

    return NextResponse.json({
      success: true,
      workshop: auth.workshop,
      staff,
      isOwner: auth.isOwner,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getCurrentAuth();

    // Owner only check
    if (!auth.isOwner) {
      return NextResponse.json({ error: 'Access denied: Only workshop owners can modify workshop settings.' }, { status: 403 });
    }

    const body = await req.json();
    const updated = await repo.updateWorkshopSettings(auth.workshop.id, {
      name: body.name,
      phone: body.phone,
      address: body.address,
      tax_enabled: body.tax_enabled !== undefined ? Boolean(body.tax_enabled) : undefined,
      tax_rate_percent: body.tax_rate_percent !== undefined ? Number(body.tax_rate_percent) : undefined,
      vat_number: body.vat_number,
      logo_url: body.logo_url,
      bank_name: body.bank_name,
      account_holder: body.account_holder,
      account_number: body.account_number,
      branch_code: body.branch_code,
      branch_name: body.branch_name,
    });

    return NextResponse.json({ success: true, workshop: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
