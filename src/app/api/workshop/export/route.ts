import { NextResponse } from 'next/server';
import { getCurrentAuth } from '@/lib/auth/session';
import { repo } from '@/lib/db/repository';

export async function GET() {
  try {
    const auth = await getCurrentAuth();

    if (!auth.isOwner) {
      return NextResponse.json({ error: 'Access denied: Only workshop owners can export workshop records.' }, { status: 403 });
    }

    const data = await repo.exportWorkshopData(auth.workshop.id);

    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="bongzmoto-export-${auth.workshop.slug}-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
