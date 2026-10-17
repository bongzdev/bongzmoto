import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { repo } from '@/lib/db/repository';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const user = await repo.getUser(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const cookieStore = await cookies();
    cookieStore.set('bongzmoto_user_id', user.id, {
      path: '/',
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: 'lax',
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.full_name,
        role: user.role,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
